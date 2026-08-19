'use strict';
const router = require('express').Router();
const c = require('../controllers/encomendas.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const { limiteEscrita } = require('../middleware/limites');
const e = require('../utils/esquemas');

router.use(exigirSessao);

router.get('/', validar({ query: e.paginacao }), c.minhas);
router.post('/', limiteEscrita, validar({ body: e.criarEncomenda }), c.criar);
router.get('/:id', validar({ params: e.paramsId }), c.obter);
router.post('/:id/cancelar', validar({ params: e.paramsId }), c.cancelar);

module.exports = router;
