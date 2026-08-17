'use strict';
const auth = require('../services/auth.service');
const carrinho = require('../services/carrinho.service');
const { capturar } = require('../utils/async');
const { ok, criado } = require('../utils/resposta');
const { erros } = require('../utils/erros');
const { extrairToken } = require('../middleware/auth');

const registar = capturar(async (req, res) => {
  const resultado = await auth.registar(req.body, req.origemSite);
  return criado(res, resultado, {
    mensagem: resultado.precisa_confirmar
      ? 'Conta criada. Confirme o e-mail para começar a comprar.'
      : 'Conta criada. Bem-vindo à TeskBuy.',
  });
});

const entrar = capturar(async (req, res) => {
  const resultado = await auth.entrar(req.body);
  return ok(res, resultado, { mensagem: `Bem-vindo de volta, ${resultado.utilizador?.nome || ''}.`.trim() });
});

const sair = capturar(async (req, res) => {
  await auth.sair(extrairToken(req));
  return ok(res, { terminada: true }, { mensagem: 'Sessão terminada.' });
});

const renovar = capturar(async (req, res) => {
  const refresh = req.body?.refresh_token;
  if (!refresh) throw erros.pedidoInvalido('Falta o refresh_token.');
  return ok(res, await auth.renovar(refresh));
});

const eu = capturar(async (req, res) => {
  const [favoritos, resumoCarrinho] = await Promise.all([
    require('../services/favoritos.service').idsDoUtilizador(req.utilizador.id),
    carrinho.obter(req.utilizador.id),
  ]);

  return ok(res, {
    utilizador: {
      id: req.utilizador.id,
      email: req.utilizador.email,
      nome: req.utilizador.perfil?.full_name || null,
      telefone: req.utilizador.perfil?.phone || null,
      papel: req.utilizador.papel,
      avatar_url: req.utilizador.perfil?.avatar_url || null,
    },
    favoritos,
    carrinho: { total_itens: resumoCarrinho.total_itens, subtotal: resumoCarrinho.subtotal },
  });
});

const recuperar = capturar(async (req, res) => {
  await auth.pedirRecuperacao(req.body.email, req.origemSite);
  return ok(res, { enviado: true }, {
    mensagem: 'Se existir uma conta com este e-mail, enviámos as instruções para recuperar a palavra-passe.',
  });
});

const definirPalavraPasse = capturar(async (req, res) => {
  const token = extrairToken(req);
  if (!token) throw erros.naoAutenticado('A ligação de recuperação expirou. Peça uma nova.');
  await auth.definirNovaPalavraPasse(token, req.body.palavra_passe);
  return ok(res, { actualizada: true }, { mensagem: 'Palavra-passe actualizada. Já pode iniciar sessão.' });
});

const alterarPalavraPasse = capturar(async (req, res) => {
  await auth.alterarPalavraPasse(extrairToken(req), req.body.actual, req.body.nova, req.utilizador.email);
  return ok(res, { actualizada: true }, { mensagem: 'Palavra-passe alterada.' });
});

module.exports = { registar, entrar, sair, renovar, eu, recuperar, definirPalavraPasse, alterarPalavraPasse };
