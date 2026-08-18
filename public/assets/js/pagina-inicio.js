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

    definir('c-intro', i.intro);
    definir('c-parceiros-titulo', i.parceiros_titulo);

    var titulo = document.getElementById('c-titulo');
    if (titulo && i.titulo) {
      titulo.textContent = i.titulo + (i.titulo_destaque ? ' ' + i.titulo_destaque : '');
    }

    desenharSlides(i, r);
    desenharParceiros(i.parceiros);
    iniciarSlider();
  });

  /* Imagens de reserva: se um slide gravado no painel ainda não tiver
     imagem própria, usa-se a da posição correspondente. */
  var IMAGENS = [
    { larga: '/assets/img/hero/loja.webp', alta: '/assets/img/hero/loja-movel.webp' },
    { larga: '/assets/img/hero/parcerias.webp', alta: '/assets/img/hero/parcerias-movel.webp' },
    { larga: '/assets/img/hero/pagamentos.webp', alta: '/assets/img/hero/pagamentos-movel.webp' },
    { larga: '/assets/img/hero/contacto.webp', alta: '/assets/img/hero/contacto-movel.webp' },
  ];

  function desenharSlides(inicio, rodape) {
    var alvo = document.getElementById('slider');
    var slides = inicio.slides;
    if (!alvo || !slides || !slides.length) return;

    var telefoneLimpo = String(rodape.telefone || '').replace(/[^0-9+]/g, '');

    alvo.innerHTML = slides.map(function (s, n) {
      var reserva = IMAGENS[n % IMAGENS.length];
      var larga = s.imagem || reserva.larga;
      var alta = s.imagem_movel || s.imagem || reserva.alta;

      var accoes =
        '<a class="btn btn-principal" href="' + ui.escapar(s.botao_href || '/loja') + '">' +
          ui.escapar(s.botao || inicio.botao1 || 'Ver a loja') + '</a>' +
        (n === 0 && inicio.botao2
          ? '<a class="btn btn-secundario" href="/loja?condicao=usado">' + ui.escapar(inicio.botao2) + '</a>'
          : '');

      return '<article class="hb-slide' + (n === 0 ? ' activo' : '') + '" aria-hidden="' + (n === 0 ? 'false' : 'true') + '">' +
        '<picture>' +
          '<source media="(max-width:700px)" srcset="' + ui.escapar(alta) + '">' +
          '<img src="' + ui.escapar(larga) + '" alt="" ' +
            (n === 0 ? 'fetchpriority="high"' : 'loading="lazy"') + '>' +
        '</picture>' +
        '<div class="hb-texto env"><div class="hb-caixa">' +
          (n === 0 && inicio.eyebrow ? '<p class="eyebrow">' + ui.escapar(inicio.eyebrow) + '</p>' : '') +
          '<h2>' + ui.escapar(s.titulo) +
            (s.destaque ? ' <span class="accent">' + ui.escapar(s.destaque) + '</span>' : '') + '</h2>' +
          '<p>' + ui.escapar(s.texto) + '</p>' +
          (s.mostrar_contactos
            ? '<div class="linha-flex mono" style="margin-top:14px;font-size:14px;color:var(--sand)">' +
                '<a href="tel:' + ui.escapar(telefoneLimpo) + '" style="text-decoration:none;' +
                  'border-bottom:1px solid rgba(245,234,217,.35)">' + ui.escapar(rodape.telefone) + '</a>' +
                '<a href="mailto:' + ui.escapar(rodape.email) + '" style="text-decoration:none;' +
                  'border-bottom:1px solid rgba(245,234,217,.35)">' + ui.escapar(rodape.email) + '</a>' +
              '</div>'
            : '') +
          '<div class="hb-accoes">' + accoes + '</div>' +
        '</div></div>' +
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
    var painel = document.getElementById('painel-principal');
    var slides = document.querySelectorAll('.hb-slide');
    var pontos = document.getElementById('pontos');
    if (!painel || !slides.length || !pontos) return;

    var actual = 0;
    var automatico = null;

    pontos.innerHTML = '';
    Array.prototype.slice.call(slides).forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Ver destaque ' + (i + 1));
      if (i === 0) b.classList.add('activo');
      b.addEventListener('click', function () { irPara(i); recomecar(); });
      pontos.appendChild(b);
    });
    var botoes = pontos.querySelectorAll('button');

    // setas — só aparecem em ecrãs largos, por CSS
    var seta = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
    if (slides.length > 1) {
      painel.insertAdjacentHTML('beforeend',
        '<div class="hb-setas">' +
          '<button class="hb-seta hb-ant" id="hb-ant" type="button" aria-label="Destaque anterior">' + seta + '</button>' +
          '<button class="hb-seta hb-seg" id="hb-seg" type="button" aria-label="Destaque seguinte">' + seta + '</button>' +
        '</div>');
      document.getElementById('hb-ant').addEventListener('click', function () { andar(-1); recomecar(); });
      document.getElementById('hb-seg').addEventListener('click', function () { andar(1); recomecar(); });
    }

    function irPara(i) {
      slides[actual].classList.remove('activo');
      slides[actual].setAttribute('aria-hidden', 'true');
      botoes[actual].classList.remove('activo');
      actual = i;
      slides[actual].classList.add('activo');
      slides[actual].setAttribute('aria-hidden', 'false');
      botoes[actual].classList.add('activo');
    }

    function andar(passo) {
      irPara((actual + passo + slides.length) % slides.length);
    }

    function recomecar() {
      if (automatico) clearInterval(automatico);
      if (slides.length < 2) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      automatico = setInterval(function () { andar(1); }, 6000);
    }

    // arrastar com o dedo, como se espera num telemóvel
    var inicioX = null;
    painel.addEventListener('touchstart', function (ev) {
      inicioX = ev.touches[0].clientX;
    }, { passive: true });
    painel.addEventListener('touchend', function (ev) {
      if (inicioX === null) return;
      var delta = ev.changedTouches[0].clientX - inicioX;
      inicioX = null;
      if (Math.abs(delta) < 45) return;
      andar(delta < 0 ? 1 : -1);
      recomecar();
    }, { passive: true });

    // não roda enquanto o separador está escondido
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (automatico) clearInterval(automatico); }
      else recomecar();
    });

    recomecar();
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
