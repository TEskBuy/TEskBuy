'use strict';
const comerciante = require('../services/comerciante.service');
const { capturar } = require('../utils/async');
const { ok, criado, paginado } = require('../utils/resposta');
const { erros } = require('../utils/erros');

/**
 * Carrega a empresa aprovada de quem faz o pedido e deixa-a em req.empresa.
 * Sem empresa aprovada, não há área de comerciante — é a regra 4 dos requisitos.
 */
const exigirEmpresa = capturar(async (req, _res, next) => {
  const empresa = await comerciante.empresaDe(req.utilizador.id);
  if (!empresa) {
    throw erros.semPermissao(
      'Esta área é para parceiros aprovados. Candidate-se em /parceiro.'
    );
  }
  req.empresa = empresa;
  return next();
});

const minhaEmpresa = capturar(async (req, res) => ok(res, req.empresa));

const resumo = capturar(async (req, res) => ok(res, await comerciante.resumo(req.empresa)));

const listarProdutos = capturar(async (req, res) => {
  const { pagina, limite, q } = req.query;
  const { dados, total } = await comerciante.listarProdutos(req.empresa, {
    q, estado: req.query.estado, pagina, limite,
  });
  return paginado(res, dados, { pagina, limite, total });
});

const criarProduto = capturar(async (req, res) => {
  const r = await comerciante.criarProduto(req.empresa, req.body);
  return criado(res, r, {
    mensagem: 'Produto criado. Fica à espera de aprovação antes de aparecer na loja.',
  });
});

const actualizarProduto = capturar(async (req, res) => {
  const r = await comerciante.actualizarProduto(req.empresa, req.params.id, req.body);
  return ok(res, r, { mensagem: 'Produto actualizado.' });
});

const alternarProduto = capturar(async (req, res) => {
  const activo = req.body?.activo !== false;
  const r = await comerciante.alternarProduto(req.empresa, req.params.id, activo);
  return ok(res, r, { mensagem: activo ? 'Produto activado.' : 'Produto desactivado.' });
});

const listarEncomendas = capturar(async (req, res) => {
  const { pagina, limite } = req.query;
  const { dados, total } = await comerciante.listarEncomendas(req.empresa, {
    estado: req.query.estado, pagina, limite,
  });
  return paginado(res, dados, { pagina, limite, total });
});

const listarAvaliacoes = capturar(async (req, res) =>
  ok(res, await comerciante.listarAvaliacoes(req.empresa))
);

const responderAvaliacao = capturar(async (req, res) => {
  const r = await comerciante.responderAvaliacao(req.empresa, req.params.id, req.body.resposta);
  return ok(res, r, { mensagem: 'Resposta publicada.' });
});

const actualizarEmpresa = capturar(async (req, res) => {
  const r = await comerciante.actualizarEmpresa(req.empresa, req.body);
  return ok(res, r, { mensagem: 'Dados da empresa actualizados.' });
});

module.exports = {
  exigirEmpresa, minhaEmpresa, resumo,
  listarProdutos, criarProduto, actualizarProduto, alternarProduto,
  listarEncomendas, listarAvaliacoes, responderAvaliacao, actualizarEmpresa,
};
