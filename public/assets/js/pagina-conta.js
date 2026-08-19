/* TeskBuy — a minha conta */
(function () {
  'use strict';
  var api = window.TBApi, ui = window.TBUI, estado = window.TBEstado;

  ui.iniciar();
  var conteudo = document.getElementById('conteudo');
  if (!ui.exigirSessao('/conta')) return;

  var PROVINCIAS = [
    'Luanda', 'Benguela', 'Huambo', 'Huíla', 'Bié', 'Bengo', 'Cabinda', 'Cuando Cubango',
    'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Lunda Norte', 'Lunda Sul', 'Malanje',
    'Moxico', 'Namibe', 'Uíge', 'Zaire',
  ];

  var separador = location.hash.replace('#', '') || 'dados';
  var perfil = null;
  var moradas = [];

  function esqueleto() {
    conteudo.innerHTML = '<div style="padding:30px 0">' + ui.esqueletos(2, 'esqueleto') + '</div>';
  }

  function moldura(interior) {
    var u = api.utilizador.obter() || {};
    var separadores = [
      { id: 'dados', nome: 'Os meus dados' },
      { id: 'moradas', nome: 'Moradas' },
      { id: 'seguranca', nome: 'Segurança' },
    ];

    conteudo.innerHTML =
      '<div class="conta-grelha">' +
        '<aside>' +
          '<div class="cartao" style="margin-bottom:16px">' +
            '<p class="mono pequeno silenciado">Conta</p>' +
            '<p style="margin-top:6px;font-size:16px">' + ui.escapar(perfil.full_name || 'Cliente TeskBuy') + '</p>' +
            '<p class="pequeno silenciado" style="margin-top:2px">' + ui.escapar(perfil.email || '') + '</p>' +
            (perfil.role !== 'cliente'
              ? '<p class="pilula" style="margin-top:10px;display:inline-block">' +
                (perfil.role === 'admin' ? 'Administrador' : 'Gestor') + '</p>'
              : '') +
          '</div>' +
          '<nav class="menu-conta">' +
            separadores.map(function (s) {
              return '<button data-sep="' + s.id + '" class="' + (separador === s.id ? 'activo' : '') + '">' + s.nome + '</button>';
            }).join('') +
            '<a href="/encomendas">As minhas encomendas</a>' +
            '<a href="/favoritos">Favoritos</a>' +
            (u.papel === 'admin' || u.papel === 'gestor' ? '<a href="/admin">Painel de gestão</a>' : '') +
            '<button id="terminar" style="color:#ff8a86">Terminar sessão</button>' +
          '</nav>' +
        '</aside>' +
        '<div id="painel">' + interior + '</div>' +
      '</div>';

    conteudo.querySelectorAll('[data-sep]').forEach(function (b) {
      b.addEventListener('click', function () {
        separador = b.getAttribute('data-sep');
        location.hash = separador;
        desenhar();
      });
    });

    document.getElementById('terminar').addEventListener('click', function () {
      api.sair().then(function () {
        estado.carrinho.limpar();
        estado.favoritos.definir([]);
        location.href = '/';
      });
    });
  }

  /* ── dados pessoais ─────────────────────────────────────── */
  function painelDados() {
    return '<h1 style="padding-top:4px">Os meus dados</h1>' +
      '<p class="silenciado pequeno" style="margin:6px 0 20px">Usamos estes dados para o contactar sobre as encomendas.</p>' +
      '<form class="cartao" id="form-perfil">' +
        '<div class="campo"><label for="nome">Nome completo</label>' +
          '<input id="nome" value="' + ui.escapar(perfil.full_name || '') + '" required>' +
          '<span class="erro" data-erro="nome"></span></div>' +
        '<div class="campo"><label for="telefone">Telefone</label>' +
          '<input id="telefone" type="tel" placeholder="+244 9XX XXX XXX" value="' + ui.escapar(perfil.phone || '') + '">' +
          '<span class="erro" data-erro="telefone"></span></div>' +
        '<div class="campo"><label for="email">E-mail</label>' +
          '<input id="email" value="' + ui.escapar(perfil.email || '') + '" disabled>' +
          '<span class="ajuda">Para mudar o e-mail, fale connosco pelo +244 943 277 184.</span></div>' +
        '<button class="btn btn-principal" type="submit">Guardar alterações</button>' +
      '</form>';
  }

  function ligarDados() {
    var form = document.getElementById('form-perfil');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      form.querySelectorAll('[data-erro]').forEach(function (s) { s.textContent = ''; });

      var btn = form.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'A guardar…';

      api.patch('/utilizadores/eu', {
        nome: document.getElementById('nome').value.trim(),
        telefone: document.getElementById('telefone').value.trim(),
      })
        .then(function (r) {
          perfil = r.dados;
          var u = api.utilizador.obter() || {};
          u.nome = perfil.full_name;
          api.utilizador.guardar(u);
          ui.notificar('Dados actualizados.', 'ok');
          desenhar();
        })
        .catch(function (e) {
          btn.disabled = false;
          btn.textContent = 'Guardar alterações';
          (e.detalhes || []).forEach(function (d) {
            var alvo = form.querySelector('[data-erro="' + d.campo + '"]');
            if (alvo) alvo.textContent = d.mensagem;
          });
          ui.notificar(e.message, 'erro');
        });
    });
  }

  /* ── moradas ────────────────────────────────────────────── */
  function painelMoradas() {
    return '<h1 style="padding-top:4px">Moradas</h1>' +
      '<p class="silenciado pequeno" style="margin:6px 0 20px">Guardadas para preencher o checkout mais depressa.</p>' +
      (moradas.length
        ? moradas.map(function (m) {
            return '<div class="cartao" style="margin-bottom:12px">' +
              '<div class="linha-flex" style="justify-content:space-between;align-items:flex-start;gap:12px">' +
                '<div>' +
                  '<p><strong>' + ui.escapar(m.label || 'Morada') + '</strong>' +
                    (m.is_default ? ' <span class="pilula" style="margin-left:6px">Predefinida</span>' : '') + '</p>' +
                  '<p class="pequeno" style="margin-top:6px">' + ui.escapar(m.recipient_name) + ' · ' +
                    '<span class="mono">' + ui.escapar(m.phone) + '</span></p>' +
                  '<p class="pequeno silenciado" style="margin-top:4px">' +
                    [m.street, m.neighbourhood, m.municipality, m.province].filter(Boolean).map(ui.escapar).join(', ') + '</p>' +
                '</div>' +
                '<button class="btn btn-fantasma btn-pequeno" data-apagar-morada="' + m.id + '">Remover</button>' +
              '</div>' +
            '</div>';
          }).join('')
        : '<div class="cartao-vazio" style="padding:34px 20px;margin-bottom:16px">' +
            '<h3>Sem moradas guardadas</h3><p>Adicione uma para não voltar a escrever tudo.</p></div>') +

      '<details class="cartao" style="margin-top:6px">' +
        '<summary style="cursor:pointer;font-family:\'Space Grotesk\',sans-serif;font-weight:600">Adicionar morada</summary>' +
        '<form id="form-morada" style="margin-top:18px">' +
          '<div class="campo-duplo">' +
            '<div class="campo"><label for="m-label">Etiqueta</label><input id="m-label" value="Casa"></div>' +
            '<div class="campo"><label for="m-nome">Quem recebe</label><input id="m-nome" required ' +
              'value="' + ui.escapar(perfil.full_name || '') + '"></div>' +
          '</div>' +
          '<div class="campo-duplo">' +
            '<div class="campo"><label for="m-telefone">Telefone</label>' +
              '<input id="m-telefone" type="tel" placeholder="+244 9XX XXX XXX" required ' +
              'value="' + ui.escapar(perfil.phone || '') + '"></div>' +
            '<div class="campo"><label for="m-provincia">Província</label><select id="m-provincia">' +
              PROVINCIAS.map(function (p) { return '<option' + (p === 'Luanda' ? ' selected' : '') + '>' + p + '</option>'; }).join('') +
              '</select></div>' +
          '</div>' +
          '<div class="campo-duplo">' +
            '<div class="campo"><label for="m-municipio">Município</label><input id="m-municipio" required></div>' +
            '<div class="campo"><label for="m-bairro">Bairro</label><input id="m-bairro"></div>' +
          '</div>' +
          '<div class="campo"><label for="m-rua">Rua e número</label><input id="m-rua"></div>' +
          '<div class="campo"><label for="m-referencia">Ponto de referência</label><input id="m-referencia"></div>' +
          '<label class="opcao" style="margin-bottom:16px">' +
            '<input type="checkbox" id="m-padrao"><span><strong>Usar como morada predefinida</strong>' +
            '<span>Aparece já preenchida no checkout.</span></span></label>' +
          '<button class="btn btn-principal" type="submit">Guardar morada</button>' +
          '<div id="erro-morada"></div>' +
        '</form>' +
      '</details>';
  }

  function ligarMoradas() {
    document.querySelectorAll('[data-apagar-morada]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Remover esta morada?')) return;
        btn.disabled = true;
        api.del('/utilizadores/eu/moradas/' + btn.getAttribute('data-apagar-morada'))
          .then(function () {
            ui.notificar('Morada removida.', 'ok');
            return carregar();
          })
          .catch(function (e) { btn.disabled = false; ui.notificar(e.message, 'erro'); });
      });
    });

    var form = document.getElementById('form-morada');
    if (!form) return;

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'A guardar…';
      document.getElementById('erro-morada').innerHTML = '';

      api.post('/utilizadores/eu/moradas', {
        label: document.getElementById('m-label').value.trim() || 'Casa',
        recipient_name: document.getElementById('m-nome').value.trim(),
        phone: document.getElementById('m-telefone').value.trim(),
        province: document.getElementById('m-provincia').value,
        municipality: document.getElementById('m-municipio').value.trim(),
        neighbourhood: document.getElementById('m-bairro').value.trim() || null,
        street: document.getElementById('m-rua').value.trim() || null,
        reference_point: document.getElementById('m-referencia').value.trim() || null,
        is_default: document.getElementById('m-padrao').checked,
      })
        .then(function () {
          ui.notificar('Morada guardada.', 'ok');
          return carregar();
        })
        .catch(function (e) {
          btn.disabled = false;
          btn.textContent = 'Guardar morada';
          document.getElementById('erro-morada').innerHTML =
            '<div class="aviso aviso-erro" style="margin-top:14px">' + ui.escapar(e.message) + '</div>';
        });
    });
  }

  /* ── segurança ──────────────────────────────────────────── */
  function painelSeguranca() {
    return '<h1 style="padding-top:4px">Segurança</h1>' +
      '<p class="silenciado pequeno" style="margin:6px 0 20px">Escolha uma palavra-passe que não use noutro sítio.</p>' +
      '<form class="cartao" id="form-passe">' +
        '<div class="campo"><label for="actual">Palavra-passe actual</label>' +
          '<input id="actual" type="password" autocomplete="current-password" required></div>' +
        '<div class="campo"><label for="nova">Nova palavra-passe</label>' +
          '<input id="nova" type="password" autocomplete="new-password" minlength="8" required>' +
          '<span class="ajuda">Pelo menos 8 caracteres.</span>' +
          '<span class="erro" data-erro="nova"></span></div>' +
        '<div class="campo"><label for="confirmar">Repetir a nova palavra-passe</label>' +
          '<input id="confirmar" type="password" autocomplete="new-password" required>' +
          '<span class="erro" data-erro="confirmar"></span></div>' +
        '<button class="btn btn-principal" type="submit">Alterar palavra-passe</button>' +
      '</form>';
  }

  function ligarSeguranca() {
    var form = document.getElementById('form-passe');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      form.querySelectorAll('[data-erro]').forEach(function (s) { s.textContent = ''; });

      var nova = document.getElementById('nova').value;
      if (nova !== document.getElementById('confirmar').value) {
        form.querySelector('[data-erro="confirmar"]').textContent = 'As palavras-passe não coincidem.';
        return;
      }

      var btn = form.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'A alterar…';

      api.post('/auth/alterar-palavra-passe', {
        actual: document.getElementById('actual').value,
        nova: nova,
      })
        .then(function () {
          ui.notificar('Palavra-passe alterada.', 'ok');
          form.reset();
        })
        .catch(function (e) { ui.notificar(e.message, 'erro'); })
        .then(function () {
          btn.disabled = false;
          btn.textContent = 'Alterar palavra-passe';
        });
    });
  }

  function desenhar() {
    if (separador === 'moradas') {
      moldura(painelMoradas());
      ligarMoradas();
    } else if (separador === 'seguranca') {
      moldura(painelSeguranca());
      ligarSeguranca();
    } else {
      moldura(painelDados());
      ligarDados();
    }
  }

  function carregar() {
    esqueleto();
    return Promise.all([
      api.get('/utilizadores/eu'),
      api.get('/utilizadores/eu/moradas').catch(function () { return { dados: [] }; }),
    ])
      .then(function (r) {
        perfil = r[0].dados;
        moradas = r[1].dados || [];
        desenhar();
      })
      .catch(function (e) {
        conteudo.innerHTML = '<div class="aviso aviso-erro" style="margin:30px 0">' + ui.escapar(e.message) + '</div>';
      });
  }

  carregar();
})();
