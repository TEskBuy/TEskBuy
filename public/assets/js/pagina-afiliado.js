/* TEskBuy — Área do Afiliado */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar();

  var conteudo = document.getElementById('conteudo');
  var eu = null;
  var vista = (location.hash || '').replace('#', '') || 'resumo';

  var ESTADO_PARCERIA = {
    pendente: 'À espera da TEskBuy',
    em_analise_admin: 'Em análise pela TEskBuy',
    enviado_vendedor: 'À espera da empresa',
    aceite: 'Aceite',
    recusado: 'Recusada',
    cancelado: 'Cancelada',
  };
  var ESTADO_COMISSAO = {
    pendente: 'Por confirmar',
    confirmada: 'Confirmada',
    paga: 'Paga',
    anulada: 'Anulada',
  };

  function esqueleto(n) {
    var alvo = document.getElementById('painel-afiliado');
    if (alvo) alvo.innerHTML = ui.esqueletos(n || 2, 'esqueleto');
  }

  function erroPainel(e) {
    var alvo = document.getElementById('painel-afiliado') || conteudo;
    alvo.innerHTML = '<div class="aviso aviso-erro" style="margin:10px 0">' +
      ui.escapar(e.message || 'Não foi possível carregar.') + '</div>';
  }

  function moldura() {
    var itens = [
      { id: 'resumo', nome: 'Resumo' },
      { id: 'empresas', nome: 'Empresas' },
      { id: 'parcerias', nome: 'As minhas parcerias' },
      { id: 'comissoes', nome: 'Comissões' },
    ];

    conteudo.innerHTML =
      '<div class="admin-grelha">' +
        '<aside>' +
          '<p class="eyebrow" style="margin-bottom:14px">Afiliado</p>' +
          '<nav class="admin-menu">' +
            itens.map(function (i) {
              return '<button data-vista="' + i.id + '" class="' + (vista === i.id ? 'activo' : '') + '">' +
                i.nome + '</button>';
            }).join('') +
          '</nav>' +
          '<p class="pequeno silenciado" style="margin-top:18px;padding:0 14px">' +
            'Código: <span class="mono">' + ui.escapar(eu.code) + '</span></p>' +
        '</aside>' +
        '<div id="painel-afiliado"></div>' +
      '</div>';

    conteudo.querySelectorAll('[data-vista]').forEach(function (b) {
      b.addEventListener('click', function () {
        vista = b.getAttribute('data-vista');
        location.hash = vista;
        conteudo.querySelectorAll('[data-vista]').forEach(function (o) { o.classList.remove('activo'); });
        b.classList.add('activo');
        abrir();
      });
    });
  }

  /* ── resumo ───────────────────────────────────────────────── */
  function verResumo() {
    esqueleto(2);
    Promise.all([api.get('/afiliados/comissoes'), api.get('/afiliados/parcerias')])
      .then(function (r) {
        var t = r[0].dados.totais;
        var parcerias = r[1].dados || [];
        var aceites = parcerias.filter(function (p) { return p.estado === 'aceite'; });

        document.getElementById('painel-afiliado').innerHTML =
          '<h1 style="margin-bottom:4px">Resumo</h1>' +
          '<p class="silenciado pequeno" style="margin-bottom:20px">' +
            'Como está a correr a sua divulgação.</p>' +

          '<div class="kpis">' +
            '<div class="kpi"><p>Confirmado</p><p class="v mono">' + ui.kz(t.confirmada) + '</p></div>' +
            '<div class="kpi"><p>Por confirmar</p><p class="v mono">' + ui.kz(t.pendente) + '</p></div>' +
            '<div class="kpi"><p>Já pago</p><p class="v mono">' + ui.kz(t.paga) + '</p></div>' +
            '<div class="kpi"><p>Vendas atribuídas</p><p class="v mono">' + t.vendas + '</p></div>' +
            '<div class="kpi"><p>Parcerias activas</p><p class="v mono">' + aceites.length + '</p></div>' +
          '</div>' +

          '<div class="cartao" style="margin-bottom:16px">' +
            '<h3 style="margin-bottom:8px">Como funciona</h3>' +
            '<p class="silenciado pequeno" style="margin-bottom:10px">' +
              'Só pode divulgar produtos de empresas que aceitaram a sua parceria. ' +
              'Cada pedido passa primeiro pela TEskBuy e depois pela empresa.</p>' +
            '<p class="silenciado pequeno">' +
              'Uma comissão fica <strong>confirmada</strong> quando a encomenda é entregue, ' +
              'e é <strong>anulada</strong> se for cancelada ou devolvida.</p>' +
          '</div>' +

          (aceites.length ? ligacoesHtml(aceites) : '');

        ligarCopiar();
      })
      .catch(erroPainel);
  }

  /** As ligações que o afiliado partilha, já com o seu código no fim. */
  function ligacoesHtml(aceites) {
    var base = location.origin;
    return '<div class="cartao">' +
      '<h3 style="margin-bottom:6px">As suas ligações</h3>' +
      '<p class="silenciado pequeno" style="margin-bottom:14px">' +
        'Partilhe estes endereços. Quem comprar nos 30 dias seguintes conta para si.</p>' +
      [{ nome: 'Página inicial', caminho: '/' }, { nome: 'Loja', caminho: '/loja' }]
        .concat(aceites.map(function (p) {
          return { nome: p.empresa.name, caminho: '/loja?empresa=' + encodeURIComponent(p.empresa.slug) };
        }))
        .map(function (l) {
          var url = base + l.caminho + (l.caminho.indexOf('?') === -1 ? '?' : '&') + 'ref=' + eu.code;
          return '<div class="linha-flex" style="justify-content:space-between;gap:10px;' +
            'padding:9px 0;border-bottom:1px solid rgba(238,247,248,.06)">' +
            '<div style="min-width:0">' +
              '<p class="pequeno">' + ui.escapar(l.nome) + '</p>' +
              '<p class="pequeno silenciado mono" style="word-break:break-all">' + ui.escapar(url) + '</p>' +
            '</div>' +
            '<button class="btn btn-secundario btn-pequeno" data-copiar="' + ui.escapar(url) + '">Copiar</button>' +
          '</div>';
        }).join('') +
    '</div>';
  }

  function ligarCopiar() {
    document.querySelectorAll('[data-copiar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var texto = b.getAttribute('data-copiar');
        var feito = function () {
          b.textContent = 'Copiado';
          setTimeout(function () { b.textContent = 'Copiar'; }, 1600);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(texto).then(feito, function () {});
        else {
          var campo = document.createElement('textarea');
          campo.value = texto;
          document.body.appendChild(campo);
          campo.select();
          try { document.execCommand('copy'); feito(); } catch (e) { /* nada */ }
          campo.remove();
        }
      });
    });
  }

  /* ── empresas ─────────────────────────────────────────────── */
  function verEmpresas() {
    esqueleto(3);
    api.get('/afiliados/empresas').then(function (r) {
      var itens = r.dados || [];

      document.getElementById('painel-afiliado').innerHTML =
        '<h1 style="margin-bottom:4px">Empresas</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:18px">' +
          'Peça parceria às empresas cujos produtos quer divulgar.</p>' +
        (itens.length
          ? itens.map(function (e) {
              return '<div class="cartao" style="margin-bottom:12px">' +
                '<div class="entre" style="gap:14px;align-items:flex-start">' +
                  '<div style="min-width:0">' +
                    '<strong>' + ui.escapar(e.name) + '</strong>' +
                    (e.rating_count
                      ? ' <span class="pequeno silenciado">· ' + Number(e.rating).toFixed(1) + '/5</span>'
                      : '') +
                    (e.description
                      ? '<p class="pequeno silenciado" style="margin-top:6px">' + ui.escapar(e.description) + '</p>'
                      : '') +
                  '</div>' +
                  '<div style="flex-shrink:0">' +
                    (e.pode_pedir
                      ? '<button class="btn btn-principal btn-pequeno" data-pedir="' + e.id + '" ' +
                        'data-nome="' + ui.escapar(e.name) + '">Pedir parceria</button>'
                      : '<span class="pequeno silenciado">' +
                        ui.escapar(ESTADO_PARCERIA[e.estado_parceria] || e.estado_parceria) + '</span>') +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('')
          : '<div class="cartao-vazio"><h3>Ainda sem empresas parceiras</h3>' +
            '<p class="silenciado">Assim que houver vendedores aprovados, aparecem aqui.</p></div>');

      document.querySelectorAll('[data-pedir]').forEach(function (b) {
        b.addEventListener('click', function () { pedirParceria(b); });
      });
    }).catch(erroPainel);
  }

  function pedirParceria(botao) {
    var nome = botao.getAttribute('data-nome');
    var mensagem = prompt('Escreva uma mensagem para ' + nome + ' (opcional):', '');
    if (mensagem === null) return;

    botao.disabled = true;
    botao.textContent = 'A enviar…';

    api.post('/afiliados/parcerias', {
      empresa_id: botao.getAttribute('data-pedir'),
      mensagem: mensagem.trim() || undefined,
    })
      .then(function (r) { ui.notificar(r.mensagem, 'ok'); verEmpresas(); })
      .catch(function (e) {
        ui.notificar(e.message, 'erro');
        botao.disabled = false;
        botao.textContent = 'Pedir parceria';
      });
  }

  /* ── parcerias ────────────────────────────────────────────── */
  function verParcerias() {
    esqueleto(2);
    api.get('/afiliados/parcerias').then(function (r) {
      var itens = r.dados || [];

      document.getElementById('painel-afiliado').innerHTML =
        '<h1 style="margin-bottom:4px">As minhas parcerias</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:18px">' +
          'Cada pedido passa pela TEskBuy e depois pela empresa.</p>' +
        (itens.length
          ? itens.map(function (p) {
              return '<div class="cartao" style="margin-bottom:12px">' +
                '<div class="entre">' +
                  '<strong>' + ui.escapar(p.empresa ? p.empresa.name : '—') + '</strong>' +
                  '<span class="selo ' + (p.estado === 'aceite' ? 'selo-desconto'
                    : p.estado === 'recusado' ? 'selo-esgotado' : 'selo-usado') +
                    '" style="position:static">' +
                    ui.escapar(ESTADO_PARCERIA[p.estado] || p.estado) + '</span>' +
                '</div>' +
                (p.comissao != null
                  ? '<p class="pequeno" style="margin-top:8px">Comissão: <strong>' +
                    Number(p.comissao) + '%</strong></p>'
                  : '') +
                (p.nota_empresa
                  ? '<p class="pequeno silenciado" style="margin-top:6px">Empresa: ' +
                    ui.escapar(p.nota_empresa) + '</p>'
                  : '') +
                (p.nota_admin
                  ? '<p class="pequeno silenciado" style="margin-top:6px">TEskBuy: ' +
                    ui.escapar(p.nota_admin) + '</p>'
                  : '') +
                '<p class="pequeno silenciado" style="margin-top:8px">Pedida em ' +
                  ui.data(p.criada_em) + '</p>' +
              '</div>';
            }).join('')
          : '<div class="cartao-vazio"><h3>Ainda sem pedidos</h3>' +
            '<p class="silenciado">Vá a Empresas e peça parceria à primeira.</p></div>');
    }).catch(erroPainel);
  }

  /* ── comissões ────────────────────────────────────────────── */
  function verComissoes() {
    esqueleto(2);
    api.get('/afiliados/comissoes').then(function (r) {
      var d = r.dados;

      document.getElementById('painel-afiliado').innerHTML =
        '<h1 style="margin-bottom:4px">Comissões</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:18px">' +
          'Confirmam-se quando a encomenda é entregue.</p>' +

        '<div class="kpis">' +
          '<div class="kpi"><p>Confirmado</p><p class="v mono">' + ui.kz(d.totais.confirmada) + '</p></div>' +
          '<div class="kpi"><p>Por confirmar</p><p class="v mono">' + ui.kz(d.totais.pendente) + '</p></div>' +
          '<div class="kpi"><p>Pago</p><p class="v mono">' + ui.kz(d.totais.paga) + '</p></div>' +
          '<div class="kpi"><p>Anulado</p><p class="v mono">' + ui.kz(d.totais.anulada) + '</p></div>' +
        '</div>' +

        (d.linhas.length
          ? '<div class="cartao">' +
              d.linhas.map(function (l) {
                return '<div class="linha-flex" style="justify-content:space-between;gap:12px;' +
                  'padding:10px 0;border-bottom:1px solid rgba(238,247,248,.06)">' +
                  '<div style="min-width:0">' +
                    '<p class="pequeno">' + ui.escapar(l.empresa) + '</p>' +
                    '<p class="pequeno silenciado mono">' + ui.escapar(l.encomenda) + ' · ' +
                      ui.data(l.criada_em) + '</p>' +
                  '</div>' +
                  '<div style="text-align:right;flex-shrink:0">' +
                    '<p class="mono"><strong>' + ui.kz(l.comissao) + '</strong></p>' +
                    '<p class="pequeno silenciado">' + l.taxa + '% de ' + ui.kz(l.valor_venda) + '</p>' +
                    '<p class="pequeno">' + ui.escapar(ESTADO_COMISSAO[l.estado] || l.estado) + '</p>' +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>'
          : '<div class="cartao-vazio"><h3>Ainda sem comissões</h3>' +
            '<p class="silenciado">Assim que alguém comprar pela sua ligação, aparece aqui.</p></div>');
    }).catch(erroPainel);
  }

  function abrir() {
    if (vista === 'empresas') return verEmpresas();
    if (vista === 'parcerias') return verParcerias();
    if (vista === 'comissoes') return verComissoes();
    return verResumo();
  }

  /* ── arranque ─────────────────────────────────────────────── */
  conteudo.innerHTML = '<div style="padding:40px 0">' + ui.esqueletos(2, 'esqueleto') + '</div>';

  api.get('/afiliados/eu')
    .then(function (r) { eu = r.dados; moldura(); abrir(); })
    .catch(function (e) {
      conteudo.innerHTML =
        '<div class="cartao-vazio" style="margin:40px 0 70px">' +
          '<h3>Esta área é para afiliados aprovados</h3>' +
          '<p class="silenciado" style="margin:10px 0 18px">' + ui.escapar(e.message) + '</p>' +
          '<a class="btn btn-principal" href="/parceiro">Candidatar-me</a>' +
        '</div>';
    });
})();
