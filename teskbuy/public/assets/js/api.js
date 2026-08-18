/* ============================================================
   TeskBuy — cliente da API
   Trata da sessão, renovação de token e formato de resposta.
   ============================================================ */
(function (global) {
  'use strict';

  var BASE = '/api';
  var CHAVE_SESSAO = 'tb.sessao';
  var CHAVE_UTILIZADOR = 'tb.utilizador';

  function lerJSON(chave) {
    try { return JSON.parse(localStorage.getItem(chave) || 'null'); } catch (e) { return null; }
  }
  function gravarJSON(chave, valor) {
    if (valor === null || valor === undefined) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  }

  var sessao = {
    obter: function () { return lerJSON(CHAVE_SESSAO); },
    guardar: function (s) { gravarJSON(CHAVE_SESSAO, s); },
    limpar: function () { gravarJSON(CHAVE_SESSAO, null); gravarJSON(CHAVE_UTILIZADOR, null); },
    token: function () { var s = lerJSON(CHAVE_SESSAO); return s && s.access_token; },
    activa: function () { return Boolean(lerJSON(CHAVE_SESSAO)); },
  };

  var utilizador = {
    obter: function () { return lerJSON(CHAVE_UTILIZADOR); },
    guardar: function (u) { gravarJSON(CHAVE_UTILIZADOR, u); },
    ehEquipa: function () { var u = lerJSON(CHAVE_UTILIZADOR); return !!u && (u.papel === 'admin' || u.papel === 'gestor'); },
    ehAdmin: function () { var u = lerJSON(CHAVE_UTILIZADOR); return !!u && u.papel === 'admin'; },
  };

  /** Erro devolvido pela API, com código de negócio legível. */
  function ErroApi(mensagem, codigo, estado, detalhes) {
    var e = new Error(mensagem);
    e.codigo = codigo; e.estado = estado; e.detalhes = detalhes;
    return e;
  }

  var aRenovar = null;

  function renovarSessao() {
    if (aRenovar) return aRenovar;
    var s = sessao.obter();
    if (!s || !s.refresh_token) return Promise.reject(ErroApi('Sessão terminada.', 'NAO_AUTENTICADO', 401));

    aRenovar = fetch(BASE + '/auth/renovar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    })
      .then(function (r) { return r.json(); })
      .then(function (corpo) {
        if (!corpo.sucesso) throw ErroApi('Sessão terminada.', 'NAO_AUTENTICADO', 401);
        sessao.guardar(corpo.dados.sessao);
        utilizador.guardar(corpo.dados.utilizador);
        return corpo.dados.sessao;
      })
      .finally(function () { aRenovar = null; });

    return aRenovar;
  }

  function pedir(caminho, opcoes) {
    opcoes = opcoes || {};
    var tentarRenovar = opcoes._retry !== true;

    var cabecalhos = Object.assign({}, opcoes.headers || {});
    if (opcoes.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';

    var token = opcoes.token || sessao.token();
    if (token) cabecalhos.Authorization = 'Bearer ' + token;

    var url = BASE + caminho;
    if (opcoes.params) {
      var qs = Object.keys(opcoes.params)
        .filter(function (k) { return opcoes.params[k] !== undefined && opcoes.params[k] !== null && opcoes.params[k] !== ''; })
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(opcoes.params[k]); })
        .join('&');
      if (qs) url += (url.indexOf('?') === -1 ? '?' : '&') + qs;
    }

    return fetch(url, {
      method: opcoes.metodo || 'GET',
      headers: cabecalhos,
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
    })
      .then(function (resposta) {
        return resposta.json().catch(function () { return {}; }).then(function (corpo) {
          return { resposta: resposta, corpo: corpo };
        });
      })
      .then(function (r) {
        if (r.resposta.ok && r.corpo.sucesso !== false) {
          return { dados: r.corpo.dados, paginacao: r.corpo.paginacao, mensagem: r.corpo.mensagem };
        }

        var erro = r.corpo.erro || {};
        if (r.resposta.status === 401 && tentarRenovar && sessao.obter()) {
          return renovarSessao()
            .then(function () {
              return pedir(caminho, Object.assign({}, opcoes, { _retry: true, token: null }));
            })
            .catch(function () {
              sessao.limpar();
              throw ErroApi(erro.mensagem || 'Precisa de iniciar sessão.', 'NAO_AUTENTICADO', 401);
            });
        }

        throw ErroApi(
          erro.mensagem || 'Não foi possível concluir o pedido.',
          erro.codigo || 'ERRO',
          r.resposta.status,
          erro.detalhes
        );
      });
  }

  var api = {
    BASE: BASE,
    sessao: sessao,
    utilizador: utilizador,
    pedir: pedir,

    get: function (c, params) { return pedir(c, { params: params }); },
    post: function (c, corpo) { return pedir(c, { metodo: 'POST', corpo: corpo || {} }); },
    patch: function (c, corpo) { return pedir(c, { metodo: 'PATCH', corpo: corpo || {} }); },
    put: function (c, corpo) { return pedir(c, { metodo: 'PUT', corpo: corpo || {} }); },
    del: function (c) { return pedir(c, { metodo: 'DELETE' }); },

    /* ── autenticação ── */
    registar: function (dados) { return pedir('/auth/registar', { metodo: 'POST', corpo: dados }); },
    entrar: function (dados) {
      return pedir('/auth/entrar', { metodo: 'POST', corpo: dados }).then(function (r) {
        sessao.guardar(r.dados.sessao);
        utilizador.guardar(r.dados.utilizador);
        return r;
      });
    },
    sair: function () {
      return pedir('/auth/sair', { metodo: 'POST' }).catch(function () {}).then(function () {
        sessao.limpar();
      });
    },
    eu: function () {
      return pedir('/auth/eu').then(function (r) {
        utilizador.guardar(r.dados.utilizador);
        return r;
      });
    },
  };

  global.TBApi = api;
})(window);
