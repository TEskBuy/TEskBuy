'use strict';
/**
 * Afiliados: parcerias com empresas e comissões.
 *
 * A regra que dá forma a tudo isto: ser afiliado aprovado não chega para
 * divulgar seja o que for. É preciso uma parceria com cada empresa, e essa
 * parceria passa por duas mãos — primeiro o administrador, depois a empresa.
 */
const { db, comUtilizador } = require('../config/supabase');
const { erros } = require('../utils/erros');

const CAMPOS_PARCERIA = `
  id, status, commission_rate, message, admin_note, company_note,
  created_at, admin_reviewed_at, company_decided_at,
  empresa:companies ( id, name, slug, logo_url, rating, rating_count ),
  afiliado:affiliates!affiliate_partnerships_affiliate_id_fkey (
    user_id, code,
    perfil:profiles!affiliates_user_id_fkey ( full_name, email, phone )
  )
`;

/** Estados a partir dos quais faz sentido voltar a pedir à mesma empresa. */
const REPETIVEIS = ['recusado', 'cancelado'];

function normaliza(p) {
  return {
    id: p.id,
    estado: p.status,
    comissao: p.commission_rate,
    mensagem: p.message,
    nota_admin: p.admin_note,
    nota_empresa: p.company_note,
    criada_em: p.created_at,
    analisada_em: p.admin_reviewed_at,
    decidida_em: p.company_decided_at,
    empresa: p.empresa || null,
    afiliado: p.afiliado
      ? {
          id: p.afiliado.user_id,
          codigo: p.afiliado.code,
          nome: p.afiliado.perfil?.full_name || null,
          email: p.afiliado.perfil?.email || null,
        }
      : null,
  };
}

/* ── lado do afiliado ──────────────────────────────────────── */

async function perfil(utilizadorId) {
  const { data, error } = await db()
    .from('affiliates')
    .select('user_id, code, status, commission_rate, approved_at, created_at')
    .eq('user_id', utilizadorId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function exigirAfiliado(utilizadorId) {
  const a = await perfil(utilizadorId);
  if (!a || a.status !== 'aprovada') {
    throw erros.semPermissao('Esta área é para afiliados aprovados. Candidate-se em /parceiro.');
  }
  return a;
}

/** Empresas a que se pode pedir parceria, já com o estado do pedido actual. */
async function empresasDisponiveis(utilizadorId) {
  const cliente = db();

  const [empresas, parcerias] = await Promise.all([
    cliente.from('companies')
      .select('id, name, slug, logo_url, description, rating, rating_count')
      .eq('status', 'aprovada')
      .order('name'),
    cliente.from('affiliate_partnerships')
      .select('company_id, status')
      .eq('affiliate_id', utilizadorId),
  ]);
  if (empresas.error) throw empresas.error;

  const porEmpresa = {};
  (parcerias.data || []).forEach((p) => { porEmpresa[p.company_id] = p.status; });

  return (empresas.data || []).map((e) => ({
    ...e,
    estado_parceria: porEmpresa[e.id] || null,
    pode_pedir: !porEmpresa[e.id] || REPETIVEIS.indexOf(porEmpresa[e.id]) !== -1,
  }));
}

async function minhasParcerias(utilizadorId) {
  const { data, error } = await db()
    .from('affiliate_partnerships')
    .select(CAMPOS_PARCERIA)
    .eq('affiliate_id', utilizadorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normaliza);
}

async function pedirParceria(utilizadorId, { empresa_id, mensagem }) {
  const cliente = db();

  const { data: existente } = await cliente
    .from('affiliate_partnerships')
    .select('id, status')
    .eq('affiliate_id', utilizadorId)
    .eq('company_id', empresa_id)
    .maybeSingle();

  if (existente && REPETIVEIS.indexOf(existente.status) === -1) {
    throw erros.conflito(
      existente.status === 'aceite'
        ? 'Já tem parceria com esta empresa.'
        : 'Já tem um pedido em curso com esta empresa.'
    );
  }

  // Um pedido recusado pode ser retomado; não se cria um segundo registo.
  if (existente) {
    const { error } = await cliente
      .from('affiliate_partnerships')
      .update({
        status: 'pendente',
        message: mensagem || null,
        admin_note: null,
        company_note: null,
        admin_reviewed_at: null,
        company_decided_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existente.id);
    if (error) throw error;
    return { id: existente.id, estado: 'pendente' };
  }

  const { data, error } = await cliente
    .from('affiliate_partnerships')
    .insert({ affiliate_id: utilizadorId, company_id: empresa_id, message: mensagem || null })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id, estado: 'pendente' };
}

async function minhasComissoes(utilizadorId) {
  const { data, error } = await db()
    .from('affiliate_sales')
    .select(`id, amount, commission_rate, commission_amount, status, created_at,
             empresa:companies ( id, name ),
             encomenda:orders ( order_number, status )`)
    .eq('affiliate_id', utilizadorId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const linhas = (data || []).map((c) => ({
    id: c.id,
    valor_venda: Number(c.amount),
    taxa: Number(c.commission_rate),
    comissao: Number(c.commission_amount),
    estado: c.status,
    criada_em: c.created_at,
    empresa: c.empresa?.name || '—',
    encomenda: c.encomenda?.order_number || '—',
  }));

  const soma = (estado) =>
    linhas.filter((l) => l.estado === estado).reduce((t, l) => t + l.comissao, 0);

  return {
    linhas,
    totais: {
      pendente: soma('pendente'),
      confirmada: soma('confirmada'),
      paga: soma('paga'),
      anulada: soma('anulada'),
      vendas: linhas.filter((l) => l.estado !== 'anulada').length,
    },
  };
}

/* ── lado da empresa ───────────────────────────────────────── */

async function parceriasDaEmpresa(empresaId) {
  const { data, error } = await db()
    .from('affiliate_partnerships')
    .select(CAMPOS_PARCERIA)
    .eq('company_id', empresaId)
    .in('status', ['enviado_vendedor', 'aceite', 'recusado'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normaliza);
}

async function decidirEmpresa(empresaId, parceriaId, { decisao, nota, comissao }) {
  const cliente = db();

  const { data: parceria, error } = await cliente
    .from('affiliate_partnerships')
    .select('id, status')
    .eq('id', parceriaId)
    .eq('company_id', empresaId)
    .maybeSingle();
  if (error) throw error;
  if (!parceria) throw erros.naoEncontrado('Pedido não encontrado.');
  if (parceria.status !== 'enviado_vendedor') {
    throw erros.conflito('Este pedido já não está à sua espera.');
  }

  const alteracoes = {
    status: decisao === 'aceitar' ? 'aceite' : 'recusado',
    company_note: nota || null,
    company_decided_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (decisao === 'aceitar' && Number.isFinite(Number(comissao))) {
    alteracoes.commission_rate = Number(comissao);
  }

  const { error: erroUpd } = await cliente
    .from('affiliate_partnerships')
    .update(alteracoes)
    .eq('id', parceriaId);
  if (erroUpd) throw erroUpd;

  return { id: parceriaId, estado: alteracoes.status };
}

/* ── lado do administrador ─────────────────────────────────── */

async function listarParcerias({ estado, pagina = 1, limite = 30 }) {
  let consulta = db().from('affiliate_partnerships').select(CAMPOS_PARCERIA, { count: 'exact' });
  if (estado) consulta = consulta.eq('status', estado);

  const de = (pagina - 1) * limite;
  const { data, error, count } = await consulta
    .order('created_at', { ascending: false })
    .range(de, de + limite - 1);
  if (error) throw error;
  return { dados: (data || []).map(normaliza), total: count || 0 };
}

/**
 * O administrador não decide pela empresa: encaminha ou trava. É o passo
 * intermédio que os requisitos pedem — a decisão final é sempre da empresa.
 */
async function decidirAdmin(token, parceriaId, { decisao, nota, comissao }, revisorId) {
  const cliente = comUtilizador(token);

  const { data: parceria, error } = await cliente
    .from('affiliate_partnerships')
    .select('id, status')
    .eq('id', parceriaId)
    .maybeSingle();
  if (error) throw error;
  if (!parceria) throw erros.naoEncontrado('Pedido não encontrado.');
  if (['aceite', 'recusado'].indexOf(parceria.status) !== -1) {
    throw erros.conflito('Este pedido já foi decidido pela empresa.');
  }

  const ESTADOS = { encaminhar: 'enviado_vendedor', travar: 'recusado', analisar: 'em_analise_admin' };
  const novo = ESTADOS[decisao];
  if (!novo) throw erros.pedidoInvalido('Decisão inválida.');

  const alteracoes = {
    status: novo,
    admin_note: nota || null,
    admin_reviewed_by: revisorId,
    admin_reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (Number.isFinite(Number(comissao))) alteracoes.commission_rate = Number(comissao);

  const { error: erroUpd } = await cliente
    .from('affiliate_partnerships')
    .update(alteracoes)
    .eq('id', parceriaId);
  if (erroUpd) throw erroUpd;

  return { id: parceriaId, estado: novo };
}

module.exports = {
  perfil, exigirAfiliado, empresasDisponiveis, minhasParcerias, pedirParceria, minhasComissoes,
  parceriasDaEmpresa, decidirEmpresa,
  listarParcerias, decidirAdmin,
};
