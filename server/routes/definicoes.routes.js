'use strict';
const router = require('express').Router();
const c = require('../controllers/definicoes.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirSessao);

router.get('/perfil', c.perfil);
router.put('/preferencias', validar({ body: e.preferencias }), c.guardarPreferencias);

router.get('/pagamentos', c.listarMetodos);
router.post('/pagamentos', validar({ body: e.metodoPagamento }), c.criarMetodo);
router.delete('/pagamentos/:id', validar({ params: e.paramsId }), c.apagarMetodo);

router.post('/eliminar-conta', validar({ body: e.eliminarConta }), c.pedirEliminacao);

module.exports = router;
