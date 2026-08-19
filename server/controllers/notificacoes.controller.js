'use strict';
const notificacoes = require('../services/notificacoes.service');
const { capturar } = require('../utils/async');
const { ok, paginado } = require('../utils/resposta');

const listar = capturar(async (req, res) =>
  ok(res, await notificacoes.listar({
    limite: Number(req.query.limite) || 30,
    apenasPorLer: req.query.por_ler === 'true',
  }))
);

const porLer = capturar(async (_req, res) => ok(res, { total: await notificacoes.porLer() }));

const marcarLida = capturar(async (req, res) =>
  ok(res, await notificacoes.marcarLida(req.params.id))
);

const marcarTodas = capturar(async (_req, res) =>
  ok(res, await notificacoes.marcarTodasLidas(), { mensagem: 'Tudo marcado como lido.' })
);

const auditoria = capturar(async (req, res) => {
  const { pagina, limite } = req.query;
  const { dados, total } = await notificacoes.auditoria({
    entidade: req.query.entidade, pagina, limite,
  });
  return paginado(res, dados, { pagina, limite, total });
});

module.exports = { listar, porLer, marcarLida, marcarTodas, auditoria };
