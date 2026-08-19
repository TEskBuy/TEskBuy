'use strict';
/**
 * Notificações.
 *
 * Cada perfil vê o que lhe diz respeito: o cliente as suas, a empresa as da
 * empresa, e a equipa as do painel. Quem decide isso é a política de segurança
 * da base de dados — aqui só se lê e se marca como lida.
 */
const { db } = require('../config/supabase');

const CAMPOS = 'id, audience, type, title, body, link, meta, read_at, created_at';

function normaliza(n) {
  return {
    id: n.id,
    destino: n.audience,
    tipo: n.type,
    titulo: n.title,
    texto: n.body,
    ligacao: n.link,
    lida: Boolean(n.read_at),
    criada_em: n.created_at,
  };
}

async function listar({ limite = 30, apenasPorLer = false }) {
  let consulta = db().from('notifications').select(CAMPOS);
  if (apenasPorLer) consulta = consulta.is('read_at', null);

  const { data, error } = await consulta
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data || []).map(normaliza);
}

async function porLer() {
  const { count, error } = await db()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count || 0;
}

async function marcarLida(id) {
  const { error } = await db()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  return { lida: true };
}

/** Marca tudo o que o utilizador alcança. A política limita o alcance. */
async function marcarTodasLidas() {
  const { error } = await db()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
  return { lidas: true };
}

/** Registo de auditoria, só para a equipa. */
async function auditoria({ entidade, pagina = 1, limite = 50 }) {
  let consulta = db()
    .from('audit_log')
    .select(`id, action, entity, entity_id, created_at,
             autor:profiles!audit_log_actor_id_fkey ( id, full_name, email )`,
      { count: 'exact' });
  if (entidade) consulta = consulta.eq('entity', entidade);

  const de = (pagina - 1) * limite;
  const { data, error, count } = await consulta
    .order('created_at', { ascending: false })
    .range(de, de + limite - 1);
  if (error) throw error;

  return {
    dados: (data || []).map((a) => ({
      id: a.id,
      accao: a.action,
      entidade: a.entity,
      entidade_id: a.entity_id,
      quando: a.created_at,
      autor: a.autor ? (a.autor.full_name || a.autor.email) : 'Sistema',
    })),
    total: count || 0,
  };
}

module.exports = { listar, porLer, marcarLida, marcarTodasLidas, auditoria };
