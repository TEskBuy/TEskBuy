/* TeskBuy — entrar, registar, recuperar e definir nova palavra-passe */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar();

  var pagina = location.pathname.replace(/^\/|\.html$/g, '') || 'entrar';
  var form = document.getElementById('form');
  var aviso = document.getElementById('aviso');
  var botao = document.getElementById('submeter');
  if (!form) return;

  function mostrar(mensagem, tipo) {
    aviso.innerHTML = '<div class="aviso aviso-' + (tipo || 'info') + '" style="margin-bottom:18px">' + ui.escapar(mensagem) + '</div>';
  }
  function limpar() { aviso.innerHTML = ''; }
  function ocupado(estado, textoOcupado) {
    botao.disabled = estado;
    if (estado) { botao.dataset.texto = botao.textContent; botao.textContent = textoOcupado; }
    else if (botao.dataset.texto) botao.textContent = botao.dataset.texto;
  }
  function destino() {
    var voltar = new URLSearchParams(location.search).get('voltar');
    return voltar && voltar.charAt(0) === '/' ? voltar : '/';
  }
  function detalhes(erro) {
    if (erro.detalhes && erro.detalhes.length) {
      return erro.detalhes.map(function (d) { return d.mensagem; }).join(' ');
    }
    return erro.message;
  }

  /* já tem sessão activa */
  if (api.sessao.activa() && (pagina === 'entrar' || pagina === 'registar')) {
    location.replace(destino());
    return;
  }

  /* token de recuperação vindo do e-mail (#access_token=…) */
  var tokenRecuperacao = null;
  if (pagina === 'nova-palavra-passe') {
    var hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    tokenRecuperacao = hash.get('access_token');
    if (hash.get('error_description')) {
      mostrar(decodeURIComponent(hash.get('error_description')).replace(/\+/g, ' '), 'erro');
    } else if (!tokenRecuperacao) {
      mostrar('Abra esta página a partir da ligação que enviámos por e-mail.', 'erro');
      botao.disabled = true;
    }
    history.replaceState(null, '', location.pathname);
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    limpar();

    if (pagina === 'entrar') {
      ocupado(true, 'A entrar…');
      api.entrar({
        email: form.email.value.trim(),
        palavra_passe: form.palavra_passe.value,
      })
        .then(function () { return ui.sincronizarAposLogin(); })
        .then(function () { location.href = destino(); })
        .catch(function (e) { mostrar(detalhes(e), 'erro'); ocupado(false); });
      return;
    }

    if (pagina === 'registar') {
      ocupado(true, 'A criar conta…');
      api.registar({
        nome: form.nome.value.trim(),
        email: form.email.value.trim(),
        telefone: form.telefone.value.trim(),
        palavra_passe: form.palavra_passe.value,
      })
        .then(function (r) {
          if (r.dados.precisa_confirmar) {
            form.style.display = 'none';
            mostrar('Conta criada. Confirme o e-mail que enviámos para ' + form.email.value.trim() + ' e depois inicie sessão.', 'ok');
            return;
          }
          api.sessao.guardar(r.dados.sessao);
          api.utilizador.guardar(r.dados.utilizador);
          return ui.sincronizarAposLogin().then(function () { location.href = destino(); });
        })
        .catch(function (e) { mostrar(detalhes(e), 'erro'); ocupado(false); });
      return;
    }

    if (pagina === 'recuperar') {
      ocupado(true, 'A enviar…');
      api.post('/auth/recuperar', { email: form.email.value.trim() })
        .then(function (r) {
          form.style.display = 'none';
          mostrar(r.mensagem, 'ok');
        })
        .catch(function (e) { mostrar(detalhes(e), 'erro'); ocupado(false); });
      return;
    }

    if (pagina === 'nova-palavra-passe') {
      if (form.palavra_passe.value !== form.confirmar.value) {
        mostrar('As duas palavras-passe não coincidem.', 'erro');
        return;
      }
      ocupado(true, 'A guardar…');
      api.pedir('/auth/nova-palavra-passe', {
        metodo: 'POST',
        corpo: { palavra_passe: form.palavra_passe.value },
        token: tokenRecuperacao,
      })
        .then(function (r) {
          form.style.display = 'none';
          mostrar(r.mensagem, 'ok');
          setTimeout(function () { location.href = '/entrar'; }, 2200);
        })
        .catch(function (e) { mostrar(detalhes(e), 'erro'); ocupado(false); });
    }
  });
})();
