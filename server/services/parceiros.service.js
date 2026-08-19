'use strict';
/**
 * Candidaturas a vendedor e a afiliado.
 *
 * Um cliente candidata-se, a equipa decide. Quando um vendedor é aprovado,
 * a empresa é criada aqui mesmo — nunca pelo próprio candidato, para que
 * ninguém possa aparecer com uma empresa já aprovada.
 */
const { db, comUtilizador } = require('../config/supabase');
const { erros } = require('../utils/erros');

const CAMPOS = `
  id, kind, status, payload, admin_note, created_at, updated_at, reviewed_at, company_id,
  utilizador:profiles!applications_user_id_fkey ( id, full_name, email, phone ),
  kyc:kyc_submissions ( id, full_name, document_type, document_number, status,
                        documentos:kyc_documents ( id, kind, storage_path, mime ) )
`;

/** Estados a partir dos quais ainda se pode voltar a submeter. */
const REABRIVEIS = ['rejeitado', 'cancelado', 'info_pedida'];

function normaliza(c) {
  return {
    id: c.id,
    tipo: c.kind,
    estado: c.status,
    dados: c.payload || {},
    nota_admin: c.admin_note || null,
    criado_em: c.created_at,
    decidido_em: c.reviewed_at,
    empresa_id: c.company_id,
    utilizador: c.utilizador || null,
    kyc: Array.isArray(c.kyc) ? c.kyc[0] || null : c.kyc || null,
  };
}

function sanitizarSlug(nome) {
  return String(nome)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'empresa';
}

/* ── lado do candidato ─────────────────────────────────────── */

async function minhas(utilizadorId) {
  const { data, error } = await db()
    .from('applications')
    .select(CAMPOS)
    .eq('user_id', utilizadorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normaliza);
}

/**
 * Cria a candidatura e, no mesmo passo, o registo de KYC com os documentos
 * que o candidato já carregou para o Storage.
 */
async function candidatar(utilizadorId, tipo, corpo) {
  const cliente = db();

  // Uma candidatura activa de cada tipo, para não encher a fila de duplicados.
  const { data: existentes } = await cliente
    .from('applications')
    .select('id, status')
    .eq('user_id', utilizadorId)
    .eq('kind', tipo);

  const activa = (existentes || []).find((c) => !REABRIVEIS.includes(c.status));
  if (activa) {
    throw erros.conflito(
      activa.status === 'aprovado'
        ? 'Esta conta já foi aprovada para essa função.'
        : 'Já tem uma candidatura em análise. Aguarde a resposta.'
    );
  }

  const { documentos = [], kyc, ...dados } = corpo;

  const { data: candidatura, error } = await cliente
    .from('applications')
    .insert({ user_id: utilizadorId, kind: tipo, payload: dados })
    .select('id')
    .single();
  if (error) throw error;

  if (kyc) {
    const { data: submissao, error: erroKyc } = await cliente
      .from('kyc_submissions')
      .insert({
        user_id: utilizadorId,
        application_id: candidatura.id,
        full_name: kyc.nome_completo,
        document_type: kyc.tipo_documento,
        document_number: kyc.numero_documento,
        birth_date: kyc.data_nascimento || null,
        address: kyc.morada || null,
      })
      .select('id')
      .single();
    if (erroKyc) throw erroKyc;

    if (documentos.length) {
      const { error: erroDocs } = await cliente.from('kyc_documents').insert(
        documentos.map((d) => ({
          submission_id: submissao.id,
          kind: d.tipo,
          storage_path: d.caminho,
          mime: d.mime || null,
        }))
      );
      if (erroDocs) throw erroDocs;
    }
  }

  return { id: candidatura.id, estado: 'pendente' };
}

/* ── lado da equipa ────────────────────────────────────────── */

async function listar({ estado, tipo, pagina = 1, limite = 20 }) {
  let consulta = db().from('applications').select(CAMPOS, { count: 'exact' });
  if (estado) consulta = consulta.eq('status', estado);
  if (tipo) consulta = consulta.eq('kind', tipo);

  const de = (pagina - 1) * limite;
  const { data, error, count } = await consulta
    .order('created_at', { ascending: false })
    .range(de, de + limite - 1);
  if (error) throw error;

  return { dados: (data || []).map(normaliza), total: count || 0 };
}

/**
 * Aprovar, rejeitar ou pedir mais informação.
 * Ao aprovar um vendedor cria a empresa; ao aprovar um afiliado cria o registo
 * de afiliado com um código único. Notifica sempre o candidato.
 */
async function decidir(token, candidaturaId, { decisao, nota, comissao }, revisorId) {
  const cliente = comUtilizador(token);

  const { data: candidatura, error } = await cliente
    .from('applications')
    .select('id, user_id, kind, status, payload')
    .eq('id', candidaturaId)
    .maybeSingle();
  if (error) throw error;
  if (!candidatura) throw erros.naoEncontrado('Candidatura não encontrada.');
  if (candidatura.status === 'aprovado') {
    throw erros.conflito('Esta candidatura já tinha sido aprovada.');
  }

  const ESTADOS = { aprovar: 'aprovado', rejeitar: 'rejeitado', pedir_info: 'info_pedida' };
  const novoEstado = ESTADOS[decisao];
  if (!novoEstado) throw erros.pedidoInvalido('Decisão inválida.');

  let empresaId = null;

  if (decisao === 'aprovar' && candidatura.kind === 'vendedor') {
    empresaId = await criarEmpresa(cliente, candidatura, revisorId, comissao);
  }

  if (decisao === 'aprovar' && candidatura.kind === 'afiliado') {
    await criarAfiliado(cliente, candidatura, revisorId, comissao);
  }

  const { error: erroUpd } = await cliente
    .from('applications')
    .update({
      status: novoEstado,
      admin_note: nota || null,
      reviewed_by: revisorId,
      reviewed_at: new Date().toISOString(),
      company_id: empresaId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', candidaturaId);
  if (erroUpd) throw erroUpd;

  await cliente
    .from('kyc_submissions')
    .update({ status: novoEstado, admin_note: nota || null, reviewed_by: revisorId, reviewed_at: new Date().toISOString() })
    .eq('application_id', candidaturaId);

  await avisarCandidato(cliente, candidatura, decisao, nota);

  return { id: candidaturaId, estado: novoEstado, empresa_id: empresaId };
}

async function criarEmpresa(cliente, candidatura, revisorId, comissao) {
  const d = candidatura.payload || {};
  const nome = d.nome_empresa || d.nome || 'Empresa';

  // O slug tem de ser único; se já existir, junta-se um sufixo curto.
  let slug = sanitizarSlug(nome);
  const { data: ocupado } = await cliente.from('companies').select('id').eq('slug', slug).maybeSingle();
  if (ocupado) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: empresa, error } = await cliente
    .from('companies')
    .insert({
      owner_id: candidatura.user_id,
      name: nome,
      slug,
      legal_name: d.nome_legal || null,
      tax_id: d.nif || null,
      email: d.email || null,
      phone: d.telefone || null,
      province: d.provincia || 'Luanda',
      municipality: d.municipio || null,
      address: d.morada || null,
      description: d.descricao || null,
      status: 'aprovada',
      commission_rate: Number.isFinite(Number(comissao)) ? Number(comissao) : 10,
      approved_at: new Date().toISOString(),
      approved_by: revisorId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return empresa.id;
}

async function criarAfiliado(cliente, candidatura, revisorId, comissao) {
  const base = sanitizarSlug(candidatura.payload?.nome || 'afiliado').slice(0, 12);
  const codigo = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await cliente.from('affiliates').upsert(
    {
      user_id: candidatura.user_id,
      code: codigo,
      status: 'aprovada',
      commission_rate: Number.isFinite(Number(comissao)) ? Number(comissao) : 5,
      approved_at: new Date().toISOString(),
      approved_by: revisorId,
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

const MENSAGENS = {
  aprovar: {
    titulo: 'Candidatura aprovada',
    corpo: 'A sua candidatura foi aprovada. Já pode usar a nova área na sua conta.',
  },
  rejeitar: {
    titulo: 'Candidatura não aprovada',
    corpo: 'A sua candidatura não foi aprovada desta vez.',
  },
  pedir_info: {
    titulo: 'Falta informação na sua candidatura',
    corpo: 'Precisamos de mais alguns dados para continuar a análise.',
  },
};

async function avisarCandidato(cliente, candidatura, decisao, nota) {
  const m = MENSAGENS[decisao];
  await cliente.from('notifications').insert({
    user_id: candidatura.user_id,
    audience: 'utilizador',
    type: `candidatura_${decisao}`,
    title: m.titulo,
    body: nota || m.corpo,
    link: '/conta?sep=candidaturas',
    meta: { application_id: candidatura.id, kind: candidatura.kind },
  });
}

/** Quantos pedidos estão à espera — para o painel. */
async function pendentes() {
  const { count, error } = await db()
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pendente', 'em_analise', 'info_pedida']);
  if (error) throw error;
  return count || 0;
}

module.exports = { minhas, candidatar, listar, decidir, pendentes };
