/* TeskBuy — detalhe da encomenda */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar();
  var conteudo = document.getElementById('conteudo');

  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var ehNova = params.get('nova') === '1';

  if (!id) {
    conteudo.innerHTML =
      '<div class="cartao-vazio"><h3>Encomenda não indicada</h3>' +
      '<p>Abra a encomenda a partir da sua lista.</p>' +
      '<a class="btn btn-principal" href="/encomendas">Ver as minhas encomendas</a></div>';
    return;
  }
  if (!ui.exigirSessao('/encomenda?id=' + encodeURIComponent(id))) return;

  var INSTRUCOES = {
    multicaixa_express: 'Vamos enviar a referência Multicaixa Express por SMS para o número indicado.',
    transferencia_bancaria: 'Recebe o IBAN por e-mail. Envie o comprovativo e confirmamos de imediato.',
    numerario: 'Prepare o valor exacto. Paga ao estafeta no momento da entrega.',
  };

  var SEQUENCIA = ['pendente', 'confirmada', 'em_preparacao', 'enviada', 'entregue'];

  /**
   * Avaliação das empresas que venderam nesta encomenda.
   * Só aparece depois da entrega — antes disso não há o que avaliar.
   */
  function avaliacaoVendedores(e) {
    if (e.status !== 'entregue') return '';

    var empresas = {};
    (e.itens || []).forEach(function (i) {
      if (i.empresa && i.empresa.id) empresas[i.empresa.id] = i.empresa.name;
    });
    var ids = Object.keys(empresas);
    if (!ids.length) return '';

    return '<div class="cartao" style="margin-top:22px">' +
      '<h3 style="margin-bottom:6px">Como correu?</h3>' +
      '<p class="pequeno silenciado" style="margin-bottom:14px">' +
        'A sua avaliação ajuda outros compradores a escolher.</p>' +
      ids.map(function (id) {
        return '<div style="padding:10px 0;border-top:1px solid rgba(238,247,248,.06)" data-av="' + id + '">' +
          '<p class="pequeno" style="margin-bottom:8px">' +
            '<span class="silenciado">Vendido por</span> <strong>' + ui.escapar(empresas[id]) + '</strong></p>' +
          '<div class="linha-flex" style="gap:6px;margin-bottom:8px">' +
            [1, 2, 3, 4, 5].map(function (n) {
              return '<button class="pilula" data-estrela="' + n + '" data-emp="' + id + '">' + n + '★</button>';
            }).join('') +
          '</div>' +
          '<div class="campo"><input id="av-' + id + '" placeholder="Comentário (opcional)"></div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function ligarAvaliacaoVendedor(e) {
    document.querySelectorAll('[data-estrela]').forEach(function (b) {
      b.addEventListener('click', function () {
        var empresaId = b.getAttribute('data-emp');
        var campo = document.getElementById('av-' + empresaId);
        var bloco = document.querySelector('[data-av="' + empresaId + '"]');

        bloco.querySelectorAll('[data-estrela]').forEach(function (o) { o.disabled = true; });

        api.post('/suporte/avaliacoes-vendedor', {
          empresa_id: empresaId,
          encomenda_id: e.id,
          estrelas: Number(b.getAttribute('data-estrela')),
          comentario: campo && campo.value.trim() ? campo.value.trim() : undefined,
        })
          .then(function (r) {
            ui.notificar(r.mensagem, 'ok');
            bloco.innerHTML = '<p class="pequeno">Obrigado pela avaliação.</p>';
          })
          .catch(function (err) {
            ui.notificar(err.message, 'erro');
            bloco.querySelectorAll('[data-estrela]').forEach(function (o) { o.disabled = false; });
          });
      });
    });
  }

  function morada(e) {
    return [e.ship_street, e.ship_neighbourhood, e.ship_municipality, e.ship_province]
      .filter(Boolean).map(ui.escapar).join(', ');
  }

  function desenhar(e) {
    var cancelavel = ['pendente', 'confirmada'].indexOf(e.status) !== -1;
    var posicaoActual = SEQUENCIA.indexOf(e.status);

    conteudo.innerHTML =
      (ehNova
        ? '<div class="aviso aviso-ok" style="margin-bottom:22px">' +
            '<span><strong>Encomenda registada.</strong> Ligamos para ' + ui.escapar(e.customer_phone) +
            ' para confirmar antes de enviar.</span></div>'
        : '') +

      '<div class="linha-flex" style="justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">' +
        '<div>' +
          '<p class="eyebrow">Encomenda</p>' +
          '<h1 class="mono" style="margin-top:10px;font-size:30px">' + ui.escapar(e.order_number) + '</h1>' +
          '<p class="pequeno silenciado" style="margin-top:6px">Feita a ' + ui.data(e.created_at, true) + '</p>' +
        '</div>' +
        '<span class="estado estado-' + e.status + '">' + (ui.NOMES_ESTADO[e.status] || e.status) + '</span>' +
      '</div>' +

      avaliacaoVendedores(e) +

      '<div class="grelha-2" style="margin-top:28px;align-items:start">' +
        '<div>' +
          '<div class="cartao" style="margin-bottom:16px">' +
            '<h3 style="margin-bottom:14px">Artigos</h3>' +
            (e.itens || []).map(function (i) {
              return '<div class="mini-item" style="display:flex;gap:12px;padding:10px 0;align-items:center;border-bottom:1px solid rgba(238,247,248,.06)">' +
                '<img src="' + ui.imagem({ imagem: i.product_image, nome: i.product_name }) + '" alt="" ' +
                  'style="width:52px;height:52px;border-radius:9px;object-fit:cover;background:var(--surface-2)">' +
                '<div style="flex:1">' +
                  '<p>' + ui.escapar(i.product_name) + '</p>' +
                  '<p class="pequeno silenciado mono">' + (i.product_sku ? ui.escapar(i.product_sku) + ' · ' : '') +
                    ui.kz(i.unit_price) + ' × ' + i.quantity + '</p>' +
                '</div>' +
                '<span class="mono" style="white-space:nowrap">' + ui.kz(i.subtotal) + '</span>' +
              '</div>';
            }).join('') +

            '<div class="resumo-linha" style="display:flex;justify-content:space-between;padding:10px 0 0">' +
              '<span class="silenciado">Subtotal</span><span class="mono">' + ui.kz(e.subtotal) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;padding:6px 0">' +
              '<span class="silenciado">Entrega</span>' +
              '<span class="mono">' + (Number(e.shipping_cost) === 0 ? 'Grátis' : ui.kz(e.shipping_cost)) + '</span></div>' +
            (Number(e.discount) > 0
              ? '<div style="display:flex;justify-content:space-between;padding:6px 0">' +
                  '<span class="silenciado">Desconto' + (e.coupon_code ? ' (' + ui.escapar(e.coupon_code) + ')' : '') + '</span>' +
                  '<span class="mono" style="color:var(--verde)">− ' + ui.kz(e.discount) + '</span></div>'
              : '') +
            '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--linha);margin-top:10px;padding-top:14px">' +
              '<strong>Total</strong>' +
              '<strong class="mono" style="font-size:18px;color:var(--sand)">' + ui.kz(e.total) + '</strong></div>' +
          '</div>' +

          '<div class="cartao">' +
            '<h3 style="margin-bottom:12px">Percurso da encomenda</h3>' +
            '<ul class="linha-tempo">' +
              (e.historico || []).map(function (h, indice) {
                var passado = indice < (e.historico || []).length - 1;
                return '<li' + (passado ? ' class="passado"' : '') + '>' +
                  '<p><strong>' + (ui.NOMES_ESTADO[h.status] || h.status) + '</strong></p>' +
                  '<p class="pequeno silenciado">' + ui.data(h.created_at, true) +
                    (h.note ? ' · ' + ui.escapar(h.note) : '') + '</p>' +
                '</li>';
              }).join('') +
              (posicaoActual >= 0 && posicaoActual < SEQUENCIA.length - 1
                ? '<li style="opacity:.5"><p><strong>' +
                    (ui.NOMES_ESTADO[SEQUENCIA[posicaoActual + 1]] || '') + '</strong></p>' +
                    '<p class="pequeno silenciado">Passo seguinte</p></li>'
                : '') +
            '</ul>' +
          '</div>' +
        '</div>' +

        '<aside>' +
          '<div class="cartao" style="margin-bottom:16px">' +
            '<h3 style="margin-bottom:12px">Pagamento</h3>' +
            '<p>' + (ui.NOMES_PAGAMENTO[e.payment_method] || e.payment_method) + '</p>' +
            '<p class="pequeno silenciado" style="margin-top:6px">' +
              (INSTRUCOES[e.payment_method] || '') + '</p>' +
            (e.payment_reference
              ? '<p class="mono" style="margin-top:10px;color:var(--sand)">Referência: ' +
                ui.escapar(e.payment_reference) + '</p>'
              : '') +
            '<p class="pequeno" style="margin-top:10px">Estado: <strong>' +
              (e.payment_status === 'pago' ? 'Pago' : e.payment_status === 'reembolsado' ? 'Reembolsado' : 'Por pagar') +
            '</strong></p>' +
          '</div>' +

          '<div class="cartao" style="margin-bottom:16px">' +
            '<h3 style="margin-bottom:12px">Entrega</h3>' +
            '<p>' + ui.escapar(e.customer_name) + '</p>' +
            '<p class="pequeno silenciado mono" style="margin-top:4px">' + ui.escapar(e.customer_phone) + '</p>' +
            '<p class="pequeno silenciado" style="margin-top:8px">' + morada(e) + '</p>' +
            (e.ship_reference
              ? '<p class="pequeno silenciado" style="margin-top:6px">Referência: ' + ui.escapar(e.ship_reference) + '</p>'
              : '') +
            (e.notes ? '<p class="pequeno" style="margin-top:10px">Nota: ' + ui.escapar(e.notes) + '</p>' : '') +
          '</div>' +

          '<div class="cartao">' +
            '<h3 style="margin-bottom:10px">Precisa de ajuda?</h3>' +
            '<p class="pequeno silenciado" style="margin-bottom:12px">Fale connosco e indique o número da encomenda.</p>' +
            '<a class="btn btn-secundario btn-largo" href="tel:+244943277184">+244 943 277 184</a>' +
            (cancelavel
              ? '<button class="btn btn-perigo btn-largo" id="cancelar" style="margin-top:10px">Cancelar encomenda</button>'
              : '') +
          '</div>' +
        '</aside>' +
      '</div>' +

      '<div style="margin-top:26px"><a class="btn btn-fantasma" href="/encomendas">← Todas as encomendas</a></div>';

    ligarAvaliacaoVendedor(e);

    var btn = document.getElementById('cancelar');
    if (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Cancelar a encomenda ' + e.order_number + '? O stock volta a ficar disponível.')) return;
        btn.disabled = true;
        btn.textContent = 'A cancelar…';
        api.post('/encomendas/' + e.id + '/cancelar')
          .then(function (r) {
            ui.notificar(r.mensagem || 'Encomenda cancelada.', 'ok');
            ehNova = false;
            desenhar(r.dados);
          })
          .catch(function (err) {
            btn.disabled = false;
            btn.textContent = 'Cancelar encomenda';
            ui.notificar(err.message, 'erro');
          });
      });
    }
  }

  conteudo.innerHTML = ui.esqueletos(2, 'esqueleto');
  api.get('/encomendas/' + encodeURIComponent(id))
    .then(function (r) { desenhar(r.dados); })
    .catch(function (e) {
      conteudo.innerHTML =
        '<div class="cartao-vazio"><h3>Não encontrámos esta encomenda</h3>' +
        '<p>' + ui.escapar(e.message) + '</p>' +
        '<a class="btn btn-principal" href="/encomendas">Ver as minhas encomendas</a></div>';
    });
})();
