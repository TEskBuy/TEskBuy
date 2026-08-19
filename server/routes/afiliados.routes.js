'use strict';
const router = require('express').Router();
const c = require('../controllers/afiliados.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirSessao);

router.get('/eu', c.meuPerfil);
router.get('/empresas', c.empresas);
router.get('/parcerias', c.minhasParcerias);
router.post('/parcerias', validar({ body: e.pedidoParceria }), c.pedirParceria);
router.get('/comissoes', c.minhasComissoes);

module.exports = router;
