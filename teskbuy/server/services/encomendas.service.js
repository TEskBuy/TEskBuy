'use strict';
const { db } = require('../config/supabase');
const { erros } = require('../utils/erros');
const carrinho = require('./carrinho.service');

const CAMPOS = `
  id, order_number, status, payment_method, payment_status, payment_reference,
  subtotal, shipping_cost, discount, total, currency, coupon_code,
  customer_name, customer_email, customer_phone,
  ship_province, ship_municipality, ship_neighbourhood, ship_street, ship_reference,
  notes, placed_at, paid_at, shipped_at, delivered_at, cancelled_at, created_at, user_id,
  itens:order_items ( id, product_id, product_name, product_sku, product_image, unit_price, quantity, subtotal )
`;

async function criar(utilizadorId, dados) {
  const resumo = await carrinho.obter(utilizadorId, dados.provincia);
  if (!resumo.itens.length) throw erros.pedidoInvalido('O carrinho está vazio.');

  const indisponiveis = resumo.itens.filter((i) => !i.disponivel);
  if (indisponiveis.length) {
    throw erros.conflito(
      `Sem stock suficiente para: ${indisponiveis.map((i) => i.produto?.nome).join(', ')}.`
    );
  }

  const { data, error } = await db().rpc('place_order', {
    p_user_id: utilizadorId,
    p_payment_method: dados.metodo_pagamento,
    p_customer_name: dados.nome,
    p_customer_phone: dados.telefone,
    p_customer_email: dados.email || null,
    p_province: dados.provincia || 'Luanda',
    p_municipality: dados.municipio,
    p_neighbourhood: dados.bairro || null,
    p_street: dados.rua || null,
    p_reference: dados.referencia || null,
    p_notes: dados.notas || null,
    p_coupon_code: dados.cupao || null,
    p_shipping_cost: resumo.entrega,
  });
  if (error) throw error;

  const encomendaId = Array.isArray(data) ? data[0]?.id : data?.id;
  return obter(encomendaId, { ignorarDono: true });
}

async function listarDoUtilizador(utilizadorId, { pagina = 1, limite = 10 } = {}) {
  const de = (pagina - 1) * limite;
  const { data, error, count } = await db()
    .from('orders')
    .select(CAMPOS, { count: 'exact' })
    .eq('user_id', utilizadorId)
    .order('created_at', { ascending: false })
    .range(de, de + limite - 1);
  if (error) throw error;
  return { encomendas: data || [], total: count || 0 };
}

async function listarTodas({ estado, q, pagina = 1, limite = 20 } = {}) {
  const de = (pagina - 1) * limite;
  let consulta = db().from('orders').select(CAMPOS, { count: 'exact' });
  if (estado) consulta = consulta.eq('status', estado);
  if (q) consulta = consulta.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);

  const { data, error, count } = await consulta
    .order('created_at', { ascending: false })
    .range(de, de + limite - 1);
  if (error) throw error;
  return { encomendas: data || [], total: count || 0 };
}

async function obter(id, { utilizadorId = null, ignorarDono = false } = {}) {
  let consulta = db().from('orders').select(CAMPOS).eq('id', id);
  if (!ignorarDono && utilizadorId) consulta = consulta.eq('user_id', utilizadorId);

  const { data, error } = await consulta.maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Encomenda não encontrada.');

  const { data: historico } = await db()
    .from('order_status_history')
    .select('id, status, note, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  return { ...data, historico: historico || [] };
}

async function porNumero(numero) {
  const { data, error } = await db().from('orders').select(CAMPOS).eq('order_number', numero).maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Encomenda não encontrada.');
  return data;
}

async function actualizarEstado(id, estado, { nota = null, utilizadorId = null } = {}) {
  const { error } = await db().rpc('change_order_status', {
    p_order_id: id, p_status: estado, p_note: nota,
  });
  if (error) throw error;
  return obter(id, { ignorarDono: true });
}

async function cancelarDoUtilizador(id, utilizadorId) {
  const encomenda = await obter(id, { utilizadorId });
  if (!['pendente', 'confirmada'].includes(encomenda.status)) {
    throw erros.conflito('Esta encomenda já não pode ser cancelada. Contacte-nos pelo +244 943 277 184.');
  }
  return actualizarEstado(id, 'cancelada', { nota: 'Cancelada pelo cliente', utilizadorId });
}

async function registarPagamento(id, { referencia, estado = 'pago' }) {
  const { error } = await db().rpc('admin_register_payment', {
    p_order_id: id, p_reference: referencia, p_status: estado,
  });
  if (error) throw error;
  return obter(id, { ignorarDono: true });
}

module.exports = {
  criar, listarDoUtilizador, listarTodas, obter, porNumero,
  actualizarEstado, cancelarDoUtilizador, registarPagamento,
};
