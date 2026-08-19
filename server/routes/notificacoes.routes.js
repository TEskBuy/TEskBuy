'use strict';
const router = require('express').Router();
const c = require('../controllers/notificacoes.controller');
const { exigirSessao } = require('../middleware/auth');

router.use(exigirSessao);

router.get('/', c.listar);
router.get('/por-ler', c.porLer);
router.post('/todas-lidas', c.marcarTodas);
router.post('/:id/lida', c.marcarLida);

module.exports = router;
