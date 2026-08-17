/* TeskBuy — catálogo com filtros */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar('loja');

  var filtros = {
    q: '', categoria: '', condicao: '', preco_min: '', preco_max: '',
    apenas_com_stock: '', ordenar: 'recentes', pagina: 1, limite: 12,
  };

  function lerURL() {
    var p = new URLSearchParams(location.search);
    Object.keys(filtros).forEach(function (k) {
      if (p.has(k)) filtros[k] = p.get(k);
    });
    filtros.pagina = Number(filtros.pagina) || 1;
    document.getElementById('ordenar').value = filtros.ordenar;
    document.getElementById('preco-min').value = filtros.preco_min;
    document.getElementById('preco-max').value = filtros.preco_max;
  }

  function escreverURL() {
    var p = new URLSearchParams();
    Object.keys(filtros).forEach(function (k) {
      if (filtros[k] !== '' && filtros[k] != null && !(k === 'pagina' && filtros[k] === 1) && k !== 'limite') {
        p.set(k, filtros[k]);
      }
    });
    var qs = p.toString();
    history.replaceState(null, '', '/loja' + (qs ? '?' + qs : ''));
  }

  function marcarActivos() {
    document.querySelectorAll('[data-categoria]').forEach(function (b) {
      b.classList.toggle('activo', b.getAttribute('data-categoria') === filtros.categoria);
    });
    document.querySelectorAll('[data-condicao]').forEach(function (b) {
      b.classList.toggle('activo', b.getAttribute('data-condicao') === filtros.condicao);
    });
    document.querySelectorAll('[data-stock]').forEach(function (b) {
      b.classList.toggle('activo', b.getAttribute('data-stock') === String(filtros.apenas_com_stock));
    });
  }

  function carregarCategorias() {
    api.get('/catalogo/categorias').then(function (r) {
      var alvo = document.getElementById('lista-categorias');
      alvo.innerHTML =
        '<button data-categoria="">Todas</button>' +
        r.dados.map(function (c) {
          return '<button data-categoria="' + c.slug + '">' + ui.escapar(c.name) +
                 '<span>' + c.total_produtos + '</span></button>';
        }).join('');

      alvo.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          filtros.categoria = b.getAttribute('data-categoria');
          filtros.pagina = 1;
          procurar();
        });
      });
      marcarActivos();
    });
  }

  function titulo() {
    if (filtros.q) return 'Resultados para “' + filtros.q + '”';
    var botao = document.querySelector('[data-categoria="' + filtros.categoria + '"]');
    if (filtros.categoria && botao) return botao.childNodes[0].textContent.trim();
    if (filtros.condicao === 'usado') return 'Usados verificados';
    return 'Loja';
  }

  function procurar() {
    escreverURL();
    marcarActivos();
    document.getElementById('titulo').textContent = titulo();

    var alvo = document.getElementById('resultados');
    alvo.innerHTML = ui.esqueletos(8);
    document.getElementById('contagem').textContent = 'A carregar…';

    api.get('/produtos', filtros)
      .then(function (r) {
        var total = r.paginacao.total;
        document.getElementById('contagem').textContent =
          total === 0 ? 'Nenhum produto encontrado' : total + (total === 1 ? ' produto' : ' produtos');

        if (!r.dados.length) {
          alvo.innerHTML =
            '<div class="cartao-vazio" style="grid-column:1/-1">' +
              '<h3>Não encontrámos nada com estes filtros</h3>' +
              '<p>Experimente outras palavras ou limpe os filtros para ver todo o catálogo.</p>' +
              '<a class="btn btn-secundario" href="/loja">Ver todo o catálogo</a>' +
            '</div>';
          document.getElementById('paginacao').innerHTML = '';
          return;
        }

        var porId = {};
        r.dados.forEach(function (p) { porId[p.id] = p; });
        alvo.innerHTML = r.dados.map(ui.cartaoProduto).join('');
        ui.ligarAccoesProduto(alvo, porId);
        desenharPaginacao(r.paginacao);
      })
      .catch(function (e) {
        alvo.innerHTML = '<div class="aviso aviso-erro" style="grid-column:1/-1">' + ui.escapar(e.message) + '</div>';
      });
  }

  function desenharPaginacao(p) {
    var alvo = document.getElementById('paginacao');
    if (p.paginas <= 1) { alvo.innerHTML = ''; return; }

    var html = '<button ' + (p.pagina === 1 ? 'disabled' : '') + ' data-pagina="' + (p.pagina - 1) + '">Anterior</button>';
    var inicio = Math.max(1, p.pagina - 2);
    var fim = Math.min(p.paginas, inicio + 4);

    for (var i = inicio; i <= fim; i += 1) {
      html += '<button class="' + (i === p.pagina ? 'activo' : '') + '" data-pagina="' + i + '">' + i + '</button>';
    }
    html += '<button ' + (p.pagina === p.paginas ? 'disabled' : '') + ' data-pagina="' + (p.pagina + 1) + '">Seguinte</button>';
    alvo.innerHTML = html;

    alvo.querySelectorAll('button[data-pagina]').forEach(function (b) {
      b.addEventListener('click', function () {
        filtros.pagina = Number(b.getAttribute('data-pagina'));
        procurar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  document.querySelectorAll('[data-condicao]').forEach(function (b) {
    b.addEventListener('click', function () {
      filtros.condicao = b.getAttribute('data-condicao');
      filtros.pagina = 1;
      procurar();
    });
  });
  document.querySelectorAll('[data-stock]').forEach(function (b) {
    b.addEventListener('click', function () {
      filtros.apenas_com_stock = b.getAttribute('data-stock');
      filtros.pagina = 1;
      procurar();
    });
  });
  document.getElementById('aplicar-preco').addEventListener('click', function () {
    filtros.preco_min = document.getElementById('preco-min').value;
    filtros.preco_max = document.getElementById('preco-max').value;
    filtros.pagina = 1;
    procurar();
  });
  document.getElementById('ordenar').addEventListener('change', function (ev) {
    filtros.ordenar = ev.target.value;
    filtros.pagina = 1;
    procurar();
  });
  document.getElementById('limpar-filtros').addEventListener('click', function () {
    location.href = '/loja';
  });
  document.getElementById('btn-filtros').addEventListener('click', function () {
    document.getElementById('filtros').classList.toggle('aberta');
  });

  lerURL();
  carregarCategorias();
  procurar();
})();
