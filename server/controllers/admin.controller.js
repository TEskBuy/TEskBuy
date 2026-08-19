'use strict';
const { db } = require('../config/supabase');
const estatisticas = require('../services/estatisticas.service');
const encomendas = require('../services/encomendas.service');
const utilizadores = require('../services/utilizadores.service');
const stock = require('../services/stock.service');
const catalogo = require('../services/catalogo.service');
const { capturar } = require('../utils/async');
const { ok, criado, paginado } = require('../utils/resposta');

const painel = capturar(async (_req, res) => ok(res, await estatisticas.painel()));

const listarEncomendas = capturar(async (req, res) => {
  const { pagina, limite, estado, q } = req.consulta;
  const { encomendas: lista, total } = await encomendas.listarTodas({ pagina, limite, estado, q });
  return paginado(res, lista, { pagina, limite, total });
});

const mudarEstadoEncomenda = capturar(async (req, res) =>
  ok(res, await encomendas.actualizarEstado(req.params.id, req.body.estado, {
    nota: req.body.nota, utilizadorId: req.utilizador.id,
  }), { mensagem: 'Estado da encomenda actualizado.' })
);

const listarUtilizadores = capturar(async (req, res) => {
  const { pagina, limite, q, papel } = req.consulta;
  const { utilizadores: lista, total } = await utilizadores.listarTodos({ pagina, limite, q, papel });
  return paginado(res, lista, { pagina, limite, total });
});

const mudarPapel = capturar(async (req, res) =>
  ok(res, await utilizadores.definirPapel(req.params.id, req.body.papel), { mensagem: 'Nível de acesso actualizado.' })
);

const movimentarStock = capturar(async (req, res) => {
  const produto = await stock.movimentar({
    produtoId: req.body.produto_id,
    tipo: req.body.tipo,
    quantidade: req.body.quantidade,
    motivo: req.body.motivo,
  });
  return ok(res, produto, { mensagem: 'Stock actualizado.' });
});

const historicoStock = capturar(async (req, res) =>
  ok(res, await stock.historico({ produtoId: req.query.produto_id, limite: Number(req.query.limite) || 50 }))
);

const stockBaixo = capturar(async (_req, res) => ok(res, await stock.stockBaixo()));

const listarCupoes = capturar(async (_req, res) => {
  const { data, error } = await db().from('coupons').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return ok(res, data || []);
});

const criarCupao = capturar(async (req, res) => {
  const { data, error } = await db().from('coupons').insert(req.body).select('*').single();
  if (error) throw error;
  return criado(res, data, { mensagem: 'Cupão criado.' });
});

const apagarCupao = capturar(async (req, res) => {
  const { error } = await db().from('coupons').delete().eq('id', req.params.id);
  if (error) throw error;
  return ok(res, { id: req.params.id }, { mensagem: 'Cupão removido.' });
});

const guardarDefinicao = capturar(async (req, res) =>
  ok(res, await catalogo.guardarDefinicao(req.params.chave, req.body), { mensagem: 'Definições guardadas.' })
);

module.exports = {
  painel, listarEncomendas, mudarEstadoEncomenda, listarUtilizadores, mudarPapel,
  movimentarStock, historicoStock, stockBaixo,
  listarCupoes, criarCupao, apagarCupao, guardarDefinicao,
};
