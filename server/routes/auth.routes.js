'use strict';
const router = require('express').Router();
const c = require('../controllers/auth.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const { limiteAutenticacao } = require('../middleware/limites');
const e = require('../utils/esquemas');

router.post('/registar', limiteAutenticacao, validar({ body: e.registo }), c.registar);
router.post('/entrar', limiteAutenticacao, validar({ body: e.login }), c.entrar);
router.post('/confirmar', limiteAutenticacao, validar({ body: e.confirmacaoCodigo }), c.confirmar);
router.post('/reenviar-codigo', limiteAutenticacao, validar({ body: e.reenvioCodigo }), c.reenviar);
router.post('/sair', c.sair);
router.post('/renovar', c.renovar);
router.get('/eu', exigirSessao, c.eu);
router.post('/recuperar', limiteAutenticacao, validar({ body: e.recuperacao }), c.recuperar);
router.post('/nova-palavra-passe', limiteAutenticacao, validar({ body: e.novaPalavraPasse }), c.definirPalavraPasse);
router.post('/alterar-palavra-passe', exigirSessao, validar({ body: e.alteracaoPalavraPasse }), c.alterarPalavraPasse);

module.exports = router;
