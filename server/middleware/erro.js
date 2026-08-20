'use strict';
const env = require('../config/env');
const { ErroApi, traduzErroBd } = require('../utils/erros');

/** 404 para rotas de API inexistentes. */
function rotaNaoEncontrada(req, res) {
  res.status(404).json({
    sucesso: false,
    erro: { codigo: 'ROTA_NAO_ENCONTRADA', mensagem: `Rota não encontrada: ${req.method} ${req.path}` },
  });
}

/** Tratador central de erros. Nunca devolve stack traces em produção. */
// eslint-disable-next-line no-unused-vars
function tratadorErros(erro, req, res, _next) {
  let e = erro instanceof ErroApi ? erro : traduzErroBd(erro);

  if (!e) {
    e = new ErroApi(
      env.producao ? 'Ocorreu um erro no servidor. Tente novamente.' : erro.message,
      erro.status || erro.statusCode || 500,
      'ERRO_INTERNO'
    );
  }

  if (e.estado >= 500) {
    console.error('[TEskBuy] Erro:', {
      rota: `${req.method} ${req.originalUrl}`,
      mensagem: erro.message,
      // erros do Supabase trazem estes campos: sem eles um 500 não se investiga
      codigo_bd: erro.code || null,
      detalhes_bd: erro.details || null,
      sugestao_bd: erro.hint || null,
      stack: erro.stack,
    });
  }

  res.status(e.estado).json({
    sucesso: false,
    erro: {
      codigo: e.codigo,
      mensagem: e.message,
      ...(e.detalhes ? { detalhes: e.detalhes } : {}),
    },
  });
}

module.exports = { rotaNaoEncontrada, tratadorErros };
