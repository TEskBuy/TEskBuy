'use strict';
/**
 * Promove uma conta existente a administrador.
 *
 * Uso: node scripts/create-admin.js email@dominio.com
 *
 * Precisa de SUPABASE_SERVICE_ROLE_KEY no .env, porque o gatilho
 * guard_profile_role impede — de propósito — que alguém se promova pela API.
 * Sem essa chave, faça a mesma coisa no SQL Editor do Supabase:
 *   update public.profiles set role = 'admin' where email = '...';
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const env = require('../server/config/env');

const email = process.argv[2];
if (!email) {
  console.error('\n  Uso: node scripts/create-admin.js email@dominio.com\n');
  process.exit(1);
}

if (!env.supabase.serviceRoleKey) {
  console.error(
    '\n  Falta SUPABASE_SERVICE_ROLE_KEY no .env.\n' +
    '  Em alternativa, corra isto no SQL Editor do Supabase:\n\n' +
    `    update public.profiles set role = 'admin' where email = '${email.toLowerCase()}';\n`
  );
  process.exit(1);
}

const bd = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { persistSession: false },
});

(async () => {
  const { data, error } = await bd
    .from('profiles')
    .update({ role: 'admin' })
    .eq('email', email.toLowerCase())
    .select('id, email, full_name, role')
    .maybeSingle();

  if (error) {
    console.error('\n  Erro:', error.message, '\n');
    process.exit(1);
  }
  if (!data) {
    console.error(`\n  Nenhuma conta com o e-mail ${email}. Registe-se primeiro no site.\n`);
    process.exit(1);
  }

  console.log(`\n  ${data.full_name || data.email} passou a administrador da TeskBuy.\n`);
})();
