'use strict';
const router = require('express').Router();
const c = require('../controllers/admin.controller');
const { validar } = require('../middleware/validar');
const { exigirEquipa, exigirAdmin } = require('../middleware/auth');
const e = require('../utils/esquemas');

router.use(exigirEquipa);

router.get('/painel', c.painel);

router.get('/encomendas', validar({ query: e.paginacao }), c.listarEncomendas);
router.patch('/encomendas/:id/estado', validar({ params: e.paramsId, body: e.estadoEncomenda }), c.mudarEstadoEncomenda);

router.get('/stock/baixo', c.stockBaixo);
router.get('/stock/movimentos', c.historicoStock);
router.post('/stock/movimentos', validar({ body: e.movimentoStock }), c.movimentarStock);

router.get('/cupoes', c.listarCupoes);
router.post('/cupoes', validar({ body: e.cupao }), c.criarCupao);
router.delete('/cupoes/:id', validar({ params: e.paramsId }), c.apagarCupao);

router.get('/utilizadores', exigirAdmin, validar({ query: e.paginacao }), c.listarUtilizadores);
router.patch('/utilizadores/:id/papel', exigirAdmin, validar({ params: e.paramsId, body: e.papelUtilizador }), c.mudarPapel);

// Candidaturas a vendedor e a afiliado: a equipa vê, só o admin decide.
const p = require('../controllers/parceiros.controller');
router.get('/candidaturas', validar({ query: e.paginacao }), p.listar);
router.patch(
  '/candidaturas/:id',
  exigirAdmin,
  validar({ params: e.paramsId, body: e.decisaoCandidatura }),
  p.decidir
);

// Parcerias entre afiliados e empresas
const af = require('../controllers/afiliados.controller');
router.get('/parcerias', validar({ query: e.paginacao }), af.listarParcerias);
router.patch('/parcerias/:id', exigirAdmin, validar({ params: e.paramsId, body: e.decisaoParceriaAdmin }), af.decidirAdmin);

// Denúncias e tickets
const sp = require('../controllers/suporte.controller');
router.get('/denuncias', validar({ query: e.paginacao }), sp.listarDenuncias);
router.patch('/denuncias/:id', validar({ params: e.paramsId, body: e.tratarDenuncia }), sp.tratarDenuncia);
router.get('/tickets', validar({ query: e.paginacao }), sp.listarTickets);
router.post('/tickets/:id/mensagens', validar({ params: e.paramsId, body: e.mensagemTicket }), sp.responderEquipa);
router.patch('/tickets/:id', validar({ params: e.paramsId, body: e.estadoTicket }), sp.mudarEstadoTicket);

router.put('/definicoes/:chave', exigirAdmin, c.guardarDefinicao);

module.exports = router;
