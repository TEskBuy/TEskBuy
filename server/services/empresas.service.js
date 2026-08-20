'use strict';
/**
 * Perfil público das empresas vendedoras.
 *
 * Só existe leitura, e só de empresas aprovadas — é a política da base de
 * dados que garante isso, não este ficheiro. Serve o cliente que quer saber
 * a quem está a comprar e o afiliado que anda à procura de com quem trabalhar.
 */
const { db } = require('../config/supabase');
const { erros } = require('../utils/erros');

const CAMPOS_LISTA =
  'id, name, slug, logo_url, cover_url, description, province, municipality, rating, rating_count, created_at';

const CAMPOS_PERFIL = CAMPOS_LISTA + ', email, phone, address';

const CAMPOS_PRODUTO = `
  id, sku, name, slug, short_description, condition, price, compare_at_price,
  currency, stock_quantity, rating, rating_count, sales_count, created_at,
  categoria:categories ( id, name, slug ),
  imagens:product_images ( id, url, alt, position, is_primary )
`;

function normalizaProduto(p) {
  const imagens = (p.imagens || []).sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position
  );
  return { ...p, imagens, imagem: imagens[0]?.url || null };
}

/** Lista as empresas aprovadas, com quantos produtos cada uma tem à venda. */
async function listar({ q, provincia, pagina = 1, limite = 24 } = {}) {
  const de = (pagina - 1) * limite;

  let consulta = db()
    .from('companies')
    .select(CAMPOS_LISTA, { count: 'exact' })
    .eq('status', 'aprovada');

  if (q) consulta = consulta.ilike('name', `%${q}%`);
  if (provincia) consulta = consulta.eq('province', provincia);

  const { data, error, count } = await consulta
    .order('rating', { ascending: false })
    .order('name', { ascending: true })
    .range(de, de + limite - 1);
  if (error) throw error;

  const empresas = data || [];
  if (!empresas.length) return { dados: [], total: count || 0 };

  // Quantos produtos visíveis tem cada empresa. Uma consulta só, não uma por empresa.
  const { data: produtos } = await db()
    .from('products')
    .select('company_id')
    .in('company_id', empresas.map((e) => e.id))
    .eq('is_active', true);

  const contagem = {};
  (produtos || []).forEach((p) => {
    contagem[p.company_id] = (contagem[p.company_id] || 0) + 1;
  });

  return {
    dados: empresas.map((e) => ({ ...e, produtos: contagem[e.id] || 0 })),
    total: count || 0,
  };
}

/** O perfil de uma empresa e tudo o que ela tem publicado. */
async function perfil(slug) {
  const { data: empresa, error } = await db()
    .from('companies')
    .select(CAMPOS_PERFIL)
    .eq('slug', slug)
    .eq('status', 'aprovada')
    .maybeSingle();
  if (error) throw error;
  if (!empresa) throw erros.naoEncontrado('Empresa não encontrada.');

  const { data: produtos, error: erroProdutos } = await db()
    .from('products')
    .select(CAMPOS_PRODUTO)
    .eq('company_id', empresa.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(60);
  if (erroProdutos) throw erroProdutos;

  const { data: avaliacoes } = await db()
    .from('seller_reviews')
    .select('id, rating, comment, created_at, autor:profiles!seller_reviews_user_id_fkey ( full_name, avatar_url )')
    .eq('company_id', empresa.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    empresa,
    produtos: (produtos || []).map(normalizaProduto),
    avaliacoes: (avaliacoes || []).map((a) => ({
      id: a.id,
      nota: a.rating,
      texto: a.comment,
      criada_em: a.created_at,
      autor: a.autor?.full_name || 'Cliente TEskBuy',
      foto: a.autor?.avatar_url || null,
    })),
  };
}

module.exports = { listar, perfil };
