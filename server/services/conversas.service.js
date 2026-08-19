'use strict';
/**
 * Conversas entre clientes/afiliados e empresas.
 *
 * O administrador não entra aqui, por desenho: as políticas da base de dados
 * só deixam ver as conversas a quem participa nelas. Quando um cliente tem um
 * problema que precisa da administração, usa a denúncia, não uma conversa.
 */
const { db } = require('../config/supabase');
const { erros } = require('../utils/erros');

const CAMPOS = `
  id, kind, subject, last_message_at, created_at, company_id, user_id,
  empresa:companies ( id, name, logo_url ),
  cliente:profiles!conversations_user_id_fkey ( id, full_name ),
  mensagens:conversation_messages ( id, body, sender_id, read_at, created_at )
`;

function normaliza(c, quemSou) {
  const mensagens = (c.mensagens || [])
    .slice()
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

  return {
    id: c.id,
    tipo: c.kind,
    assunto: c.subject,
    empresa: c.empresa || null,
    cliente: c.cliente ? { id: c.cliente.id, nome: c.cliente.full_name } : null,
    ultima_em: c.last_message_at,
    por_ler: mensagens.filter((m) => m.sender_id !== quemSou && !m.read_at).length,
    mensagens: mensagens.map((m) => ({
      id: m.id,
      texto: m.body,
      minha: m.sender_id === quemSou,
      criada_em: m.created_at,
    })),
  };
}

/** As conversas de um cliente ou afiliado. */
async function minhas(utilizadorId) {
  const { data, error } = await db()
    .from('conversations')
    .select(CAMPOS)
    .eq('user_id', utilizadorId)
    .order('last_message_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((c) => normaliza(c, utilizadorId));
}

/** As conversas de uma empresa. */
async function daEmpresa(empresaId, utilizadorId) {
  const { data, error } = await db()
    .from('conversations')
    .select(CAMPOS)
    .eq('company_id', empresaId)
    .order('last_message_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((c) => normaliza(c, utilizadorId));
}

/**
 * Abre a conversa se ainda não existir e envia a primeira mensagem.
 * O tipo depende de quem fala: um afiliado aprovado abre conversa de
 * afiliado, os restantes de cliente.
 */
async function iniciar(utilizadorId, { empresa_id, assunto, mensagem }) {
  const cliente = db();

  const { data: empresa } = await cliente
    .from('companies')
    .select('id, status')
    .eq('id', empresa_id)
    .maybeSingle();
  if (!empresa || empresa.status !== 'aprovada') {
    throw erros.naoEncontrado('Empresa não encontrada.');
  }

  const { data: afiliado } = await cliente
    .from('affiliates')
    .select('user_id')
    .eq('user_id', utilizadorId)
    .eq('status', 'aprovada')
    .maybeSingle();
  const tipo = afiliado ? 'afiliado_empresa' : 'cliente_empresa';

  const { data: existente } = await cliente
    .from('conversations')
    .select('id')
    .eq('kind', tipo)
    .eq('company_id', empresa_id)
    .eq('user_id', utilizadorId)
    .maybeSingle();

  let conversaId = existente?.id;

  if (!conversaId) {
    const { data, error } = await cliente
      .from('conversations')
      .insert({
        kind: tipo,
        company_id: empresa_id,
        user_id: utilizadorId,
        subject: assunto || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    conversaId = data.id;
  }

  await enviar(utilizadorId, conversaId, mensagem);
  return { id: conversaId };
}

async function enviar(utilizadorId, conversaId, texto) {
  const cliente = db();

  const { error } = await cliente.from('conversation_messages').insert({
    conversation_id: conversaId,
    sender_id: utilizadorId,
    body: texto,
  });
  if (error) {
    if (/row-level security|policy/i.test(error.message || '')) {
      throw erros.semPermissao('Não participa nesta conversa.');
    }
    throw error;
  }

  await cliente
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversaId);

  return { enviada: true };
}

/** Marca como lidas as mensagens que não são minhas. */
async function marcarLidas(utilizadorId, conversaId) {
  const { error } = await db()
    .from('conversation_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversaId)
    .neq('sender_id', utilizadorId)
    .is('read_at', null);
  if (error) throw error;
  return { lidas: true };
}

module.exports = { minhas, daEmpresa, iniciar, enviar, marcarLidas };
