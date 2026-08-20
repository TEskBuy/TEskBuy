'use strict';
const afiliados = require('../services/afiliados.service');
const { capturar } = require('../utils/async');
const { ok, criado, paginado } = require('../utils/resposta');
const { extrairToken } = require('../middleware/auth');

/* ── afiliado ──────────────────────────────────────────────── */

const meuPerfil = capturar(async (req, res) => {
  const a = await afiliados.exigirAfiliado(req.utilizador.id);
  return ok(res, a);
});

const empresas = capturar(async (req, res) => {
  await afiliados.exigirAfiliado(req.utilizador.id);
  return ok(res, await afiliados.empresasDisponiveis(req.utilizador.id));
});

const minhasParcerias = capturar(async (req, res) => {
  await afiliados.exigirAfiliado(req.utilizador.id);
  return ok(res, await afiliados.minhasParcerias(req.utilizador.id));
});

const pedirParceria = capturar(async (req, res) => {
  await afiliados.exigirAfiliado(req.utilizador.id);
  const r = await afiliados.pedirParceria(req.utilizador.id, req.body);
  return criado(res, r, {
    mensagem: 'Pedido enviado. Passa primeiro pela TEskBuy e depois pela empresa.',
  });
});

const minhasComissoes = capturar(async (req, res) => {
  await afiliados.exigirAfiliado(req.utilizador.id);
  return ok(res, await afiliados.minhasComissoes(req.utilizador.id));
});

/* ── empresa ───────────────────────────────────────────────── */

const parceriasDaEmpresa = capturar(async (req, res) =>
  ok(res, await afiliados.parceriasDaEmpresa(req.empresa.id))
);

const decidirEmpresa = capturar(async (req, res) => {
  const r = await afiliados.decidirEmpresa(req.empresa.id, req.params.id, req.body);
  return ok(res, r, {
    mensagem: r.estado === 'aceite'
      ? 'Afiliado aceite. Já pode divulgar os seus produtos.'
      : 'Pedido recusado.',
  });
});

/* ── administrador ─────────────────────────────────────────── */

const listarParcerias = capturar(async (req, res) => {
  const { pagina, limite } = req.query;
  const { dados, total } = await afiliados.listarParcerias({
    estado: req.query.estado, pagina, limite,
  });
  return paginado(res, dados, { pagina, limite, total });
});

const decidirAdmin = capturar(async (req, res) => {
  const r = await afiliados.decidirAdmin(
    extrairToken(req), req.params.id, req.body, req.utilizador.id
  );
  const TEXTOS = {
    enviado_vendedor: 'Pedido encaminhado para a empresa.',
    recusado: 'Pedido travado.',
    em_analise_admin: 'Pedido marcado como em análise.',
  };
  return ok(res, r, { mensagem: TEXTOS[r.estado] || 'Pedido actualizado.' });
});

module.exports = {
  meuPerfil, empresas, minhasParcerias, pedirParceria, minhasComissoes,
  parceriasDaEmpresa, decidirEmpresa,
  listarParcerias, decidirAdmin,
};
