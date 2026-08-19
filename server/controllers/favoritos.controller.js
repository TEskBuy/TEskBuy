'use strict';
const favoritos = require('../services/favoritos.service');
const { capturar } = require('../utils/async');
const { ok } = require('../utils/resposta');

const listar = capturar(async (req, res) => ok(res, await favoritos.listar(req.utilizador.id)));

const alternar = capturar(async (req, res) => {
  const resultado = await favoritos.alternar(req.utilizador.id, req.params.produtoId);
  return ok(res, resultado, {
    mensagem: resultado.favorito ? 'Guardado nos favoritos.' : 'Removido dos favoritos.',
  });
});

const remover = capturar(async (req, res) =>
  ok(res, await favoritos.remover(req.utilizador.id, req.params.produtoId), { mensagem: 'Removido dos favoritos.' })
);

module.exports = { listar, alternar, remover };
