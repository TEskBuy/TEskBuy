'use strict';
const { db } = require('../config/supabase');

const NAO_CONTAM = ['cancelada', 'reembolsada'];

async function painel() {
  const [encomendas, produtos, utilizadores, movimentos] = await Promise.all([
    db().from('orders').select('id, total, status, created_at, customer_name, order_number'),
    db().from('products').select('id, name, stock_quantity, low_stock_threshold, sales_count, is_active, price'),
    db().from('profiles').select('id, created_at, role'),
    db().from('order_items').select('product_name, quantity, subtotal'),
  ]);

  const todasEncomendas = encomendas.data || [];
  const validas = todasEncomendas.filter((e) => !NAO_CONTAM.includes(e.status));
  const receita = validas.reduce((t, e) => t + Number(e.total || 0), 0);

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const doMes = validas.filter((e) => e.created_at >= inicioMes);

  const porEstado = todasEncomendas.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  const listaProdutos = produtos.data || [];
  const maisVendidos = Object.values(
    (movimentos.data || []).reduce((acc, i) => {
      const chave = i.product_name;
      acc[chave] = acc[chave] || { nome: chave, unidades: 0, receita: 0 };
      acc[chave].unidades += i.quantity;
      acc[chave].receita += Number(i.subtotal || 0);
      return acc;
    }, {})
  )
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 5);

  // receita dos últimos 7 dias
  const serie = [];
  for (let i = 6; i >= 0; i -= 1) {
    const dia = new Date(agora);
    dia.setDate(agora.getDate() - i);
    const chave = dia.toISOString().slice(0, 10);
    const total = validas
      .filter((e) => String(e.created_at).slice(0, 10) === chave)
      .reduce((t, e) => t + Number(e.total || 0), 0);
    serie.push({ dia: chave, total });
  }

  return {
    receita_total: receita,
    receita_mes: doMes.reduce((t, e) => t + Number(e.total || 0), 0),
    encomendas_total: todasEncomendas.length,
    encomendas_mes: doMes.length,
    encomendas_pendentes: porEstado.pendente || 0,
    ticket_medio: validas.length ? Math.round(receita / validas.length) : 0,
    produtos_total: listaProdutos.length,
    produtos_activos: listaProdutos.filter((p) => p.is_active).length,
    produtos_sem_stock: listaProdutos.filter((p) => p.stock_quantity === 0).length,
    produtos_stock_baixo: listaProdutos.filter(
      (p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
    ).length,
    valor_inventario: listaProdutos.reduce((t, p) => t + Number(p.price) * p.stock_quantity, 0),
    clientes_total: (utilizadores.data || []).filter((u) => u.role === 'cliente').length,
    por_estado: porEstado,
    mais_vendidos: maisVendidos,
    receita_7_dias: serie,
    ultimas_encomendas: todasEncomendas
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 8)
      .map((e) => ({
        id: e.id, numero: e.order_number, cliente: e.customer_name,
        total: Number(e.total), estado: e.status, criado_em: e.created_at,
      })),
    // Contadores do marketplace: candidaturas, moderação, denúncias e afins.
    // Vêm todos de uma só função na base de dados, para não fazer quinze
    // consultas só para desenhar um painel.
    marketplace: await marketplace(),
  };
}

async function marketplace() {
  try {
    const { data, error } = await db().rpc('painel_marketplace');
    if (error) throw error;
    return data || {};
  } catch (e) {
    // O painel antigo continua a funcionar mesmo que isto falhe.
    return {};
  }
}

module.exports = { painel };
