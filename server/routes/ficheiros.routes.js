'use strict';
const router = require('express').Router();
const c = require('../controllers/ficheiros.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirSessao);

router.post('/autorizacao', validar({ body: e.autorizacaoFicheiro }), c.autorizar);
router.get('/documento', c.verDocumento);

module.exports = router;
