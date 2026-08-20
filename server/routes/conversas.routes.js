'use strict';
const router = require('express').Router();
const c = require('../controllers/definicoes.controller');
const { validar } = require('../middleware/validar');
const { exigirSessao } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirSessao);

router.get('/', c.minhasConversas);
router.get('/por-ler', c.mensagensPorLer);
router.post('/', validar({ body: e.novaConversa }), c.iniciarConversa);
router.post('/:id/mensagens', validar({ params: e.paramsId, body: e.mensagemTicket }), c.enviarMensagem);
router.post('/:id/lidas', validar({ params: e.paramsId }), c.marcarLidas);

module.exports = router;
