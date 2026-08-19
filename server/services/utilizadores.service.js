'use strict';
const { db } = require('../config/supabase');
const { erros } = require('../utils/erros');

const CAMPOS = 'id, email, full_name, phone, avatar_url, role, is_active, created_at';

async function obterPerfil(id) {
  const { data, error } = await db().from('profiles').select(CAMPOS).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Perfil não encontrado.');
  return data;
}

async function actualizarPerfil(id, dados) {
  const permitido = {};
  if (dados.nome !== undefined) permitido.full_name = dados.nome;
  if (dados.telefone !== undefined) permitido.phone = dados.telefone;
  if (dados.avatar_url !== undefined) permitido.avatar_url = dados.avatar_url;

  const { data, error } = await db().from('profiles').update(permitido).eq('id', id).select(CAMPOS).maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Perfil não encontrado.');
  return data;
}

async function listarTodos({ q, papel, pagina = 1, limite = 20 } = {}) {
  const de = (pagina - 1) * limite;
  let consulta = db().from('profiles').select(CAMPOS, { count: 'exact' });
  if (q) consulta = consulta.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  if (papel) consulta = consulta.eq('role', papel);

  const { data, error, count } = await consulta
    .order('created_at', { ascending: false })
    .range(de, de + limite - 1);
  if (error) throw error;
  return { utilizadores: data || [], total: count || 0 };
}

async function definirPapel(id, papel) {
  const { data, error } = await db().from('profiles').update({ role: papel }).eq('id', id).select(CAMPOS).maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Utilizador não encontrado.');
  return data;
}

async function definirActivo(id, activo) {
  const { data, error } = await db().from('profiles').update({ is_active: activo }).eq('id', id).select(CAMPOS).maybeSingle();
  if (error) throw error;
  return data;
}

// ── Moradas ────────────────────────────────────────────────
const CAMPOS_MORADA =
  'id, label, recipient_name, phone, province, municipality, neighbourhood, street, reference_point, is_default, created_at';

async function listarMoradas(utilizadorId) {
  const { data, error } = await db()
    .from('addresses')
    .select(CAMPOS_MORADA)
    .eq('user_id', utilizadorId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function criarMorada(utilizadorId, dados) {
  if (dados.is_default) {
    await db().from('addresses').update({ is_default: false }).eq('user_id', utilizadorId);
  }
  const { data, error } = await db()
    .from('addresses')
    .insert({ ...dados, user_id: utilizadorId })
    .select(CAMPOS_MORADA)
    .single();
  if (error) throw error;
  return data;
}

async function actualizarMorada(utilizadorId, id, dados) {
  if (dados.is_default) {
    await db().from('addresses').update({ is_default: false }).eq('user_id', utilizadorId);
  }
  const { data, error } = await db()
    .from('addresses')
    .update(dados)
    .eq('id', id)
    .eq('user_id', utilizadorId)
    .select(CAMPOS_MORADA)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Morada não encontrada.');
  return data;
}

async function apagarMorada(utilizadorId, id) {
  const { error } = await db().from('addresses').delete().eq('id', id).eq('user_id', utilizadorId);
  if (error) throw error;
  return { id };
}

module.exports = {
  obterPerfil, actualizarPerfil, listarTodos, definirPapel, definirActivo,
  listarMoradas, criarMorada, actualizarMorada, apagarMorada,
};
