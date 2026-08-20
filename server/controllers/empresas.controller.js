'use strict';
const empresas = require('../services/empresas.service');
const { capturar } = require('../utils/async');
const { ok, paginado } = require('../utils/resposta');

const listar = capturar(async (req, res) => {
  const pagina = Number(req.query.pagina) || 1;
  const limite = Math.min(Number(req.query.limite) || 24, 60);
  const { dados, total } = await empresas.listar({
    q: req.query.q,
    provincia: req.query.provincia,
    pagina,
    limite,
  });
  return paginado(res, dados, { pagina, limite, total });
});

const perfil = capturar(async (req, res) => ok(res, await empresas.perfil(req.params.slug)));

module.exports = { listar, perfil };
