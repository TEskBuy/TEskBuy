/* TeskBuy — página inicial */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar('inicio');

  /* ── textos editáveis pelo painel ────────────────────────────
     Enquanto não chegam, ficam à vista os textos que estão no HTML.
     Assim a página nunca aparece vazia, mesmo sem ligação. */
  ui.conteudo(function (c) {
    var i = c.inicio;
    var r = c.rodape;

    function definir(id, texto) {
      var el = document.getElementById(id);
      if (el && texto) el.textContent = texto;
    }

    definir('c-eyebrow', i.eyebrow);
    definir('c-intro', i.intro);
    definir('c-botao1', i.botao1);
    definir('c-botao2', i.botao2);
    definir('c-parceiros-titulo', i.parceiros_titulo);

    var titulo = document.getElementById('c-titulo');
    if (titulo) {
      titulo.innerHTML = ui.escapar(i.titulo) +
        (i.titulo_destaque ? '<br><span class="accent">' + ui.escapar(i.titulo_destaque) + '</span>' : '');
    }

    desenharSlides(i.slides, r);
    desenharParceiros(i.parceiros);
    iniciarSlider();
  });

  function desenharSlides(slides, rodape) {
    var alvo = document.getElementById('slider');
    if (!alvo || !slides || !slides.length) return;

    var telefoneLimpo = String(rodape.telefone || '').replace(/[^0-9+]/g, '');

    alvo.innerHTML = slides.map(function (s, indice) {
      return '<article class="slide' + (indice === 0 ? ' activo' : '') + '">' +
        '<h2>' + ui.escapar(s.titulo) +
          (s.destaque ? ' <span class="accent">' + ui.escapar(s.destaque) + '</span>' : '') + '</h2>' +
        '<p>' + ui.escapar(s.texto) + '</p>' +
        (s.mostrar_contactos
          ? '<div class="linha-flex mono" style="margin-top:12px;font-size:14px;color:var(--sand)">' +
              '<a href="tel:' + ui.escapar(telefoneLimpo) + '" style="text-decoration:none;' +
                'border-bottom:1px solid rgba(245,234,217,.35)">' + ui.escapar(rodape.telefone) + '</a>' +
              '<a href="mailto:' + ui.escapar(rodape.email) + '" style="text-decoration:none;' +
                'border-bottom:1px solid rgba(245,234,217,.35)">' + ui.escapar(rodape.email) + '</a>' +
            '</div>'
          : '') +
      '</article>';
    }).join('');
  }

  function desenharParceiros(nomes) {
    var faixa = document.getElementById('c-faixa-parceiros');
    if (!faixa || !nomes || !nomes.length) return;

    // remove só as pastilhas, mantendo o título da faixa
    Array.prototype.slice.call(faixa.querySelectorAll('span')).forEach(function (s) {
      s.parentNode.removeChild(s);
    });

    nomes.forEach(function (nome) {
      var span = document.createElement('span');
      span.textContent = nome;
      faixa.appendChild(span);
    });
  }

  function iniciarSlider() {
    var slides = document.querySelectorAll('.slide');
    var pontos = document.getElementById('pontos');
    if (!slides.length || !pontos) return;

    pontos.innerHTML = '';
    var actual = 0;

    Array.prototype.slice.call(slides).forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Ver mensagem ' + (i + 1));
      if (i === 0) b.classList.add('activo');
      b.addEventListener('click', function () { irPara(i); });
      pontos.appendChild(b);
    });
    var botoes = pontos.querySelectorAll('button');

    function irPara(i) {
      slides[actual].classList.remove('activo');
      botoes[actual].classList.remove('activo');
      actual = i;
      slides[actual].classList.add('activo');
      botoes[actual].classList.add('activo');
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInterval(function () { irPara((actual + 1) % slides.length); }, 5500);
    }
  }

  /* ── categorias ─────────────────────────────────────────── */
  api.get('/catalogo/categorias')
    .then(function (r) {
      document.getElementById('categorias').innerHTML = r.dados
        .map(function (c) {
          return (
            '<a class="categoria" href="/loja?categoria=' + encodeURIComponent(c.slug) + '">' +
              '<strong>' + ui.escapar(c.name) + '</strong>' +
              '<span>' + c.total_produtos + ' artigo' + (c.total_produtos === 1 ? '' : 's') + '</span>' +
            '</a>'
          );
        })
        .join('');
    })
    .catch(function () {
      document.getElementById('categorias').innerHTML =
        '<p class="silenciado">Não foi possível carregar as categorias. Actualize a página.</p>';
    });

  /* ── listas de produtos ─────────────────────────────────── */
  function carregarGrelha(elementoId, params, vazio) {
    var alvo = document.getElementById(elementoId);
    alvo.innerHTML = ui.esqueletos(4);

    api.get('/produtos', params)
      .then(function (r) {
        if (!r.dados.length) {
          alvo.innerHTML = '<p class="silenciado">' + vazio + '</p>';
          return;
        }
        var porId = {};
        r.dados.forEach(function (p) { porId[p.id] = p; });
        alvo.innerHTML = r.dados.map(ui.cartaoProduto).join('');
        ui.ligarAccoesProduto(alvo, porId);
      })
      .catch(function () {
        alvo.innerHTML = '<p class="silenciado">Não foi possível carregar os produtos.</p>';
      });
  }

  carregarGrelha('destaques', { destaque: 'true', limite: 8 }, 'Ainda sem destaques.');
  carregarGrelha('novidades', { ordenar: 'recentes', limite: 8 }, 'Ainda sem novidades.');

})();
