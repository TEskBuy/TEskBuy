'use strict';
const { db } = require('../config/supabase');
const { erros } = require('../utils/erros');

const CAMPOS = `
  id, sku, name, slug, short_description, description, condition, price, compare_at_price,
  currency, stock_quantity, low_stock_threshold, warranty_months, supplier, specs, tags,
  rating, rating_count, views, sales_count, is_active, is_featured, created_at, updated_at,
  category_id, brand_id,
  categoria:categories ( id, name, slug ),
  marca:brands ( id, name, slug ),
  vendedor:companies ( id, name, slug, rating, rating_count ),
  imagens:product_images ( id, url, alt, position, is_primary )
`;

const ORDENACOES = {
  recentes: { coluna: 'created_at', ascendente: false },
  antigos: { coluna: 'created_at', ascendente: true },
  preco_asc: { coluna: 'price', ascendente: true },
  preco_desc: { coluna: 'price', ascendente: false },
  nome: { coluna: 'name', ascendente: true },
  populares: { coluna: 'sales_count', ascendente: false },
  avaliacao: { coluna: 'rating', ascendente: false },
};

function normaliza(p) {
  if (!p) return p;
  const imagens = (p.imagens || []).sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position
  );
  return {
    ...p,
    imagens,
    imagem: imagens[0]?.url || null,
    poupanca:
      p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
        ? Number(p.compare_at_price) - Number(p.price)
        : 0,
    em_stock: p.stock_quantity > 0,
    stock_baixo: p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold,
  };
}

async function listar(filtros = {}) {
  const {
    q, categoria, marca, condicao, preco_min, preco_max, destaque,
    apenas_com_stock, ordenar = 'recentes', pagina = 1, limite = 12, incluirInactivos = false,
  } = filtros;

  let consulta = db().from('products').select(CAMPOS, { count: 'exact' });

  if (!incluirInactivos) consulta = consulta.eq('is_active', true);
  if (q) consulta = consulta.or(`name.ilike.%${q}%,short_description.ilike.%${q}%,sku.ilike.%${q}%`);
  if (condicao) consulta = consulta.eq('condition', condicao);
  if (destaque !== undefined) consulta = consulta.eq('is_featured', destaque);
  if (preco_min !== undefined) consulta = consulta.gte('price', preco_min);
  if (preco_max !== undefined) consulta = consulta.lte('price', preco_max);
  if (apenas_com_stock) consulta = consulta.gt('stock_quantity', 0);

  if (categoria) {
    const cat = await db()
      .from('categories')
      .select('id')
      .or(`slug.eq.${categoria},id.eq.${/^[0-9a-f]{8}-/i.test(categoria) ? categoria : '00000000-0000-0000-0000-000000000000'}`)
      .maybeSingle();
    if (!cat.data) return { produtos: [], total: 0 };
    consulta = consulta.eq('category_id', cat.data.id);
  }

  if (marca) {
    const m = await db().from('brands').select('id').eq('slug', marca).maybeSingle();
    if (!m.data) return { produtos: [], total: 0 };
    consulta = consulta.eq('brand_id', m.data.id);
  }

  const ord = ORDENACOES[ordenar] || ORDENACOES.recentes;
  consulta = consulta.order(ord.coluna, { ascending: ord.ascendente });

  const de = (pagina - 1) * limite;
  consulta = consulta.range(de, de + limite - 1);

  const { data, error, count } = await consulta;
  if (error) throw error;

  return { produtos: (data || []).map(normaliza), total: count || 0 };
}

async function obter(slugOuId, { incluirInactivos = false } = {}) {
  const coluna = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slugOuId) ? 'id' : 'slug';
  let consulta = db().from('products').select(CAMPOS).eq(coluna, slugOuId);
  if (!incluirInactivos) consulta = consulta.eq('is_active', true);

  const { data, error } = await consulta.maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Produto não encontrado.');
  return normaliza(data);
}

async function relacionados(produto, limite = 4) {
  if (!produto.category_id) return [];
  const { data, error } = await db()
    .from('products')
    .select(CAMPOS)
    .eq('category_id', produto.category_id)
    .eq('is_active', true)
    .neq('id', produto.id)
    .order('sales_count', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data || []).map(normaliza);
}

async function registarVisita(id) {
  await db().rpc('increment_product_views', { p_product_id: id });
}

async function criar(dados) {
  const { imagens = [], ...produto } = dados;
  const { data, error } = await db().from('products').insert(produto).select('id').single();
  if (error) throw error;

  if (imagens.length) await guardarImagens(data.id, imagens);
  if (produto.stock_quantity > 0) {
    await db().from('stock_movements').insert({
      product_id: data.id, type: 'entrada', quantity: produto.stock_quantity,
      stock_before: 0, stock_after: produto.stock_quantity, reason: 'Stock inicial',
    });
  }
  return obter(data.id, { incluirInactivos: true });
}

async function actualizar(id, dados) {
  const { imagens, ...produto } = dados;
  if (Object.keys(produto).length) {
    const { error } = await db().from('products').update(produto).eq('id', id);
    if (error) throw error;
  }
  if (Array.isArray(imagens)) {
    await db().from('product_images').delete().eq('product_id', id);
    if (imagens.length) await guardarImagens(id, imagens);
  }
  return obter(id, { incluirInactivos: true });
}

async function guardarImagens(produtoId, imagens) {
  const linhas = imagens.map((img, i) => ({
    product_id: produtoId,
    url: typeof img === 'string' ? img : img.url,
    alt: typeof img === 'string' ? null : img.alt || null,
    position: i,
    is_primary: i === 0,
  }));
  const { error } = await db().from('product_images').insert(linhas);
  if (error) throw error;
}

async function apagar(id) {
  const { error } = await db().from('products').delete().eq('id', id);
  if (error) throw error;
  return { id };
}

async function listarAvaliacoes(produtoId) {
  const { data, error } = await db()
    .from('reviews')
    .select('id, rating, title, comment, created_at, is_approved, autor:profiles ( full_name )')
    .eq('product_id', produtoId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function criarAvaliacao(produtoId, utilizadorId, dados) {
  const { data, error } = await db()
    .from('reviews')
    .upsert({ product_id: produtoId, user_id: utilizadorId, ...dados }, { onConflict: 'product_id,user_id' })
    .select('id, rating, title, comment, is_approved, created_at')
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  listar, obter, relacionados, registarVisita, criar, actualizar, apagar,
  listarAvaliacoes, criarAvaliacao, normaliza, CAMPOS,
};
