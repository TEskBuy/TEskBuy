'use strict';
const router = require('express').Router();
const c = require('../controllers/comerciante.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirSessao, c.exigirEmpresa);

router.get('/empresa', c.minhaEmpresa);
router.put('/empresa', validar({ body: e.dadosEmpresa }), c.actualizarEmpresa);

router.get('/resumo', c.resumo);

router.get('/produtos', validar({ query: e.paginacao }), c.listarProdutos);
router.post('/produtos', validar({ body: e.produtoParceiro }), c.criarProduto);
router.put('/produtos/:id', validar({ params: e.paramsId, body: e.produtoParceiroParcial }), c.actualizarProduto);
router.patch('/produtos/:id/estado', validar({ params: e.paramsId }), c.alternarProduto);

router.get('/encomendas', validar({ query: e.paginacao }), c.listarEncomendas);

const af = require('../controllers/afiliados.controller');
router.get('/afiliados', af.parceriasDaEmpresa);
router.patch('/afiliados/:id', validar({ params: e.paramsId, body: e.decisaoParceriaEmpresa }), af.decidirEmpresa);

router.get('/avaliacoes', c.listarAvaliacoes);
router.post('/avaliacoes/:id/resposta', validar({ params: e.paramsId, body: e.respostaAvaliacao }), c.responderAvaliacao);

module.exports = router;
