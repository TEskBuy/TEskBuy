'use strict';
/**
 * Ponto de entrada único da aplicação na Vercel.
 *
 * O vercel.json encaminha TODOS os pedidos para aqui e o Express trata do resto:
 * /api/* vai para a API, tudo o resto é servido a partir de public/.
 * Este é o formato que a Vercel documenta para aplicações Express — exportar a
 * app, sem chamar listen().
 */
module.exports = require('./server/app');
