'use strict';
/**
 * Denúncias, avaliação de vendedores e tickets de suporte.
 *
 * A regra de comunicação dos requisitos manda-se cumprir aqui: o cliente e o
 * afiliado não conversam com o administrador. Quando têm um problema abrem uma
 * denúncia, que aparece no painel. Quem fala directamente com a administração
 * são as empresas, e só através de tickets.
 */
const { db, comUtilizador } = require('../config/supabase');
const { erros } = require('../utils/erros');

const CAMPOS_DENUNCIA = `
  id, reason, description, status, resolution, created_at, handled_at,
  autor:profiles!reports_user_id_fkey ( id, full_name, email, phone ),
  produto:products ( id, name, slug ),
  empresa:companies ( id, name ),
  encomenda:orders ( id, order_number, status ),
  anexos:report_attachments ( id, storage_path, mime )
`;

const CAMPOS_TICKET = `
  id, ticket_number, subject, category, status, created_at, updated_at,
  empresa:companies ( id, name ),
  mensagens:ticket_messages (
    id, body, created_at,
    autor:profiles!ticket_messages_sender_id_fkey ( id, full_name, role )
  )
`;

function normalizaDenuncia(d) {
  return {
    id: d.id,
    motivo: d.reason,
    descricao: d.description,
    estado: d.status,
    resolucao: d.resolution,
    criada_em: d.created_at,
    tratada_em: d.handled_at,
    autor: d.autor || null,
    produto: d.produto || null,
    empresa: d.empresa || null,
    encomenda: d.encomenda || null,
    anexos: d.anexos || [],
  };
}

function normalizaTicket(t) {
  const mensagens = (t.mensagens || []).slice().sort(
    (a, b) => String(a.created_at).localeCompare(String(b.created_at))
  );
  return {
    id: t.id,
    numero: t.ticket_number,
    assunto: t.subject,
    categoria: t.category,
    estado: t.status,
    criado_em: t.created_at,
    actualizado_em: t.updated_at,
    empresa: t.empresa || null,
    mensagens: mensagens.map((m) => ({
      id: m.id,
      texto: m.body,
      criada_em: m.created_at,
      autor: m.autor?.full_name || 'TeskBuy',
      da_equipa: m.autor?.role === 'admin' || m.autor?.role === 'gestor',
    })),
  };
}

/* ── denúncias ─────────────────────────────────────────────── */

/**
 * Cria a denúncia. A empresa responsável não vem do cliente: é procurada a
 * partir do produto, para ninguém poder apontar o dedo à empresa errada.
 */
async function criarDenuncia(utilizadorId, corpo) {
  const cliente = db();
  let empresaId = null;

  if (corpo.produto_id) {
    const { data: produto } = await cliente
      .from('products')
      .select('company_id')
      .eq('id', corpo.produto_id)
      .maybeSingle();
    empresaId = produto?.company_id || null;
  }

  const { data, error } = await cliente
    .from('reports')
    .insert({
      user_id: utilizadorId,
      product_id: corpo.produto_id || null,
      order_id: corpo.encomenda_id || null,
      company_id: empresaId,
      reason: corpo.motivo,
      description: corpo.descricao || null,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (Array.isArray(corpo.anexos) && corpo.anexos.length) {
    await cliente.from('report_attachments').insert(
      corpo.anexos.map((a) => ({
        report_id: data.id,
        storage_path: a.caminho,
        mime: a.mime || null,
      }))
    );
  }

  return { id: data.id, estado: 'nova' };
}

async function minhasDenuncias(utilizadorId) {
  const { data, error } = await db()
    .from('reports')
    .select(CAMPOS_DENUNCIA)
    .eq('user_id', utilizadorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizaDenuncia);
}

async function listarDenuncias({ estado, pagina = 1, limite = 30 }) {
  let consulta = db().from('reports').select(CAMPOS_DENUNCIA, { count: 'exact' });
  if (estado) consulta = consulta.eq('status', estado);

  const de = (pagina - 1) * limite;
  const { data, error, count } = await consulta
    .order('created_at', { ascending: false })
    .range(de, de + limite - 1);
  if (error) throw error;
  return { dados: (data || []).map(normalizaDenuncia), total: count || 0 };
}

async function tratarDenuncia(token, denunciaId, { estado, resolucao }, gestorId) {
  const cliente = comUtilizador(token);

  const { data, error } = await cliente
    .from('reports')
    .update({
      status: estado,
      resolution: resolucao || null,
      handled_by: gestorId,
      handled_at: new Date().toISOString(),
    })
    .eq('id', denunciaId)
    .select('id, user_id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Denúncia não encontrada.');

  if (estado === 'resolvida' || estado === 'rejeitada') {
    await cliente.from('notifications').insert({
      user_id: data.user_id,
      audience: 'utilizador',
      type: 'denuncia_' + estado,
      title: estado === 'resolvida' ? 'A sua denúncia foi resolvida' : 'A sua denúncia foi analisada',
      body: resolucao || 'Já analisámos o que nos comunicou.',
      link: '/conta#denuncias',
    });
  }

  return { id: denunciaId, estado };
}

/* ── avaliação do vendedor ─────────────────────────────────── */

/**
 * Só quem comprou àquela empresa e recebeu a encomenda pode avaliar.
 * A política da base de dados exige encomenda entregue; aqui confirma-se
 * também que a empresa realmente vendeu alguma coisa nessa encomenda.
 */
async function avaliarVendedor(utilizadorId, corpo) {
  const cliente = db();

  const { data: linha } = await cliente
    .from('order_items')
    .select('id')
    .eq('order_id', corpo.encomenda_id)
    .eq('company_id', corpo.empresa_id)
    .limit(1)
    .maybeSingle();
  if (!linha) {
    throw erros.pedidoInvalido('Esta empresa não vendeu nada nessa encomenda.');
  }

  const { error } = await cliente.from('seller_reviews').insert({
    company_id: corpo.empresa_id,
    user_id: utilizadorId,
    order_id: corpo.encomenda_id,
    rating: corpo.estrelas,
    comment: corpo.comentario || null,
  });
  if (error) {
    if (String(error.message || '').includes('duplicate key')) {
      throw erros.conflito('Já avaliou esta empresa nesta encomenda.');
    }
    if (/row-level security|policy/i.test(error.message || '')) {
      throw erros.semPermissao('Só pode avaliar depois de receber a encomenda.');
    }
    throw error;
  }

  return { avaliada: true };
}

/* ── tickets ───────────────────────────────────────────────── */

async function ticketsDaEmpresa(empresaId) {
  const { data, error } = await db()
    .from('support_tickets')
    .select(CAMPOS_TICKET)
    .eq('company_id', empresaId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizaTicket);
}

async function criarTicket(empresaId, utilizadorId, corpo) {
  const cliente = db();

  const { data, error } = await cliente
    .from('support_tickets')
    .insert({
      company_id: empresaId,
      opened_by: utilizadorId,
      subject: corpo.assunto,
      category: corpo.categoria,
    })
    .select('id, ticket_number')
    .single();
  if (error) throw error;

  const { error: erroMsg } = await cliente.from('ticket_messages').insert({
    ticket_id: data.id,
    sender_id: utilizadorId,
    body: corpo.mensagem,
  });
  if (erroMsg) throw erroMsg;

  return { id: data.id, numero: data.ticket_number };
}

async function listarTickets({ estado, pagina = 1, limite = 30 }) {
  let consulta = db().from('support_tickets').select(CAMPOS_TICKET, { count: 'exact' });
  if (estado) consulta = consulta.eq('status', estado);

  const de = (pagina - 1) * limite;
  const { data, error, count } = await consulta
    .order('updated_at', { ascending: false })
    .range(de, de + limite - 1);
  if (error) throw error;
  return { dados: (data || []).map(normalizaTicket), total: count || 0 };
}

/**
 * Responder move o estado para o lado de quem tem de agir a seguir, sem
 * ninguém ter de se lembrar de o fazer à mão.
 */
async function responderTicket(ticketId, utilizadorId, texto, daEquipa) {
  const cliente = db();

  const { error } = await cliente.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: utilizadorId,
    body: texto,
  });
  if (error) throw error;

  await cliente
    .from('support_tickets')
    .update({
      status: daEquipa ? 'aguarda_empresa' : 'aguarda_admin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  // Quem é avisado da nova mensagem é decidido por um gatilho na base de
  // dados: a empresa se quem escreveu foi a equipa, e a equipa no caso oposto.
  return { enviada: true };
}

async function mudarEstadoTicket(ticketId, estado) {
  const { data, error } = await db()
    .from('support_tickets')
    .update({ status: estado, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Ticket não encontrado.');
  return { id: ticketId, estado };
}

module.exports = {
  criarDenuncia, minhasDenuncias, listarDenuncias, tratarDenuncia,
  avaliarVendedor,
  ticketsDaEmpresa, criarTicket, listarTickets, responderTicket, mudarEstadoTicket,
};
