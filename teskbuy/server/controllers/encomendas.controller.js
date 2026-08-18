'use strict';
const encomendas = require('../services/encomendas.service');
const { capturar } = require('../utils/async');
const { ok, criado, paginado } = require('../utils/resposta');

const criar = capturar(async (req, res) => {
  const encomenda = await encomendas.criar(req.utilizador.id, req.body);
  return criado(res, encomenda, {
    mensagem: `Encomenda ${encomenda.order_number} registada. Entramos em contacto para confirmar a entrega.`,
  });
});

const minhas = capturar(async (req, res) => {
  const { pagina, limite } = req.consulta;
  const { encomendas: lista, total } = await encomendas.listarDoUtilizador(req.utilizador.id, { pagina, limite });
  return paginado(res, lista, { pagina, limite, total });
});

const obter = capturar(async (req, res) => {
  const ehEquipa = ['admin', 'gestor'].includes(req.utilizador.papel);
  const encomenda = await encomendas.obter(req.params.id, {
    utilizadorId: req.utilizador.id,
    ignorarDono: ehEquipa,
  });
  return ok(res, encomenda);
});

const cancelar = capturar(async (req, res) =>
  ok(res, await encomendas.cancelarDoUtilizador(req.params.id, req.utilizador.id), {
    mensagem: 'Encomenda cancelada e stock reposto.',
  })
);

module.exports = { criar, minhas, obter, cancelar };
