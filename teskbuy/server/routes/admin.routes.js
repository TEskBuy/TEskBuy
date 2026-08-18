'use strict';
const router = require('express').Router();
const c = require('../controllers/admin.controller');
const { validar } = require('../middleware/validar');
const { exigirEquipa, exigirAdmin } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirEquipa);

router.get('/painel', c.painel);

router.get('/encomendas', validar({ query: e.paginacao }), c.listarEncomendas);
router.patch('/encomendas/:id/estado', validar({ params: e.paramsId, body: e.estadoEncomenda }), c.mudarEstadoEncomenda);

router.get('/stock/baixo', c.stockBaixo);
router.get('/stock/movimentos', c.historicoStock);
router.post('/stock/movimentos', validar({ body: e.movimentoStock }), c.movimentarStock);

router.get('/cupoes', c.listarCupoes);
router.post('/cupoes', validar({ body: e.cupao }), c.criarCupao);
router.delete('/cupoes/:id', validar({ params: e.paramsId }), c.apagarCupao);

router.get('/utilizadores', exigirAdmin, validar({ query: e.paginacao }), c.listarUtilizadores);
router.patch('/utilizadores/:id/papel', exigirAdmin, validar({ params: e.paramsId, body: e.papelUtilizador }), c.mudarPapel);

router.put('/definicoes/:chave', exigirAdmin, c.guardarDefinicao);

module.exports = router;
