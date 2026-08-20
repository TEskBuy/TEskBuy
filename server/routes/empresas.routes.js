'use strict';
const router = require('express').Router();
const c = require('../controllers/empresas.controller');

// Perfil público: aberto a toda a gente, com ou sem sessão.
router.get('/', c.listar);
router.get('/:slug', c.perfil);

module.exports = router;
