/* TEskBuy — finalizar encomenda */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar();
  var conteudo = document.getElementById('conteudo');

  var PROVINCIAS = [
    'Luanda', 'Benguela', 'Huambo', 'Huíla', 'Bié', 'Bengo', 'Cabinda', 'Cuando Cubango',
    'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Lunda Norte', 'Lunda Sul', 'Malanje',
    'Moxico', 'Namibe', 'Uíge', 'Zaire',
  ];

  var PAGAMENTOS = [
    { valor: 'multicaixa_express', nome: 'Multicaixa Express',
      ajuda: 'Enviamos a referência por SMS depois de confirmarmos a encomenda.' },
    { valor: 'transferencia_bancaria', nome: 'Transferência bancária',
      ajuda: 'Recebe o IBAN por e-mail. A encomenda segue após confirmação do comprovativo.' },
    { valor: 'numerário', nome: 'Numerário na entrega', // corrigido abaixo
      ajuda: 'Paga ao estafeta no momento da entrega. Apenas em Luanda.' },
  ];
  PAGAMENTOS[2].valor = 'numerario';

  if (!ui.exigirSessao('/checkout')) return;

  function campo(id, etiqueta, opcoes) {
    opcoes = opcoes || {};
    return '<div class="campo">' +
      '<label for="' + id + '">' + etiqueta + '</label>' +
      (opcoes.textarea
        ? '<textarea id="' + id + '" name="' + id + '" placeholder="' + (opcoes.dica || '') + '"></textarea>'
        : '<input id="' + id + '" name="' + id + '" type="' + (opcoes.tipo || 'text') + '" ' +
          'placeholder="' + (opcoes.dica || '') + '" ' + (opcoes.valor ? 'value="' + ui.escapar(opcoes.valor) + '"' : '') +
          (opcoes.obrigatorio ? ' required' : '') + '>') +
      (opcoes.ajuda ? '<span class="ajuda">' + opcoes.ajuda + '</span>' : '') +
      '<span class="erro" data-erro="' + id + '"></span>' +
      '</div>';
  }

  function desenhar(resumo, perfil, moradas) {
    var moradaPadrao = (moradas || []).filter(function (m) { return m.is_default; })[0] || (moradas || [])[0];

    conteudo.innerHTML =
      '<form class="checkout-grelha" id="form-checkout" novalidate>' +
        '<div>' +

          (moradas && moradas.length
            ? '<section class="passo">' +
                '<h2><i>1</i> Moradas guardadas</h2>' +
                '<div class="pilulas" id="moradas-guardadas">' +
                  moradas.map(function (m, i) {
                    return '<button type="button" class="pilula' + (m === moradaPadrao ? ' activa' : '') + '" data-morada="' + i + '">' +
                      ui.escapar(m.label || 'Morada') + ' · ' + ui.escapar(m.municipality) + '</button>';
                  }).join('') +
                '</div>' +
              '</section>'
            : '') +

          '<section class="passo">' +
            '<h2><i>' + (moradas && moradas.length ? '2' : '1') + '</i> Quem recebe</h2>' +
            '<div class="campo-duplo">' +
              campo('nome', 'Nome completo', { obrigatorio: true, valor: (moradaPadrao && moradaPadrao.recipient_name) || perfil.nome || '' }) +
              campo('telefone', 'Telefone', { tipo: 'tel', obrigatorio: true, dica: '+244 9XX XXX XXX',
                valor: (moradaPadrao && moradaPadrao.phone) || perfil.telefone || '' }) +
            '</div>' +
            campo('email', 'E-mail', { tipo: 'email', valor: perfil.email || '', ajuda: 'Para lhe enviarmos a confirmação.' }) +
          '</section>' +

          '<section class="passo">' +
            '<h2><i>' + (moradas && moradas.length ? '3' : '2') + '</i> Onde entregamos</h2>' +
            '<div class="campo-duplo">' +
              '<div class="campo">' +
                '<label for="provincia">Província</label>' +
                '<select id="provincia" name="provincia">' +
                  PROVINCIAS.map(function (p) {
                    var sel = (moradaPadrao ? moradaPadrao.province : 'Luanda') === p ? ' selected' : '';
                    return '<option value="' + p + '"' + sel + '>' + p + '</option>';
                  }).join('') +
                '</select>' +
                '<span class="erro" data-erro="provincia"></span>' +
              '</div>' +
              campo('municipio', 'Município', { obrigatorio: true, valor: (moradaPadrao && moradaPadrao.municipality) || '' }) +
            '</div>' +
            '<div class="campo-duplo">' +
              campo('bairro', 'Bairro', { valor: (moradaPadrao && moradaPadrao.neighbourhood) || '' }) +
              campo('rua', 'Rua e número', { valor: (moradaPadrao && moradaPadrao.street) || '' }) +
            '</div>' +
            campo('referencia', 'Ponto de referência', {
              valor: (moradaPadrao && moradaPadrao.reference_point) || '',
              ajuda: 'Ajuda o estafeta a chegar mais depressa.',
            }) +
            campo('notas', 'Notas para a entrega', { textarea: true, dica: 'Horário preferido, instruções, etc.' }) +
          '</section>' +

          '<section class="passo">' +
            '<h2><i>' + (moradas && moradas.length ? '4' : '3') + '</i> Como paga</h2>' +
            '<div style="display:grid;gap:10px" id="pagamentos">' +
              PAGAMENTOS.map(function (p, i) {
                return '<label class="opcao' + (i === 0 ? ' activa' : '') + '" data-pagamento="' + p.valor + '">' +
                  '<input type="radio" name="metodo_pagamento" value="' + p.valor + '"' + (i === 0 ? ' checked' : '') + '>' +
                  '<span><strong>' + p.nome + '</strong><span>' + p.ajuda + '</span></span>' +
                '</label>';
              }).join('') +
            '</div>' +
            '<span class="erro" data-erro="metodo_pagamento"></span>' +
          '</section>' +
        '</div>' +

        '<aside class="resumo cartao">' +
          '<h3 style="margin-bottom:12px">A sua encomenda</h3>' +
          '<div id="mini-itens">' +
            resumo.itens.map(function (i) {
              return '<div class="mini-item">' +
                '<img src="' + ui.imagem({ imagem: i.produto.imagem, nome: i.produto.nome }) + '" alt="">' +
                '<div style="flex:1">' + ui.escapar(i.produto.nome) +
                  '<span class="silenciado"> × ' + i.quantidade + '</span></div>' +
                '<span class="mono">' + ui.kz(i.subtotal) + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +

          '<div class="campo" style="margin-top:16px">' +
            '<label for="cupao">Código de desconto</label>' +
            '<input id="cupao" name="cupao" placeholder="Ex.: BEMVINDO10">' +
            '<span class="ajuda">Aplicamos o desconto ao confirmar.</span>' +
          '</div>' +

          '<div class="resumo-linha"><span class="silenciado">Subtotal</span>' +
            '<span class="mono">' + ui.kz(resumo.subtotal) + '</span></div>' +
          '<div class="resumo-linha"><span class="silenciado">Entrega</span>' +
            '<span class="mono" id="valor-entrega">' + (resumo.entrega === 0 ? 'Grátis' : ui.kz(resumo.entrega)) + '</span></div>' +
          '<div class="resumo-linha resumo-total"><span>Total</span>' +
            '<span class="mono" id="valor-total">' + ui.kz(resumo.total) + '</span></div>' +

          '<button type="submit" class="btn btn-principal btn-largo" id="btn-confirmar" style="margin-top:16px">' +
            'Confirmar encomenda</button>' +
          '<p class="pequeno silenciado centro" style="margin-top:12px">' +
            'Ligamos para o número indicado antes de enviar.</p>' +
          '<div id="erro-geral"></div>' +
        '</aside>' +
      '</form>';

    ligar(resumo, moradas || []);
  }

  function ligar(resumo, moradas) {
    var form = document.getElementById('form-checkout');

    form.querySelectorAll('[data-pagamento]').forEach(function (el) {
      el.addEventListener('click', function () {
        form.querySelectorAll('[data-pagamento]').forEach(function (o) { o.classList.remove('activa'); });
        el.classList.add('activa');
      });
    });

    form.querySelectorAll('[data-morada]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        form.querySelectorAll('[data-morada]').forEach(function (b) { b.classList.remove('activa'); });
        btn.classList.add('activa');
        preencher(moradas[Number(btn.getAttribute('data-morada'))]);
      });
    });

    document.getElementById('provincia').addEventListener('change', recalcularEntrega);
    form.addEventListener('submit', submeter);

    function preencher(m) {
      if (!m) return;
      form.nome.value = m.recipient_name || form.nome.value;
      form.telefone.value = m.phone || '';
      form.provincia.value = m.province || 'Luanda';
      form.municipio.value = m.municipality || '';
      form.bairro.value = m.neighbourhood || '';
      form.rua.value = m.street || '';
      form.referencia.value = m.reference_point || '';
      recalcularEntrega();
    }

    function recalcularEntrega() {
      var luanda = form.provincia.value.toLowerCase() === 'luanda';
      var entrega = resumo.subtotal >= resumo.entrega_gratis_acima ? 0 : (luanda ? 3500 : 12000);
      document.getElementById('valor-entrega').textContent = entrega === 0 ? 'Grátis' : ui.kz(entrega);
      document.getElementById('valor-total').textContent = ui.kz(resumo.subtotal + entrega);
    }

    function limparErros() {
      form.querySelectorAll('[data-erro]').forEach(function (s) { s.textContent = ''; });
      document.getElementById('erro-geral').innerHTML = '';
    }

    function submeter(ev) {
      ev.preventDefault();
      limparErros();

      var btn = document.getElementById('btn-confirmar');
      btn.disabled = true;
      btn.textContent = 'A registar…';

      var dados = {
        nome: form.nome.value.trim(),
        telefone: form.telefone.value.trim(),
        email: form.email.value.trim(),
        metodo_pagamento: form.metodo_pagamento.value,
        provincia: form.provincia.value,
        municipio: form.municipio.value.trim(),
        bairro: form.bairro.value.trim(),
        rua: form.rua.value.trim(),
        referencia: form.referencia.value.trim(),
        notas: form.notas.value.trim(),
        cupao: form.cupao.value.trim(),
        ref: ui.referencia() || undefined,
      };

      api.post('/encomendas', dados)
        .then(function (r) {
          ui.notificar(r.mensagem || 'Encomenda registada.', 'ok');
          location.href = '/encomenda?id=' + encodeURIComponent(r.dados.id) + '&nova=1';
        })
        .catch(function (e) {
          btn.disabled = false;
          btn.textContent = 'Confirmar encomenda';

          (e.detalhes || []).forEach(function (d) {
            var alvo = form.querySelector('[data-erro="' + d.campo + '"]');
            if (alvo) alvo.textContent = d.mensagem;
          });
          document.getElementById('erro-geral').innerHTML =
            '<div class="aviso aviso-erro" style="margin-top:14px">' + ui.escapar(e.message) + '</div>';
          ui.notificar(e.message, 'erro');
        });
    }
  }

  function carregar() {
    conteudo.innerHTML = '<div style="padding:30px 0">' + ui.esqueletos(1, 'esqueleto') + '</div>';

    Promise.all([
      api.get('/carrinho'),
      api.get('/utilizadores/eu'),
      api.get('/utilizadores/eu/moradas').catch(function () { return { dados: [] }; }),
    ])
      .then(function (r) {
        var resumo = r[0].dados;
        if (!resumo.itens.length) {
          conteudo.innerHTML =
            '<div class="cartao-vazio" style="margin:30px 0 60px">' +
              '<h3>Não há nada para encomendar</h3>' +
              '<p>O carrinho está vazio. Escolha primeiro o que quer levar.</p>' +
              '<a class="btn btn-principal" href="/loja">Ver a loja</a>' +
            '</div>';
          return;
        }

        var indisponiveis = resumo.itens.filter(function (i) { return !i.disponivel; });
        if (indisponiveis.length) {
          ui.notificar('Alguns artigos já não têm stock suficiente. Ajuste o carrinho.', 'erro');
          location.href = '/carrinho';
          return;
        }

        var p = r[1].dados;
        desenhar(resumo, { nome: p.full_name, telefone: p.phone, email: p.email }, r[2].dados);
      })
      .catch(function (e) {
        conteudo.innerHTML = '<div class="aviso aviso-erro" style="margin:30px 0">' + ui.escapar(e.message) + '</div>';
      });
  }

  carregar();
})();
