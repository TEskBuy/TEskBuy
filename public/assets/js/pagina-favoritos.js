/* TeskBuy — favoritos */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI, estado = window.TBEstado;

  ui.iniciar();
  var conteudo = document.getElementById('conteudo');

  function vazio(mensagem) {
    conteudo.className = '';
    conteudo.innerHTML =
      '<div class="cartao-vazio" style="margin:10px 0 60px">' +
        '<h3>Ainda não guardou nada</h3>' +
        '<p>' + (mensagem || 'Toque no coração de um produto para o guardar aqui e voltar a ele quando quiser.') + '</p>' +
        '<a class="btn btn-principal" href="/loja">Ver a loja</a>' +
      '</div>';
  }

  function desenhar(produtos) {
    if (!produtos.length) return vazio();

    conteudo.className = 'grelha grelha-produtos';
    var porId = {};
    produtos.forEach(function (p) { porId[p.id] = p; });

    conteudo.innerHTML = produtos.map(ui.cartaoProduto).join('');
    ui.ligarAccoesProduto(conteudo, porId);

    conteudo.querySelectorAll('[data-favorito]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setTimeout(carregar, 350);
      });
    });
  }

  function carregar() {
    conteudo.className = 'grelha grelha-produtos';
    conteudo.innerHTML = ui.esqueletos(4);

    if (api.sessao.activa()) {
      api.get('/favoritos')
        .then(function (r) {
          estado.favoritos.definir((r.dados || []).map(function (f) { return f.produto.id; }));
          ui.actualizarCrachas();
          desenhar((r.dados || []).map(function (f) { return f.produto; }));
        })
        .catch(function (e) {
          conteudo.className = '';
          conteudo.innerHTML = '<div class="aviso aviso-erro" style="margin:10px 0 40px">' + ui.escapar(e.message) + '</div>';
        });
      return;
    }

    var ids = estado.favoritos.ids();
    if (!ids.length) {
      return vazio('Guarde os produtos que lhe interessam. Se criar conta, ficam sincronizados em todos os dispositivos.');
    }

    Promise.all(
      ids.map(function (id) {
        return api.get('/produtos/' + id).then(function (r) { return r.dados.produto; }).catch(function () { return null; });
      })
    ).then(function (lista) {
      var validos = lista.filter(Boolean);
      estado.favoritos.definir(validos.map(function (p) { return p.id; }));
      desenhar(validos);

      if (validos.length) {
        conteudo.insertAdjacentHTML(
          'beforebegin',
          '<div class="aviso aviso-info" style="margin-bottom:20px">' +
            '<span>Estes favoritos estão guardados só neste dispositivo. ' +
            '<a href="/entrar?voltar=%2Ffavoritos">Inicie sessão</a> para os manter na sua conta.</span>' +
          '</div>'
        );
      }
    });
  }

  carregar();
})();
