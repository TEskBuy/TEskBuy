'use strict';
const carrinho = require('../services/carrinho.service');
const { capturar } = require('../utils/async');
const { ok } = require('../utils/resposta');

const ver = capturar(async (req, res) => ok(res, await carrinho.obter(req.utilizador.id, req.query.provincia)));

const adicionar = capturar(async (req, res) => {
  const resultado = await carrinho.adicionar(req.utilizador.id, req.body.produto_id, req.body.quantidade);
  return ok(res, resultado, { mensagem: 'Adicionado ao carrinho.' });
});

const actualizar = capturar(async (req, res) =>
  ok(res, await carrinho.actualizarItem(req.utilizador.id, req.params.id, req.body.quantidade))
);

const remover = capturar(async (req, res) =>
  ok(res, await carrinho.remover(req.utilizador.id, req.params.id), { mensagem: 'Item removido.' })
);

const limpar = capturar(async (req, res) =>
  ok(res, await carrinho.limpar(req.utilizador.id), { mensagem: 'Carrinho esvaziado.' })
);

const sincronizar = capturar(async (req, res) =>
  ok(res, await carrinho.sincronizar(req.utilizador.id, req.body.itens))
);

module.exports = { ver, adicionar, actualizar, remover, limpar, sincronizar };
