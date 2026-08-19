'use strict';
/**
 * Definições da conta: preferências, métodos de pagamento e eliminação.
 *
 * O que cada perfil pode configurar muda — um cliente não tem dados de
 * empresa, um vendedor tem — mas a base é a mesma para todos.
 */
const { db, comUtilizador } = require('../config/supabase');
const env = require('../config/env');
const { erros } = require('../utils/erros');

/* ── preferências ──────────────────────────────────────────── */

async function preferencias(utilizadorId) {
  const { data, error } = await db()
    .from('user_preferences')
    .select('language, notify_email, notify_platform')
    .eq('user_id', utilizadorId)
    .maybeSingle();
  if (error) throw error;

  // Sem linha guardada, valem os valores por omissão.
  return data || { language: 'pt', notify_email: true, notify_platform: true };
}

async function guardarPreferencias(utilizadorId, corpo) {
  const alteracoes = { user_id: utilizadorId, updated_at: new Date().toISOString() };
  if (corpo.idioma !== undefined) alteracoes.language = corpo.idioma;
  if (corpo.notificar_email !== undefined) alteracoes.notify_email = corpo.notificar_email;
  if (corpo.notificar_plataforma !== undefined) alteracoes.notify_platform = corpo.notificar_plataforma;

  const { error } = await db()
    .from('user_preferences')
    .upsert(alteracoes, { onConflict: 'user_id' });
  if (error) throw error;
  return { guardadas: true };
}

/* ── métodos de pagamento e recebimento ────────────────────── */

const NOMES_METODO = {
  multicaixa_express: 'Multicaixa Express',
  transferencia_bancaria: 'Transferência bancária',
  numerario: 'Numerário',
  iban: 'Conta bancária (IBAN)',
};

/**
 * Nunca guardamos o número completo de um cartão nem credenciais.
 * Só o que serve para o cliente reconhecer o método — os últimos dígitos —
 * e, quando existir um provedor de pagamentos, o identificador que ele devolve.
 */
function mascarar(valor) {
  const limpo = String(valor || '').replace(/\s+/g, '');
  if (limpo.length <= 4) return limpo;
  return '•••• ' + limpo.slice(-4);
}

async function listarMetodos(utilizadorId, empresaId) {
  let consulta = db()
    .from('payment_methods')
    .select('id, user_id, company_id, kind, label, details, is_default, created_at');

  consulta = empresaId
    ? consulta.eq('company_id', empresaId)
    : consulta.eq('user_id', utilizadorId).is('company_id', null);

  const { data, error } = await consulta.order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map((m) => ({
    id: m.id,
    tipo: m.kind,
    nome_tipo: NOMES_METODO[m.kind] || m.kind,
    etiqueta: m.label,
    referencia: m.details?.mascarado || null,
    titular: m.details?.titular || null,
    banco: m.details?.banco || null,
    por_omissao: m.is_default,
    de_empresa: Boolean(m.company_id),
  }));
}

async function criarMetodo(utilizadorId, corpo, empresaId) {
  const cliente = db();
  const daEmpresa = corpo.para === 'empresa';

  if (daEmpresa && !empresaId) {
    throw erros.semPermissao('Só empresas aprovadas podem guardar métodos de recebimento.');
  }

  const linha = {
    user_id: daEmpresa ? null : utilizadorId,
    company_id: daEmpresa ? empresaId : null,
    kind: corpo.tipo,
    label: corpo.etiqueta,
    details: {
      mascarado: corpo.referencia ? mascarar(corpo.referencia) : null,
      titular: corpo.titular || null,
      banco: corpo.banco || null,
    },
    is_default: Boolean(corpo.por_omissao),
  };

  // Só pode haver um por omissão de cada lado.
  if (linha.is_default) {
    let limpar = cliente.from('payment_methods').update({ is_default: false });
    limpar = daEmpresa ? limpar.eq('company_id', empresaId) : limpar.eq('user_id', utilizadorId);
    await limpar;
  }

  const { data, error } = await cliente
    .from('payment_methods')
    .insert(linha)
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id };
}

async function apagarMetodo(utilizadorId, metodoId) {
  const { error } = await db().from('payment_methods').delete().eq('id', metodoId);
  if (error) throw error;
  return { removido: true };
}

/* ── eliminação de conta ───────────────────────────────────── */

/**
 * Não se apaga nada de imediato: marca-se a conta como inactiva e avisa-se
 * a equipa. Há encomendas, facturas e comissões presas a este utilizador —
 * apagá-lo à força deixaria buracos no histórico de outras pessoas.
 */
async function pedirEliminacao(token, utilizadorId, motivo) {
  const cliente = comUtilizador(token);

  const { data: perfil } = await cliente
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', utilizadorId)
    .maybeSingle();

  if (perfil && perfil.role !== 'cliente') {
    throw erros.pedidoInvalido(
      'Contas da equipa não se eliminam por aqui. Fale com o administrador.'
    );
  }

  const { data: empresa } = await cliente
    .from('companies')
    .select('id')
    .eq('owner_id', utilizadorId)
    .maybeSingle();
  if (empresa) {
    throw erros.conflito(
      'Esta conta é dona de uma empresa. Encerre a empresa antes de eliminar a conta.'
    );
  }

  const { error } = await cliente.from('reports').insert({
    user_id: utilizadorId,
    reason: 'outro',
    description:
      'PEDIDO DE ELIMINAÇÃO DE CONTA. ' +
      (motivo ? 'Motivo: ' + motivo : 'Sem motivo indicado.'),
  });
  if (error) throw error;

  return { pedido: true };
}

/* ── resumo para o ecrã de definições ──────────────────────── */

/** Diz à interface que secções mostrar, conforme o que a conta é. */
async function perfilCompleto(utilizadorId) {
  const cliente = db();

  const [empresa, afiliado, prefs] = await Promise.all([
    cliente.from('companies').select('id, name, status').eq('owner_id', utilizadorId).maybeSingle(),
    cliente.from('affiliates').select('user_id, code, status').eq('user_id', utilizadorId).maybeSingle(),
    preferencias(utilizadorId),
  ]);

  return {
    empresa: empresa.data || null,
    afiliado: afiliado.data || null,
    preferencias: prefs,
    idiomas: [
      { codigo: 'pt', nome: 'Português' },
      { codigo: 'en', nome: 'English' },
    ],
    moeda: env.loja.moeda,
  };
}

module.exports = {
  preferencias, guardarPreferencias,
  listarMetodos, criarMetodo, apagarMetodo,
  pedirEliminacao, perfilCompleto,
};
