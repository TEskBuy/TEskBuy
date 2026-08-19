'use strict';
const router = require('express').Router();
const { publico } = require('../config/supabase');
const env = require('../config/env');
const { capturar } = require('../utils/async');
const { ok } = require('../utils/resposta');

router.get('/health', capturar(async (_req, res) => {
  const inicio = Date.now();
  const { error } = await publico.from('settings').select('key').limit(1);
  return ok(res, {
    servico: 'TeskBuy API',
    versao: '1.0.0',
    ambiente: env.nodeEnv,
    base_de_dados: error ? 'indisponivel' : 'ligada',
    latencia_ms: Date.now() - inicio,
    hora: new Date().toISOString(),
  });
}));

router.get('/', (_req, res) =>
  ok(res, {
    servico: 'TeskBuy API',
    versao: '1.0.0',
    documentacao: '/api/health',
    recursos: [
      'POST   /api/auth/registar',
      'POST   /api/auth/entrar',
      'GET    /api/auth/eu',
      'GET    /api/catalogo/categorias',
      'GET    /api/produtos',
      'GET    /api/produtos/:slug',
      'GET    /api/carrinho',
      'POST   /api/carrinho/itens',
      'GET    /api/favoritos',
      'POST   /api/encomendas',
      'GET    /api/encomendas',
      'GET    /api/utilizadores/eu',
      'GET    /api/admin/painel',
    ],
  })
);

router.use('/auth', require('./auth.routes'));
router.use('/catalogo', require('./catalogo.routes'));
router.use('/produtos', require('./produtos.routes'));
router.use('/carrinho', require('./carrinho.routes'));
router.use('/favoritos', require('./favoritos.routes'));
router.use('/encomendas', require('./encomendas.routes'));
router.use('/utilizadores', require('./utilizadores.routes'));
router.use('/parceiros', require('./parceiros.routes'));
router.use('/comerciante', require('./comerciante.routes'));
router.use('/ficheiros', require('./ficheiros.routes'));
router.use('/afiliados', require('./afiliados.routes'));
router.use('/admin', require('./admin.routes'));

router.post('/newsletter', capturar(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({
      sucesso: false,
      erro: { codigo: 'PEDIDO_INVALIDO', mensagem: 'Indique um e-mail válido.' },
    });
  }
  await publico.from('newsletter_subscribers').upsert({ email }, { onConflict: 'email' });
  return ok(res, { subscrito: true }, { mensagem: 'Subscrito. Avisamos assim que houver novidades.' });
}));

module.exports = router;
