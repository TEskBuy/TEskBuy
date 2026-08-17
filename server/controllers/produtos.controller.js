'use strict';
const produtos = require('../services/produtos.service');
const { capturar } = require('../utils/async');
const { ok, criado, paginado } = require('../utils/resposta');

const ehEquipa = (req) => ['admin', 'gestor'].includes(req.utilizador?.papel);

const listar = capturar(async (req, res) => {
  const { pagina, limite } = req.consulta;
  const { produtos: lista, total } = await produtos.listar({
    ...req.consulta,
    incluirInactivos: ehEquipa(req) && req.consulta.incluir_inactivos !== 'false',
  });
  return paginado(res, lista, { pagina, limite, total });
});

const obter = capturar(async (req, res) => {
  const produto = await produtos.obter(req.params.slug, { incluirInactivos: ehEquipa(req) });
  const [semelhantes, avaliacoes] = await Promise.all([
    produtos.relacionados(produto),
    produtos.listarAvaliacoes(produto.id),
  ]);
  produtos.registarVisita(produto.id).catch(() => {});
  return ok(res, { produto, relacionados: semelhantes, avaliacoes });
});

const criar = capturar(async (req, res) => criado(res, await produtos.criar(req.body), { mensagem: 'Produto criado.' }));

const actualizar = capturar(async (req, res) =>
  ok(res, await produtos.actualizar(req.params.id, req.body), { mensagem: 'Produto actualizado.' })
);

const apagar = capturar(async (req, res) =>
  ok(res, await produtos.apagar(req.params.id), { mensagem: 'Produto removido.' })
);

const avaliar = capturar(async (req, res) => {
  const produto = await produtos.obter(req.params.slug);
  const avaliacao = await produtos.criarAvaliacao(produto.id, req.utilizador.id, req.body);
  return criado(res, avaliacao, {
    mensagem: 'Obrigado pela avaliação. Fica visível assim que for verificada pela equipa.',
  });
});

module.exports = { listar, obter, criar, actualizar, apagar, avaliar };
