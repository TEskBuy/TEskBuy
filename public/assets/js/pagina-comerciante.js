/* TEskBuy — Área do Comerciante (parceiros aprovados) */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar();

  var conteudo = document.getElementById('conteudo');
  var empresa = null;
  var vista = (location.hash || '').replace('#', '') || 'resumo';

  var ESTADO_MOD = { pendente: 'À espera', aprovado: 'Aprovado', rejeitado: 'Rejeitado' };

  function esqueleto(n) {
    var alvo = document.getElementById('painel-parceiro');
    if (alvo) alvo.innerHTML = ui.esqueletos(n || 2, 'esqueleto');
  }

  function erroPainel(e) {
    var alvo = document.getElementById('painel-parceiro') || conteudo;
    alvo.innerHTML =
      '<div class="aviso aviso-erro" style="margin:10px 0">' +
      ui.escapar(e.message || 'Não foi possível carregar.') + '</div>';
  }

  /* ── moldura ──────────────────────────────────────────────── */
  function moldura(porAprovar) {
    var itens = [
      { id: 'resumo', nome: 'Resumo' },
      { id: 'produtos', nome: 'Produtos', n: porAprovar },
      { id: 'encomendas', nome: 'Encomendas' },
      { id: 'afiliados', nome: 'Afiliados' },
      { id: 'avaliacoes', nome: 'Avaliações' },
      { id: 'mensagens', nome: 'Mensagens' },
      { id: 'suporte', nome: 'Suporte' },
      { id: 'empresa', nome: 'A minha empresa' },
    ];

    conteudo.innerHTML =
      '<div class="admin-grelha">' +
        '<aside>' +
          '<p class="eyebrow" style="margin-bottom:14px">Comerciante</p>' +
          '<nav class="admin-menu">' +
            itens.map(function (i) {
              return '<button data-vista="' + i.id + '" class="' + (vista === i.id ? 'activo' : '') + '">' +
                i.nome + (i.n ? '<span class="n">' + i.n + '</span>' : '') + '</button>';
            }).join('') +
          '</nav>' +
          '<p class="pequeno silenciado" style="margin-top:18px;padding:0 14px">' +
            ui.escapar(empresa.name) + '<br>Comissão da plataforma: ' +
            Number(empresa.commission_rate) + '%</p>' +
        '</aside>' +
        '<div id="painel-parceiro"></div>' +
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
    api.get('/comerciante/resumo').then(function (r) {
      var d = r.dados;
      document.getElementById('painel-parceiro').innerHTML =
        '<h1 style="margin-bottom:4px">' + ui.escapar(empresa.name) + '</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:20px">Como está a sua actividade na TEskBuy.</p>' +

        '<div class="kpis">' +
          '<div class="kpi"><p>Vendas</p><p class="v mono">' + ui.kz(d.vendas_total) + '</p></div>' +
          '<div class="kpi"><p>Comissão da plataforma</p><p class="v mono">' + ui.kz(d.comissao_plataforma) + '</p></div>' +
          '<div class="kpi"><p>Fica para si</p><p class="v mono">' + ui.kz(d.a_receber) + '</p></div>' +
          '<div class="kpi"><p>Unidades vendidas</p><p class="v mono">' + d.unidades_vendidas + '</p></div>' +
          '<div class="kpi"><p>Produtos</p><p class="v mono">' + d.produtos + '</p></div>' +
          '<div class="kpi' + (d.produtos_por_aprovar ? ' alerta' : '') + '"><p>Por aprovar</p>' +
            '<p class="v mono">' + d.produtos_por_aprovar + '</p></div>' +
          '<div class="kpi' + (d.produtos_sem_stock ? ' alerta' : '') + '"><p>Sem stock</p>' +
            '<p class="v mono">' + d.produtos_sem_stock + '</p></div>' +
          '<div class="kpi"><p>Classificação</p><p class="v mono">' +
            (d.avaliacoes ? d.classificacao.toFixed(1) + ' / 5' : '—') + '</p></div>' +
        '</div>' +

        '<div class="cartao">' +
          '<h3 style="margin-bottom:8px">Como funciona a comissão</h3>' +
          '<p class="silenciado pequeno">A TEskBuy retém ' + Number(d.taxa_comissao) +
          '% de cada venda. Os valores acima são calculados sobre tudo o que já vendeu ' +
          'através da plataforma.</p>' +
        '</div>';
    }).catch(erroPainel);
  }

  /* ── produtos ─────────────────────────────────────────────── */
  function verProdutos(estado) {
    esqueleto(3);
    var filtro = estado === undefined ? '' : estado;

    api.get('/comerciante/produtos', { estado: filtro || undefined, limite: 50 })
      .then(function (r) {
        var itens = r.dados || [];

        var filtros = ['', 'pendente', 'aprovado', 'rejeitado'].map(function (f) {
          return '<button class="pilula' + (f === filtro ? ' activa' : '') + '" data-filtro="' + f + '">' +
            (f ? ESTADO_MOD[f] : 'Todos') + '</button>';
        }).join('');

        document.getElementById('painel-parceiro').innerHTML =
          '<div class="entre" style="margin-bottom:14px">' +
            '<h1>Produtos</h1>' +
            '<button class="btn btn-principal btn-pequeno" id="novo-produto">Novo produto</button>' +
          '</div>' +
          '<div class="pilulas" style="margin-bottom:18px">' + filtros + '</div>' +
          (itens.length
            ? itens.map(cartaoProduto).join('')
            : '<div class="cartao-vazio"><h3>Ainda sem produtos</h3>' +
              '<p class="silenciado">Crie o primeiro e nós aprovamos antes de ir para a loja.</p></div>');

        document.getElementById('novo-produto').addEventListener('click', function () { editor(null); });
        document.querySelectorAll('[data-filtro]').forEach(function (b) {
          b.addEventListener('click', function () { verProdutos(b.getAttribute('data-filtro')); });
        });
        document.querySelectorAll('[data-editar]').forEach(function (b) {
          b.addEventListener('click', function () {
            editor(itens.filter(function (p) { return p.id === b.getAttribute('data-editar'); })[0]);
          });
        });
        document.querySelectorAll('[data-alternar]').forEach(function (b) {
          b.addEventListener('click', function () {
            api.patch('/comerciante/produtos/' + b.getAttribute('data-alternar') + '/estado', {
              activo: b.getAttribute('data-activo') !== 'true',
            }).then(function (res) {
              ui.notificar(res.mensagem, 'ok');
              verProdutos(filtro);
            }).catch(function (e) { ui.notificar(e.message, 'erro'); });
          });
        });
      })
      .catch(erroPainel);
  }

  function cartaoProduto(p) {
    var selo = p.moderation_status === 'aprovado' ? 'selo-desconto'
      : p.moderation_status === 'rejeitado' ? 'selo-esgotado' : 'selo-usado';

    return '<div class="cartao" style="margin-bottom:12px">' +
      '<div class="entre" style="gap:14px;align-items:flex-start">' +
        '<div style="display:flex;gap:14px;min-width:0">' +
          '<img src="' + (p.imagem || ui.imagem(p)) + '" alt="" ' +
            'style="width:64px;height:64px;object-fit:cover;border-radius:10px;flex-shrink:0">' +
          '<div style="min-width:0">' +
            '<strong>' + ui.escapar(p.name) + '</strong><br>' +
            '<span class="mono pequeno silenciado">' + ui.escapar(p.sku) + '</span><br>' +
            '<span class="selo ' + selo + '" style="position:static;display:inline-block;margin-top:6px">' +
              (ESTADO_MOD[p.moderation_status] || p.moderation_status) + '</span>' +
            (p.is_active ? '' : '<span class="selo selo-esgotado" style="position:static;display:inline-block;margin:6px 0 0 6px">Desactivado</span>') +
            (p.moderation_note ? '<p class="pequeno silenciado" style="margin-top:6px">' + ui.escapar(p.moderation_note) + '</p>' : '') +
          '</div>' +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0">' +
          '<p class="mono"><strong>' + ui.kz(p.price) + '</strong></p>' +
          '<p class="pequeno silenciado">' + p.stock_quantity + ' em stock</p>' +
        '</div>' +
      '</div>' +
      '<div class="linha-flex" style="margin-top:12px">' +
        '<button class="btn btn-secundario btn-pequeno" data-editar="' + p.id + '">Editar</button>' +
        '<button class="btn btn-fantasma btn-pequeno" data-alternar="' + p.id + '" ' +
          'data-activo="' + p.is_active + '">' + (p.is_active ? 'Desactivar' : 'Activar') + '</button>' +
      '</div>' +
    '</div>';
  }

  /* ── editor de produto ────────────────────────────────────── */
  function campo(id, etiqueta, valor, opcoes) {
    opcoes = opcoes || {};
    return '<div class="campo"><label for="' + id + '">' + etiqueta + '</label>' +
      (opcoes.area
        ? '<textarea id="' + id + '" rows="' + (opcoes.linhas || 3) + '">' + ui.escapar(valor || '') + '</textarea>'
        : '<input id="' + id + '" type="' + (opcoes.tipo || 'text') + '" value="' + ui.escapar(valor == null ? '' : valor) + '">') +
      (opcoes.ajuda ? '<span class="ajuda">' + opcoes.ajuda + '</span>' : '') +
      '</div>';
  }

  function editor(produto) {
    var novo = !produto;
    var p = produto || {};

    var fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.innerHTML =
      '<div class="modal">' +
        '<h2 style="margin-bottom:16px">' + (novo ? 'Novo produto' : 'Editar produto') + '</h2>' +
        campo('p-nome', 'Nome', p.name) +
        '<div class="campo-duplo">' +
          campo('p-sku', 'SKU', p.sku) +
          campo('p-slug', 'Endereço', p.slug, { ajuda: 'Só letras minúsculas, números e hífens.' }) +
        '</div>' +
        campo('p-curta', 'Descrição curta', p.short_description) +
        campo('p-desc', 'Descrição', p.description, { area: true, linhas: 4 }) +
        '<div class="campo-duplo">' +
          campo('p-preco', 'Preço (Kz)', p.price, { tipo: 'number' }) +
          campo('p-antes', 'Preço anterior (Kz)', p.compare_at_price, { tipo: 'number' }) +
        '</div>' +
        '<div class="campo-duplo">' +
          campo('p-stock', 'Stock', p.stock_quantity == null ? 0 : p.stock_quantity, { tipo: 'number' }) +
          campo('p-garantia', 'Garantia (meses)', p.warranty_months == null ? 0 : p.warranty_months, { tipo: 'number' }) +
        '</div>' +
        '<div class="campo"><label for="p-condicao">Estado</label>' +
          '<select id="p-condicao">' +
            ['novo', 'usado', 'recondicionado'].map(function (c) {
              return '<option value="' + c + '"' + (p.condition === c ? ' selected' : '') + '>' +
                ui.NOMES_CONDICAO[c] + '</option>';
            }).join('') +
          '</select></div>' +
        '<div class="campo"><label for="p-categoria">Categoria</label>' +
          '<select id="p-categoria"><option value="">Sem categoria</option></select></div>' +
        '<div class="campo"><label for="p-ficheiro">Imagens</label>' +
          '<input type="file" id="p-ficheiro" accept="image/*" multiple>' +
          '<span class="ajuda" id="p-estado-envio">Escolha as fotografias do produto. ' +
            'A primeira da lista é a principal.</span></div>' +
        campo('p-imagens', 'Endereços das imagens', (p.imagens || []).map(function (i) { return i.url; }).join('\n'),
          { area: true, linhas: 3, ajuda: 'Preenchido automaticamente. Pode reordenar ou colar endereços.' }) +
        '<div class="aviso aviso-info" style="margin:12px 0"><span>' +
          (novo ? 'Depois de criar, o produto fica à espera de aprovação.'
                : 'Se alterar um produto já aprovado, ele mantém-se na loja.') +
        '</span></div>' +
        '<div class="linha-flex" style="justify-content:flex-end">' +
          '<button class="btn btn-fantasma" id="p-cancelar">Cancelar</button>' +
          '<button class="btn btn-principal" id="p-guardar">' + (novo ? 'Criar produto' : 'Guardar') + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(fundo);

    // categorias, para o parceiro escolher a partir da lista da loja
    api.get('/catalogo/categorias').then(function (r) {
      var sel = fundo.querySelector('#p-categoria');
      (r.dados || []).forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name;
        if (p.category_id === c.id) o.selected = true;
        sel.appendChild(o);
      });
    }).catch(function () { /* sem categorias, o produto fica sem categoria */ });

    // carregamento das fotografias: vão directas para o Storage e o endereço
    // resultante é acrescentado à lista
    fundo.querySelector('#p-ficheiro').addEventListener('change', function (ev) {
      var ficheiros = Array.prototype.slice.call(ev.target.files || []);
      if (!ficheiros.length) return;

      var estado = fundo.querySelector('#p-estado-envio');
      var caixa = fundo.querySelector('#p-imagens');
      var enviados = 0;
      estado.textContent = 'A enviar 0 de ' + ficheiros.length + '…';

      ficheiros.reduce(function (cadeia, f) {
        return cadeia.then(function () {
          return ui.carregarFicheiro(f, 'produto').then(function (r) {
            enviados += 1;
            caixa.value = (caixa.value ? caixa.value.trim() + '\n' : '') + r.url;
            estado.textContent = 'A enviar ' + enviados + ' de ' + ficheiros.length + '…';
          });
        });
      }, Promise.resolve())
        .then(function () { estado.textContent = enviados + ' imagem(ns) carregada(s).'; })
        .catch(function (e) {
          estado.textContent = e.message || 'Não foi possível enviar.';
          ui.notificar(e.message || 'Não foi possível enviar a imagem.', 'erro');
        })
        .then(function () { ev.target.value = ''; });
    });

    function fechar() { fundo.remove(); }
    fundo.querySelector('#p-cancelar').addEventListener('click', fechar);
    fundo.addEventListener('click', function (ev) { if (ev.target === fundo) fechar(); });

    fundo.querySelector('#p-guardar').addEventListener('click', function (ev) {
      var botao = ev.currentTarget;
      function val(id) { return fundo.querySelector('#' + id).value.trim(); }

      var corpo = {
        name: val('p-nome'),
        sku: val('p-sku'),
        slug: val('p-slug'),
        short_description: val('p-curta') || null,
        description: val('p-desc') || null,
        condition: val('p-condicao'),
        price: Number(val('p-preco') || 0),
        compare_at_price: val('p-antes') ? Number(val('p-antes')) : null,
        stock_quantity: Number(val('p-stock') || 0),
        warranty_months: Number(val('p-garantia') || 0),
        category_id: val('p-categoria') || null,
        imagens: val('p-imagens').split('\n').map(function (l) { return l.trim(); }).filter(Boolean),
      };

      botao.disabled = true;
      botao.textContent = 'A guardar…';

      var pedido = novo
        ? api.post('/comerciante/produtos', corpo)
        : api.put('/comerciante/produtos/' + p.id, corpo);

      pedido
        .then(function (r) { ui.notificar(r.mensagem, 'ok'); fechar(); verProdutos(); })
        .catch(function (e) {
          var detalhe = e.detalhes && e.detalhes.length
            ? e.detalhes.map(function (d) { return d.mensagem; }).join(' ')
            : e.message;
          ui.notificar(detalhe, 'erro');
          botao.disabled = false;
          botao.textContent = novo ? 'Criar produto' : 'Guardar';
        });
    });
  }

  /* ── encomendas ───────────────────────────────────────────── */
  function verEncomendas() {
    esqueleto(3);
    api.get('/comerciante/encomendas', { limite: 50 }).then(function (r) {
      var itens = r.dados || [];

      document.getElementById('painel-parceiro').innerHTML =
        '<h1 style="margin-bottom:4px">Encomendas</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:18px">' +
          'Só as linhas com produtos seus. O estado é gerido pela TEskBuy.</p>' +
        (itens.length
          ? itens.map(function (l) {
              var e = l.encomenda || {};
              return '<div class="cartao" style="margin-bottom:12px">' +
                '<div class="entre" style="gap:14px;align-items:flex-start">' +
                  '<div style="min-width:0">' +
                    '<span class="mono pequeno silenciado">' + ui.escapar(e.order_number || '—') + '</span><br>' +
                    '<strong>' + ui.escapar(l.produto) + '</strong><br>' +
                    '<span class="pequeno silenciado">' + l.quantidade + ' × ' + ui.kz(l.preco) + '</span>' +
                  '</div>' +
                  '<div style="text-align:right;flex-shrink:0">' +
                    '<p class="mono"><strong>' + ui.kz(l.subtotal) + '</strong></p>' +
                    '<p class="pequeno silenciado">comissão ' + ui.kz(l.comissao) + '</p>' +
                    '<p class="pequeno">' + ui.escapar(ui.NOMES_ESTADO[e.status] || e.status || '') + '</p>' +
                  '</div>' +
                '</div>' +
                '<p class="pequeno silenciado" style="margin-top:10px">' +
                  ui.escapar(e.customer_name || '') + ' · ' +
                  ui.escapar([e.ship_municipality, e.ship_province].filter(Boolean).join(', ')) + ' · ' +
                  ui.data(e.placed_at, true) +
                '</p>' +
              '</div>';
            }).join('')
          : '<div class="cartao-vazio"><h3>Ainda sem vendas</h3>' +
            '<p class="silenciado">Assim que alguém comprar um produto seu, aparece aqui.</p></div>');
    }).catch(erroPainel);
  }

  /* ── avaliações ───────────────────────────────────────────── */
  function verAvaliacoes() {
    esqueleto(2);
    api.get('/comerciante/avaliacoes').then(function (r) {
      var itens = r.dados || [];

      document.getElementById('painel-parceiro').innerHTML =
        '<h1 style="margin-bottom:4px">Avaliações</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:18px">' +
          'Só quem comprou e recebeu pode avaliar.</p>' +
        (itens.length
          ? itens.map(function (a) {
              return '<div class="cartao" style="margin-bottom:12px">' +
                '<div class="entre">' +
                  '<strong>' + ui.escapar(a.cliente) + '</strong>' +
                  '<span class="mono">' + '★'.repeat(a.estrelas) + '</span>' +
                '</div>' +
                (a.comentario ? '<p style="margin-top:8px">' + ui.escapar(a.comentario) + '</p>' : '') +
                (a.resposta
                  ? '<div style="margin-top:10px;padding-left:12px;border-left:2px solid var(--orange)">' +
                      '<p class="pequeno silenciado">A sua resposta</p>' +
                      '<p class="pequeno">' + ui.escapar(a.resposta) + '</p></div>'
                  : '<div class="campo" style="margin-top:10px">' +
                      '<input id="resp-' + a.id + '" placeholder="Responder publicamente…">' +
                      '<button class="btn btn-secundario btn-pequeno" style="margin-top:8px" ' +
                        'data-responder="' + a.id + '">Responder</button>' +
                    '</div>') +
                '<p class="pequeno silenciado" style="margin-top:8px">' + ui.data(a.criada_em) + '</p>' +
              '</div>';
            }).join('')
          : '<div class="cartao-vazio"><h3>Ainda sem avaliações</h3>' +
            '<p class="silenciado">Aparecem aqui depois das primeiras entregas.</p></div>');

      document.querySelectorAll('[data-responder]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-responder');
          var texto = document.getElementById('resp-' + id).value.trim();
          if (texto.length < 2) return ui.notificar('Escreva a resposta.', 'erro');

          b.disabled = true;
          api.post('/comerciante/avaliacoes/' + id + '/resposta', { resposta: texto })
            .then(function (res) { ui.notificar(res.mensagem, 'ok'); verAvaliacoes(); })
            .catch(function (e) { ui.notificar(e.message, 'erro'); b.disabled = false; });
        });
      });
    }).catch(erroPainel);
  }

  /* ── dados da empresa ─────────────────────────────────────── */
  function verEmpresa() {
    var e = empresa;
    document.getElementById('painel-parceiro').innerHTML =
      '<h1 style="margin-bottom:4px">A minha empresa</h1>' +
      '<p class="silenciado pequeno" style="margin-bottom:18px">' +
        'A comissão e o estado da conta são definidos pela TEskBuy.</p>' +
      '<div class="cartao">' +
        campo('e-nome', 'Nome comercial', e.name) +
        '<div class="campo-duplo">' +
          campo('e-legal', 'Nome legal', e.legal_name) +
          campo('e-nif', 'NIF', e.tax_id) +
        '</div>' +
        '<div class="campo-duplo">' +
          campo('e-email', 'E-mail', e.email) +
          campo('e-tel', 'Telefone', e.phone) +
        '</div>' +
        '<div class="campo-duplo">' +
          campo('e-prov', 'Província', e.province) +
          campo('e-mun', 'Município', e.municipality) +
        '</div>' +
        campo('e-morada', 'Morada', e.address) +
        '<div class="campo"><label for="e-logo-ficheiro">Carregar logótipo</label>' +
          '<input type="file" id="e-logo-ficheiro" accept="image/*">' +
          '<span class="ajuda" id="e-logo-estado">PNG ou JPG, até 5 MB.</span></div>' +
        campo('e-logo', 'Endereço do logótipo', e.logo_url) +
        '<div class="campo"><label for="e-capa-ficheiro">Carregar foto de capa</label>' +
          '<input type="file" id="e-capa-ficheiro" accept="image/*">' +
          '<span class="ajuda" id="e-capa-estado">A faixa larga do seu perfil público. ' +
          'Fica melhor com uma imagem deitada, 1600×500 ou parecido.</span></div>' +
        campo('e-capa', 'Endereço da capa', e.cover_url) +
        campo('e-desc', 'Descrição', e.description, { area: true, linhas: 3 }) +
        '<p class="pequeno silenciado" style="margin:-6px 0 16px">' +
          'É assim que os clientes o vêem: ' +
          '<a href="/empresa?slug=' + encodeURIComponent(e.slug || '') + '" target="_blank" rel="noopener" ' +
          'style="color:var(--orange-soft)">ver o meu perfil público</a>.</p>' +
        '<button class="btn btn-principal" id="e-guardar">Guardar</button>' +
      '</div>';

    document.getElementById('e-logo-ficheiro').addEventListener('change', function (ev) {
      var f = (ev.target.files || [])[0];
      if (!f) return;
      var estado = document.getElementById('e-logo-estado');
      estado.textContent = 'A enviar…';

      ui.carregarFicheiro(f, 'logotipo')
        .then(function (r) {
          document.getElementById('e-logo').value = r.url;
          estado.textContent = 'Logótipo carregado. Não se esqueça de guardar.';
        })
        .catch(function (e2) {
          estado.textContent = e2.message || 'Não foi possível enviar.';
          ui.notificar(e2.message || 'Não foi possível enviar o logótipo.', 'erro');
        });
    });

    document.getElementById('e-capa-ficheiro').addEventListener('change', function (ev) {
      var f = (ev.target.files || [])[0];
      if (!f) return;
      var estado = document.getElementById('e-capa-estado');
      estado.textContent = 'A enviar…';

      ui.carregarFicheiro(f, 'logotipo')
        .then(function (r) {
          document.getElementById('e-capa').value = r.url;
          estado.textContent = 'Capa carregada. Não se esqueça de guardar.';
        })
        .catch(function (e2) {
          estado.textContent = e2.message || 'Não foi possível enviar.';
          ui.notificar(e2.message || 'Não foi possível enviar a capa.', 'erro');
        });
    });

    document.getElementById('e-guardar').addEventListener('click', function (ev) {
      var botao = ev.currentTarget;
      function val(id) { return document.getElementById(id).value.trim(); }

      var corpo = {
        name: val('e-nome'),
        legal_name: val('e-legal'),
        tax_id: val('e-nif'),
        email: val('e-email'),
        phone: val('e-tel'),
        province: val('e-prov'),
        municipality: val('e-mun'),
        address: val('e-morada'),
        logo_url: val('e-logo'),
        cover_url: val('e-capa'),
        description: val('e-desc'),
      };
      Object.keys(corpo).forEach(function (k) { if (!corpo[k]) delete corpo[k]; });

      botao.disabled = true;
      api.put('/comerciante/empresa', corpo)
        .then(function (r) {
          ui.notificar(r.mensagem, 'ok');
          Object.assign(empresa, corpo);
        })
        .catch(function (e2) { ui.notificar(e2.message, 'erro'); })
        .then(function () { botao.disabled = false; });
    });
  }

  /* ── afiliados que pediram para divulgar ─────────────────── */
  function verAfiliados() {
    esqueleto(2);
    api.get('/comerciante/afiliados').then(function (r) {
      var itens = r.dados || [];

      document.getElementById('painel-parceiro').innerHTML =
        '<h1 style="margin-bottom:4px">Afiliados</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:18px">' +
          'Pessoas que querem divulgar os seus produtos e ganhar uma comissão por venda. ' +
          'A TEskBuy já os analisou; a decisão é sua.</p>' +
        (itens.length
          ? itens.map(function (p) {
              var aEsperar = p.estado === 'enviado_vendedor';
              return '<div class="cartao" style="margin-bottom:12px">' +
                '<div class="entre">' +
                  '<strong>' + ui.escapar(p.afiliado ? (p.afiliado.nome || p.afiliado.email) : '—') + '</strong>' +
                  '<span class="pequeno silenciado">' + ui.data(p.criada_em) + '</span>' +
                '</div>' +
                (p.mensagem ? '<p class="pequeno" style="margin-top:8px">' + ui.escapar(p.mensagem) + '</p>' : '') +
                (p.nota_admin
                  ? '<p class="pequeno silenciado" style="margin-top:6px">TEskBuy: ' + ui.escapar(p.nota_admin) + '</p>'
                  : '') +
                (aEsperar
                  ? '<div class="campo" style="margin:12px 0 8px;max-width:240px">' +
                      '<label for="ac-' + p.id + '">Comissão (%)</label>' +
                      '<input id="ac-' + p.id + '" type="number" min="0" max="100" step="0.5" ' +
                        'value="' + (p.comissao != null ? p.comissao : 5) + '">' +
                    '</div>' +
                    '<div class="campo" style="margin-bottom:12px">' +
                      '<label for="an-' + p.id + '">Nota para o afiliado</label>' +
                      '<input id="an-' + p.id + '" placeholder="Opcional.">' +
                    '</div>' +
                    '<div class="linha-flex">' +
                      '<button class="btn btn-principal btn-pequeno" data-adec="aceitar" data-aid="' + p.id + '">Aceitar</button>' +
                      '<button class="btn btn-fantasma btn-pequeno" data-adec="recusar" data-aid="' + p.id + '">Recusar</button>' +
                    '</div>'
                  : '<p class="pequeno" style="margin-top:10px">' +
                      (p.estado === 'aceite'
                        ? 'Aceite' + (p.comissao != null ? ' · comissão de ' + Number(p.comissao) + '%' : '')
                        : 'Recusada') +
                    '</p>') +
              '</div>';
            }).join('')
          : '<div class="cartao-vazio"><h3>Ainda sem pedidos</h3>' +
            '<p class="silenciado">Quando um afiliado quiser divulgar os seus produtos, aparece aqui.</p></div>');

      document.querySelectorAll('[data-adec]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-aid');
          var nota = document.getElementById('an-' + id);
          var com = document.getElementById('ac-' + id);

          b.disabled = true;
          api.patch('/comerciante/afiliados/' + id, {
            decisao: b.getAttribute('data-adec'),
            nota: nota && nota.value.trim() ? nota.value.trim() : undefined,
            comissao: com && com.value ? Number(com.value) : undefined,
          })
            .then(function (res) { ui.notificar(res.mensagem, 'ok'); verAfiliados(); })
            .catch(function (e) { ui.notificar(e.message, 'erro'); b.disabled = false; });
        });
      });
    }).catch(erroPainel);
  }

  /* ── suporte: falar com a TEskBuy ────────────────────────── */
  var CATEGORIAS = {
    conta: 'Conta da empresa', produtos: 'Produtos', encomendas: 'Encomendas',
    pagamentos: 'Pagamentos', comissoes: 'Comissões', afiliados: 'Afiliados',
    reembolsos: 'Reembolsos', tecnico: 'Problema técnico',
    contestacao: 'Contestar uma decisão', outro: 'Outro assunto',
  };
  var ESTADO_TK = {
    aberto: 'Aberto', em_analise: 'Em análise', aguarda_empresa: 'À sua espera',
    aguarda_admin: 'Com a TEskBuy', resolvido: 'Resolvido', fechado: 'Fechado',
  };

  function verSuporte() {
    esqueleto(2);
    api.get('/comerciante/tickets').then(function (r) {
      var itens = r.dados || [];

      document.getElementById('painel-parceiro').innerHTML =
        '<h1 style="margin-bottom:4px">Suporte</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:16px">' +
          'Este é o canal directo com a administração da TEskBuy.</p>' +

        '<div class="cartao" style="margin-bottom:18px">' +
          '<h3 style="margin-bottom:12px">Nova solicitação</h3>' +
          '<div class="campo-duplo">' +
            '<div class="campo"><label for="t-assunto">Assunto</label><input id="t-assunto"></div>' +
            '<div class="campo"><label for="t-cat">Categoria</label><select id="t-cat">' +
              Object.keys(CATEGORIAS).map(function (k) {
                return '<option value="' + k + '">' + CATEGORIAS[k] + '</option>';
              }).join('') +
            '</select></div>' +
          '</div>' +
          '<div class="campo"><label for="t-msg">Mensagem</label><textarea id="t-msg" rows="3"></textarea></div>' +
          '<button class="btn btn-principal" id="t-abrir">Abrir solicitação</button>' +
        '</div>' +

        (itens.length
          ? itens.map(function (t) {
              return '<div class="cartao" style="margin-bottom:12px">' +
                '<div class="entre" style="margin-bottom:8px">' +
                  '<div><span class="mono pequeno silenciado">' + ui.escapar(t.numero) + '</span><br>' +
                    '<strong>' + ui.escapar(t.assunto) + '</strong></div>' +
                  '<span class="selo selo-usado" style="position:static">' +
                    ui.escapar(ESTADO_TK[t.estado] || t.estado) + '</span>' +
                '</div>' +
                '<div style="margin:10px 0">' +
                  t.mensagens.map(function (m) {
                    return '<div style="padding:8px 0;border-bottom:1px solid rgba(238,247,248,.06)">' +
                      '<p class="pequeno silenciado">' + (m.da_equipa ? 'TEskBuy' : ui.escapar(m.autor)) +
                        ' · ' + ui.data(m.criada_em, true) + '</p>' +
                      '<p class="pequeno" style="margin-top:4px">' + ui.escapar(m.texto) + '</p>' +
                    '</div>';
                  }).join('') +
                '</div>' +
                (t.estado !== 'fechado' && t.estado !== 'resolvido'
                  ? '<div class="campo"><label for="tr-' + t.id + '">Responder</label>' +
                      '<textarea id="tr-' + t.id + '" rows="2"></textarea></div>' +
                    '<button class="btn btn-secundario btn-pequeno" data-tresp="' + t.id + '">Enviar</button>'
                  : '') +
              '</div>';
            }).join('')
          : '<div class="cartao-vazio"><h3>Sem solicitações</h3>' +
            '<p class="silenciado">Abra uma acima quando precisar de nós.</p></div>');

      document.getElementById('t-abrir').addEventListener('click', function (ev) {
        var botao = ev.currentTarget;
        var assunto = document.getElementById('t-assunto').value.trim();
        var mensagem = document.getElementById('t-msg').value.trim();
        if (assunto.length < 3 || mensagem.length < 5) {
          return ui.notificar('Escreva o assunto e a mensagem.', 'erro');
        }
        botao.disabled = true;
        api.post('/comerciante/tickets', {
          assunto: assunto,
          categoria: document.getElementById('t-cat').value,
          mensagem: mensagem,
        })
          .then(function (res) { ui.notificar(res.mensagem, 'ok'); verSuporte(); })
          .catch(function (e) { ui.notificar(e.message, 'erro'); botao.disabled = false; });
      });

      document.querySelectorAll('[data-tresp]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-tresp');
          var campo = document.getElementById('tr-' + id);
          if (!campo || !campo.value.trim()) return ui.notificar('Escreva a mensagem.', 'erro');
          b.disabled = true;
          api.post('/comerciante/tickets/' + id + '/mensagens', { mensagem: campo.value.trim() })
            .then(function (res) { ui.notificar(res.mensagem, 'ok'); verSuporte(); })
            .catch(function (e) { ui.notificar(e.message, 'erro'); b.disabled = false; });
        });
      });
    }).catch(erroPainel);
  }

  /* ── mensagens de clientes e afiliados ───────────────────── */
  function verMensagens() {
    esqueleto(2);
    api.get('/comerciante/conversas').then(function (r) {
      var itens = r.dados || [];

      document.getElementById('painel-parceiro').innerHTML =
        '<h1 style="margin-bottom:4px">Mensagens</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:16px">' +
          'Conversas com clientes e afiliados. A TEskBuy não as lê.</p>' +
        (itens.length
          ? itens.map(function (c) {
              return '<div class="cartao" style="margin-bottom:12px">' +
                '<div class="entre" style="margin-bottom:8px">' +
                  '<strong>' + ui.escapar(c.cliente ? c.cliente.nome : 'Cliente') + '</strong>' +
                  '<span class="pequeno silenciado">' +
                    (c.tipo === 'afiliado_empresa' ? 'Afiliado' : 'Cliente') +
                    (c.por_ler ? ' · ' + c.por_ler + ' por ler' : '') + '</span>' +
                '</div>' +
                '<div style="max-height:240px;overflow:auto;margin-bottom:10px">' +
                  c.mensagens.map(function (m) {
                    return '<div style="padding:7px 0;border-bottom:1px solid rgba(238,247,248,.06)">' +
                      '<p class="pequeno silenciado">' + (m.minha ? 'Eu' : 'Cliente') + ' · ' +
                        ui.data(m.criada_em, true) + '</p>' +
                      '<p class="pequeno">' + ui.escapar(m.texto) + '</p>' +
                    '</div>';
                  }).join('') +
                '</div>' +
                '<div class="campo"><input id="cv-' + c.id + '" placeholder="Responder…"></div>' +
                '<button class="btn btn-secundario btn-pequeno" data-cenviar="' + c.id + '">Enviar</button>' +
              '</div>';
            }).join('')
          : '<div class="cartao-vazio"><h3>Sem mensagens</h3>' +
            '<p class="silenciado">Os clientes podem escrever-lhe a partir dos seus produtos.</p></div>');

      document.querySelectorAll('[data-cenviar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-cenviar');
          var campo = document.getElementById('cv-' + id);
          if (!campo.value.trim()) return ui.notificar('Escreva a mensagem.', 'erro');
          b.disabled = true;
          api.post('/comerciante/conversas/' + id + '/mensagens', { mensagem: campo.value.trim() })
            .then(function (res) { ui.notificar(res.mensagem, 'ok'); verMensagens(); })
            .catch(function (e) { ui.notificar(e.message, 'erro'); b.disabled = false; });
        });
      });
    }).catch(erroPainel);
  }

  function abrir() {
    if (vista === 'produtos') return verProdutos();
    if (vista === 'encomendas') return verEncomendas();
    if (vista === 'afiliados') return verAfiliados();
    if (vista === 'avaliacoes') return verAvaliacoes();
    if (vista === 'mensagens') return verMensagens();
    if (vista === 'suporte') return verSuporte();
    if (vista === 'empresa') return verEmpresa();
    return verResumo();
  }

  /* ── arranque ─────────────────────────────────────────────── */
  conteudo.innerHTML = '<div style="padding:40px 0">' + ui.esqueletos(2, 'esqueleto') + '</div>';

  api.get('/comerciante/empresa')
    .then(function (r) {
      empresa = r.dados;
      return api.get('/comerciante/resumo');
    })
    .then(function (r) {
      moldura(r.dados.produtos_por_aprovar);
      abrir();
    })
    .catch(function (e) {
      conteudo.innerHTML =
        '<div class="cartao-vazio" style="margin:40px 0 70px">' +
          '<h3>Esta área é para parceiros aprovados</h3>' +
          '<p class="silenciado" style="margin:10px 0 18px">' + ui.escapar(e.message) + '</p>' +
          '<a class="btn btn-principal" href="/parceiro">Candidatar-me</a>' +
        '</div>';
    });
})();
