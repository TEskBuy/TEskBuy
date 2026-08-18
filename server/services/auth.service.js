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

/** Traduz os erros próprios da confirmação por código de 6 dígitos. */
function traduzCodigo(mensagem = '') {
  const m = mensagem.toLowerCase();
  if (m.includes('expired') || m.includes('invalid')) {
    return 'Código inválido ou expirado. Peça um código novo.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Demasiados pedidos. Aguarde um minuto antes de tentar outra vez.';
  }
  return mensagem || 'Não foi possível confirmar o código.';
}

/**
 * Confirma a conta com o código de 6 dígitos enviado por e-mail.
 * Em caso de sucesso o cliente fica com sessão iniciada de imediato.
 */
async function confirmarCodigo({ email, codigo }) {
  const { data, error } = await publico.auth.verifyOtp({
    email,
    token: codigo,
    type: 'signup',
  });
  if (error) throw erros.pedidoInvalido(traduzCodigo(error.message));
  if (!data?.session) throw erros.pedidoInvalido('Código inválido ou expirado. Peça um código novo.');

  const sessao = comUtilizador(data.session.access_token);

  const { data: perfil } = await sessao
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

/** Envia novamente o código de confirmação para o mesmo e-mail. */
async function reenviarCodigo(email) {
  const { error } = await publico.auth.resend({ type: 'signup', email });
  if (error) throw erros.pedidoInvalido(traduzCodigo(error.message));
  return { enviado: true };
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

/**
 * Define a palavra-passe a partir de um access token.
 *
 * Fala directamente com o serviço de autenticação do Supabase em vez de
 * usar cliente.auth.updateUser(): esse método procura uma sessão guardada
 * dentro do cliente e, como aqui só temos o token, falhava sempre com
 * "Auth session missing!". Por HTTP basta o token — serve tanto para a
 * ligação de recuperação como para a mudança feita dentro da conta.
 */
async function definirNovaPalavraPasse(accessToken, novaPalavraPasse) {
  let resposta;
  try {
    resposta = await fetch(`${env.supabase.url}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: env.supabase.anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: novaPalavraPasse }),
    });
  } catch (e) {
    throw erros.interno('Não foi possível contactar o serviço de autenticação. Tente novamente.');
  }

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const mensagem = corpo.msg || corpo.error_description || corpo.message || '';
    if (resposta.status === 401) {
      throw erros.naoAutenticado('A ligação expirou. Peça uma nova.');
    }
    if (String(mensagem).toLowerCase().includes('should be different')) {
      throw erros.pedidoInvalido('A nova palavra-passe tem de ser diferente da anterior.');
    }
    throw erros.pedidoInvalido(traduz(mensagem));
  }

  return { actualizada: true };
}

async function alterarPalavraPasse(accessToken, actual, nova, email) {
  // Confirma a palavra-passe actual e aproveita a sessão nova daí resultante,
  // que é sempre válida — o token vindo do pedido pode já estar a expirar.
  const { data, error } = await publico.auth.signInWithPassword({ email, password: actual });
  if (error) throw erros.pedidoInvalido('A palavra-passe actual está incorrecta.');

  return definirNovaPalavraPasse(data.session.access_token, nova);
}

module.exports = {
  registar, entrar, sair, renovar, pedirRecuperacao,
  definirNovaPalavraPasse, alterarPalavraPasse, formatarSessao,
  confirmarCodigo, reenviarCodigo,
};
