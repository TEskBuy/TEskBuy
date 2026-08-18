'use strict';
require('dotenv').config();

/**
 * Leitura centralizada das variáveis de ambiente.
 * Tudo tem valor por omissão sensato para que o projecto arranque logo após o
 * clone; em produção, as variáveis definidas no Vercel sobrepõem-se.
 */
function opcional(nome, padrao) {
  const valor = process.env[nome];
  return valor === undefined || valor === '' ? padrao : String(valor).trim();
}

function numero(nome, padrao) {
  const valor = Number(opcional(nome, padrao));
  return Number.isFinite(valor) ? valor : Number(padrao);
}

// Projecto Supabase da TeskBuy (valores públicos — ver nota abaixo).
const PROJECTO_URL = 'https://ipmzxiqmzcjvyxxyoisf.supabase.co';
const PROJECTO_CHAVE_PUBLICA = 'sb_publishable_vWvSwl8K_nPHBy4CJVDj7Q_C7q5ynrQ';

const env = {
  nodeEnv: opcional('NODE_ENV', 'development'),
  porta: numero('PORT', 3000),
  siteUrl: opcional('SITE_URL', 'http://localhost:3000').replace(/\/$/, ''),
  // Só tem valor quando foi mesmo configurada. Serve para decidir se usamos o
  // domínio do pedido ou este valor fixo.
  siteUrlDefinida: (process.env.SITE_URL || '').trim().replace(/\/$/, '') || null,

  supabase: {
    // URL e chave publicável são públicas por desenho: viajam para o browser em
    // qualquer app Supabase e não dão acesso a nada — quem protege os dados é o
    // Row Level Security. Ficam com valor por omissão para o projecto arrancar
    // sem configuração; as variáveis de ambiente sobrepõem-se sempre.
    url: opcional('SUPABASE_URL', PROJECTO_URL).replace(/\/$/, ''),
    anonKey: opcional('SUPABASE_ANON_KEY', PROJECTO_CHAVE_PUBLICA),
    // Opcional. A API funciona sem ela: a autorização é garantida pelas
    // políticas de Row Level Security da base de dados.
    serviceRoleKey: opcional('SUPABASE_SERVICE_ROLE_KEY', ''),
  },

  loja: {
    moeda: opcional('LOJA_MOEDA', 'AOA'),
    taxaLuanda: numero('ENTREGA_TAXA_LUANDA', 3500),
    taxaProvincias: numero('ENTREGA_TAXA_PROVINCIAS', 12000),
    entregaGratisAcima: numero('ENTREGA_GRATIS_ACIMA', 250000),
  },

  cors: opcional('CORS_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  rateLimit: {
    janelaMs: numero('RATE_LIMIT_JANELA_MIN', 15) * 60 * 1000,
    max: numero('RATE_LIMIT_MAX', 300),
  },
};

env.producao = env.nodeEnv === 'production';

module.exports = env;
