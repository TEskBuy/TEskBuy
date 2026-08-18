'use strict';
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const mensagem = {
  sucesso: false,
  erro: { codigo: 'DEMASIADOS_PEDIDOS', mensagem: 'Demasiados pedidos. Tente novamente daqui a pouco.' },
};

/** Limite geral da API. */
const limiteGeral = rateLimit({
  windowMs: env.rateLimit.janelaMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensagem,
});

/** Limite apertado para autenticação — trava tentativas de força bruta. */
const limiteAutenticacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    sucesso: false,
    erro: {
      codigo: 'DEMASIADAS_TENTATIVAS',
      mensagem: 'Demasiadas tentativas. Aguarde 15 minutos antes de tentar novamente.',
    },
  },
});

/** Limite para escrita (encomendas, avaliações). */
const limiteEscrita = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensagem,
});

module.exports = { limiteGeral, limiteAutenticacao, limiteEscrita };
