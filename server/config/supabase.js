'use strict';
const { AsyncLocalStorage } = require('node:async_hooks');
const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const opcoesBase = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { headers: { 'x-application-name': 'teskbuy-api' } },
};

/**
 * Contexto por pedido. Guarda o cliente Supabase ligado à sessão de quem chama,
 * para que TODAS as consultas passem pelas políticas de Row Level Security.
 */
const contexto = new AsyncLocalStorage();

/**
 * Cliente público — chave anónima, sem sessão.
 * Serve para autenticação (registo/login) e para as leituras abertas ao público
 * (produtos activos, categorias, definições da loja).
 */
const publico = createClient(env.supabase.url, env.supabase.anonKey, opcoesBase);

/**
 * Cliente elevado — apenas existe se SUPABASE_SERVICE_ROLE_KEY estiver definida.
 * Ignora RLS, por isso é opcional e nunca é o caminho normal: fica reservado para
 * tarefas de manutenção. NUNCA deve ser exposto ao browser.
 */
const servico = env.supabase.serviceRoleKey
  ? createClient(env.supabase.url, env.supabase.serviceRoleKey, opcoesBase)
  : null;

/** Cria um cliente no contexto de um utilizador autenticado. */
function comUtilizador(accessToken) {
  return createClient(env.supabase.url, env.supabase.anonKey, {
    ...opcoesBase,
    global: {
      headers: { ...opcoesBase.global.headers, Authorization: `Bearer ${accessToken}` },
    },
  });
}

/** Abre o contexto do pedido (usado uma vez, no app.js). */
function abrirContexto(callback) {
  return contexto.run({ db: null }, callback);
}

/** Define o cliente da sessão actual (usado pelo middleware de autenticação). */
function definirSessao(accessToken) {
  const loja = contexto.getStore();
  if (loja) loja.db = comUtilizador(accessToken);
}

/**
 * Cliente do pedido em curso: o do utilizador autenticado quando existe sessão,
 * caso contrário o anónimo. A autorização real vive nas políticas de RLS —
 * os middlewares são apenas a primeira barreira.
 */
function db() {
  return contexto.getStore()?.db || publico;
}

/** Cliente com service role, ou null se não estiver configurada. */
function elevado() {
  return servico;
}

module.exports = { publico, db, elevado, comUtilizador, abrirContexto, definirSessao };
