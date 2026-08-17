/* TeskBuy — carrinho (conta ou dispositivo) */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI, estado = window.TBEstado;

  ui.iniciar();
  var conteudo = document.getElementById('conteudo');

  function vazio() {
    conteudo.innerHTML =
      '<div class="cartao-vazio" style="margin:30px 0 60px">' +
        '<h3>O carrinho está vazio</h3>' +
        '<p>Ainda não escolheu nada. Comece pelos destaques ou procure o que precisa.</p>' +
        '<a class="btn btn-principal" href="/loja">Ver a loja</a>' +
      '</div>';
  }

  function desenhar(resumo) {
    if (!resumo.itens.length) return vazio();

    var falta = resumo.falta_para_entrega_gratis;
    var progresso = Math.min(100, (resumo.subtotal / resumo.entrega_gratis_acima) * 100);

    conteudo.innerHTML =
      '<div class="carrinho-grelha">' +
        '<div>' +
          resumo.itens.map(function (i) {
            return '<div class="item" data-item="' + i.id + '">' +
              '<a class="item-img" href="/produto?slug=' + encodeURIComponent(i.produto.slug) + '">' +
                '<img src="' + ui.imagem({ imagem: i.produto.imagem, nome: i.produto.nome }) + '" alt="' + ui.escapar(i.produto.nome) + '"></a>' +
              '<div>' +
                '<a href="/produto?slug=' + encodeURIComponent(i.produto.slug) + '"><h3>' + ui.escapar(i.produto.nome) + '</h3></a>' +
                '<p class="pequeno silenciado">' + (ui.NOMES_CONDICAO[i.produto.condicao] || '') +
                  ' · <span class="mono">' + ui.kz(i.preco_unitario) + '</span> por unidade</p>' +
                (!i.disponivel
                  ? '<p class="pequeno" style="color:#ff8a86;margin-top:4px">Só há ' + i.stock_disponivel + ' em stock — ajuste a quantidade.</p>'
                  : '') +
                '<div class="linha-flex" style="margin-top:10px">' +
                  '<div class="quantidade">' +
                    '<button data-menos="' + i.id + '" aria-label="Diminuir">' + ui.ico.menos + '</button>' +
                    '<span>' + i.quantidade + '</span>' +
                    '<button data-mais="' + i.id + '" aria-label="Aumentar">' + ui.ico.mais + '</button>' +
                  '</div>' +
                  '<button class="btn btn-fantasma btn-pequeno" data-remover="' + i.id + '">' + ui.ico.lixo + ' Remover</button>' +
                '</div>' +
              '</div>' +
              '<div class="mono" style="font-size:16px;color:var(--sand);white-space:nowrap">' + ui.kz(i.subtotal) + '</div>' +
            '</div>';
          }).join('') +
          '<div class="linha-flex" style="margin-top:22px">' +
            '<a class="btn btn-secundario" href="/loja">Continuar a comprar</a>' +
            '<button class="btn btn-fantasma" id="esvaziar">Esvaziar carrinho</button>' +
          '</div>' +
        '</div>' +

        '<aside class="resumo cartao">' +
          '<h3 style="margin-bottom:14px">Resumo</h3>' +
          '<div class="resumo-linha"><span class="silenciado">Subtotal (' + resumo.total_itens + ' artigos)</span><span class="mono">' + ui.kz(resumo.subtotal) + '</span></div>' +
          '<div class="resumo-linha"><span class="silenciado">Entrega</span><span class="mono">' + (resumo.entrega === 0 ? 'Grátis' : ui.kz(resumo.entrega)) + '</span></div>' +
          (falta > 0
            ? '<div class="barra-progresso"><i style="width:' + progresso + '%"></i></div>' +
              '<p class="pequeno silenciado">Faltam <span class="mono">' + ui.kz(falta) + '</span> para entrega grátis.</p>'
            : '<p class="pequeno" style="color:var(--verde)">Entrega grátis desbloqueada.</p>') +
          '<div class="resumo-linha resumo-total"><span>Total</span><span class="mono">' + ui.kz(resumo.total) + '</span></div>' +
          '<a class="btn btn-principal btn-largo" href="/checkout" style="margin-top:16px">Finalizar encomenda</a>' +
          '<p class="pequeno silenciado centro" style="margin-top:12px">Multicaixa Express · Transferência · Numerário</p>' +
        '</aside>' +
      '</div>';

    ligar(resumo);
  }

  function ligar(resumo) {
    function acao(fn) {
      return function (ev) {
        ev.currentTarget.disabled = true;
        fn(ev.currentTarget).catch(function (e) {
          ui.notificar(e.message, 'erro');
          ev.currentTarget.disabled = false;
        });
      };
    }

    conteudo.querySelectorAll('[data-mais]').forEach(function (b) {
      b.addEventListener('click', acao(function (el) {
        return mudar(el.getAttribute('data-mais'), 1, resumo);
      }));
    });
    conteudo.querySelectorAll('[data-menos]').forEach(function (b) {
      b.addEventListener('click', acao(function (el) {
        return mudar(el.getAttribute('data-menos'), -1, resumo);
      }));
    });
    conteudo.querySelectorAll('[data-remover]').forEach(function (b) {
      b.addEventListener('click', acao(function (el) {
        return remover(el.getAttribute('data-remover'));
      }));
    });
    document.getElementById('esvaziar').addEventListener('click', function () {
      if (!confirm('Remover todos os artigos do carrinho?')) return;
      if (api.sessao.activa()) {
        api.del('/carrinho').then(carregar).catch(function (e) { ui.notificar(e.message, 'erro'); });
      } else {
        estado.carrinho.limpar();
        carregar();
      }
    });
  }

  function mudar(id, delta, resumo) {
    var item = resumo.itens.filter(function (i) { return i.id === id; })[0];
    var nova = (item ? item.quantidade : 1) + delta;

    if (api.sessao.activa()) {
      return api.patch('/carrinho/itens/' + id, { quantidade: nova }).then(carregar);
    }
    estado.carrinho.definirQuantidade(id, nova);
    carregar();
    return Promise.resolve();
  }

  function remover(id) {
    if (api.sessao.activa()) {
      return api.del('/carrinho/itens/' + id).then(function () {
        ui.notificar('Item removido.', 'ok');
        carregar();
      });
    }
    estado.carrinho.remover(id);
    ui.notificar('Item removido.', 'ok');
    carregar();
    return Promise.resolve();
  }

  function resumoLocal() {
    var itens = estado.carrinho.itens();
    var subtotal = itens.reduce(function (t, i) { return t + i.preco * i.quantidade; }, 0);
    var gratisAcima = 250000;
    var entrega = subtotal === 0 ? 0 : subtotal >= gratisAcima ? 0 : 3500;

    return {
      itens: itens.map(function (i) {
        return {
          id: i.produto_id,
          quantidade: i.quantidade,
          preco_unitario: i.preco,
          subtotal: i.preco * i.quantidade,
          disponivel: i.quantidade <= (i.stock || 99),
          stock_disponivel: i.stock || 99,
          produto: { nome: i.nome, slug: i.slug, imagem: i.imagem, condicao: i.condicao },
        };
      }),
      total_itens: itens.reduce(function (t, i) { return t + i.quantidade; }, 0),
      subtotal: subtotal,
      entrega: entrega,
      total: subtotal + entrega,
      entrega_gratis_acima: gratisAcima,
      falta_para_entrega_gratis: Math.max(0, gratisAcima - subtotal),
    };
  }

  function carregar() {
    if (api.sessao.activa()) {
      conteudo.innerHTML = '<div style="padding:30px 0">' + ui.esqueletos(1, 'esqueleto') + '</div>';
      api.get('/carrinho')
        .then(function (r) {
          desenhar(r.dados);
          var u = api.utilizador.obter() || {};
          u.carrinho_itens = r.dados.total_itens;
          api.utilizador.guardar(u);
          ui.actualizarCrachas();
        })
        .catch(function (e) {
          conteudo.innerHTML = '<div class="aviso aviso-erro" style="margin:30px 0">' + ui.escapar(e.message) + '</div>';
        });
      return;
    }

    desenhar(resumoLocal());
    ui.actualizarCrachas();
  }

  carregar();
})();
