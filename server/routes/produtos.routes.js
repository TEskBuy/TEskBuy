'use strict';
const router = require('express').Router();
const c = require('../controllers/produtos.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao, exigirEquipa } = require('../middleware/auth');
const { limiteEscrita } = require('../middleware/limites');
const e = require('../utils/esquemas');

router.get('/', validar({ query: e.listagemProdutos }), c.listar);
router.post('/', exigirEquipa, validar({ body: e.criarProduto }), c.criar);

router.get('/:slug', c.obter);
router.post('/:slug/avaliacoes', exigirSessao, limiteEscrita, validar({ body: e.avaliacao }), c.avaliar);

router.patch('/:id', exigirEquipa, validar({ params: e.paramsId, body: e.actualizarProduto }), c.actualizar);
router.delete('/:id', exigirEquipa, validar({ params: e.paramsId }), c.apagar);

module.exports = router;
