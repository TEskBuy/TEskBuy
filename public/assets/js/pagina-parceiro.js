/* TeskBuy — candidatura a vendedor ou a afiliado */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI;

  ui.iniciar();

  var aviso = document.getElementById('aviso');
  var lista = document.getElementById('candidaturas');

  /* Sem sessão não há candidatura: leva-se o cliente a entrar e volta aqui. */
  if (!api.sessao.activa()) {
    aviso.innerHTML =
      '<div class="aviso aviso-info" style="margin-bottom:18px">' +
        '<span>Para se candidatar precisa de ter conta. ' +
        '<a href="/entrar?voltar=/parceiro" style="color:var(--orange-soft)">Entrar ou criar conta</a>.</span>' +
      '</div>';
  }

  var ESTADOS = {
    pendente: { texto: 'Em espera', cor: 'aviso-info' },
    em_analise: { texto: 'Em análise', cor: 'aviso-info' },
    info_pedida: { texto: 'Falta informação', cor: 'aviso-alerta' },
    aprovado: { texto: 'Aprovada', cor: 'aviso-ok' },
    rejeitado: { texto: 'Não aprovada', cor: 'aviso-erro' },
    cancelado: { texto: 'Cancelada', cor: 'aviso-info' },
  };
  var NOMES = { vendedor: 'Vendedor', afiliado: 'Afiliado' };

  /** Mostra o que já foi pedido, para ninguém se candidatar duas vezes às cegas. */
  function mostrarCandidaturas() {
    if (!api.sessao.activa()) return;

    api.get('/parceiros/candidaturas')
      .then(function (r) {
        var itens = r.dados || [];
        if (!itens.length) return;

        lista.innerHTML = itens.map(function (c) {
          var e = ESTADOS[c.estado] || ESTADOS.pendente;
          return '<div class="aviso ' + e.cor + '" style="margin-bottom:12px">' +
            '<span><strong>' + ui.escapar(NOMES[c.tipo] || c.tipo) + '</strong> — ' +
            ui.escapar(e.texto) + ' · ' + ui.data(c.criado_em) +
            (c.nota_admin ? '<br>' + ui.escapar(c.nota_admin) : '') +
            '</span></div>';
        }).join('');

        // Se já há um pedido em curso, não vale a pena mostrar o formulário.
        var emCurso = itens.some(function (c) {
          return ['pendente', 'em_analise', 'aprovado'].indexOf(c.estado) !== -1;
        });
        if (emCurso) {
          document.querySelector('.pc-grelha').style.display = 'none';
          document.querySelector('.pc-passos').style.display = 'none';
        }
      })
      .catch(function () { /* silêncio: a página continua utilizável */ });
  }

  /* ── escolha entre vendedor e afiliado ─────────────────────── */
  var formVendedor = document.getElementById('form-vendedor');
  var formAfiliado = document.getElementById('form-afiliado');
  var opVendedor = document.getElementById('op-vendedor');
  var opAfiliado = document.getElementById('op-afiliado');

  function escolher(qual) {
    var vendedor = qual === 'vendedor';
    opVendedor.classList.toggle('activa', vendedor);
    opAfiliado.classList.toggle('activa', !vendedor);
    formVendedor.classList.toggle('visivel', vendedor);
    formAfiliado.classList.toggle('visivel', !vendedor);
    (vendedor ? formVendedor : formAfiliado).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  opVendedor.addEventListener('click', function () { escolher('vendedor'); });
  opAfiliado.addEventListener('click', function () { escolher('afiliado'); });

  function v(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /** Tira os campos vazios: o servidor rejeita textos em branco onde espera opcionais. */
  function limpar(objecto) {
    var saida = {};
    Object.keys(objecto).forEach(function (k) {
      var valor = objecto[k];
      if (valor === '' || valor === null || valor === undefined) return;
      saida[k] = valor;
    });
    return saida;
  }

  function submeter(form, botaoId, caminho, montar) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!api.sessao.activa()) {
        location.href = '/entrar?voltar=/parceiro';
        return;
      }

      var botao = document.getElementById(botaoId);
      botao.disabled = true;
      botao.textContent = 'A enviar…';

      api.post(caminho, montar())
        .then(function (r) {
          ui.notificar(r.mensagem, 'ok');
          form.classList.remove('visivel');
          mostrarCandidaturas();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(function (e) {
          var detalhe = e.detalhes && e.detalhes.length
            ? e.detalhes.map(function (d) { return d.mensagem; }).join(' ')
            : e.message;
          ui.notificar(detalhe, 'erro');
        })
        .then(function () {
          botao.disabled = false;
          botao.textContent = 'Enviar candidatura';
        });
    });
  }

  submeter(formVendedor, 'v-submeter', '/parceiros/candidaturas/vendedor', function () {
    return limpar({
      nome_empresa: v('v-nome'),
      nome_legal: v('v-legal'),
      nif: v('v-nif'),
      email: v('v-email'),
      telefone: v('v-tel'),
      provincia: v('v-prov'),
      municipio: v('v-mun'),
      morada: v('v-morada'),
      descricao: v('v-desc'),
      kyc: limpar({
        nome_completo: v('v-k-nome'),
        tipo_documento: v('v-k-tipo'),
        numero_documento: v('v-k-num'),
        morada: v('v-k-morada'),
      }),
    });
  });

  submeter(formAfiliado, 'a-submeter', '/parceiros/candidaturas/afiliado', function () {
    return limpar({
      nome: v('a-nome'),
      telefone: v('a-tel'),
      canais: v('a-canais'),
      motivo: v('a-motivo'),
      kyc: limpar({
        nome_completo: v('a-k-nome'),
        tipo_documento: v('a-k-tipo'),
        numero_documento: v('a-k-num'),
        morada: v('a-k-morada'),
      }),
    });
  });

  mostrarCandidaturas();
})();
