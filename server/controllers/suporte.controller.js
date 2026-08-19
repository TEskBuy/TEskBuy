'use strict';
const suporte = require('../services/suporte.service');
const { capturar } = require('../utils/async');
const { ok, criado, paginado } = require('../utils/resposta');
const { extrairToken } = require('../middleware/auth');

/* ── cliente ───────────────────────────────────────────────── */

const denunciar = capturar(async (req, res) => {
  const r = await suporte.criarDenuncia(req.utilizador.id, req.body);
  return criado(res, r, {
    mensagem: 'Denúncia registada. A equipa TeskBuy vai analisar.',
  });
});

const minhasDenuncias = capturar(async (req, res) =>
  ok(res, await suporte.minhasDenuncias(req.utilizador.id))
);

const avaliarVendedor = capturar(async (req, res) => {
  const r = await suporte.avaliarVendedor(req.utilizador.id, req.body);
  return criado(res, r, { mensagem: 'Obrigado pela avaliação.' });
});

/* ── empresa ───────────────────────────────────────────────── */

const meusTickets = capturar(async (req, res) =>
  ok(res, await suporte.ticketsDaEmpresa(req.empresa.id))
);

const abrirTicket = capturar(async (req, res) => {
  const r = await suporte.criarTicket(req.empresa.id, req.utilizador.id, req.body);
  return criado(res, r, { mensagem: 'Solicitação aberta com o número ' + r.numero + '.' });
});

const responderEmpresa = capturar(async (req, res) => {
  const r = await suporte.responderTicket(req.params.id, req.utilizador.id, req.body.mensagem, false);
  return ok(res, r, { mensagem: 'Mensagem enviada.' });
});

/* ── equipa ────────────────────────────────────────────────── */

const listarDenuncias = capturar(async (req, res) => {
  const { pagina, limite } = req.query;
  const { dados, total } = await suporte.listarDenuncias({ estado: req.query.estado, pagina, limite });
  return paginado(res, dados, { pagina, limite, total });
});

const tratarDenuncia = capturar(async (req, res) => {
  const r = await suporte.tratarDenuncia(extrairToken(req), req.params.id, req.body, req.utilizador.id);
  return ok(res, r, { mensagem: 'Denúncia actualizada.' });
});

const listarTickets = capturar(async (req, res) => {
  const { pagina, limite } = req.query;
  const { dados, total } = await suporte.listarTickets({ estado: req.query.estado, pagina, limite });
  return paginado(res, dados, { pagina, limite, total });
});

const responderEquipa = capturar(async (req, res) => {
  const r = await suporte.responderTicket(req.params.id, req.utilizador.id, req.body.mensagem, true);
  return ok(res, r, { mensagem: 'Resposta enviada à empresa.' });
});

const mudarEstadoTicket = capturar(async (req, res) => {
  const r = await suporte.mudarEstadoTicket(req.params.id, req.body.estado);
  return ok(res, r, { mensagem: 'Estado actualizado.' });
});

module.exports = {
  denunciar, minhasDenuncias, avaliarVendedor,
  meusTickets, abrirTicket, responderEmpresa,
  listarDenuncias, tratarDenuncia, listarTickets, responderEquipa, mudarEstadoTicket,
};
