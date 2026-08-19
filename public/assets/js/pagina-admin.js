/* TeskBuy — painel de gestão (admin e gestor) */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  var conteudo = document.getElementById('conteudo');

  /* ── ecrã de entrada próprio da equipa ───────────────────────
     Sem sessão, o /admin deixa de passar pela página da loja: mostra
     aqui a sua própria caixa de entrada, sem menu, sem rodapé e sem
     "criar conta". O cabeçalho e o rodapé ficam vazios de propósito,
     porque o ui.iniciar() só corre depois de haver sessão. */
  function ecraEntradaEquipa() {
    document.title = 'Área de gestão — TeskBuy';

    conteudo.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;min-height:78vh;padding:40px 0">' +
        '<div style="width:min(400px,100%)">' +
          '<div style="text-align:center;margin-bottom:26px">' +
            '<p style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:26px">' +
              '<span class="accent">Tesk</span><span style="color:var(--teal-bright)">Buy</span></p>' +
            '<p class="mono" style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;' +
              'color:var(--ink-dim);margin-top:6px">Área de gestão</p>' +
          '</div>' +
          '<div class="cartao" style="padding:30px">' +
            '<h1 style="font-size:22px;margin-bottom:6px">Entrar</h1>' +
            '<p class="pequeno silenciado" style="margin-bottom:22px">Acesso reservado à equipa TeskBuy.</p>' +
            '<div id="aviso-equipa"></div>' +
            '<form id="form-equipa">' +
              '<div class="campo"><label for="eq-email">E-mail</label>' +
                '<input type="email" id="eq-email" autocomplete="email" required ' +
                'placeholder="admin@teskbuy.com"></div>' +
              '<div class="campo"><label for="eq-passe">Palavra-passe</label>' +
                '<input type="password" id="eq-passe" autocomplete="current-password" required ' +
                'placeholder="••••••••"></div>' +
              '<button class="btn btn-principal btn-largo" type="submit" id="eq-btn">Entrar</button>' +
            '</form>' +
            '<p class="pequeno silenciado centro" style="margin-top:18px">' +
              '<a href="/" style="color:var(--ink-dim);text-decoration:none">← Voltar à loja</a></p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var formEq = document.getElementById('form-equipa');
    var btnEq = document.getElementById('eq-btn');
    var alvoEq = document.getElementById('aviso-equipa');

    function avisarEq(mensagem, tipo) {
      alvoEq.innerHTML = '<div class="aviso aviso-' + (tipo || 'erro') +
        '" style="margin-bottom:18px">' + ui.escapar(mensagem) + '</div>';
    }

    formEq.addEventListener('submit', function (ev) {
      ev.preventDefault();
      alvoEq.innerHTML = '';
      btnEq.disabled = true;
      btnEq.textContent = 'A entrar…';

      api.entrar({
        email: document.getElementById('eq-email').value.trim(),
        palavra_passe: document.getElementById('eq-passe').value,
      })
        .then(function () { return api.get('/auth/eu'); })
        .then(function (r) {
          var papel = r.dados.utilizador.papel;
          if (papel !== 'admin' && papel !== 'gestor') {
            return api.sair().then(function () {
              btnEq.disabled = false;
              btnEq.textContent = 'Entrar';
              avisarEq('Esta conta não tem acesso à área de gestão.');
            });
          }
          location.reload();
        })
        .catch(function (e) {
          btnEq.disabled = false;
          btnEq.textContent = 'Entrar';
          avisarEq(e.message);
        });
    });

    document.getElementById('eq-email').focus();
  }

  if (!api.sessao.activa()) { ecraEntradaEquipa(); return; }

  ui.iniciar();

  var ESTADOS =['pendente', 'confirmada', 'em_preparacao', 'enviada', 'entregue', 'cancelada', 'reembolsada'];

  var vista = location.hash.replace('#', '') || 'painel';
  var eu = null;
  var categorias = [];
  var marcas = [];

  /* ── utilitários ─────────────────────────────────────────── */
  function esqueleto(n) {
    document.getElementById('painel-admin').innerHTML = ui.esqueletos(n || 3, 'esqueleto');
  }

  function modal(titulo, corpoHtml, aoConfirmar, textoBotao) {
    var fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<div class="linha-flex" style="justify-content:space-between;margin-bottom:18px">' +
          '<h2 style="font-size:19px">' + titulo + '</h2>' +
          '<button class="icone-btn" data-fechar aria-label="Fechar">✕</button>' +
        '</div>' +
        '<form id="form-modal">' + corpoHtml +
          '<div class="linha-flex" style="justify-content:flex-end;gap:10px;margin-top:20px">' +
            '<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button>' +
            '<button type="submit" class="btn btn-principal">' + (textoBotao || 'Guardar') + '</button>' +
          '</div>' +
          '<div id="erro-modal"></div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(fundo);
    function fechar() { fundo.remove(); }
    fundo.querySelectorAll('[data-fechar]').forEach(function (b) { b.addEventListener('click', fechar); });
    fundo.addEventListener('click', function (ev) { if (ev.target === fundo) fechar(); });

    fundo.querySelector('#form-modal').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = fundo.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'A guardar…';
      Promise.resolve(aoConfirmar(fundo))
        .then(fechar)
        .catch(function (e) {
          btn.disabled = false;
          btn.textContent = textoBotao || 'Guardar';
          fundo.querySelector('#erro-modal').innerHTML =
            '<div class="aviso aviso-erro" style="margin-top:14px">' + ui.escapar(e.message) + '</div>';
        });
    });
    return fundo;
  }

  function valor(fundo, id) { return fundo.querySelector('#' + id).value.trim(); }

  /* ── moldura ─────────────────────────────────────────────── */
  function moldura(pendentes, stockBaixo) {
    var itens = [
      { id: 'painel', nome: 'Resumo' },
      { id: 'encomendas', nome: 'Encomendas', n: pendentes },
      { id: 'produtos', nome: 'Produtos' },
      { id: 'stock', nome: 'Stock', n: stockBaixo },
      { id: 'cupoes', nome: 'Cupões' },
      { id: 'candidaturas', nome: 'Candidaturas' },
      { id: 'parcerias', nome: 'Parcerias' },
    ];
    if (eu.papel === 'admin') itens.push({ id: 'utilizadores', nome: 'Utilizadores' });
    if (eu.papel === 'admin') itens.push({ id: 'conteudo', nome: 'Conteúdo' });

    conteudo.innerHTML =
      '<div class="admin-grelha">' +
        '<aside>' +
          '<p class="eyebrow" style="margin-bottom:14px">Gestão</p>' +
          '<nav class="admin-menu">' +
            itens.map(function (i) {
              return '<button data-vista="' + i.id + '" class="' + (vista === i.id ? 'activo' : '') + '">' +
                i.nome + (i.n ? '<span class="n">' + i.n + '</span>' : '') + '</button>';
            }).join('') +
          '</nav>' +
          '<p class="pequeno silenciado" style="margin-top:18px;padding:0 14px">' +
            'Sessão de ' + ui.escapar(eu.nome || eu.email) + '</p>' +
        '</aside>' +
        '<div id="painel-admin"></div>' +
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

  /* ── resumo ──────────────────────────────────────────────── */
  function verPainel() {
    esqueleto(2);
    api.get('/admin/painel').then(function (r) {
      var d = r.dados;
      var maxima = Math.max.apply(null, d.receita_7_dias.map(function (s) { return s.total; }).concat([1]));

      document.getElementById('painel-admin').innerHTML =
        '<h1 style="margin-bottom:4px">Resumo</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:20px">Como está a loja neste momento.</p>' +

        '<div class="kpis">' +
          '<div class="kpi"><p>Receita total</p><p class="v mono">' + ui.kz(d.receita_total) + '</p></div>' +
          '<div class="kpi"><p>Receita do mês</p><p class="v mono">' + ui.kz(d.receita_mes) + '</p></div>' +
          '<div class="kpi"><p>Encomendas</p><p class="v mono">' + d.encomendas_total + '</p></div>' +
          '<div class="kpi' + (d.encomendas_pendentes ? ' alerta' : '') + '"><p>Por tratar</p>' +
            '<p class="v mono">' + d.encomendas_pendentes + '</p></div>' +
          '<div class="kpi"><p>Ticket médio</p><p class="v mono">' + ui.kz(d.ticket_medio) + '</p></div>' +
          '<div class="kpi"><p>Clientes</p><p class="v mono">' + d.clientes_total + '</p></div>' +
          '<div class="kpi' + (d.produtos_sem_stock ? ' alerta' : '') + '"><p>Sem stock</p>' +
            '<p class="v mono">' + d.produtos_sem_stock + '</p></div>' +
          '<div class="kpi"><p>Valor em inventário</p><p class="v mono">' + ui.kz(d.valor_inventario) + '</p></div>' +
        '</div>' +

        '<div class="cartao" style="margin-bottom:16px">' +
          '<h3 style="margin-bottom:6px">Receita dos últimos 7 dias</h3>' +
          '<div class="barras">' +
            d.receita_7_dias.map(function (s) {
              return '<div style="height:' + Math.max(3, (s.total / maxima) * 100) + '%" ' +
                'title="' + s.dia + ': ' + ui.kz(s.total) + '"></div>';
            }).join('') +
          '</div>' +
          '<div class="barras-eixo">' +
            d.receita_7_dias.map(function (s) { return '<span>' + s.dia.slice(8) + '/' + s.dia.slice(5, 7) + '</span>'; }).join('') +
          '</div>' +
        '</div>' +

        '<div class="grelha-2" style="align-items:start">' +
          '<div class="cartao">' +
            '<h3 style="margin-bottom:12px">Últimas encomendas</h3>' +
            (d.ultimas_encomendas.length
              ? d.ultimas_encomendas.map(function (e) {
                  return '<a href="#encomendas" class="linha-flex" style="justify-content:space-between;' +
                    'padding:9px 0;border-bottom:1px solid rgba(238,247,248,.06);text-decoration:none;color:inherit">' +
                    '<div><p class="mono pequeno">' + ui.escapar(e.numero) + '</p>' +
                      '<p class="pequeno silenciado">' + ui.escapar(e.cliente) + '</p></div>' +
                    '<div style="text-align:right">' +
                      '<p class="mono pequeno">' + ui.kz(e.total) + '</p>' +
                      '<span class="estado estado-' + e.estado + '" style="margin-top:4px">' +
                        (ui.NOMES_ESTADO[e.estado] || e.estado) + '</span></div>' +
                  '</a>';
                }).join('')
              : '<p class="pequeno silenciado">Ainda sem encomendas.</p>') +
          '</div>' +
          '<div class="cartao">' +
            '<h3 style="margin-bottom:12px">Mais vendidos</h3>' +
            (d.mais_vendidos.length
              ? d.mais_vendidos.map(function (p) {
                  return '<div class="linha-flex" style="justify-content:space-between;padding:9px 0;' +
                    'border-bottom:1px solid rgba(238,247,248,.06)">' +
                    '<span class="pequeno">' + ui.escapar(p.nome) + '</span>' +
                    '<span class="mono pequeno">' + p.unidades + ' un.</span></div>';
                }).join('')
              : '<p class="pequeno silenciado">Sem vendas registadas.</p>') +
          '</div>' +
        '</div>';
    }).catch(erroPainel);
  }

  /* ── encomendas ──────────────────────────────────────────── */
  function verEncomendas(filtros) {
    filtros = filtros || { pagina: 1 };
    esqueleto(3);

    api.get('/admin/encomendas', {
      pagina: filtros.pagina, limite: 20, estado: filtros.estado, q: filtros.q,
    }).then(function (r) {
      var lista = r.dados || [];

      document.getElementById('painel-admin').innerHTML =
        '<h1 style="margin-bottom:4px">Encomendas</h1>' +
        '<p class="silenciado pequeno" style="margin-bottom:18px">Confirme, prepare e acompanhe cada entrega.</p>' +
        '<div class="barra-topo">' +
          '<input id="procura-enc" placeholder="Número, nome ou telefone" value="' + ui.escapar(filtros.q || '') + '">' +
          '<select id="filtro-estado"><option value="">Todos os estados</option>' +
            ESTADOS.map(function (e) {
              return '<option value="' + e + '"' + (filtros.estado === e ? ' selected' : '') + '>' +
                (ui.NOMES_ESTADO[e] || e) + '</option>';
            }).join('') +
          '</select>' +
          '<button class="btn btn-secundario btn-pequeno" id="aplicar">Aplicar</button>' +
        '</div>' +

        (lista.length
          ? '<div class="tabela-env"><table><thead><tr>' +
              '<th>Encomenda</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Estado</th><th></th>' +
            '</tr></thead><tbody>' +
              lista.map(function (e) {
                return '<tr>' +
                  '<td><span class="mono">' + ui.escapar(e.order_number) + '</span>' +
                    '<br><span class="pequeno silenciado">' + ui.data(e.created_at) + '</span></td>' +
                  '<td>' + ui.escapar(e.customer_name) +
                    '<br><span class="pequeno silenciado mono">' + ui.escapar(e.customer_phone) + '</span></td>' +
                  '<td class="mono">' + ui.kz(e.total) + '</td>' +
                  '<td class="pequeno">' + (ui.NOMES_PAGAMENTO[e.payment_method] || '') + '</td>' +
                  '<td><span class="estado estado-' + e.status + '">' +
                    (ui.NOMES_ESTADO[e.status] || e.status) + '</span></td>' +
                  '<td><button class="btn btn-secundario btn-pequeno" data-gerir="' + e.id + '">Gerir</button></td>' +
                '</tr>';
              }).join('') +
            '</tbody></table></div>' +
            paginador(r.paginacao, filtros)
          : '<div class="cartao-vazio"><h3>Sem encomendas</h3><p>Nenhuma encomenda corresponde a este filtro.</p></div>');

      document.getElementById('aplicar').addEventListener('click', function () {
        verEncomendas({
          pagina: 1,
          q: document.getElementById('procura-enc').value.trim(),
          estado: document.getElementById('filtro-estado').value,
        });
      });

      document.querySelectorAll('[data-gerir]').forEach(function (b) {
        b.addEventListener('click', function () {
          var e = lista.filter(function (x) { return x.id === b.getAttribute('data-gerir'); })[0];
          gerirEncomenda(e, filtros);
        });
      });

      ligarPaginador(filtros, verEncomendas);
    }).catch(erroPainel);
  }

  function gerirEncomenda(e, filtros) {
    modal('Encomenda ' + ui.escapar(e.order_number),
      '<div class="cartao" style="margin-bottom:16px;background:rgba(238,247,248,.03)">' +
        (e.itens || []).map(function (i) {
          return '<div class="linha-flex" style="justify-content:space-between;padding:5px 0">' +
            '<span class="pequeno">' + ui.escapar(i.product_name) + ' × ' + i.quantity + '</span>' +
            '<span class="mono pequeno">' + ui.kz(i.subtotal) + '</span></div>';
        }).join('') +
        '<div class="linha-flex" style="justify-content:space-between;border-top:1px solid var(--linha);' +
          'margin-top:8px;padding-top:10px"><strong>Total</strong>' +
          '<strong class="mono">' + ui.kz(e.total) + '</strong></div>' +
      '</div>' +
      '<p class="pequeno silenciado" style="margin-bottom:14px">' +
        ui.escapar(e.customer_name) + ' · ' + ui.escapar(e.customer_phone) + '<br>' +
        [e.ship_street, e.ship_neighbourhood, e.ship_municipality, e.ship_province]
          .filter(Boolean).map(ui.escapar).join(', ') + '</p>' +
      '<div class="campo"><label for="novo-estado">Novo estado</label>' +
        '<select id="novo-estado">' +
          ESTADOS.map(function (s) {
            return '<option value="' + s + '"' + (s === e.status ? ' selected' : '') + '>' +
              (ui.NOMES_ESTADO[s] || s) + '</option>';
          }).join('') +
        '</select>' +
        '<span class="ajuda">Cancelar repõe automaticamente o stock dos artigos.</span></div>' +
      '<div class="campo"><label for="nota-estado">Nota (opcional)</label>' +
        '<input id="nota-estado" placeholder="Ex.: cliente confirmou por telefone"></div>',
      function (fundo) {
        return api.patch('/admin/encomendas/' + e.id + '/estado', {
          estado: fundo.querySelector('#novo-estado').value,
          nota: valor(fundo, 'nota-estado') || null,
        }).then(function () {
          ui.notificar('Estado actualizado.', 'ok');
          verEncomendas(filtros);
        });
      },
      'Actualizar estado');
  }

  /* ── produtos ────────────────────────────────────────────── */
  function verProdutos(filtros) {
    filtros = filtros || { pagina: 1 };
    esqueleto(3);

    api.get('/produtos', { pagina: filtros.pagina, limite: 24, q: filtros.q, ordenar: 'recentes' })
      .then(function (r) {
        var lista = r.dados || [];

        document.getElementById('painel-admin').innerHTML =
          '<div class="linha-flex" style="justify-content:space-between;align-items:flex-end;margin-bottom:18px">' +
            '<div><h1 style="margin-bottom:4px">Produtos</h1>' +
              '<p class="silenciado pequeno">' + (r.paginacao ? r.paginacao.total : lista.length) + ' no catálogo</p></div>' +
            '<button class="btn btn-principal btn-pequeno" id="novo-produto">Adicionar produto</button>' +
          '</div>' +
          '<div class="barra-topo">' +
            '<input id="procura-prod" placeholder="Nome ou SKU" value="' + ui.escapar(filtros.q || '') + '">' +
            '<button class="btn btn-secundario btn-pequeno" id="aplicar">Procurar</button>' +
          '</div>' +

          (lista.length
            ? '<div class="tabela-env"><table><thead><tr>' +
                '<th>Produto</th><th>Preço</th><th>Stock</th><th>Estado</th><th></th></tr></thead><tbody>' +
                lista.map(function (p) {
                  return '<tr>' +
                    '<td><div class="linha-flex" style="gap:10px">' +
                      '<img src="' + ui.imagem(p) + '" alt="" style="width:38px;height:38px;border-radius:8px;object-fit:cover">' +
                      '<div><p>' + ui.escapar(p.name) + '</p>' +
                        '<p class="pequeno silenciado mono">' + ui.escapar(p.sku) + '</p></div></div></td>' +
                    '<td class="mono">' + ui.kz(p.price) + '</td>' +
                    '<td class="mono"' + (p.stock_quantity === 0 ? ' style="color:#ff8a86"' :
                      p.stock_baixo ? ' style="color:var(--ambar)"' : '') + '>' + p.stock_quantity + '</td>' +
                    '<td class="pequeno">' + (p.is_active ? 'Activo' : 'Inactivo') +
                      (p.is_featured ? ' · Destaque' : '') + '</td>' +
                    '<td><button class="btn btn-secundario btn-pequeno" data-editar="' + p.id + '">Editar</button></td>' +
                  '</tr>';
                }).join('') +
              '</tbody></table></div>' + paginador(r.paginacao, filtros)
            : '<div class="cartao-vazio"><h3>Sem produtos</h3><p>Nenhum produto corresponde à procura.</p></div>');

        document.getElementById('aplicar').addEventListener('click', function () {
          verProdutos({ pagina: 1, q: document.getElementById('procura-prod').value.trim() });
        });
        document.getElementById('novo-produto').addEventListener('click', function () {
          formularioProduto(null, filtros);
        });
        document.querySelectorAll('[data-editar]').forEach(function (b) {
          b.addEventListener('click', function () {
            formularioProduto(lista.filter(function (x) { return x.id === b.getAttribute('data-editar'); })[0], filtros);
          });
        });

        ligarPaginador(filtros, verProdutos);
      }).catch(erroPainel);
  }

  function formularioProduto(p, filtros) {
    var edicao = Boolean(p);
    p = p || {};

    var caixa = modal(edicao ? 'Editar produto' : 'Adicionar produto',
      '<div class="campo-duplo">' +
        '<div class="campo"><label for="p-nome">Nome</label>' +
          '<input id="p-nome" required value="' + ui.escapar(p.name || '') + '"></div>' +
        '<div class="campo"><label for="p-sku">SKU</label>' +
          '<input id="p-sku" required value="' + ui.escapar(p.sku || '') + '"></div>' +
      '</div>' +
      '<div class="campo"><label for="p-slug">Endereço na loja (slug)</label>' +
        '<input id="p-slug" required value="' + ui.escapar(p.slug || '') + '" placeholder="ex-samsung-galaxy-a55">' +
        '<span class="ajuda">Só minúsculas, números e hífens.</span></div>' +
      '<div class="campo"><label for="p-curta">Descrição curta</label>' +
        '<input id="p-curta" value="' + ui.escapar(p.short_description || '') + '"></div>' +
      '<div class="campo"><label for="p-desc">Descrição</label>' +
        '<textarea id="p-desc">' + ui.escapar(p.description || '') + '</textarea></div>' +
      '<div class="campo-duplo">' +
        '<div class="campo"><label for="p-categoria">Categoria</label><select id="p-categoria">' +
          '<option value="">Sem categoria</option>' +
          categorias.map(function (c) {
            return '<option value="' + c.id + '"' + (c.id === p.category_id ? ' selected' : '') + '>' +
              ui.escapar(c.name) + '</option>';
          }).join('') + '</select></div>' +
        '<div class="campo"><label for="p-marca">Marca</label><select id="p-marca">' +
          '<option value="">Sem marca</option>' +
          marcas.map(function (m) {
            return '<option value="' + m.id + '"' + (m.id === p.brand_id ? ' selected' : '') + '>' +
              ui.escapar(m.name) + '</option>';
          }).join('') + '</select></div>' +
      '</div>' +
      '<div class="campo-duplo">' +
        '<div class="campo"><label for="p-preco">Preço (Kz)</label>' +
          '<input id="p-preco" type="number" min="0" step="1" required value="' + (p.price || '') + '"></div>' +
        '<div class="campo"><label for="p-antigo">Preço anterior (Kz)</label>' +
          '<input id="p-antigo" type="number" min="0" step="1" value="' + (p.compare_at_price || '') + '">' +
          '<span class="ajuda">Deixe vazio se não houver desconto.</span></div>' +
      '</div>' +
      '<div class="campo-duplo">' +
        '<div class="campo"><label for="p-stock">Stock</label>' +
          '<input id="p-stock" type="number" min="0" step="1" value="' + (p.stock_quantity != null ? p.stock_quantity : 0) + '"></div>' +
        '<div class="campo"><label for="p-condicao">Estado do artigo</label><select id="p-condicao">' +
          ['novo', 'usado', 'recondicionado'].map(function (c) {
            return '<option value="' + c + '"' + (c === (p.condition || 'novo') ? ' selected' : '') + '>' +
              ui.NOMES_CONDICAO[c] + '</option>';
          }).join('') + '</select></div>' +
      '</div>' +
      '<div class="campo-duplo">' +
        '<div class="campo"><label for="p-garantia">Garantia (meses)</label>' +
          '<input id="p-garantia" type="number" min="0" value="' + (p.warranty_months || 0) + '"></div>' +
        '<div class="campo"><label for="p-limite">Alertar com stock abaixo de</label>' +
          '<input id="p-limite" type="number" min="0" value="' + (p.low_stock_threshold != null ? p.low_stock_threshold : 3) + '"></div>' +
      '</div>' +
      '<div class="campo"><label for="p-ficheiro">Carregar imagens</label>' +
        '<input type="file" id="p-ficheiro" accept="image/*" multiple>' +
        '<span class="ajuda" id="p-estado-envio">A primeira da lista é a principal.</span></div>' +
      '<div class="campo"><label for="p-imagens">Imagens (um endereço por linha)</label>' +
        '<textarea id="p-imagens" placeholder="https://…">' +
        ui.escapar((p.imagens || []).map(function (i) { return i.url; }).join('\n')) + '</textarea>' +
        '<span class="ajuda">Sem imagem, mostramos um cartão com a identidade TeskBuy.</span></div>' +
      '<label class="opcao" style="margin-bottom:10px"><input type="checkbox" id="p-activo"' +
        (p.is_active === false ? '' : ' checked') + '><span><strong>Visível na loja</strong>' +
        '<span>Desligue para esconder sem apagar.</span></span></label>' +
      '<label class="opcao"><input type="checkbox" id="p-destaque"' + (p.is_featured ? ' checked' : '') +
        '><span><strong>Mostrar nos destaques</strong><span>Aparece na página inicial.</span></span></label>',

      function (fundo) {
        var imagens = fundo.querySelector('#p-imagens').value
          .split('\n').map(function (l) { return l.trim(); }).filter(Boolean);

        var dados = {
          name: valor(fundo, 'p-nome'),
          sku: valor(fundo, 'p-sku'),
          slug: valor(fundo, 'p-slug'),
          short_description: valor(fundo, 'p-curta') || null,
          description: fundo.querySelector('#p-desc').value.trim() || null,
          category_id: fundo.querySelector('#p-categoria').value || null,
          brand_id: fundo.querySelector('#p-marca').value || null,
          condition: fundo.querySelector('#p-condicao').value,
          price: Number(valor(fundo, 'p-preco')),
          compare_at_price: valor(fundo, 'p-antigo') ? Number(valor(fundo, 'p-antigo')) : null,
          stock_quantity: Number(valor(fundo, 'p-stock') || 0),
          low_stock_threshold: Number(valor(fundo, 'p-limite') || 3),
          warranty_months: Number(valor(fundo, 'p-garantia') || 0),
          is_active: fundo.querySelector('#p-activo').checked,
          is_featured: fundo.querySelector('#p-destaque').checked,
          imagens: imagens,
        };

        var pedido = edicao ? api.patch('/produtos/' + p.id, dados) : api.post('/produtos', dados);
        return pedido.then(function () {
          ui.notificar(edicao ? 'Produto actualizado.' : 'Produto adicionado.', 'ok');
          verProdutos(filtros);
        });
      },
      edicao ? 'Guardar alterações' : 'Adicionar produto');

    ligarCarregamentoImagens(caixa, 'loja');
  }

  /**
   * Liga um <input type="file"> à caixa de endereços de imagens.
   * Os ficheiros vão directos para o Supabase Storage; aqui só entra o endereço.
   */
  function ligarCarregamentoImagens(fundo, finalidade) {
    var entrada = fundo.querySelector('#p-ficheiro');
    if (!entrada) return;

    entrada.addEventListener('change', function (ev) {
      var ficheiros = Array.prototype.slice.call(ev.target.files || []);
      if (!ficheiros.length) return;

      var estado = fundo.querySelector('#p-estado-envio');
      var caixaImagens = fundo.querySelector('#p-imagens');
      var enviados = 0;
      estado.textContent = 'A enviar 0 de ' + ficheiros.length + '…';

      ficheiros.reduce(function (cadeia, f) {
        return cadeia.then(function () {
          return ui.carregarFicheiro(f, finalidade).then(function (r) {
            enviados += 1;
            caixaImagens.value = (caixaImagens.value ? caixaImagens.value.trim() + '\n' : '') + r.url;
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
  }

  /* ── stock ───────────────────────────────────────────────── */
  function verStock() {
    esqueleto(3);

    Promise.all([api.get('/admin/stock/baixo'), api.get('/admin/stock/movimentos', { limite: 40 })])
      .then(function (r) {
        var baixo = r[0].dados || [];
        var movimentos = r[1].dados || [];

        document.getElementById('painel-admin').innerHTML =
          '<h1 style="margin-bottom:4px">Stock</h1>' +
          '<p class="silenciado pequeno" style="margin-bottom:18px">Reponha antes de esgotar e registe cada entrada.</p>' +

          '<div class="cartao" style="margin-bottom:18px">' +
            '<h3 style="margin-bottom:12px">A precisar de reposição</h3>' +
            (baixo.length
              ? baixo.map(function (p) {
                  return '<div class="linha-flex" style="justify-content:space-between;padding:9px 0;' +
                    'border-bottom:1px solid rgba(238,247,248,.06)">' +
                    '<div><p class="pequeno">' + ui.escapar(p.name) + '</p>' +
                      '<p class="pequeno silenciado mono">' + ui.escapar(p.sku) + '</p></div>' +
                    '<div class="linha-flex" style="gap:12px">' +
                      '<span class="mono pequeno"' + (p.stock_quantity === 0 ? ' style="color:#ff8a86"' : '') + '>' +
                        p.stock_quantity + ' un.</span>' +
                      '<button class="btn btn-secundario btn-pequeno" data-repor="' + p.id + '" ' +
                        'data-nome="' + ui.escapar(p.name) + '">Movimentar</button>' +
                    '</div></div>';
                }).join('')
              : '<p class="pequeno silenciado">Tudo com stock confortável.</p>') +
          '</div>' +

          '<div class="cartao">' +
            '<h3 style="margin-bottom:12px">Últimos movimentos</h3>' +
            (movimentos.length
              ? '<div class="tabela-env" style="border:none"><table style="min-width:520px"><thead><tr>' +
                  '<th>Data</th><th>Produto</th><th>Tipo</th><th>Qt.</th><th>Depois</th><th>Motivo</th>' +
                '</tr></thead><tbody>' +
                movimentos.map(function (m) {
                  return '<tr><td class="pequeno">' + ui.data(m.created_at, true) + '</td>' +
                    '<td class="pequeno">' + ui.escapar(m.produto ? m.produto.name : '—') + '</td>' +
                    '<td class="pequeno">' + m.type + '</td>' +
                    '<td class="mono">' + m.quantity + '</td>' +
                    '<td class="mono">' + m.stock_after + '</td>' +
                    '<td class="pequeno silenciado">' + ui.escapar(m.reason || '—') + '</td></tr>';
                }).join('') + '</tbody></table></div>'
              : '<p class="pequeno silenciado">Ainda sem movimentos registados.</p>') +
          '</div>';

        document.querySelectorAll('[data-repor]').forEach(function (b) {
          b.addEventListener('click', function () {
            formularioStock(b.getAttribute('data-repor'), b.getAttribute('data-nome'));
          });
        });
      }).catch(erroPainel);
  }

  function formularioStock(produtoId, nome) {
    modal('Movimentar stock',
      '<p class="pequeno silenciado" style="margin-bottom:16px">' + ui.escapar(nome) + '</p>' +
      '<div class="campo"><label for="s-tipo">Tipo de movimento</label><select id="s-tipo">' +
        '<option value="entrada">Entrada — recebi mercadoria</option>' +
        '<option value="saida">Saída — retirei do armazém</option>' +
        '<option value="ajuste">Ajuste — corrigir para o valor real</option>' +
        '<option value="devolucao">Devolução — cliente devolveu</option>' +
      '</select></div>' +
      '<div class="campo"><label for="s-qt">Quantidade</label>' +
        '<input id="s-qt" type="number" min="0" required value="1">' +
        '<span class="ajuda">Num ajuste, escreva o total que existe agora em armazém.</span></div>' +
      '<div class="campo"><label for="s-motivo">Motivo</label>' +
        '<input id="s-motivo" placeholder="Ex.: recepção de fornecedor"></div>',
      function (fundo) {
        return api.post('/admin/stock/movimentos', {
          produto_id: produtoId,
          tipo: fundo.querySelector('#s-tipo').value,
          quantidade: Number(valor(fundo, 's-qt')),
          motivo: valor(fundo, 's-motivo') || null,
        }).then(function () {
          ui.notificar('Stock actualizado.', 'ok');
          verStock();
        });
      },
      'Registar movimento');
  }

  /* ── cupões ──────────────────────────────────────────────── */
  function verCupoes() {
    esqueleto(2);

    api.get('/admin/cupoes').then(function (r) {
      var lista = r.dados || [];

      document.getElementById('painel-admin').innerHTML =
        '<div class="linha-flex" style="justify-content:space-between;align-items:flex-end;margin-bottom:18px">' +
          '<div><h1 style="margin-bottom:4px">Cupões</h1>' +
            '<p class="silenciado pequeno">Descontos aplicados no checkout.</p></div>' +
          '<button class="btn btn-principal btn-pequeno" id="novo-cupao">Criar cupão</button>' +
        '</div>' +
        (lista.length
          ? '<div class="tabela-env"><table><thead><tr>' +
              '<th>Código</th><th>Desconto</th><th>Mínimo</th><th>Usos</th><th>Estado</th><th></th>' +
            '</tr></thead><tbody>' +
            lista.map(function (c) {
              return '<tr><td class="mono">' + ui.escapar(c.code) + '</td>' +
                '<td>' + (c.type === 'percentagem' ? c.value + '%' : ui.kz(c.value)) + '</td>' +
                '<td class="mono pequeno">' + ui.kz(c.min_order) + '</td>' +
                '<td class="mono pequeno">' + c.used_count + (c.max_uses ? ' / ' + c.max_uses : '') + '</td>' +
                '<td class="pequeno">' + (c.is_active ? 'Activo' : 'Desligado') + '</td>' +
                '<td><button class="btn btn-fantasma btn-pequeno" data-apagar-cupao="' + c.id + '">Remover</button></td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="cartao-vazio"><h3>Sem cupões</h3><p>Crie um código para campanhas e clientes novos.</p></div>');

      document.getElementById('novo-cupao').addEventListener('click', formularioCupao);
      document.querySelectorAll('[data-apagar-cupao]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!confirm('Remover este cupão?')) return;
          api.del('/admin/cupoes/' + b.getAttribute('data-apagar-cupao'))
            .then(function () { ui.notificar('Cupão removido.', 'ok'); verCupoes(); })
            .catch(function (e) { ui.notificar(e.message, 'erro'); });
        });
      });
    }).catch(erroPainel);
  }

  function formularioCupao() {
    modal('Criar cupão',
      '<div class="campo"><label for="c-codigo">Código</label>' +
        '<input id="c-codigo" required placeholder="BEMVINDO10" style="text-transform:uppercase"></div>' +
      '<div class="campo"><label for="c-desc">Descrição</label>' +
        '<input id="c-desc" placeholder="Para quem é e em que campanha"></div>' +
      '<div class="campo-duplo">' +
        '<div class="campo"><label for="c-tipo">Tipo</label><select id="c-tipo">' +
          '<option value="percentagem">Percentagem</option>' +
          '<option value="fixo">Valor fixo em Kz</option></select></div>' +
        '<div class="campo"><label for="c-valor">Valor</label>' +
          '<input id="c-valor" type="number" min="1" required value="10"></div>' +
      '</div>' +
      '<div class="campo-duplo">' +
        '<div class="campo"><label for="c-minimo">Compra mínima (Kz)</label>' +
          '<input id="c-minimo" type="number" min="0" value="0"></div>' +
        '<div class="campo"><label for="c-max">Limite de utilizações</label>' +
          '<input id="c-max" type="number" min="1" placeholder="Sem limite"></div>' +
      '</div>',
      function (fundo) {
        return api.post('/admin/cupoes', {
          code: valor(fundo, 'c-codigo').toUpperCase(),
          description: valor(fundo, 'c-desc') || null,
          type: fundo.querySelector('#c-tipo').value,
          value: Number(valor(fundo, 'c-valor')),
          min_order: Number(valor(fundo, 'c-minimo') || 0),
          max_uses: valor(fundo, 'c-max') ? Number(valor(fundo, 'c-max')) : null,
        }).then(function () {
          ui.notificar('Cupão criado.', 'ok');
          verCupoes();
        });
      },
      'Criar cupão');
  }

  /* ── utilizadores ────────────────────────────────────────── */
  function verUtilizadores(filtros) {
    filtros = filtros || { pagina: 1 };
    esqueleto(3);

    api.get('/admin/utilizadores', { pagina: filtros.pagina, limite: 20, q: filtros.q })
      .then(function (r) {
        var lista = r.dados || [];

        document.getElementById('painel-admin').innerHTML =
          '<h1 style="margin-bottom:4px">Utilizadores</h1>' +
          '<p class="silenciado pequeno" style="margin-bottom:18px">Só administradores podem alterar níveis de acesso.</p>' +
          '<div class="barra-topo">' +
            '<input id="procura-util" placeholder="Nome, e-mail ou telefone" value="' + ui.escapar(filtros.q || '') + '">' +
            '<button class="btn btn-secundario btn-pequeno" id="aplicar">Procurar</button>' +
          '</div>' +
          '<div class="tabela-env"><table><thead><tr>' +
            '<th>Nome</th><th>Contacto</th><th>Registo</th><th>Acesso</th></tr></thead><tbody>' +
            lista.map(function (u) {
              return '<tr><td>' + ui.escapar(u.full_name || '—') + '</td>' +
                '<td class="pequeno silenciado">' + ui.escapar(u.email || '') +
                  (u.phone ? '<br><span class="mono">' + ui.escapar(u.phone) + '</span>' : '') + '</td>' +
                '<td class="pequeno">' + ui.data(u.created_at) + '</td>' +
                '<td><select data-papel="' + u.id + '" style="padding:6px 10px;background:rgba(238,247,248,.04);' +
                  'border:1px solid var(--linha);border-radius:8px;color:var(--ink);font-family:inherit;font-size:13px">' +
                  ['cliente', 'gestor', 'admin'].map(function (p) {
                    return '<option value="' + p + '"' + (p === u.role ? ' selected' : '') + '>' +
                      (p === 'cliente' ? 'Cliente' : p === 'gestor' ? 'Gestor' : 'Administrador') + '</option>';
                  }).join('') + '</select></td></tr>';
            }).join('') + '</tbody></table></div>' + paginador(r.paginacao, filtros);

        document.getElementById('aplicar').addEventListener('click', function () {
          verUtilizadores({ pagina: 1, q: document.getElementById('procura-util').value.trim() });
        });

        document.querySelectorAll('[data-papel]').forEach(function (s) {
          var anterior = s.value;
          s.addEventListener('change', function () {
            api.patch('/admin/utilizadores/' + s.getAttribute('data-papel') + '/papel', { papel: s.value })
              .then(function () { ui.notificar('Nível de acesso actualizado.', 'ok'); anterior = s.value; })
              .catch(function (e) { s.value = anterior; ui.notificar(e.message, 'erro'); });
          });
        });

        ligarPaginador(filtros, verUtilizadores);
      }).catch(erroPainel);
  }

  /* ── conteúdo do site ────────────────────────────────────────
     Grava tudo numa única definição, "conteudo_site". O site lê essa
     chave e, se faltar algum campo, usa o texto original. */
  function verConteudo() {
    esqueleto(2);

    api.get('/catalogo/definicoes')
      .then(function (r) {
        var padrao = ui.CONTEUDO_PADRAO;
        var gravado = (r.dados || {}).conteudo_site || {};
        var gi = gravado.inicio || {};
        var gr = gravado.rodape || {};

        function ou(valor, alternativa) {
          if (valor === undefined || valor === null || valor === '') return alternativa;
          if (Array.isArray(valor) && !valor.length) return alternativa;
          return valor;
        }

        desenharConteudo({
          inicio: {
            eyebrow: ou(gi.eyebrow, padrao.inicio.eyebrow),
            titulo: ou(gi.titulo, padrao.inicio.titulo),
            titulo_destaque: ou(gi.titulo_destaque, padrao.inicio.titulo_destaque),
            intro: ou(gi.intro, padrao.inicio.intro),
            botao1: ou(gi.botao1, padrao.inicio.botao1),
            botao2: ou(gi.botao2, padrao.inicio.botao2),
            slides: ou(gi.slides, padrao.inicio.slides),
            confianca: ou(gi.confianca, padrao.inicio.confianca),
            parceiros_titulo: ou(gi.parceiros_titulo, padrao.inicio.parceiros_titulo),
            parceiros: ou(gi.parceiros, padrao.inicio.parceiros),
            newsletter_titulo: ou(gi.newsletter_titulo, padrao.inicio.newsletter_titulo),
            newsletter_texto: ou(gi.newsletter_texto, padrao.inicio.newsletter_texto),
          },
          rodape: {
            descricao: ou(gr.descricao, padrao.rodape.descricao),
            telefone: ou(gr.telefone, padrao.rodape.telefone),
            email: ou(gr.email, padrao.rodape.email),
            local: ou(gr.local, padrao.rodape.local),
            facebook: ou(gr.facebook, padrao.rodape.facebook),
            whatsapp: ou(gr.whatsapp, padrao.rodape.whatsapp),
          },
        });
      })
      .catch(erroPainel);
  }

  function campoTexto(id, etiqueta, valor, opcoes) {
    opcoes = opcoes || {};
    return '<div class="campo">' +
      '<label for="' + id + '">' + etiqueta + '</label>' +
      (opcoes.area
        ? '<textarea id="' + id + '"' + (opcoes.linhas ? ' rows="' + opcoes.linhas + '"' : '') + '>' +
            ui.escapar(valor || '') + '</textarea>'
        : '<input id="' + id + '" value="' + ui.escapar(valor || '') + '">') +
      (opcoes.ajuda ? '<span class="ajuda">' + opcoes.ajuda + '</span>' : '') +
      '</div>';
  }

  function desenharConteudo(c) {
    var i = c.inicio;
    var r = c.rodape;

    var htmlSlides = i.slides.map(function (s, n) {
      return '<div class="cartao" style="margin-bottom:12px;background:rgba(238,247,248,.03)">' +
        '<p class="mono pequeno silenciado" style="margin-bottom:12px">Slide ' + (n + 1) + '</p>' +
        '<div class="campo-duplo">' +
          campoTexto('sl-' + n + '-titulo', 'Título', s.titulo) +
          campoTexto('sl-' + n + '-destaque', 'Parte destacada', s.destaque,
            { ajuda: 'Aparece a laranja, a seguir ao título.' }) +
        '</div>' +
        campoTexto('sl-' + n + '-texto', 'Texto', s.texto, { area: true, linhas: 3 }) +
        '<div class="campo-duplo">' +
          campoTexto('sl-' + n + '-botao', 'Texto do botão', s.botao) +
          campoTexto('sl-' + n + '-botao-href', 'Para onde leva o botão', s.botao_href,
            { ajuda: 'Por exemplo /loja ou /loja?categoria=telemoveis' }) +
        '</div>' +
        '<div class="campo-duplo">' +
          campoTexto('sl-' + n + '-imagem', 'Imagem (computador)', s.imagem,
            { ajuda: 'Endereço da imagem larga. Deixe como está para manter a actual.' }) +
          campoTexto('sl-' + n + '-imagem-movel', 'Imagem (telemóvel)', s.imagem_movel,
            { ajuda: 'Versão alta, para ecrãs pequenos. Se ficar vazia, usa a de cima.' }) +
        '</div>' +
        '<label class="opcao"><input type="checkbox" id="sl-' + n + '-contactos"' +
          (s.mostrar_contactos ? ' checked' : '') + '>' +
          '<span><strong>Mostrar telefone e e-mail neste slide</strong>' +
          '<span>Usa os contactos definidos no rodapé.</span></span></label>' +
      '</div>';
    }).join('');

    var htmlConfianca = i.confianca.map(function (x, n) {
      return '<div class="cartao" style="margin-bottom:12px;background:rgba(238,247,248,.03)">' +
        '<p class="mono pequeno silenciado" style="margin-bottom:12px">Cartão ' + (n + 1) + '</p>' +
        campoTexto('cf-' + n + '-titulo', 'Título', x.titulo) +
        campoTexto('cf-' + n + '-texto', 'Texto', x.texto, { area: true, linhas: 2 }) +
      '</div>';
    }).join('');

    document.getElementById('painel-admin').innerHTML =
      '<h1 style="margin-bottom:4px">Conteúdo do site</h1>' +
      '<p class="silenciado pequeno" style="margin-bottom:20px">' +
        'Os textos da página inicial e do rodapé. Guarde e recarregue a loja para ver o resultado.</p>' +

      '<div class="cartao" style="margin-bottom:16px">' +
        '<h3 style="margin-bottom:16px">Página inicial</h3>' +
        campoTexto('in-eyebrow', 'Linha pequena por cima do primeiro destaque', i.eyebrow) +
        '<div class="campo-duplo">' +
          campoTexto('in-titulo', 'Título da página', i.titulo,
            { ajuda: 'Não aparece à vista. Serve para o Google e para leitores de ecrã.' }) +
          campoTexto('in-destaque', 'Continuação do título', i.titulo_destaque) +
        '</div>' +
        campoTexto('in-intro', 'Descrição da página', i.intro, { area: true, linhas: 3 }) +
        '<div class="campo-duplo">' +
          campoTexto('in-botao1', 'Botão principal (quando o destaque não tem um)', i.botao1) +
          campoTexto('in-botao2', 'Botão secundário do primeiro destaque', i.botao2) +
        '</div>' +
      '</div>' +

      '<div class="cartao" style="margin-bottom:16px">' +
        '<h3 style="margin-bottom:6px">Painel principal</h3>' +
        '<p class="pequeno silenciado" style="margin-bottom:16px">' +
          'É a faixa grande com imagem, no topo da página inicial.</p>' + htmlSlides +
      '</div>' +

      '<div class="cartao" style="margin-bottom:16px">' +
        '<h3 style="margin-bottom:16px">Cartões de confiança</h3>' +
        '<p class="pequeno silenciado" style="margin-bottom:14px">Aparecem no rodapé, em todas as páginas. Os ícones são fixos; só os textos mudam.</p>' +
        htmlConfianca +
      '</div>' +

      '<div class="cartao" style="margin-bottom:16px">' +
        '<h3 style="margin-bottom:16px">Faixa de parceiros e newsletter</h3>' +
        campoTexto('in-parc-titulo', 'Título da faixa', i.parceiros_titulo) +
        campoTexto('in-parceiros', 'Parceiros', i.parceiros.join('\n'),
          { area: true, linhas: 4, ajuda: 'Um por linha.' }) +
        campoTexto('in-news-titulo', 'Título da newsletter (no rodapé)', i.newsletter_titulo) +
        campoTexto('in-news-texto', 'Texto da newsletter', i.newsletter_texto, { area: true, linhas: 2 }) +
      '</div>' +

      '<div class="cartao" style="margin-bottom:16px">' +
        '<h3 style="margin-bottom:16px">Rodapé</h3>' +
        campoTexto('rd-descricao', 'Descrição da loja', r.descricao, { area: true, linhas: 3 }) +
        '<div class="campo-duplo">' +
          campoTexto('rd-telefone', 'Telefone', r.telefone) +
          campoTexto('rd-email', 'E-mail', r.email) +
        '</div>' +
        campoTexto('rd-local', 'Localidade', r.local) +
        '<div class="campo-duplo">' +
          campoTexto('rd-facebook', 'Endereço do Facebook', r.facebook) +
          campoTexto('rd-whatsapp', 'Endereço do WhatsApp', r.whatsapp) +
        '</div>' +
      '</div>' +

      '<div class="linha-flex" style="margin-bottom:40px">' +
        '<button class="btn btn-principal" id="guardar-conteudo">Guardar conteúdo</button>' +
        '<a class="btn btn-secundario" href="/" target="_blank" rel="noopener">Ver a loja</a>' +
      '</div>' +
      '<div id="erro-conteudo"></div>';

    document.getElementById('guardar-conteudo').addEventListener('click', function (ev) {
      var btn = ev.currentTarget;
      var alvo = document.getElementById('erro-conteudo');
      alvo.innerHTML = '';
      btn.disabled = true;
      btn.textContent = 'A guardar…';

      function v(id) { return document.getElementById(id).value.trim(); }

      var corpo = {
        inicio: {
          eyebrow: v('in-eyebrow'),
          titulo: v('in-titulo'),
          titulo_destaque: v('in-destaque'),
          intro: v('in-intro'),
          botao1: v('in-botao1'),
          botao2: v('in-botao2'),
          slides: i.slides.map(function (_, n) {
            return {
              titulo: v('sl-' + n + '-titulo'),
              destaque: v('sl-' + n + '-destaque'),
              texto: v('sl-' + n + '-texto'),
              botao: v('sl-' + n + '-botao'),
              botao_href: v('sl-' + n + '-botao-href'),
              imagem: v('sl-' + n + '-imagem'),
              imagem_movel: v('sl-' + n + '-imagem-movel'),
              mostrar_contactos: document.getElementById('sl-' + n + '-contactos').checked,
            };
          }),
          confianca: i.confianca.map(function (_, n) {
            return { titulo: v('cf-' + n + '-titulo'), texto: v('cf-' + n + '-texto') };
          }),
          parceiros_titulo: v('in-parc-titulo'),
          parceiros: v('in-parceiros').split('\n')
            .map(function (l) { return l.trim(); })
            .filter(Boolean),
          newsletter_titulo: v('in-news-titulo'),
          newsletter_texto: v('in-news-texto'),
        },
        rodape: {
          descricao: v('rd-descricao'),
          telefone: v('rd-telefone'),
          email: v('rd-email'),
          local: v('rd-local'),
          facebook: v('rd-facebook'),
          whatsapp: v('rd-whatsapp'),
        },
      };

      api.put('/admin/definicoes/conteudo_site', corpo)
        .then(function () {
          btn.disabled = false;
          btn.textContent = 'Guardar conteúdo';
          ui.notificar('Conteúdo guardado. Recarregue a loja para ver.', 'ok');
        })
        .catch(function (e) {
          btn.disabled = false;
          btn.textContent = 'Guardar conteúdo';
          alvo.innerHTML = '<div class="aviso aviso-erro">' + ui.escapar(e.message) + '</div>';
        });
    });
  }

  /* ── paginação partilhada ────────────────────────────────── */
  function paginador(p, filtros) {
    if (!p || p.paginas <= 1) return '';
    return '<div class="linha-flex" style="justify-content:center;gap:10px;margin-top:20px">' +
      '<button class="btn btn-secundario btn-pequeno" data-pag="anterior"' +
        (filtros.pagina <= 1 ? ' disabled' : '') + '>Anteriores</button>' +
      '<span class="pequeno silenciado mono">' + filtros.pagina + ' / ' + p.paginas + '</span>' +
      '<button class="btn btn-secundario btn-pequeno" data-pag="seguinte"' +
        (filtros.pagina >= p.paginas ? ' disabled' : '') + '>Seguintes</button></div>';
  }

  function ligarPaginador(filtros, fn) {
    document.querySelectorAll('[data-pag]').forEach(function (b) {
      b.addEventListener('click', function () {
        var novos = Object.assign({}, filtros);
        novos.pagina = filtros.pagina + (b.getAttribute('data-pag') === 'seguinte' ? 1 : -1);
        fn(novos);
      });
    });
  }

  function erroPainel(e) {
    document.getElementById('painel-admin').innerHTML =
      '<div class="aviso aviso-erro">' + ui.escapar(e.message) + '</div>';
  }

  /* ── arranque ────────────────────────────────────────────── */
  /* ── candidaturas a vendedor e a afiliado ────────────────── */
  var ESTADO_CAND = {
    pendente: 'Em espera',
    em_analise: 'Em análise',
    info_pedida: 'Falta informação',
    aprovado: 'Aprovada',
    rejeitado: 'Não aprovada',
    cancelado: 'Cancelada',
  };

  function verCandidaturas(estado) {
    esqueleto(2);
    var filtro = estado === undefined ? 'pendente' : estado;

    api.get('/admin/candidaturas', { estado: filtro || undefined, limite: 50 })
      .then(function (r) {
        var itens = r.dados || [];

        var filtros = ['pendente', 'info_pedida', 'aprovado', 'rejeitado', ''].map(function (f) {
          return '<button class="pilula' + (f === filtro ? ' activa' : '') + '" data-filtro="' + f + '">' +
            (f ? ESTADO_CAND[f] : 'Todas') + '</button>';
        }).join('');

        var corpo = itens.length
          ? itens.map(cartaoCandidatura).join('')
          : '<div class="cartao-vazio"><h3>Nada à espera</h3>' +
            '<p class="silenciado">Não há candidaturas neste estado.</p></div>';

        document.getElementById('painel-admin').innerHTML =
          '<h1 style="margin-bottom:4px">Candidaturas</h1>' +
          '<p class="silenciado pequeno" style="margin-bottom:16px">' +
            'Pedidos para vender na TeskBuy ou para ser afiliado.</p>' +
          '<div class="pilulas" style="margin-bottom:18px">' + filtros + '</div>' +
          corpo;

        document.querySelectorAll('[data-filtro]').forEach(function (b) {
          b.addEventListener('click', function () { verCandidaturas(b.getAttribute('data-filtro')); });
        });
        // os documentos são privados: abre-se um endereço temporário
        document.querySelectorAll('[data-doc]').forEach(function (b) {
          b.addEventListener('click', function () {
            b.disabled = true;
            api.get('/ficheiros/documento', { caminho: b.getAttribute('data-doc') })
              .then(function (res) { window.open(res.dados.url, '_blank', 'noopener'); })
              .catch(function (e) { ui.notificar(e.message, 'erro'); })
              .then(function () { b.disabled = false; });
          });
        });
        document.querySelectorAll('[data-decisao]').forEach(function (b) {
          b.addEventListener('click', function () {
            decidirCandidatura(b.getAttribute('data-id'), b.getAttribute('data-decisao'), b);
          });
        });
      })
      .catch(erroPainel);
  }

  function linha(rotulo, valorTexto) {
    if (!valorTexto) return '';
    return '<p class="pequeno" style="margin-bottom:4px">' +
      '<span class="silenciado">' + rotulo + ':</span> ' + ui.escapar(String(valorTexto)) + '</p>';
  }

  function cartaoCandidatura(c) {
    var d = c.dados || {};
    var k = c.kyc || {};
    var vendedor = c.tipo === 'vendedor';

    return '<div class="cartao" style="margin-bottom:14px">' +
      '<div class="entre" style="margin-bottom:12px">' +
        '<div>' +
          '<span class="selo ' + (vendedor ? 'selo-usado' : 'selo-desconto') + '">' +
            (vendedor ? 'Vendedor' : 'Afiliado') + '</span> ' +
          '<strong style="margin-left:8px">' + ui.escapar(d.nome_empresa || d.nome || '—') + '</strong>' +
        '</div>' +
        '<span class="pequeno silenciado">' + ui.data(c.criado_em, true) + '</span>' +
      '</div>' +

      '<div class="grelha-2" style="gap:14px">' +
        '<div>' +
          '<p class="eyebrow" style="margin-bottom:8px">Candidatura</p>' +
          linha('Contacto', (c.utilizador && (c.utilizador.full_name || c.utilizador.email)) || '') +
          linha('E-mail', d.email || (c.utilizador && c.utilizador.email)) +
          linha('Telefone', d.telefone) +
          linha('NIF', d.nif) +
          linha('Nome legal', d.nome_legal) +
          linha('Localidade', [d.municipio, d.provincia].filter(Boolean).join(', ')) +
          linha('Actividade', d.descricao) +
          linha('Canais', d.canais) +
          linha('Motivo', d.motivo) +
        '</div>' +
        '<div>' +
          '<p class="eyebrow" style="margin-bottom:8px">Identificação</p>' +
          linha('Nome', k.full_name) +
          linha('Documento', k.document_type) +
          linha('Número', k.document_number) +
          ((k.documentos && k.documentos.length)
            ? '<div class="linha-flex" style="margin-top:8px">' +
                k.documentos.map(function (d, n) {
                  return '<button class="pilula" data-doc="' + ui.escapar(d.storage_path) + '">' +
                    'Documento ' + (n + 1) + '</button>';
                }).join('') +
              '</div>'
            : '<p class="pequeno silenciado" style="margin-top:8px">Sem documentos carregados.</p>') +
        '</div>' +
      '</div>' +

      (c.estado === 'pendente' || c.estado === 'info_pedida' || c.estado === 'em_analise'
        ? '<div class="campo" style="margin:14px 0 10px">' +
            '<label for="nota-' + c.id + '">Nota para o candidato</label>' +
            '<input id="nota-' + c.id + '" placeholder="Opcional. Aparece na conta dele.">' +
          '</div>' +
          '<div class="campo" style="margin-bottom:12px;max-width:220px">' +
            '<label for="com-' + c.id + '">Comissão (%)</label>' +
            '<input id="com-' + c.id + '" type="number" min="0" max="100" step="0.5" ' +
              'value="' + (vendedor ? 10 : 5) + '">' +
          '</div>' +
          '<div class="linha-flex">' +
            '<button class="btn btn-principal btn-pequeno" data-decisao="aprovar" data-id="' + c.id + '">Aprovar</button>' +
            '<button class="btn btn-secundario btn-pequeno" data-decisao="pedir_info" data-id="' + c.id + '">Pedir informação</button>' +
            '<button class="btn btn-fantasma btn-pequeno" data-decisao="rejeitar" data-id="' + c.id + '">Rejeitar</button>' +
          '</div>'
        : '<p class="pequeno" style="margin-top:14px"><span class="silenciado">Estado:</span> ' +
            ui.escapar(ESTADO_CAND[c.estado] || c.estado) +
            (c.nota_admin ? ' — ' + ui.escapar(c.nota_admin) : '') + '</p>') +
    '</div>';
  }

  function decidirCandidatura(id, decisao, botao) {
    var nota = document.getElementById('nota-' + id);
    var comissao = document.getElementById('com-' + id);

    if (decisao === 'rejeitar' && !confirm('Rejeitar esta candidatura?')) return;

    botao.disabled = true;
    var texto = botao.textContent;
    botao.textContent = 'A guardar…';

    api.patch('/admin/candidaturas/' + id, {
      decisao: decisao,
      nota: nota && nota.value.trim() ? nota.value.trim() : undefined,
      comissao: comissao && comissao.value ? Number(comissao.value) : undefined,
    })
      .then(function (r) {
        ui.notificar(r.mensagem, 'ok');
        verCandidaturas('pendente');
      })
      .catch(function (e) {
        ui.notificar(e.message, 'erro');
        botao.disabled = false;
        botao.textContent = texto;
      });
  }

  /* ── parcerias entre afiliados e empresas ────────────────── */
  var ESTADO_PARC = {
    pendente: 'À espera de análise',
    em_analise_admin: 'Em análise',
    enviado_vendedor: 'Com a empresa',
    aceite: 'Aceite pela empresa',
    recusado: 'Recusada',
    cancelado: 'Cancelada',
  };

  function verParcerias(estado) {
    esqueleto(2);
    var filtro = estado === undefined ? 'pendente' : estado;

    api.get('/admin/parcerias', { estado: filtro || undefined, limite: 50 })
      .then(function (r) {
        var itens = r.dados || [];

        var filtros = ['pendente', 'enviado_vendedor', 'aceite', 'recusado', ''].map(function (f) {
          return '<button class="pilula' + (f === filtro ? ' activa' : '') + '" data-pfiltro="' + f + '">' +
            (f ? ESTADO_PARC[f] : 'Todas') + '</button>';
        }).join('');

        document.getElementById('painel-admin').innerHTML =
          '<h1 style="margin-bottom:4px">Parcerias</h1>' +
          '<p class="silenciado pequeno" style="margin-bottom:16px">' +
            'Pedidos de afiliados para divulgar produtos de empresas. ' +
            'A decisão final é da empresa; aqui só se encaminha ou trava.</p>' +
          '<div class="pilulas" style="margin-bottom:18px">' + filtros + '</div>' +
          (itens.length
            ? itens.map(cartaoParceria).join('')
            : '<div class="cartao-vazio"><h3>Nada neste estado</h3>' +
              '<p class="silenciado">Não há pedidos para mostrar.</p></div>');

        document.querySelectorAll('[data-pfiltro]').forEach(function (b) {
          b.addEventListener('click', function () { verParcerias(b.getAttribute('data-pfiltro')); });
        });
        document.querySelectorAll('[data-pdecisao]').forEach(function (b) {
          b.addEventListener('click', function () {
            decidirParceria(b.getAttribute('data-pid'), b.getAttribute('data-pdecisao'), b);
          });
        });
      })
      .catch(erroPainel);
  }

  function cartaoParceria(p) {
    var porDecidir = ['pendente', 'em_analise_admin'].indexOf(p.estado) !== -1;

    return '<div class="cartao" style="margin-bottom:14px">' +
      '<div class="entre" style="margin-bottom:10px">' +
        '<div>' +
          '<strong>' + ui.escapar(p.afiliado ? (p.afiliado.nome || p.afiliado.email) : '—') + '</strong>' +
          '<span class="silenciado"> quer divulgar </span>' +
          '<strong>' + ui.escapar(p.empresa ? p.empresa.name : '—') + '</strong>' +
        '</div>' +
        '<span class="pequeno silenciado">' + ui.data(p.criada_em) + '</span>' +
      '</div>' +
      '<p class="pequeno silenciado" style="margin-bottom:6px">Estado: ' +
        ui.escapar(ESTADO_PARC[p.estado] || p.estado) + '</p>' +
      (p.afiliado ? '<p class="pequeno mono silenciado">Código: ' + ui.escapar(p.afiliado.codigo) + '</p>' : '') +
      (p.mensagem ? '<p class="pequeno" style="margin-top:8px">' + ui.escapar(p.mensagem) + '</p>' : '') +
      (porDecidir
        ? '<div class="campo" style="margin:12px 0 8px">' +
            '<label for="pn-' + p.id + '">Nota</label>' +
            '<input id="pn-' + p.id + '" placeholder="Opcional.">' +
          '</div>' +
          '<div class="campo" style="margin-bottom:12px;max-width:220px">' +
            '<label for="pc-' + p.id + '">Comissão sugerida (%)</label>' +
            '<input id="pc-' + p.id + '" type="number" min="0" max="100" step="0.5" ' +
              'value="' + (p.comissao != null ? p.comissao : 5) + '">' +
          '</div>' +
          '<div class="linha-flex">' +
            '<button class="btn btn-principal btn-pequeno" data-pdecisao="encaminhar" data-pid="' + p.id + '">' +
              'Encaminhar à empresa</button>' +
            '<button class="btn btn-fantasma btn-pequeno" data-pdecisao="travar" data-pid="' + p.id + '">Travar</button>' +
          '</div>'
        : (p.nota_empresa
            ? '<p class="pequeno silenciado" style="margin-top:8px">Empresa: ' + ui.escapar(p.nota_empresa) + '</p>'
            : '')) +
    '</div>';
  }

  function decidirParceria(id, decisao, botao) {
    var nota = document.getElementById('pn-' + id);
    var comissao = document.getElementById('pc-' + id);

    botao.disabled = true;
    var texto = botao.textContent;
    botao.textContent = 'A guardar…';

    api.patch('/admin/parcerias/' + id, {
      decisao: decisao,
      nota: nota && nota.value.trim() ? nota.value.trim() : undefined,
      comissao: comissao && comissao.value ? Number(comissao.value) : undefined,
    })
      .then(function (r) { ui.notificar(r.mensagem, 'ok'); verParcerias('pendente'); })
      .catch(function (e) {
        ui.notificar(e.message, 'erro');
        botao.disabled = false;
        botao.textContent = texto;
      });
  }

  function abrir() {
    if (vista === 'encomendas') return verEncomendas();
    if (vista === 'produtos') return verProdutos();
    if (vista === 'stock') return verStock();
    if (vista === 'cupoes') return verCupoes();
    if (vista === 'candidaturas') return verCandidaturas();
    if (vista === 'parcerias') return verParcerias();
    if (vista === 'utilizadores' && eu.papel === 'admin') return verUtilizadores();
    if (vista === 'conteudo' && eu.papel === 'admin') return verConteudo();
    return verPainel();
  }

  conteudo.innerHTML = '<div style="padding:40px 0">' + ui.esqueletos(2, 'esqueleto') + '</div>';

  api.get('/auth/eu')
    .then(function (r) {
      eu = r.dados.utilizador;
      if (eu.papel !== 'admin' && eu.papel !== 'gestor') {
        conteudo.innerHTML =
          '<div class="cartao-vazio" style="margin:40px 0 70px">' +
            '<h3>Esta área é da equipa TeskBuy</h3>' +
            '<p>A sua conta não tem acesso ao painel de gestão. Se devia ter, fale com um administrador.</p>' +
            '<div class="linha-flex" style="justify-content:center">' +
              '<a class="btn btn-principal" href="/">Voltar à loja</a>' +
              '<button class="btn btn-secundario" id="trocar-conta">Entrar com outra conta</button>' +
            '</div></div>';

        document.getElementById('trocar-conta').addEventListener('click', function () {
          api.sair().then(function () { location.reload(); });
        });
        return null;
      }

      return Promise.all([
        api.get('/catalogo/categorias').catch(function () { return { dados: [] }; }),
        api.get('/catalogo/marcas').catch(function () { return { dados: [] }; }),
        api.get('/admin/painel').catch(function () { return { dados: {} }; }),
      ]).then(function (r2) {
        categorias = r2[0].dados || [];
        marcas = r2[1].dados || [];
        moldura(r2[2].dados.encomendas_pendentes, r2[2].dados.produtos_stock_baixo);
        abrir();
      });
    })
    .catch(function (e) {
      conteudo.innerHTML = '<div class="aviso aviso-erro" style="margin:40px 0">' + ui.escapar(e.message) + '</div>';
    });
})();
