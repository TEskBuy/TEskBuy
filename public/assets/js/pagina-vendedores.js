/* TEskBuy — todos os vendedores da plataforma */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar('loja');

  var conteudo = document.getElementById('conteudo');
  var pagina = 1;
  var termo = new URLSearchParams(location.search).get('q') || '';

  conteudo.innerHTML =
    '<div class="seccao-cabecalho" style="padding-top:32px">' +
      '<div>' +
        '<p class="eyebrow">Marketplace</p>' +
        '<h1 style="margin-top:10px">Quem vende na TEskBuy</h1>' +
        '<p class="silenciado" style="margin-top:8px;max-width:560px">' +
          'Empresas aprovadas pela TEskBuy. Veja o que cada uma tem à venda, ' +
          'fale com elas ou peça uma parceria de afiliado.</p>' +
      '</div>' +
    '</div>' +
    '<form class="linha-flex" id="form-procura-vendedores" style="margin:18px 0 24px;gap:8px">' +
      '<input id="q" placeholder="Procurar vendedor pelo nome…" value="' + ui.escapar(termo) + '" ' +
        'style="flex:1;min-width:200px;padding:11px 16px;border-radius:999px;' +
        'border:1px solid var(--linha-forte);background:rgba(6,48,60,0.5);color:var(--ink);font-family:inherit">' +
      '<button class="btn btn-secundario" type="submit">Procurar</button>' +
    '</form>' +
    '<div id="lista">' + ui.esqueletos(3, 'esqueleto') + '</div>' +
    '<div id="mais" style="text-align:center;padding:20px 0 40px"></div>';

  function estrelas(nota) {
    var n = Math.round(Number(nota) || 0), saida = '';
    for (var i = 1; i <= 5; i++) {
      saida += '<span class="estrela' + (i <= n ? ' cheia' : '') + '">' + ui.ico.estrela + '</span>';
    }
    return saida;
  }

  function cartao(e) {
    var inicial = String(e.name || '?').trim().charAt(0).toUpperCase();
    return '<a class="vendedor-cartao" href="/empresa?slug=' + encodeURIComponent(e.slug) + '">' +
      '<div class="vendedor-capa">' +
        (e.cover_url
          ? '<img src="' + ui.escapar(e.cover_url) + '" alt="" loading="lazy">'
          : '<div class="capa-vazia"></div>') +
      '</div>' +
      '<div class="vendedor-corpo">' +
        (e.logo_url
          ? '<img class="vendedor-logo" src="' + ui.escapar(e.logo_url) + '" alt="" loading="lazy">'
          : '<span class="vendedor-logo vendedor-logo-letra">' + ui.escapar(inicial) + '</span>') +
        '<strong>' + ui.escapar(e.name) + '</strong>' +
        '<div class="vendedor-meta">' +
          (e.rating_count
            ? '<span>' + estrelas(e.rating) + ' ' + Number(e.rating).toFixed(1) + '</span>'
            : '<span class="silenciado">Sem avaliações</span>') +
          '<span class="silenciado">' + e.produtos +
            (e.produtos === 1 ? ' produto' : ' produtos') + '</span>' +
        '</div>' +
        (e.province ? '<span class="vendedor-local">' + ui.ico.local +
          ui.escapar([e.municipality, e.province].filter(Boolean).join(', ')) + '</span>' : '') +
      '</div>' +
    '</a>';
  }

  function carregar(juntar) {
    api.get('/empresas', { q: termo || undefined, pagina: pagina, limite: 24 })
      .then(function (r) {
        var lista = document.getElementById('lista');
        var itens = r.dados || [];

        if (!itens.length && !juntar) {
          lista.innerHTML =
            '<div class="cartao-vazio"><h3>Nenhum vendedor encontrado</h3>' +
            '<p>' + (termo ? 'Tente outro nome.' : 'Ainda não há empresas aprovadas.') + '</p></div>';
          document.getElementById('mais').innerHTML = '';
          return;
        }

        var html = itens.map(cartao).join('');
        if (juntar) lista.insertAdjacentHTML('beforeend', html);
        else lista.innerHTML = '<div class="vendedores-grelha">' + html + '</div>';

        var total = (r.paginacao && r.paginacao.total) || itens.length;
        var mostrados = pagina * 24;
        document.getElementById('mais').innerHTML =
          mostrados < total ? '<button class="btn btn-secundario" id="btn-mais">Ver mais vendedores</button>' : '';

        var botao = document.getElementById('btn-mais');
        if (botao) {
          botao.addEventListener('click', function () {
            pagina += 1;
            botao.disabled = true;
            botao.textContent = 'A carregar…';
            carregar(true);
          });
        }
      })
      .catch(function (e) {
        document.getElementById('lista').innerHTML =
          '<div class="cartao-vazio"><h3>Não foi possível carregar</h3><p>' +
          ui.escapar(e.message || '') + '</p></div>';
      });
  }

  document.getElementById('form-procura-vendedores').addEventListener('submit', function (ev) {
    ev.preventDefault();
    termo = document.getElementById('q').value.trim();
    pagina = 1;
    document.getElementById('lista').innerHTML = ui.esqueletos(3, 'esqueleto');
    carregar(false);
  });

  carregar(false);
})();
