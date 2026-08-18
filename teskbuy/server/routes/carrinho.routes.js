'use strict';
const router = require('express').Router();
const c = require('../controllers/carrinho.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirSessao);

router.get('/', c.ver);
router.post('/itens', validar({ body: e.adicionarAoCarrinho }), c.adicionar);
router.patch('/itens/:id', validar({ params: e.paramsId, body: e.actualizarItemCarrinho }), c.actualizar);
router.delete('/itens/:id', validar({ params: e.paramsId }), c.remover);
router.delete('/', c.limpar);
router.post('/sincronizar', validar({ body: e.sincronizarCarrinho }), c.sincronizar);

module.exports = router;
