'use strict';
const parceiros = require('../services/parceiros.service');
const { capturar } = require('../utils/async');
const { ok, criado, paginado } = require('../utils/resposta');
const { extrairToken } = require('../middleware/auth');

const minhas = capturar(async (req, res) => {
  return ok(res, await parceiros.minhas(req.utilizador.id));
});

const candidatarVendedor = capturar(async (req, res) => {
  const r = await parceiros.candidatar(req.utilizador.id, 'vendedor', req.body);
  return criado(res, r, {
    mensagem: 'Candidatura enviada. Vamos analisar e damos notícias em breve.',
  });
});

const candidatarAfiliado = capturar(async (req, res) => {
  const r = await parceiros.candidatar(req.utilizador.id, 'afiliado', req.body);
  return criado(res, r, {
    mensagem: 'Candidatura enviada. Vamos analisar e damos notícias em breve.',
  });
});

/* ── equipa ────────────────────────────────────────────────── */

const listar = capturar(async (req, res) => {
  const { pagina, limite, estado } = req.query;
  const { dados, total } = await parceiros.listar({
    estado,
    tipo: req.query.tipo,
    pagina,
    limite,
  });
  return paginado(res, dados, { pagina, limite, total });
});

const decidir = capturar(async (req, res) => {
  const r = await parceiros.decidir(
    extrairToken(req),
    req.params.id,
    req.body,
    req.utilizador.id
  );
  const TEXTOS = {
    aprovado: 'Candidatura aprovada.',
    rejeitado: 'Candidatura rejeitada.',
    info_pedida: 'Pedimos mais informação ao candidato.',
  };
  return ok(res, r, { mensagem: TEXTOS[r.estado] || 'Candidatura actualizada.' });
});

module.exports = { minhas, candidatarVendedor, candidatarAfiliado, listar, decidir };
