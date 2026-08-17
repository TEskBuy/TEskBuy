'use strict';
const { db } = require('../config/supabase');
const { erros } = require('../utils/erros');

const CAMPOS_CATEGORIA = 'id, name, slug, description, icon, image_url, parent_id, position, is_active, created_at';

async function listarCategorias({ incluirInactivas = false } = {}) {
  let q = db().from('categories').select(CAMPOS_CATEGORIA).order('position', { ascending: true });
  if (!incluirInactivas) q = q.eq('is_active', true);

  const { data, error } = await q;
  if (error) throw error;

  // contagem de produtos activos por categoria
  const { data: produtos } = await db().from('products').select('category_id').eq('is_active', true);
  const contagem = (produtos || []).reduce((acc, p) => {
    if (p.category_id) acc[p.category_id] = (acc[p.category_id] || 0) + 1;
    return acc;
  }, {});

  return (data || []).map((c) => ({ ...c, total_produtos: contagem[c.id] || 0 }));
}

async function obterCategoria(slugOuId) {
  const coluna = /^[0-9a-f]{8}-/i.test(slugOuId) ? 'id' : 'slug';
  const { data, error } = await db().from('categories').select(CAMPOS_CATEGORIA).eq(coluna, slugOuId).maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Categoria não encontrada.');
  return data;
}

async function criarCategoria(dados) {
  const { data, error } = await db().from('categories').insert(dados).select(CAMPOS_CATEGORIA).single();
  if (error) throw error;
  return data;
}

async function actualizarCategoria(id, dados) {
  const { data, error } = await db().from('categories').update(dados).eq('id', id).select(CAMPOS_CATEGORIA).maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Categoria não encontrada.');
  return data;
}

async function apagarCategoria(id) {
  const { error } = await db().from('categories').delete().eq('id', id);
  if (error) throw error;
  return { id };
}

async function listarMarcas() {
  const { data, error } = await db().from('brands').select('id, name, slug, logo_url').order('name');
  if (error) throw error;
  return data || [];
}

async function criarMarca(dados) {
  const { data, error } = await db().from('brands').insert(dados).select('id, name, slug, logo_url').single();
  if (error) throw error;
  return data;
}

async function obterDefinicoes() {
  const { data, error } = await db().from('settings').select('key, value');
  if (error) throw error;
  return (data || []).reduce((acc, linha) => ({ ...acc, [linha.key]: linha.value }), {});
}

async function guardarDefinicao(chave, valor) {
  const { data, error } = await db()
    .from('settings')
    .upsert({ key: chave, value: valor, updated_at: new Date().toISOString() })
    .select('key, value')
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  listarCategorias, obterCategoria, criarCategoria, actualizarCategoria, apagarCategoria,
  listarMarcas, criarMarca, obterDefinicoes, guardarDefinicao,
};
