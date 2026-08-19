'use strict';
const router = require('express').Router();
const c = require('../controllers/parceiros.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirSessao);

router.get('/candidaturas', c.minhas);
router.post('/candidaturas/vendedor', validar({ body: e.candidaturaVendedor }), c.candidatarVendedor);
router.post('/candidaturas/afiliado', validar({ body: e.candidaturaAfiliado }), c.candidatarAfiliado);

module.exports = router;
