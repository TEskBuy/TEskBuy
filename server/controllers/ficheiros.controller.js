'use strict';
const ficheiros = require('../services/ficheiros.service');
const comerciante = require('../services/comerciante.service');
const { capturar } = require('../utils/async');
const { ok } = require('../utils/resposta');
const { extrairToken } = require('../middleware/auth');

const autorizar = capturar(async (req, res) => {
  // A empresa só é procurada quando a finalidade a exige, para não pesar
  // um pedido de KYC com uma consulta que não serve para nada.
  const precisaEmpresa = ['produto', 'logotipo'].indexOf(req.body.finalidade) !== -1;
  const empresa = precisaEmpresa ? await comerciante.empresaDe(req.utilizador.id) : null;

  const r = await ficheiros.autorizarCarregamento(
    extrairToken(req),
    req.utilizador,
    req.body,
    empresa && empresa.id
  );
  return ok(res, r);
});

const verDocumento = capturar(async (req, res) => {
  const caminho = String(req.query.caminho || '');
  return ok(res, await ficheiros.urlAssinada(extrairToken(req), caminho));
});

module.exports = { autorizar, verDocumento };
