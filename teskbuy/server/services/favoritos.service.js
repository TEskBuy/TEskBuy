'use strict';
const { db } = require('../config/supabase');

const CAMPOS = `
  id, created_at,
  produto:products (
    id, name, slug, price, compare_at_price, condition, stock_quantity, is_active, currency,
    imagens:product_images ( url, is_primary, position )
  )
`;

function normaliza(f) {
  const imagens = (f.produto?.imagens || []).sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position
  );
  return { id: f.id, criado_em: f.created_at, produto: { ...f.produto, imagem: imagens[0]?.url || null } };
}

async function listar(utilizadorId) {
  const { data, error } = await db()
    .from('favorites')
    .select(CAMPOS)
    .eq('user_id', utilizadorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normaliza);
}

async function idsDoUtilizador(utilizadorId) {
  const { data, error } = await db().from('favorites').select('product_id').eq('user_id', utilizadorId);
  if (error) throw error;
  return (data || []).map((f) => f.product_id);
}

async function adicionar(utilizadorId, produtoId) {
  const { error } = await db()
    .from('favorites')
    .upsert({ user_id: utilizadorId, product_id: produtoId }, { onConflict: 'user_id,product_id' });
  if (error) throw error;
  return { produto_id: produtoId, favorito: true };
}

async function remover(utilizadorId, produtoId) {
  const { error } = await db().from('favorites').delete().eq('user_id', utilizadorId).eq('product_id', produtoId);
  if (error) throw error;
  return { produto_id: produtoId, favorito: false };
}

async function alternar(utilizadorId, produtoId) {
  const { data } = await db()
    .from('favorites')
    .select('id')
    .eq('user_id', utilizadorId)
    .eq('product_id', produtoId)
    .maybeSingle();
  return data ? remover(utilizadorId, produtoId) : adicionar(utilizadorId, produtoId);
}

module.exports = { listar, idsDoUtilizador, adicionar, remover, alternar };
