'use strict';
const router = require('express').Router();
const catalogo = require('../services/catalogo.service');
const { capturar } = require('../utils/async');
const { ok, criado } = require('../utils/resposta');
const { validar } = require('../middleware/validar');
const { exigirEquipa } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.get('/categorias', capturar(async (req, res) => {
  const equipa = ['admin', 'gestor'].includes(req.utilizador?.papel);
  return ok(res, await catalogo.listarCategorias({ incluirInactivas: equipa }));
}));

router.get('/categorias/:slug', capturar(async (req, res) => ok(res, await catalogo.obterCategoria(req.params.slug))));

router.post('/categorias', exigirEquipa, validar({ body: e.categoria }), capturar(async (req, res) =>
  criado(res, await catalogo.criarCategoria(req.body), { mensagem: 'Categoria criada.' })
));

router.patch('/categorias/:id', exigirEquipa, validar({ params: e.paramsId }), capturar(async (req, res) =>
  ok(res, await catalogo.actualizarCategoria(req.params.id, req.body), { mensagem: 'Categoria actualizada.' })
));

router.delete('/categorias/:id', exigirEquipa, validar({ params: e.paramsId }), capturar(async (req, res) =>
  ok(res, await catalogo.apagarCategoria(req.params.id), { mensagem: 'Categoria removida.' })
));

router.get('/marcas', capturar(async (_req, res) => ok(res, await catalogo.listarMarcas())));

router.post('/marcas', exigirEquipa, capturar(async (req, res) =>
  criado(res, await catalogo.criarMarca(req.body), { mensagem: 'Marca criada.' })
));

router.get('/definicoes', capturar(async (_req, res) => ok(res, await catalogo.obterDefinicoes())));

module.exports = router;
