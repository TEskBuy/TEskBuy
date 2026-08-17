'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const rotas = require('./routes');
const { abrirContexto } = require('./config/supabase');
const { autenticacaoOpcional } = require('./middleware/auth');
const { limiteGeral } = require('./middleware/limites');
const { rotaNaoEncontrada, tratadorErros } = require('./middleware/erro');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// ── Segurança ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", env.supabase.url, 'https://*.supabase.co'],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

const origensPermitidas = env.cors.length ? env.cors : [env.siteUrl];
app.use(
  cors({
    origin(origem, callback) {
      if (!origem) return callback(null, true); // pedidos same-origin ou ferramentas
      if (!env.producao) return callback(null, true);
      if (origensPermitidas.some((o) => origem === o || origem.endsWith('.vercel.app'))) {
        return callback(null, true);
      }
      return callback(new Error('Origem não autorizada pelo CORS.'));
    },
    credentials: true,
  })
);

// Cabeçalhos extra (o vercel.json em modo "routes" não permite a chave headers)
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.path.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
if (!env.producao) app.use(morgan('dev'));

// ── API ────────────────────────────────────────────────────
// A origem real de cada pedido. Em produção o domínio vem nos cabeçalhos da
// Vercel, por isso os e-mails de confirmação apontam sempre para o sítio certo,
// mesmo que SITE_URL não esteja configurada.
app.use((req, _res, next) => {
  const anfitriao = req.headers['x-forwarded-host'] || req.headers.host;
  const protocolo = req.headers['x-forwarded-proto'] || (env.producao ? 'https' : 'http');
  req.origemSite = env.siteUrlDefinida || (anfitriao ? `${protocolo}://${anfitriao}` : env.siteUrl);
  next();
});

app.use('/api', (req, _res, next) => abrirContexto(next));
app.use('/api', limiteGeral, autenticacaoOpcional, rotas);
app.use('/api', rotaNaoEncontrada);

// ── Frontend ───────────────────────────────────────────────
// Serve public/ tanto localmente como na Vercel. `extensions: ['html']` dá o
// mesmo efeito que o cleanUrls: /loja serve public/loja.html.
const raizPublica = path.join(__dirname, '..', 'public');
app.use(
  express.static(raizPublica, {
    extensions: ['html'],
    maxAge: env.producao ? '1h' : 0,
  })
);
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(raizPublica, 'index.html'), (erro) => (erro ? next() : null));
});

app.use(tratadorErros);

module.exports = app;
