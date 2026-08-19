'use strict';
const router = require('express').Router();
const c = require('../controllers/suporte.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirSessao);

router.post('/denuncias', validar({ body: e.denuncia }), c.denunciar);
router.get('/denuncias', c.minhasDenuncias);
router.post('/avaliacoes-vendedor', validar({ body: e.avaliacaoVendedor }), c.avaliarVendedor);

module.exports = router;
