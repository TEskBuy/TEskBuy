'use strict';
const router = require('express').Router();
const c = require('../controllers/favoritos.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirSessao);

router.get('/', c.listar);
router.post('/:produtoId', validar({ params: e.paramsProdutoId }), c.alternar);
router.delete('/:produtoId', validar({ params: e.paramsProdutoId }), c.remover);

module.exports = router;
