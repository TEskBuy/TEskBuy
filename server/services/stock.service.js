'use strict';
const { db } = require('../config/supabase');

async function movimentar({ produtoId, tipo, quantidade, motivo }) {
  const { data, error } = await db().rpc('admin_adjust_stock', {
    p_product_id: produtoId,
    p_type: tipo,
    p_quantity: quantidade,
    p_reason: motivo || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function historico({ produtoId, limite = 50 } = {}) {
  let consulta = db()
    .from('stock_movements')
    .select('id, type, quantity, stock_before, stock_after, reason, created_at, produto:products ( id, name, sku )')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (produtoId) consulta = consulta.eq('product_id', produtoId);

  const { data, error } = await consulta;
  if (error) throw error;
  return data || [];
}

async function stockBaixo() {
  const { data, error } = await db()
    .from('products')
    .select('id, sku, name, slug, stock_quantity, low_stock_threshold, price, is_active')
    .eq('is_active', true)
    .order('stock_quantity', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data || []).filter((p) => p.stock_quantity <= p.low_stock_threshold);
}

module.exports = { movimentar, historico, stockBaixo };
