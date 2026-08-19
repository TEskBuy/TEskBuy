/* TeskBuy — ficha de produto */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI, estado = window.TBEstado;

  ui.iniciar('loja');

  var slug = new URLSearchParams(location.search).get('slug');
  var conteudo = document.getElementById('conteudo');
  var quantidade = 1;
  var produto = null;

  if (!slug) {
    conteudo.innerHTML = '<div class="cartao-vazio"><h3>Produto não indicado</h3><p>Volte à loja para escolher um artigo.</p><a class="btn btn-principal" href="/loja">Ir para a loja</a></div>';
    return;
  }

  conteudo.innerHTML = '<div class="grelha grelha-2">' + ui.esqueletos(2, 'esqueleto-produto') + '</div>';

  function estrelas(nota) {
    var html = '';
    for (var i = 1; i <= 5; i += 1) {
      html += '<span class="' + (i <= Math.round(nota) ? '' : 'vazia') + '">' + ui.ico.estrela + '</span>';
    }
    return '<span class="estrelas">' + html + '</span>';
  }

  api.get('/produtos/' + encodeURIComponent(slug))
    .then(function (r) {
      produto = r.dados.produto;
      desenhar(produto, r.dados.relacionados, r.dados.avaliacoes);
    })
    .catch(function (e) {
      conteudo.innerHTML =
        '<div class="cartao-vazio"><h3>' + ui.escapar(e.message) + '</h3>' +
        '<p>Este artigo pode ter sido removido ou vendido.</p>' +
        '<a class="btn btn-principal" href="/loja">Ver outros produtos</a></div>';
    });

  var MOTIVOS_DENUNCIA = {
    mau_estado: 'Recebi em mau estado',
    diferente_descricao: 'Diferente da descrição',
    falsificado: 'Parece falsificado',
    danificado: 'Chegou danificado',
    ma_qualidade: 'Problemas de qualidade',
    nao_recebido: 'Não recebi',
    informacao_enganosa: 'Informação enganosa',
    outro: 'Outro motivo',
  };

  /** Caixa de denúncia. Sem sessão, manda-se entrar primeiro. */
  function ligarDenuncia(p) {
    var botao = document.getElementById('btn-denunciar');
    if (!botao) return;

    botao.addEventListener('click', function () {
      if (!api.sessao.activa()) {
        location.href = '/entrar?voltar=' + encodeURIComponent(location.pathname + location.search);
        return;
      }

      var fundo = document.createElement('div');
      fundo.className = 'modal-fundo';
      fundo.style.cssText = 'position:fixed;inset:0;background:rgba(3,20,26,.72);' +
        'display:flex;align-items:center;justify-content:center;padding:20px;z-index:90';
      fundo.innerHTML =
        '<div style="background:var(--teal-deep);border:1px solid var(--linha-forte);' +
          'border-radius:var(--raio);padding:24px;width:min(520px,100%)">' +
          '<h2 style="font-size:19px;margin-bottom:6px">Denunciar produto</h2>' +
          '<p class="pequeno silenciado" style="margin-bottom:16px">' +
            ui.escapar(p.name) + '</p>' +
          '<div class="campo"><label for="dn-motivo">Motivo</label>' +
            '<select id="dn-motivo">' +
              Object.keys(MOTIVOS_DENUNCIA).map(function (k) {
                return '<option value="' + k + '">' + MOTIVOS_DENUNCIA[k] + '</option>';
              }).join('') +
            '</select></div>' +
          '<div class="campo"><label for="dn-desc">O que aconteceu</label>' +
            '<textarea id="dn-desc" rows="4" placeholder="Descreva o problema."></textarea></div>' +
          '<div class="linha-flex" style="justify-content:flex-end">' +
            '<button class="btn btn-fantasma" id="dn-cancelar">Cancelar</button>' +
            '<button class="btn btn-principal" id="dn-enviar">Enviar denúncia</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(fundo);
      function fechar() { fundo.remove(); }
      fundo.querySelector('#dn-cancelar').addEventListener('click', fechar);
      fundo.addEventListener('click', function (ev) { if (ev.target === fundo) fechar(); });

      fundo.querySelector('#dn-enviar').addEventListener('click', function (ev) {
        var b = ev.currentTarget;
        b.disabled = true;
        b.textContent = 'A enviar…';

        api.post('/suporte/denuncias', {
          produto_id: p.id,
          motivo: fundo.querySelector('#dn-motivo').value,
          descricao: fundo.querySelector('#dn-desc').value.trim() || undefined,
        })
          .then(function (r) { ui.notificar(r.mensagem, 'ok'); fechar(); })
          .catch(function (e) {
            ui.notificar(e.message, 'erro');
            b.disabled = false;
            b.textContent = 'Enviar denúncia';
          });
      });
    });
  }

  /** Abre conversa com a empresa que vende este produto. */
  function ligarConversa(p) {
    var botao = document.getElementById('btn-falar');
    if (!botao || !p.vendedor) return;

    botao.addEventListener('click', function () {
      if (!api.sessao.activa()) {
        location.href = '/entrar?voltar=' + encodeURIComponent(location.pathname + location.search);
        return;
      }

      var mensagem = prompt('Mensagem para ' + p.vendedor.name + ':', '');
      if (mensagem === null || !mensagem.trim()) return;

      botao.disabled = true;
      api.post('/conversas', {
        empresa_id: p.vendedor.id,
        assunto: p.name,
        mensagem: mensagem.trim(),
      })
        .then(function (r) {
          ui.notificar(r.mensagem + ' Veja as respostas em A minha conta → Mensagens.', 'ok');
        })
        .catch(function (e) { ui.notificar(e.message, 'erro'); })
        .then(function () { botao.disabled = false; });
    });
  }

  function desenhar(p, relacionados, avaliacoes) {
    document.title = p.name + ' — TeskBuy';
    var antigo = Number(p.compare_at_price || 0);
    var preco = Number(p.price);
    var desconto = antigo > preco ? Math.round(((antigo - preco) / antigo) * 100) : 0;
    var favorito = estado.favoritos.tem(p.id);
    var imagens = p.imagens && p.imagens.length ? p.imagens : [{ url: ui.imagem(p) }];

    document.getElementById('migalhas').innerHTML =
      '<a href="/">Início</a> · <a href="/loja">Loja</a>' +
      (p.categoria ? ' · <a href="/loja?categoria=' + p.categoria.slug + '">' + ui.escapar(p.categoria.name) + '</a>' : '') +
      ' · <span class="silenciado">' + ui.escapar(p.name) + '</span>';

    var especificacoes = Object.keys(p.specs || {})
      .map(function (k) {
        return '<tr><td>' + ui.escapar(k) + '</td><td>' + ui.escapar(p.specs[k]) + '</td></tr>';
      })
      .join('');

    conteudo.innerHTML =
      '<div class="produto-grelha">' +
        '<div>' +
          '<div class="galeria-principal"><img id="img-principal" src="' + (imagens[0].url || ui.imagem(p)) + '" alt="' + ui.escapar(p.name) + '"></div>' +
          (imagens.length > 1
            ? '<div class="miniaturas">' + imagens.map(function (im, i) {
                return '<button class="' + (i === 0 ? 'activa' : '') + '" data-img="' + im.url + '"><img src="' + im.url + '" alt=""></button>';
              }).join('') + '</div>'
            : '') +
        '</div>' +

        '<div>' +
          '<div class="linha-flex" style="margin-bottom:12px">' +
            '<span class="selo">' + (ui.NOMES_CONDICAO[p.condition] || p.condition) + '</span>' +
            (desconto ? '<span class="selo selo-desconto">−' + desconto + '%</span>' : '') +
            (p.marca ? '<span class="selo">' + ui.escapar(p.marca.name) + '</span>' : '') +
          '</div>' +

          '<h1 style="font-size:clamp(24px,3.4vw,34px);margin-bottom:10px">' + ui.escapar(p.name) + '</h1>' +
          '<div class="linha-flex pequeno silenciado" style="margin-bottom:18px">' +
            estrelas(p.rating) +
            '<span>' + (p.rating_count ? p.rating.toFixed(1) + ' · ' + p.rating_count + ' avaliação(ões)' : 'Ainda sem avaliações') + '</span>' +
            '<span class="mono">SKU ' + ui.escapar(p.sku) + '</span>' +
          '</div>' +

          // quem vende: a própria loja, ou uma empresa parceira
          '<p class="pequeno" style="margin:-10px 0 18px">' +
            '<span class="silenciado">Vendido por</span> <strong>' +
            ui.escapar(p.vendedor ? p.vendedor.name : 'TeskBuy') + '</strong>' +
            (p.vendedor && p.vendedor.rating_count
              ? ' <span class="silenciado">· ' + Number(p.vendedor.rating).toFixed(1) + '/5 em ' +
                p.vendedor.rating_count + ' avaliação(ões)</span>'
              : '') +
          '</p>' +

          (p.short_description ? '<p class="silenciado" style="margin-bottom:22px">' + ui.escapar(p.short_description) + '</p>' : '') +

          '<div class="linha-flex" style="margin-bottom:6px">' +
            '<span class="preco-grande">' + ui.kz(preco) + '</span>' +
            (antigo > preco ? '<span class="preco-antigo" style="font-size:15px">' + ui.kz(antigo) + '</span>' : '') +
          '</div>' +
          (p.poupanca ? '<p class="pequeno" style="color:var(--verde);margin-bottom:18px">Poupa ' + ui.kz(p.poupanca) + '</p>' : '<div style="height:18px"></div>') +

          '<div class="cartao" style="padding:18px;margin-bottom:20px">' +
            '<p class="pequeno" style="margin-bottom:4px">' +
              (p.stock_quantity === 0
                ? '<strong style="color:#ff8a86">Esgotado</strong>'
                : p.stock_baixo
                  ? '<strong style="color:var(--ambar)">Últimas ' + p.stock_quantity + ' unidades</strong>'
                  : '<strong style="color:var(--verde)">Em stock</strong> · ' + p.stock_quantity + ' disponíveis') +
            '</p>' +
            '<p class="pequeno silenciado">Entrega em 24–48h em Luanda · ' +
              (p.warranty_months ? p.warranty_months + ' meses de garantia' : 'Sem garantia adicional') + '</p>' +
          '</div>' +

          '<div class="linha-flex" style="margin-bottom:14px">' +
            '<div class="quantidade">' +
              '<button id="menos" aria-label="Diminuir">' + ui.ico.menos + '</button>' +
              '<span id="qtd">1</span>' +
              '<button id="mais" aria-label="Aumentar">' + ui.ico.mais + '</button>' +
            '</div>' +
            '<button class="btn btn-principal" id="btn-adicionar" style="flex:1;min-width:180px"' +
              (p.stock_quantity === 0 ? ' disabled' : '') + '>' +
              (p.stock_quantity === 0 ? 'Sem stock' : 'Adicionar ao carrinho') + '</button>' +
            '<button class="btn btn-secundario" id="btn-favorito">' +
              (favorito ? ui.ico.coracaoCheio : ui.ico.coracao) + '<span>' + (favorito ? 'Guardado' : 'Guardar') + '</span></button>' +
          '</div>' +
          '<a class="btn btn-secundario btn-largo" href="https://wa.me/244943277184?text=' +
            encodeURIComponent('Olá TeskBuy, tenho interesse no produto: ' + p.name) + '" target="_blank" rel="noopener">Perguntar pelo WhatsApp</a>' +
        '</div>' +
      '</div>' +

      '<section style="padding-bottom:44px">' +
        '<div class="abas">' +
          '<button class="activa" data-aba="descricao">Descrição</button>' +
          '<button data-aba="especificacoes">Especificações</button>' +
          '<button data-aba="entrega">Entrega e pagamento</button>' +
          '<button data-aba="avaliacoes">Avaliações (' + avaliacoes.length + ')</button>' +
        '</div>' +

        '<div id="aba-descricao"><p style="max-width:760px;white-space:pre-line">' +
          ui.escapar(p.description || p.short_description || 'Sem descrição disponível.') + '</p></div>' +

        '<div id="aba-especificacoes" class="esconder" style="max-width:620px">' +
          (especificacoes ? '<table class="especificacoes">' + especificacoes + '</table>'
                          : '<p class="silenciado">Ainda não há especificações registadas para este artigo.</p>') +
        '</div>' +

        '<div id="aba-entrega" class="esconder" style="max-width:700px">' +
          '<p style="margin-bottom:14px"><strong>Entrega.</strong> Luanda em 24 a 48 horas; restantes províncias entre 3 e 7 dias úteis. Entrega gratuita acima de 250.000 Kz.</p>' +
          '<p style="margin-bottom:14px"><strong>Pagamento.</strong> Multicaixa Express, transferência bancária ou numerário na entrega.</p>' +
          '<p><strong>Garantia.</strong> ' + (p.warranty_months ? p.warranty_months + ' meses cobertos pela TeskBuy.' : 'Este artigo não inclui garantia adicional.') +
          ' Para trocas, contacte-nos até 7 dias após a entrega pelo +244 943 277 184.</p>' +
        '</div>' +

        '<div id="aba-avaliacoes" class="esconder" style="max-width:760px">' +
          (avaliacoes.length
            ? avaliacoes.map(function (a) {
                return '<div class="avaliacao-item">' +
                  '<div class="linha-flex" style="margin-bottom:6px">' + estrelas(a.rating) +
                  '<strong>' + ui.escapar((a.autor && a.autor.full_name) || 'Cliente TeskBuy') + '</strong>' +
                  '<span class="pequeno silenciado">' + ui.data(a.created_at) + '</span></div>' +
                  (a.title ? '<p><strong>' + ui.escapar(a.title) + '</strong></p>' : '') +
                  (a.comment ? '<p class="silenciado">' + ui.escapar(a.comment) + '</p>' : '') +
                '</div>';
              }).join('')
            : '<p class="silenciado">Ainda ninguém avaliou este artigo. Seja o primeiro depois de comprar.</p>') +
          '<div id="area-avaliar" style="margin-top:24px"></div>' +
        '</div>' +
        '<p class="pequeno silenciado" style="margin-top:22px">' +
          'Alguma coisa errada com este artigo? ' +
          '<button class="pilula" id="btn-denunciar">Denunciar produto</button>' +
          (p.vendedor ? ' <button class="pilula" id="btn-falar">Falar com o vendedor</button>' : '') +
        '</p>' +
      '</section>' +

      (relacionados.length
        ? '<section class="seccao" style="padding-top:0">' +
            '<div class="seccao-cabecalho"><div><p class="eyebrow">Também pode gostar</p>' +
            '<h2 style="margin-top:10px">Produtos semelhantes</h2></div></div>' +
            '<div class="grelha grelha-produtos" id="relacionados">' + relacionados.map(ui.cartaoProduto).join('') + '</div>' +
          '</section>'
        : '');

    /* galeria */
    conteudo.querySelectorAll('[data-img]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.getElementById('img-principal').src = b.getAttribute('data-img');
        conteudo.querySelectorAll('[data-img]').forEach(function (x) { x.classList.remove('activa'); });
        b.classList.add('activa');
      });
    });

    /* quantidade */
    function mostrarQtd() { document.getElementById('qtd').textContent = quantidade; }
    document.getElementById('menos').addEventListener('click', function () {
      quantidade = Math.max(1, quantidade - 1); mostrarQtd();
    });
    document.getElementById('mais').addEventListener('click', function () {
      quantidade = Math.min(p.stock_quantity || 1, quantidade + 1); mostrarQtd();
    });

    document.getElementById('btn-adicionar').addEventListener('click', function (ev) {
      ui.adicionarAoCarrinho(p, quantidade, ev.currentTarget);
    });

    document.getElementById('btn-favorito').addEventListener('click', function (ev) {
      var btn = ev.currentTarget;
      ui.alternarFavorito(p.id, null);
      setTimeout(function () {
        var activo = estado.favoritos.tem(p.id);
        btn.innerHTML = (activo ? ui.ico.coracaoCheio : ui.ico.coracao) + '<span>' + (activo ? 'Guardado' : 'Guardar') + '</span>';
      }, 350);
    });

    /* abas */
    conteudo.querySelectorAll('[data-aba]').forEach(function (b) {
      b.addEventListener('click', function () {
        conteudo.querySelectorAll('[data-aba]').forEach(function (x) { x.classList.remove('activa'); });
        b.classList.add('activa');
        ['descricao', 'especificacoes', 'entrega', 'avaliacoes'].forEach(function (nome) {
          document.getElementById('aba-' + nome).classList.toggle('esconder', nome !== b.getAttribute('data-aba'));
        });
      });
    });

    var relacionadosEl = document.getElementById('relacionados');
    if (relacionadosEl) {
      var porId = {};
      relacionados.forEach(function (x) { porId[x.id] = x; });
      ui.ligarAccoesProduto(relacionadosEl, porId);
      ligarDenuncia(p);
      ligarConversa(p);
    }

    montarFormularioAvaliacao(p);
  }

  function montarFormularioAvaliacao(p) {
    var area = document.getElementById('area-avaliar');
    if (!area) return;

    if (!api.sessao.activa()) {
      area.innerHTML = '<div class="aviso aviso-info">Inicie sessão para avaliar este produto. <a href="/entrar?voltar=' +
        encodeURIComponent(location.pathname + location.search) + '" style="color:var(--orange-soft)">Entrar</a></div>';
      return;
    }

    area.innerHTML =
      '<div class="cartao">' +
        '<h3 style="margin-bottom:14px">Deixe a sua avaliação</h3>' +
        '<div class="campo"><label for="av-nota">Estrelas</label>' +
          '<select id="av-nota"><option value="5">5 — Excelente</option><option value="4">4 — Bom</option>' +
          '<option value="3">3 — Razoável</option><option value="2">2 — Fraco</option><option value="1">1 — Mau</option></select></div>' +
        '<div class="campo"><label for="av-titulo">Título</label><input id="av-titulo" maxlength="120" placeholder="Resuma a sua experiência"></div>' +
        '<div class="campo"><label for="av-texto">Comentário</label><textarea id="av-texto" maxlength="1500" placeholder="O que achou do produto?"></textarea></div>' +
        '<button class="btn btn-principal" id="av-enviar">Enviar avaliação</button>' +
      '</div>';

    document.getElementById('av-enviar').addEventListener('click', function (ev) {
      var btn = ev.currentTarget;
      btn.disabled = true;
      api.post('/produtos/' + encodeURIComponent(p.slug) + '/avaliacoes', {
        rating: Number(document.getElementById('av-nota').value),
        title: document.getElementById('av-titulo').value.trim() || null,
        comment: document.getElementById('av-texto').value.trim() || null,
      })
        .then(function (r) {
          ui.notificar(r.mensagem, 'ok');
          area.innerHTML = '<div class="aviso aviso-ok">' + ui.escapar(r.mensagem) + '</div>';
        })
        .catch(function (e) { ui.notificar(e.message, 'erro'); btn.disabled = false; });
    });
  }
})();
