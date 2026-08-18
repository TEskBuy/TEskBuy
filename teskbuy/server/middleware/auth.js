'use strict';
const { publico, comUtilizador, definirSessao } = require('../config/supabase');
const { erros } = require('../utils/erros');
const { capturar } = require('../utils/async');

function extrairToken(req) {
  const cabecalho = req.get('authorization') || '';
  if (cabecalho.toLowerCase().startsWith('bearer ')) return cabecalho.slice(7).trim();
  return null;
}

/** Anexa req.utilizador quando existe sessão válida. Não bloqueia se não existir. */
const autenticacaoOpcional = capturar(async (req, _res, next) => {
  const token = extrairToken(req);
  if (!token) return next();

  const { data, error } = await publico.auth.getUser(token);
  if (error || !data?.user) return next();

  const sessao = comUtilizador(token);
  const { data: perfil } = await sessao
    .from('profiles')
    .select('id, email, full_name, phone, role, is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (perfil && perfil.is_active === false) return next();

  req.token = token;
  req.utilizador = { ...data.user, perfil: perfil || null, papel: perfil?.role || 'cliente' };
  req.db = sessao;
  definirSessao(token);
  next();
});

/** Exige sessão válida. */
const exigirSessao = capturar(async (req, _res, next) => {
  if (!req.utilizador) throw erros.naoAutenticado();
  next();
});

/** Exige papel de gestor ou administrador. */
const exigirEquipa = capturar(async (req, _res, next) => {
  if (!req.utilizador) throw erros.naoAutenticado();
  if (!['admin', 'gestor'].includes(req.utilizador.papel)) throw erros.semPermissao();
  next();
});

/** Exige papel de administrador. */
const exigirAdmin = capturar(async (req, _res, next) => {
  if (!req.utilizador) throw erros.naoAutenticado();
  if (req.utilizador.papel !== 'admin') throw erros.semPermissao();
  next();
});

module.exports = { autenticacaoOpcional, exigirSessao, exigirEquipa, exigirAdmin, extrairToken };
