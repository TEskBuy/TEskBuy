'use strict';
const router = require('express').Router();
const c = require('../controllers/utilizadores.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirSessao);

router.get('/eu', c.perfil);
router.patch('/eu', validar({ body: e.perfil }), c.actualizarPerfil);

router.get('/eu/moradas', c.listarMoradas);
router.post('/eu/moradas', validar({ body: e.morada }), c.criarMorada);
router.patch('/eu/moradas/:id', validar({ params: e.paramsId }), c.actualizarMorada);
router.delete('/eu/moradas/:id', validar({ params: e.paramsId }), c.apagarMorada);

module.exports = router;
