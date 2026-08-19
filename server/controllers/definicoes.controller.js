'use strict';
const definicoes = require('../services/definicoes.service');
const conversas = require('../services/conversas.service');
const comerciante = require('../services/comerciante.service');
const { capturar } = require('../utils/async');
const { ok, criado } = require('../utils/resposta');
const { extrairToken } = require('../middleware/auth');

/* ── definições ────────────────────────────────────────────── */

const perfil = capturar(async (req, res) =>
  ok(res, await definicoes.perfilCompleto(req.utilizador.id))
);

const guardarPreferencias = capturar(async (req, res) => {
  const r = await definicoes.guardarPreferencias(req.utilizador.id, req.body);
  return ok(res, r, { mensagem: 'Preferências guardadas.' });
});

const listarMetodos = capturar(async (req, res) => {
  const empresa = req.query.empresa === 'true'
    ? await comerciante.empresaDe(req.utilizador.id)
    : null;
  return ok(res, await definicoes.listarMetodos(req.utilizador.id, empresa && empresa.id));
});

const criarMetodo = capturar(async (req, res) => {
  const empresa = req.body.para === 'empresa'
    ? await comerciante.empresaDe(req.utilizador.id)
    : null;
  const r = await definicoes.criarMetodo(req.utilizador.id, req.body, empresa && empresa.id);
  return criado(res, r, { mensagem: 'Método guardado.' });
});

const apagarMetodo = capturar(async (req, res) => {
  const r = await definicoes.apagarMetodo(req.utilizador.id, req.params.id);
  return ok(res, r, { mensagem: 'Método removido.' });
});

const pedirEliminacao = capturar(async (req, res) => {
  const r = await definicoes.pedirEliminacao(extrairToken(req), req.utilizador.id, req.body.motivo);
  return ok(res, r, {
    mensagem: 'Pedido registado. A equipa TeskBuy vai tratar e avisa-o do resultado.',
  });
});

/* ── conversas ─────────────────────────────────────────────── */

const minhasConversas = capturar(async (req, res) =>
  ok(res, await conversas.minhas(req.utilizador.id))
);

const iniciarConversa = capturar(async (req, res) => {
  const r = await conversas.iniciar(req.utilizador.id, req.body);
  return criado(res, r, { mensagem: 'Mensagem enviada à empresa.' });
});

const enviarMensagem = capturar(async (req, res) => {
  const r = await conversas.enviar(req.utilizador.id, req.params.id, req.body.mensagem);
  return ok(res, r, { mensagem: 'Mensagem enviada.' });
});

const marcarLidas = capturar(async (req, res) =>
  ok(res, await conversas.marcarLidas(req.utilizador.id, req.params.id))
);

/* ── conversas do lado da empresa ──────────────────────────── */

const conversasDaEmpresa = capturar(async (req, res) =>
  ok(res, await conversas.daEmpresa(req.empresa.id, req.utilizador.id))
);

module.exports = {
  perfil, guardarPreferencias, listarMetodos, criarMetodo, apagarMetodo, pedirEliminacao,
  minhasConversas, iniciarConversa, enviarMensagem, marcarLidas, conversasDaEmpresa,
};
