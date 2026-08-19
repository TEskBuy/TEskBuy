'use strict';
const { db } = require('../config/supabase');
const { erros } = require('../utils/erros');
const env = require('../config/env');

const CAMPOS_ITEM = `
  id, quantity, unit_price, created_at,
  produto:products (
    id, name, slug, sku, price, stock_quantity, is_active, condition, currency,
    imagens:product_images ( url, is_primary, position )
  )
`;

async function garantirCarrinho(utilizadorId) {
  const { data: existente } = await db().from('carts').select('id').eq('user_id', utilizadorId).maybeSingle();
  if (existente) return existente.id;

  const { data, error } = await db().from('carts').insert({ user_id: utilizadorId }).select('id').single();
  if (error) throw error;
  return data.id;
}

function calcularEntrega(subtotal, provincia = 'Luanda') {
  if (subtotal >= env.loja.entregaGratisAcima) return 0;
  return provincia && provincia.toLowerCase() !== 'luanda' ? env.loja.taxaProvincias : env.loja.taxaLuanda;
}

function resumir(itens, provincia) {
  const linhas = itens.map((item) => {
    const imagens = (item.produto?.imagens || []).sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position
    );
    const precoActual = Number(item.produto?.price ?? item.unit_price);
    return {
      id: item.id,
      quantidade: item.quantity,
      preco_unitario: precoActual,
      subtotal: precoActual * item.quantity,
      preco_alterado: Number(item.unit_price) !== precoActual,
      disponivel: Boolean(item.produto?.is_active) && (item.produto?.stock_quantity ?? 0) >= item.quantity,
      stock_disponivel: item.produto?.stock_quantity ?? 0,
      produto: item.produto
        ? {
            id: item.produto.id, nome: item.produto.name, slug: item.produto.slug,
            sku: item.produto.sku, condicao: item.produto.condition,
            imagem: imagens[0]?.url || null,
          }
        : null,
    };
  });

  const subtotal = linhas.reduce((t, l) => t + l.subtotal, 0);
  const entrega = calcularEntrega(subtotal, provincia);

  return {
    itens: linhas,
    total_itens: linhas.reduce((t, l) => t + l.quantidade, 0),
    subtotal,
    entrega,
    total: subtotal + entrega,
    entrega_gratis_acima: env.loja.entregaGratisAcima,
    falta_para_entrega_gratis: Math.max(0, env.loja.entregaGratisAcima - subtotal),
    moeda: env.loja.moeda,
  };
}

async function obter(utilizadorId, provincia) {
  const cartId = await garantirCarrinho(utilizadorId);
  const { data, error } = await db()
    .from('cart_items')
    .select(CAMPOS_ITEM)
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return resumir(data || [], provincia);
}

async function adicionar(utilizadorId, produtoId, quantidade = 1) {
  const { data: produto, error: errProduto } = await db()
    .from('products')
    .select('id, price, stock_quantity, is_active, name')
    .eq('id', produtoId)
    .maybeSingle();
  if (errProduto) throw errProduto;
  if (!produto || !produto.is_active) throw erros.naoEncontrado('Produto não disponível.');

  const cartId = await garantirCarrinho(utilizadorId);
  const { data: existente } = await db()
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', produtoId)
    .maybeSingle();

  const novaQuantidade = (existente?.quantity || 0) + quantidade;
  if (novaQuantidade > produto.stock_quantity) {
    throw erros.conflito(
      produto.stock_quantity === 0
        ? `${produto.name} está esgotado.`
        : `Só temos ${produto.stock_quantity} unidade(s) de ${produto.name} em stock.`
    );
  }

  if (existente) {
    const { error } = await db()
      .from('cart_items')
      .update({ quantity: novaQuantidade, unit_price: produto.price })
      .eq('id', existente.id);
    if (error) throw error;
  } else {
    const { error } = await db()
      .from('cart_items')
      .insert({ cart_id: cartId, product_id: produtoId, quantity: quantidade, unit_price: produto.price });
    if (error) throw error;
  }

  return obter(utilizadorId);
}

async function actualizarItem(utilizadorId, itemId, quantidade) {
  const cartId = await garantirCarrinho(utilizadorId);
  const { data: item } = await db()
    .from('cart_items')
    .select('id, product_id, produto:products ( stock_quantity, name )')
    .eq('id', itemId)
    .eq('cart_id', cartId)
    .maybeSingle();
  if (!item) throw erros.naoEncontrado('Item não encontrado no carrinho.');

  if (quantidade <= 0) return remover(utilizadorId, itemId);
  if (quantidade > (item.produto?.stock_quantity ?? 0)) {
    throw erros.conflito(`Só temos ${item.produto?.stock_quantity ?? 0} unidade(s) em stock.`);
  }

  const { error } = await db().from('cart_items').update({ quantity: quantidade }).eq('id', itemId);
  if (error) throw error;
  return obter(utilizadorId);
}

async function remover(utilizadorId, itemId) {
  const cartId = await garantirCarrinho(utilizadorId);
  const { error } = await db().from('cart_items').delete().eq('id', itemId).eq('cart_id', cartId);
  if (error) throw error;
  return obter(utilizadorId);
}

async function limpar(utilizadorId) {
  const cartId = await garantirCarrinho(utilizadorId);
  const { error } = await db().from('cart_items').delete().eq('cart_id', cartId);
  if (error) throw error;
  return obter(utilizadorId);
}

/** Junta o carrinho local (visitante) ao carrinho da conta após o login. */
async function sincronizar(utilizadorId, itensLocais = []) {
  for (const item of itensLocais) {
    try {
      await adicionar(utilizadorId, item.produto_id, Math.max(1, Number(item.quantidade) || 1));
    } catch (_) {
      // Item indisponível ou sem stock: ignora e continua com os restantes.
    }
  }
  return obter(utilizadorId);
}

module.exports = { obter, adicionar, actualizarItem, remover, limpar, sincronizar, garantirCarrinho, calcularEntrega };
