/* TeskBuy — página inicial */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar('inicio');

  /* slider do herói */
  (function slider() {
    var slides = document.querySelectorAll('.slide');
    var pontos = document.getElementById('pontos');
    if (!slides.length || !pontos) return;
    var actual = 0;

    slides.forEach(function (_, i) {
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
  })();

  /* faixa de confiança */
  document.getElementById('confianca').innerHTML =
    [
      { i: ui.ico.escudo, t: 'Qualidade verificada', s: 'Cada artigo é testado antes de sair do armazém.' },
      { i: ui.ico.camiao, t: 'Entrega em Angola', s: '24 a 48 horas em Luanda, 3 a 7 dias nas províncias.' },
      { i: ui.ico.cartao, t: 'Pague à sua maneira', s: 'Multicaixa Express, transferência ou numerário.' },
      { i: ui.ico.estrela, t: 'Novos e usados', s: 'Usados com estado descrito com honestidade.' },
    ]
      .map(function (c) {
        return '<div>' + c.i + '<div><strong>' + c.t + '</strong><span>' + c.s + '</span></div></div>';
      })
      .join('');

  /* categorias */
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

  /* listas de produtos */
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

  /* newsletter */
  document.getElementById('form-newsletter').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var input = ev.target.querySelector('input');
    var botao = ev.target.querySelector('button');
    botao.disabled = true;

    api.post('/newsletter', { email: input.value.trim() })
      .then(function (r) { ui.notificar(r.mensagem, 'ok'); input.value = ''; })
      .catch(function (e) { ui.notificar(e.message, 'erro'); })
      .finally(function () { botao.disabled = false; });
  });
})();
