'use strict';
/**
 * Área do Comerciante — tudo o que um parceiro aprovado pode fazer.
 *
 * Todas as leituras e escritas passam pelo cliente com a sessão do próprio,
 * por isso é o Row Level Security da base de dados que garante que ninguém
 * alcança produtos ou encomendas de outra empresa. O código aqui filtra
 * também por empresa, mas isso é conveniência, não é a barreira.
 */
const { db } = require('../config/supabase');
const { erros } = require('../utils/erros');

const CAMPOS_PRODUTO = `
  id, sku, name, slug, short_description, description, price, compare_at_price,
  currency, condition, stock_quantity, low_stock_threshold, warranty_months,
  is_active, moderation_status, moderation_note, rating, rating_count, sales_count,
  created_at, category_id, brand_id,
  categoria:categories ( id, name, slug ),
  imagens:product_images ( id, url, alt, position, is_primary )
`;

/** A empresa aprovada de quem está a fazer o pedido. */
async function empresaDe(utilizadorId) {
  const { data, error } = await db()
    .from('companies')
    .select('id, name, slug, legal_name, tax_id, email, phone, province, municipality, address, logo_url, cover_url, description, status, commission_rate, rating, rating_count, created_at')
    .eq('owner_id', utilizadorId)
    .eq('status', 'aprovada')
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function normalizaProduto(p) {
  const imagens = (p.imagens || []).sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position
  );
  return { ...p, imagens, imagem: imagens[0]?.url || null };
}

/* ── resumo ────────────────────────────────────────────────── */

async function resumo(empresa) {
  const cliente = db();

  const [produtos, porAprovar, semStock, itens, avaliacoes] = await Promise.all([
    cliente.from('products').select('id', { count: 'exact', head: true }).eq('company_id', empresa.id),
    cliente.from('products').select('id', { count: 'exact', head: true })
      .eq('company_id', empresa.id).eq('moderation_status', 'pendente'),
    cliente.from('products').select('id', { count: 'exact', head: true })
      .eq('company_id', empresa.id).eq('stock_quantity', 0),
    cliente.from('order_items').select('subtotal, quantity').eq('company_id', empresa.id),
    cliente.from('seller_reviews').select('id', { count: 'exact', head: true }).eq('company_id', empresa.id),
  ]);

  const linhas = itens.data || [];
  const vendasTotal = linhas.reduce((soma, l) => soma + Number(l.subtotal || 0), 0);
  const unidades = linhas.reduce((soma, l) => soma + Number(l.quantity || 0), 0);
  const comissao = Math.round((vendasTotal * Number(empresa.commission_rate || 0)) / 100);

  return {
    produtos: produtos.count || 0,
    produtos_por_aprovar: porAprovar.count || 0,
    produtos_sem_stock: semStock.count || 0,
    unidades_vendidas: unidades,
    vendas_total: vendasTotal,
    comissao_plataforma: comissao,
    a_receber: vendasTotal - comissao,
    taxa_comissao: Number(empresa.commission_rate || 0),
    avaliacoes: avaliacoes.count || 0,
    classificacao: Number(empresa.rating || 0),
  };
}

/* ── produtos ──────────────────────────────────────────────── */

async function listarProdutos(empresa, { q, estado, pagina = 1, limite = 20 }) {
  let consulta = db()
    .from('products')
    .select(CAMPOS_PRODUTO, { count: 'exact' })
    .eq('company_id', empresa.id);

  if (q) consulta = consulta.ilike('name', `%${q}%`);
  if (estado) consulta = consulta.eq('moderation_status', estado);

  const de = (pagina - 1) * limite;
  const { data, error, count } = await consulta
    .order('created_at', { ascending: false })
    .range(de, de + limite - 1);
  if (error) throw error;

  return { dados: (data || []).map(normalizaProduto), total: count || 0 };
}

function baseProduto(empresa, corpo) {
  return {
    company_id: empresa.id,
    sku: corpo.sku,
    name: corpo.name,
    slug: corpo.slug,
    short_description: corpo.short_description ?? null,
    description: corpo.description ?? null,
    category_id: corpo.category_id ?? null,
    brand_id: corpo.brand_id ?? null,
    condition: corpo.condition || 'novo',
    price: corpo.price,
    compare_at_price: corpo.compare_at_price ?? null,
    stock_quantity: corpo.stock_quantity ?? 0,
    low_stock_threshold: corpo.low_stock_threshold ?? 3,
    warranty_months: corpo.warranty_months ?? 0,
    is_active: corpo.is_active !== false,
  };
}

async function guardarImagens(produtoId, imagens) {
  if (!Array.isArray(imagens)) return;
  const cliente = db();
  await cliente.from('product_images').delete().eq('product_id', produtoId);
  if (!imagens.length) return;

  const linhas = imagens.map((img, n) => {
    const url = typeof img === 'string' ? img : img.url;
    return {
      product_id: produtoId,
      url,
      alt: typeof img === 'string' ? null : img.alt || null,
      position: n,
      is_primary: n === 0,
    };
  });
  const { error } = await cliente.from('product_images').insert(linhas);
  if (error) throw error;
}

async function criarProduto(empresa, corpo) {
  const { imagens, ...dados } = corpo;

  const { data, error } = await db()
    .from('products')
    .insert(baseProduto(empresa, dados))
    .select('id')
    .single();
  if (error) {
    if (String(error.message || '').includes('duplicate key')) {
      throw erros.conflito('Já existe um produto com esse SKU ou endereço.');
    }
    throw error;
  }

  await guardarImagens(data.id, imagens);
  return { id: data.id, moderation_status: 'pendente' };
}

async function actualizarProduto(empresa, produtoId, corpo) {
  const { imagens, ...dados } = corpo;

  const alteracoes = {};
  Object.keys(baseProduto(empresa, dados)).forEach((k) => {
    if (k !== 'company_id' && dados[k] !== undefined) alteracoes[k] = baseProduto(empresa, dados)[k];
  });
  alteracoes.updated_at = new Date().toISOString();

  const { data, error } = await db()
    .from('products')
    .update(alteracoes)
    .eq('id', produtoId)
    .eq('company_id', empresa.id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Produto não encontrado nesta empresa.');

  if (imagens !== undefined) await guardarImagens(produtoId, imagens);
  return { id: produtoId };
}

/** Não se apaga: desactiva-se, para o histórico das encomendas ficar intacto. */
async function alternarProduto(empresa, produtoId, activo) {
  const { data, error } = await db()
    .from('products')
    .update({ is_active: activo, updated_at: new Date().toISOString() })
    .eq('id', produtoId)
    .eq('company_id', empresa.id)
    .select('id, is_active')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Produto não encontrado nesta empresa.');
  return { id: data.id, activo: data.is_active };
}

/* ── encomendas ────────────────────────────────────────────── */

async function listarEncomendas(empresa, { estado, pagina = 1, limite = 20 }) {
  let consulta = db()
    .from('order_items')
    .select(
      `id, product_name, product_sku, product_image, unit_price, quantity, subtotal,
       encomenda:orders!order_items_order_id_fkey (
         id, order_number, status, payment_status, payment_method,
         customer_name, customer_phone, ship_province, ship_municipality, placed_at
       )`,
      { count: 'exact' }
    )
    .eq('company_id', empresa.id);

  const de = (pagina - 1) * limite;
  const { data, error, count } = await consulta.range(de, de + limite - 1);
  if (error) throw error;

  let linhas = (data || []).map((l) => ({
    id: l.id,
    produto: l.product_name,
    sku: l.product_sku,
    imagem: l.product_image,
    preco: Number(l.unit_price),
    quantidade: l.quantity,
    subtotal: Number(l.subtotal),
    comissao: Math.round((Number(l.subtotal) * Number(empresa.commission_rate || 0)) / 100),
    encomenda: l.encomenda || null,
  }));

  // O filtro por estado é feito aqui porque vive na encomenda, não na linha.
  if (estado) linhas = linhas.filter((l) => l.encomenda && l.encomenda.status === estado);

  linhas.sort((a, b) =>
    String(b.encomenda?.placed_at || '').localeCompare(String(a.encomenda?.placed_at || ''))
  );

  return { dados: linhas, total: estado ? linhas.length : count || 0 };
}

/* ── avaliações ────────────────────────────────────────────── */

async function listarAvaliacoes(empresa) {
  const { data, error } = await db()
    .from('seller_reviews')
    .select(`id, rating, comment, reply, replied_at, created_at,
             cliente:profiles!seller_reviews_user_id_fkey ( full_name )`)
    .eq('company_id', empresa.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  return (data || []).map((a) => ({
    id: a.id,
    estrelas: a.rating,
    comentario: a.comment,
    resposta: a.reply,
    respondida_em: a.replied_at,
    criada_em: a.created_at,
    cliente: a.cliente?.full_name || 'Cliente',
  }));
}

async function responderAvaliacao(empresa, avaliacaoId, resposta) {
  const { data, error } = await db()
    .from('seller_reviews')
    .update({ reply: resposta, replied_at: new Date().toISOString() })
    .eq('id', avaliacaoId)
    .eq('company_id', empresa.id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw erros.naoEncontrado('Avaliação não encontrada.');
  return { id: avaliacaoId };
}

/* ── dados da empresa ──────────────────────────────────────── */

/** A comissão e o estado não estão aqui de propósito: só o administrador os muda. */
async function actualizarEmpresa(empresa, corpo) {
  const permitidos = [
    'name', 'legal_name', 'tax_id', 'email', 'phone',
    'province', 'municipality', 'address', 'logo_url', 'cover_url', 'description',
  ];
  const alteracoes = { updated_at: new Date().toISOString() };
  permitidos.forEach((k) => {
    if (corpo[k] !== undefined) alteracoes[k] = corpo[k];
  });

  const { error } = await db().from('companies').update(alteracoes).eq('id', empresa.id);
  if (error) throw error;
  return { actualizada: true };
}

module.exports = {
  empresaDe, resumo,
  listarProdutos, criarProduto, actualizarProduto, alternarProduto,
  listarEncomendas, listarAvaliacoes, responderAvaliacao, actualizarEmpresa,
};
