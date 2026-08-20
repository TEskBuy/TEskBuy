/* TEskBuy — histórico de encomendas do cliente */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar();
  var conteudo = document.getElementById('conteudo');
  if (!ui.exigirSessao('/encomendas')) return;

  var pagina = 1;
  var LIMITE = 10;

  function vazio() {
    conteudo.innerHTML =
      '<div class="cartao-vazio" style="margin:10px 0 60px">' +
        '<h3>Ainda não fez encomendas</h3>' +
        '<p>Quando encomendar, pode acompanhar aqui cada passo até à entrega.</p>' +
        '<a class="btn btn-principal" href="/loja">Começar a comprar</a>' +
      '</div>';
  }

  function linha(e) {
    var artigos = (e.itens || []).reduce(function (t, i) { return t + i.quantity; }, 0);
    var miniaturas = (e.itens || []).slice(0, 3).map(function (i) {
      return '<img src="' + ui.imagem({ imagem: i.product_image, nome: i.product_name }) + '" alt="" ' +
        'style="width:38px;height:38px;border-radius:8px;object-fit:cover;background:var(--surface-2)">';
    }).join('');

    return '<a class="cartao" href="/encomenda?id=' + encodeURIComponent(e.id) + '" ' +
      'style="display:block;text-decoration:none;color:inherit;margin-bottom:12px">' +
      '<div class="linha-flex" style="justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">' +
        '<div>' +
          '<p class="mono" style="font-size:15px;color:var(--sand)">' + ui.escapar(e.order_number) + '</p>' +
          '<p class="pequeno silenciado" style="margin-top:4px">' + ui.data(e.created_at, true) +
            ' · ' + artigos + ' artigo' + (artigos === 1 ? '' : 's') +
            ' · ' + (ui.NOMES_PAGAMENTO[e.payment_method] || '') + '</p>' +
        '</div>' +
        '<span class="estado estado-' + e.status + '">' + (ui.NOMES_ESTADO[e.status] || e.status) + '</span>' +
      '</div>' +
      '<div class="linha-flex" style="justify-content:space-between;align-items:center;margin-top:14px">' +
        '<div class="linha-flex" style="gap:6px">' + miniaturas +
          ((e.itens || []).length > 3
            ? '<span class="pequeno silenciado">+' + ((e.itens || []).length - 3) + '</span>'
            : '') +
        '</div>' +
        '<span class="mono" style="font-size:17px;color:var(--sand)">' + ui.kz(e.total) + '</span>' +
      '</div>' +
    '</a>';
  }

  function desenhar(lista, paginacao) {
    if (!lista.length) return vazio();

    conteudo.innerHTML =
      lista.map(linha).join('') +
      (paginacao && paginacao.paginas > 1
        ? '<div class="linha-flex" style="justify-content:center;gap:10px;margin-top:24px">' +
            '<button class="btn btn-secundario btn-pequeno" id="anterior"' + (pagina <= 1 ? ' disabled' : '') + '>Anteriores</button>' +
            '<span class="pequeno silenciado mono">' + pagina + ' / ' + paginacao.paginas + '</span>' +
            '<button class="btn btn-secundario btn-pequeno" id="seguinte"' +
              (pagina >= paginacao.paginas ? ' disabled' : '') + '>Seguintes</button>' +
          '</div>'
        : '');

    var anterior = document.getElementById('anterior');
    var seguinte = document.getElementById('seguinte');
    if (anterior) anterior.addEventListener('click', function () { pagina -= 1; carregar(); });
    if (seguinte) seguinte.addEventListener('click', function () { pagina += 1; carregar(); });
  }

  function carregar() {
    conteudo.innerHTML = ui.esqueletos(3, 'esqueleto');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    api.get('/encomendas', { pagina: pagina, limite: LIMITE })
      .then(function (r) { desenhar(r.dados || [], r.paginacao); })
      .catch(function (e) {
        conteudo.innerHTML = '<div class="aviso aviso-erro">' + ui.escapar(e.message) + '</div>';
      });
  }

  carregar();
})();
