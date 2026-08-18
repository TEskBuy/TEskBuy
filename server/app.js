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

/**
 * O site e a API vivem no mesmo domínio, seja ele o teskbuy.com, um
 * endereço .vercel.app ou qualquer domínio que venha a ser ligado no
 * futuro. Por isso a origem do próprio pedido é sempre aceite — é o
 * único modo de isto não voltar a partir de cada vez que o domínio muda.
 */
app.use(
  cors(function (req, callback) {
    const permitir = { origin: true, credentials: true };
    const origem = req.headers.origin;

    // Sem cabeçalho Origin: pedido do próprio site (GET) ou ferramenta.
    if (!origem) return callback(null, permitir);
    if (!env.producao) return callback(null, permitir);

    const anfitriao = req.headers['x-forwarded-host'] || req.headers.host;
    const mesmoSitio = Boolean(anfitriao) &&
      (origem === 'https://' + anfitriao || origem === 'http://' + anfitriao);

    if (mesmoSitio || origem.endsWith('.vercel.app') || origensPermitidas.indexOf(origem) !== -1) {
      return callback(null, permitir);
    }

    return callback(new Error('Origem não autorizada pelo CORS.'));
  })
);

// Cabeçalhos extra (o vercel.json em modo "routes" não permite a chave headers)
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Os ficheiros não têm o conteúdo no nome (é sempre teskbuy.css, ui.js…),
  // por isso "immutable" prendia o navegador na versão antiga durante um ano:
  // publicava-se uma alteração e ninguém a via. O CSS e o JS passam a ser
  // reconfirmados a cada visita — quando não mudam, a resposta é um 304 vazio.
  // As imagens, essas, podem ficar guardadas à vontade.
  if (req.path.startsWith('/assets/')) {
    const estatico = /\.(png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf)$/i.test(req.path);
    res.setHeader(
      'Cache-Control',
      estatico ? 'public, max-age=2592000' : 'public, max-age=0, must-revalidate'
    );
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
