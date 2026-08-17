'use strict';
const utilizadores = require('../services/utilizadores.service');
const { capturar } = require('../utils/async');
const { ok, criado } = require('../utils/resposta');

const perfil = capturar(async (req, res) => ok(res, await utilizadores.obterPerfil(req.utilizador.id)));

const actualizarPerfil = capturar(async (req, res) =>
  ok(res, await utilizadores.actualizarPerfil(req.utilizador.id, req.body), { mensagem: 'Dados actualizados.' })
);

const listarMoradas = capturar(async (req, res) => ok(res, await utilizadores.listarMoradas(req.utilizador.id)));

const criarMorada = capturar(async (req, res) =>
  criado(res, await utilizadores.criarMorada(req.utilizador.id, req.body), { mensagem: 'Morada guardada.' })
);

const actualizarMorada = capturar(async (req, res) =>
  ok(res, await utilizadores.actualizarMorada(req.utilizador.id, req.params.id, req.body), {
    mensagem: 'Morada actualizada.',
  })
);

const apagarMorada = capturar(async (req, res) =>
  ok(res, await utilizadores.apagarMorada(req.utilizador.id, req.params.id), { mensagem: 'Morada removida.' })
);

module.exports = { perfil, actualizarPerfil, listarMoradas, criarMorada, actualizarMorada, apagarMorada };
