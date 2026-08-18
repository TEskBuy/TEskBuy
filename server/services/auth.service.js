'use strict';
const { publico, db, comUtilizador } = require('../config/supabase');
const env = require('../config/env');
const { erros } = require('../utils/erros');

/** Traduz mensagens do Supabase Auth para português de Angola. */
function traduz(mensagem = '') {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou palavra-passe incorrectos.';
  if (m.includes('email not confirmed')) return 'Confirme o e-mail antes de iniciar sessão.';
  if (m.includes('user already registered')) return 'Já existe uma conta com este e-mail.';
  if (m.includes('password should be at least')) return 'A palavra-passe deve ter pelo menos 8 caracteres.';
  if (m.includes('email rate limit')) return 'Demasiados e-mails enviados. Tente daqui a alguns minutos.';
  if (m.includes('token has expired') || m.includes('invalid token')) return 'A ligação expirou. Peça uma nova.';
  if (m.includes('same password')) return 'A nova palavra-passe tem de ser diferente da anterior.';
  return mensagem || 'Não foi possível concluir a operação.';
}

function formatarSessao(sessao, utilizador, perfil) {
  return {
    sessao: sessao
      ? {
          access_token: sessao.access_token,
          refresh_token: sessao.refresh_token,
          expira_em: sessao.expires_at,
        }
      : null,
    utilizador: utilizador
      ? {
          id: utilizador.id,
          email: utilizador.email,
          nome: perfil?.full_name || utilizador.user_metadata?.full_name || null,
          telefone: perfil?.phone || utilizador.user_metadata?.phone || null,
          papel: perfil?.role || 'cliente',
          avatar_url: perfil?.avatar_url || null,
        }
      : null,
  };
}

async function registar({ email, palavra_passe, nome, telefone }, origem) {
  const { data, error } = await publico.auth.signUp({
    email,
    password: palavra_passe,
    options: {
      data: { full_name: nome, phone: telefone || null },
      emailRedirectTo: `${origem || env.siteUrl}/entrar?confirmado=1`,
    },
  });
  if (error) throw erros.pedidoInvalido(traduz(error.message));

  // O gatilho handle_new_user cria o perfil automaticamente. Sem sessão, o e-mail
  // ainda tem de ser confirmado, por isso não há leitura possível do perfil.
  const perfil = data.session
    ? (
        await comUtilizador(data.session.access_token)
          .from('profiles')
          .select('full_name, phone, role, avatar_url')
          .eq('id', data.user.id)
          .maybeSingle()
      ).data
    : null;

  return {
    ...formatarSessao(data.session, data.user, perfil),
    precisa_confirmar: !data.session,
  };
}

async function entrar({ email, palavra_passe }) {
  const { data, error } = await publico.auth.signInWithPassword({ email, password: palavra_passe });
  if (error) throw erros.naoAutenticado(traduz(error.message));

  // Cliente ligado à sessão recém-criada. É preciso declará-lo aqui: neste ponto
  // do pedido ainda não existe sessão no contexto, por isso db() não serve.
  const sessao = comUtilizador(data.session.access_token);

  const { data: perfil } = await db()
    .from('profiles')
    .select('full_name, phone, role, avatar_url, is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (perfil && perfil.is_active === false) {
    throw erros.semPermissao('Esta conta está suspensa. Contacte a TeskBuy pelo +244 943 277 184.');
  }

  await sessao.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', data.user.id);
  return formatarSessao(data.session, data.user, perfil);
}

async function sair(token) {
  if (!token) return { terminada: true };
  // Invalida o refresh token no Supabase; a sessão local é limpa pelo frontend.
  await comUtilizador(token).auth.signOut().catch(() => {});
  return { terminada: true };
}

async function renovar(refreshToken) {
  const { data, error } = await publico.auth.refreshSession({ refresh_token: refreshToken });
  if (error) throw erros.naoAutenticado('A sessão expirou. Inicie sessão novamente.');

  const { data: perfil } = await db()
    .from('profiles')
    .select('full_name, phone, role, avatar_url')
    .eq('id', data.user.id)
    .maybeSingle();

  return formatarSessao(data.session, data.user, perfil);
}

async function pedirRecuperacao(email, origem) {
  const { error } = await publico.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem || env.siteUrl}/nova-palavra-passe`,
  });
  // Resposta neutra: não revela se o e-mail existe.
  if (error && !String(error.message).toLowerCase().includes('rate limit')) {
    console.warn('[TeskBuy] recuperação:', error.message);
  }
  return { enviado: true };
}

async function definirNovaPalavraPasse(accessToken, novaPalavraPasse) {
  const cliente = comUtilizador(accessToken);
  const { error } = await cliente.auth.updateUser({ password: novaPalavraPasse });
  if (error) throw erros.pedidoInvalido(traduz(error.message));
  return { actualizada: true };
}

async function alterarPalavraPasse(accessToken, actual, nova, email) {
  const { error: errVerificacao } = await publico.auth.signInWithPassword({ email, password: actual });
  if (errVerificacao) throw erros.pedidoInvalido('A palavra-passe actual está incorrecta.');
  return definirNovaPalavraPasse(accessToken, nova);
}

module.exports = {
  registar, entrar, sair, renovar, pedirRecuperacao,
  definirNovaPalavraPasse, alterarPalavraPasse, formatarSessao,
};
