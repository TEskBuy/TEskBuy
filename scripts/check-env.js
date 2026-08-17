#!/usr/bin/env node
'use strict';
/** Verifica a configuração antes de arrancar ou publicar. */
const env = require('../server/config/env');

const linhas = [
  ['Ambiente', env.nodeEnv],
  ['Site', env.siteUrl],
  ['Supabase', env.supabase.url],
  ['Chave publicável', env.supabase.anonKey ? 'definida' : 'EM FALTA'],
  ['Service role', env.supabase.serviceRoleKey ? 'definida (opcional)' : 'não definida — a API usa RLS'],
  ['Moeda', env.loja.moeda],
  ['Entrega Luanda', env.loja.taxaLuanda],
  ['Entrega províncias', env.loja.taxaProvincias],
  ['Entrega grátis acima de', env.loja.entregaGratisAcima],
  ['Origens CORS', env.cors.length ? env.cors.join(', ') : '(só o próprio site)'],
];

console.log('\n  TeskBuy — configuração\n');
linhas.forEach(([nome, valor]) => console.log('  ' + nome.padEnd(26) + valor));

if (!env.supabase.url || !env.supabase.anonKey) {
  console.error('\n  Falta a ligação ao Supabase. Consulte o .env.example.\n');
  process.exit(1);
}
console.log('\n  Tudo pronto.\n');
