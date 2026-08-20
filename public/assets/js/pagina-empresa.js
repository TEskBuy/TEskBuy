/* TEskBuy — perfil público de um vendedor */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar('loja');

  var slug = new URLSearchParams(location.search).get('slug');
  var conteudo = document.getElementById('conteudo');
  var dados = null;

  if (!slug) {
    conteudo.innerHTML =
      '<div class="env"><div class="cartao-vazio" style="margin-top:40px">' +
      '<h3>Vendedor não indicado</h3><p>Escolha um vendedor na lista.</p>' +
      '<a class="btn btn-principal" href="/vendedores">Ver vendedores</a></div></div>';
    return;
  }

  conteudo.innerHTML = '<div class="env" style="padding-top:32px">' + ui.esqueletos(2, 'esqueleto') + '</div>';

  function estrelas(nota) {
    var n = Math.round(Number(nota) || 0);
    var saida = '';
    for (var i = 1; i <= 5; i++) {
      saida += '<span class="estrela' + (i <= n ? ' cheia' : '') + '">' + ui.ico.estrela + '</span>';
    }
    return saida;
  }

  /** Sem capa carregada, desenhamos uma com as cores da casa. */
  function capa(e) {
    if (e.cover_url) {
      return '<img src="' + ui.escapar(e.cover_url) + '" alt="" class="capa-img">';
    }
    return '<div class="capa-vazia"></div>';
  }

  function logotipo(e) {
    if (e.logo_url) {
      return '<img class="perfil-logo" src="' + ui.escapar(e.logo_url) + '" alt="' + ui.escapar(e.name) + '">';
    }
    var inicial = String(e.name || '?').trim().charAt(0).toUpperCase();
    return '<span class="perfil-logo perfil-logo-letra">' + ui.escapar(inicial) + '</span>';
  }

  function desenhar() {
    var e = dados.empresa;
    document.title = e.name + ' — TEskBuy';

    conteudo.innerHTML =
      '<section class="perfil-capa">' +
        capa(e) +
        '<div class="perfil-veu"></div>' +
      '</section>' +

      '<section class="env perfil-cabecalho">' +
        logotipo(e) +
        '<div class="perfil-identidade">' +
          '<h1>' + ui.escapar(e.name) + '</h1>' +
          '<div class="perfil-meta">' +
            (e.rating_count
              ? '<span class="perfil-nota">' + estrelas(e.rating) +
                '<b>' + Number(e.rating).toFixed(1) + '</b>' +
                '<small>' + e.rating_count + (e.rating_count === 1 ? ' avaliação' : ' avaliações') + '</small></span>'
              : '<span class="pequeno silenciado">Ainda sem avaliações</span>') +
            (e.province
              ? '<span class="perfil-local">' + ui.ico.local +
                ui.escapar([e.municipality, e.province].filter(Boolean).join(', ')) + '</span>'
              : '') +
            '<span class="pequeno silenciado">' + dados.produtos.length +
              (dados.produtos.length === 1 ? ' produto à venda' : ' produtos à venda') + '</span>' +
          '</div>' +
          (e.description ? '<p class="perfil-sobre">' + ui.escapar(e.description) + '</p>' : '') +
        '</div>' +
        '<div class="perfil-accoes">' +
          '<button class="btn btn-principal" id="btn-falar">Falar com o vendedor</button>' +
          '<a class="btn btn-secundario" href="/parceiro?tipo=afiliado">Ser afiliado desta loja</a>' +
        '</div>' +
      '</section>' +

      '<section class="seccao env" style="padding-top:26px">' +
        '<div class="seccao-cabecalho">' +
          '<div><p class="eyebrow">Catálogo</p>' +
          '<h2 style="margin-top:10px">O que este vendedor tem</h2></div>' +
        '</div>' +
        (dados.produtos.length
          ? '<div class="grelha grelha-produtos" id="produtos">' +
              dados.produtos.map(ui.cartaoProduto).join('') + '</div>'
          : '<div class="cartao-vazio"><h3>Ainda sem produtos</h3>' +
            '<p>Este vendedor ainda não publicou nada.</p></div>') +
      '</section>' +

      (dados.avaliacoes.length
        ? '<section class="seccao env" style="padding-top:0">' +
            '<div class="seccao-cabecalho"><div><p class="eyebrow">Quem já comprou</p>' +
            '<h2 style="margin-top:10px">Avaliações</h2></div></div>' +
            '<div class="grelha grelha-2">' +
              dados.avaliacoes.map(function (a) {
                return '<div class="cartao">' +
                  '<div class="linha-flex" style="gap:10px;align-items:center">' +
                    (a.foto
                      ? '<img class="avatar" src="' + ui.escapar(a.foto) + '" alt="">'
                      : '<span class="avatar avatar-letra">' +
                        ui.escapar(String(a.autor).charAt(0).toUpperCase()) + '</span>') +
                    '<div><strong>' + ui.escapar(a.autor) + '</strong>' +
                    '<p class="pequeno silenciado">' + ui.data(a.criada_em) + '</p></div>' +
                  '</div>' +
                  '<div class="estrelas" style="margin:10px 0 6px">' + estrelas(a.nota) + '</div>' +
                  (a.texto ? '<p class="pequeno">' + ui.escapar(a.texto) + '</p>' : '') +
                '</div>';
              }).join('') +
            '</div>' +
          '</section>'
        : '');

    var grelha = document.getElementById('produtos');
    if (grelha) {
      var porId = {};
      dados.produtos.forEach(function (p) { porId[p.id] = p; });
      ui.ligarAccoesProduto(grelha, porId);
    }
    ligarConversa(e);
  }

  /** Abre conversa com esta empresa. Sem sessão, manda-se entrar primeiro. */
  function ligarConversa(empresa) {
    var botao = document.getElementById('btn-falar');
    if (!botao) return;

    botao.addEventListener('click', function () {
      if (!api.sessao.activa()) {
        location.href = '/entrar?voltar=' + encodeURIComponent(location.pathname + location.search);
        return;
      }
      var mensagem = prompt('O que quer perguntar a ' + empresa.name + '?');
      if (mensagem === null) return;
      mensagem = String(mensagem).trim();
      if (!mensagem) { ui.notificar('Escreva a sua mensagem.', 'erro'); return; }

      botao.disabled = true;
      botao.textContent = 'A abrir…';
      api.post('/conversas', {
        empresa_id: empresa.id,
        assunto: mensagem.slice(0, 60),
        mensagem: mensagem,
      })
        .then(function () { location.href = '/conta?sep=mensagens'; })
        .catch(function (err) {
          botao.disabled = false;
          botao.textContent = 'Falar com o vendedor';
          ui.notificar(err.message || 'Não foi possível abrir a conversa.', 'erro');
        });
    });
  }

  api.get('/empresas/' + encodeURIComponent(slug))
    .then(function (r) { dados = r.dados; desenhar(); })
    .catch(function (e) {
      conteudo.innerHTML =
        '<div class="env"><div class="cartao-vazio" style="margin-top:40px">' +
        '<h3>Vendedor não encontrado</h3><p>' + ui.escapar(e.message || '') + '</p>' +
        '<a class="btn btn-principal" href="/vendedores">Ver vendedores</a></div></div>';
    });
})();
