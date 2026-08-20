/* TEskBuy — a minha conta */
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

  /** O que esta conta é, segundo a última resposta do servidor. */
  function contaEh() {
    var g = null;
    try { g = JSON.parse(localStorage.getItem('tb.perfil') || 'null'); } catch (e) { g = null; }
    return {
      empresa: Boolean(g && g.empresa && g.empresa.status === 'aprovada'),
      afiliado: Boolean(g && g.afiliado && g.afiliado.status === 'aprovada'),
    };
  }

  function moldura(interior) {
    var u = api.utilizador.obter() || {};
    var separadores = [
      { id: 'dados', nome: 'Os meus dados' },
      { id: 'moradas', nome: 'Moradas' },
      { id: 'mensagens', nome: 'Mensagens' },
      { id: 'denuncias', nome: 'Denúncias' },
      { id: 'definicoes', nome: 'Definições' },
      { id: 'seguranca', nome: 'Segurança' },
    ];

    conteudo.innerHTML =
      '<div class="conta-grelha">' +
        '<aside>' +
          '<div class="cartao" style="margin-bottom:16px">' +
            '<p class="mono pequeno silenciado">Conta</p>' +
            '<p style="margin-top:6px;font-size:16px">' + ui.escapar(perfil.full_name || 'Cliente TEskBuy') + '</p>' +
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
            // "Vender na TEskBuy" saiu do menu principal e vive aqui
            (contaEh().empresa
              ? '<a href="/comerciante">Área de Vendas</a>'
              : '<a href="/parceiro">Vender na TEskBuy</a>') +
            (contaEh().afiliado ? '<a href="/afiliado">Área de Afiliado</a>' : '') +
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
    var u = api.utilizador.obter() || {};
    var foto = perfil.avatar_url || u.avatar_url;
    var inicial = String(perfil.full_name || perfil.email || '?').trim().charAt(0).toUpperCase();

    return '<h1 style="padding-top:4px">Os meus dados</h1>' +
      '<p class="silenciado pequeno" style="margin:6px 0 20px">Usamos estes dados para o contactar sobre as encomendas.</p>' +
      '<div class="cartao" style="margin-bottom:16px">' +
        '<div class="perfil-foto">' +
          (foto
            ? '<img class="avatar" id="foto-actual" src="' + ui.escapar(foto) + '" alt="A minha foto">'
            : '<span class="avatar avatar-letra" id="foto-actual">' + ui.escapar(inicial) + '</span>') +
          '<div>' +
            '<strong>Foto de perfil</strong>' +
            '<p class="pequeno silenciado">Aparece no topo do site. PNG, JPG ou WEBP.</p>' +
            '<div class="linha-flex" style="margin-top:10px;gap:8px">' +
              '<button class="btn btn-secundario" id="btn-foto" type="button">' +
                (foto ? 'Mudar foto' : 'Carregar foto') + '</button>' +
              (foto ? '<button class="pilula" id="btn-foto-remover" type="button">Remover</button>' : '') +
            '</div>' +
            '<input type="file" id="ficheiro-foto" accept="image/png,image/jpeg,image/webp" hidden>' +
          '</div>' +
        '</div>' +
      '</div>' +
      avisoDadosVerdadeiros() +
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

  /** Aviso pedido na revisão: o nome tem de ser o do documento. */
  function avisoDadosVerdadeiros() {
    return '<div class="aviso-dados">' + ui.ico.escudo +
      '<div><strong>Use os seus dados verdadeiros.</strong> O nome deve ser igual ao do ' +
      'documento oficial. As empresas devem usar o nome e os documentos legais da empresa. ' +
      'Informação falsa ou incorrecta pode levar a restrições ou ao encerramento da conta.</div></div>';
  }

  /** Carregar e trocar a foto de perfil. */
  function ligarFoto() {
    var botao = document.getElementById('btn-foto');
    var campo = document.getElementById('ficheiro-foto');
    var remover = document.getElementById('btn-foto-remover');
    if (!botao || !campo) return;

    function gravar(url, mensagem) {
      return api.patch('/utilizadores/eu', { avatar_url: url })
        .then(function (r) {
          perfil = r.dados;
          var u = api.utilizador.obter() || {};
          u.avatar_url = url;
          api.utilizador.guardar(u);
          ui.notificar(mensagem, 'ok');
          ui.cabecalho();          // o cabeçalho passa a mostrar a foto nova
          desenhar();
        });
    }

    botao.addEventListener('click', function () { campo.click(); });

    campo.addEventListener('change', function () {
      var ficheiro = campo.files && campo.files[0];
      if (!ficheiro) return;
      if (ficheiro.size > 5 * 1024 * 1024) {
        ui.notificar('A imagem não pode passar dos 5 MB.', 'erro');
        return;
      }
      botao.disabled = true;
      botao.textContent = 'A enviar…';
      ui.carregarFicheiro(ficheiro, 'avatar')
        .then(function (f) { return gravar(f.url, 'Foto actualizada.'); })
        .catch(function (e) {
          botao.disabled = false;
          botao.textContent = 'Carregar foto';
          ui.notificar(e.message || 'Não foi possível enviar a foto.', 'erro');
        });
    });

    if (remover) {
      remover.addEventListener('click', function () {
        gravar(null, 'Foto removida.').catch(function (e) {
          ui.notificar(e.message || 'Não foi possível remover.', 'erro');
        });
      });
    }
  }

  function ligarDados() {
    ligarFoto();
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

  /* ── mensagens com empresas ──────────────────────────────── */
  function verMensagens() {
    moldura('<div id="lista-conversas">' + ui.esqueletos(2, 'esqueleto') + '</div>');

    api.get('/conversas').then(function (r) {
      var itens = r.dados || [];

      document.getElementById('lista-conversas').innerHTML =
        '<h2 style="margin-bottom:6px">Mensagens</h2>' +
        '<p class="silenciado pequeno" style="margin-bottom:18px">' +
          'Conversas com as empresas parceiras. Para falar com a TEskBuy, use uma denúncia.</p>' +
        (itens.length
          ? itens.map(function (c) {
              return '<div class="cartao" style="margin-bottom:12px">' +
                '<div class="entre" style="margin-bottom:8px">' +
                  '<strong>' + ui.escapar(c.empresa ? c.empresa.name : 'Empresa') + '</strong>' +
                  (c.por_ler ? '<span class="selo selo-desconto" style="position:static">' +
                    c.por_ler + ' por ler</span>' : '') +
                '</div>' +
                '<div style="max-height:240px;overflow:auto;margin-bottom:10px">' +
                  c.mensagens.map(function (m) {
                    return '<div style="padding:7px 0;border-bottom:1px solid rgba(238,247,248,.06)">' +
                      '<p class="pequeno silenciado">' + (m.minha ? 'Eu' : 'Empresa') + ' · ' +
                        ui.data(m.criada_em, true) + '</p>' +
                      '<p class="pequeno">' + ui.escapar(m.texto) + '</p>' +
                    '</div>';
                  }).join('') +
                '</div>' +
                '<div class="campo"><input id="mc-' + c.id + '" placeholder="Escrever mensagem…"></div>' +
                '<button class="btn btn-secundario btn-pequeno" data-menviar="' + c.id + '">Enviar</button>' +
              '</div>';
            }).join('')
          : '<div class="cartao-vazio"><h3>Sem mensagens</h3>' +
            '<p class="silenciado">Pode falar com uma empresa a partir da ficha de um produto dela.</p></div>');

      document.querySelectorAll('[data-menviar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-menviar');
          var campo = document.getElementById('mc-' + id);
          if (!campo.value.trim()) return ui.notificar('Escreva a mensagem.', 'erro');
          b.disabled = true;
          api.post('/conversas/' + id + '/mensagens', { mensagem: campo.value.trim() })
            .then(function (res) { ui.notificar(res.mensagem, 'ok'); verMensagens(); })
            .catch(function (e) { ui.notificar(e.message, 'erro'); b.disabled = false; });
        });
      });

      itens.forEach(function (c) {
        if (c.por_ler) api.post('/conversas/' + c.id + '/lidas').catch(function () {});
      });
    }).catch(function (e) {
      document.getElementById('lista-conversas').innerHTML =
        '<div class="aviso aviso-erro">' + ui.escapar(e.message) + '</div>';
    });
  }

  /* ── as minhas denúncias ─────────────────────────────────── */
  var ESTADO_DEN = {
    nova: 'Recebida', em_analise: 'Em análise', resolvida: 'Resolvida', rejeitada: 'Não procedente',
  };

  function verDenuncias() {
    moldura('<div id="lista-denuncias">' + ui.esqueletos(2, 'esqueleto') + '</div>');

    api.get('/suporte/denuncias').then(function (r) {
      var itens = r.dados || [];
      document.getElementById('lista-denuncias').innerHTML =
        '<h2 style="margin-bottom:6px">Denúncias</h2>' +
        '<p class="silenciado pequeno" style="margin-bottom:18px">' +
          'Problemas que comunicou à TEskBuy e o que foi feito.</p>' +
        (itens.length
          ? itens.map(function (d) {
              return '<div class="cartao" style="margin-bottom:12px">' +
                '<div class="entre">' +
                  '<strong>' + ui.escapar(d.produto ? d.produto.name : 'Encomenda') + '</strong>' +
                  '<span class="pequeno">' + ui.escapar(ESTADO_DEN[d.estado] || d.estado) + '</span>' +
                '</div>' +
                (d.descricao ? '<p class="pequeno silenciado" style="margin-top:8px">' +
                  ui.escapar(d.descricao) + '</p>' : '') +
                (d.resolucao ? '<p class="pequeno" style="margin-top:8px">' +
                  '<span class="silenciado">Resposta:</span> ' + ui.escapar(d.resolucao) + '</p>' : '') +
                '<p class="pequeno silenciado" style="margin-top:8px">' + ui.data(d.criada_em) + '</p>' +
              '</div>';
            }).join('')
          : '<div class="cartao-vazio"><h3>Sem denúncias</h3>' +
            '<p class="silenciado">Se algum artigo chegar mal, denuncie na ficha do produto.</p></div>');
    }).catch(function (e) {
      document.getElementById('lista-denuncias').innerHTML =
        '<div class="aviso aviso-erro">' + ui.escapar(e.message) + '</div>';
    });
  }

  /* ── definições ──────────────────────────────────────────── */
  var TIPOS_METODO = {
    multicaixa_express: 'Multicaixa Express',
    transferencia_bancaria: 'Transferência bancária',
    numerario: 'Numerário',
    iban: 'Conta bancária (IBAN)',
  };

  function verDefinicoes() {
    moldura('<div id="painel-definicoes">' + ui.esqueletos(2, 'esqueleto') + '</div>');

    Promise.all([api.get('/definicoes/perfil'), api.get('/definicoes/pagamentos')])
      .then(function (r) {
        var d = r[0].dados;
        var metodos = r[1].dados || [];
        var p = d.preferencias;

        document.getElementById('painel-definicoes').innerHTML =
          '<h2 style="margin-bottom:6px">Definições</h2>' +
          '<p class="silenciado pequeno" style="margin-bottom:18px">' +
            'Idioma, notificações e formas de pagamento.</p>' +

          '<div class="cartao" style="margin-bottom:16px">' +
            '<h3 style="margin-bottom:12px">Preferências</h3>' +
            '<div class="campo"><label for="df-idioma">Idioma</label>' +
              '<select id="df-idioma">' +
                d.idiomas.map(function (i) {
                  return '<option value="' + i.codigo + '"' +
                    (p.language === i.codigo ? ' selected' : '') + '>' + i.nome + '</option>';
                }).join('') +
              '</select></div>' +
            '<label class="opcao"><input type="checkbox" id="df-email"' +
              (p.notify_email ? ' checked' : '') + '>' +
              '<span><strong>Avisos por e-mail</strong>' +
              '<span>Encomendas, respostas e novidades importantes.</span></span></label>' +
            '<label class="opcao"><input type="checkbox" id="df-plataforma"' +
              (p.notify_platform ? ' checked' : '') + '>' +
              '<span><strong>Avisos no site</strong>' +
              '<span>Aparecem no sino do cabeçalho.</span></span></label>' +
            '<button class="btn btn-principal" id="df-guardar" style="margin-top:14px">Guardar</button>' +
          '</div>' +

          '<div class="cartao" style="margin-bottom:16px">' +
            '<h3 style="margin-bottom:6px">Métodos de pagamento</h3>' +
            '<p class="pequeno silenciado" style="margin-bottom:14px">' +
              'Nunca guardamos números completos de cartão — apenas os últimos dígitos, ' +
              'para os reconhecer.</p>' +
            (metodos.length
              ? metodos.map(function (m) {
                  return '<div class="linha-flex" style="justify-content:space-between;' +
                    'padding:9px 0;border-bottom:1px solid rgba(238,247,248,.06)">' +
                    '<div><p class="pequeno">' + ui.escapar(m.etiqueta) + '</p>' +
                      '<p class="pequeno silenciado">' + ui.escapar(m.nome_tipo) +
                      (m.referencia ? ' · ' + ui.escapar(m.referencia) : '') + '</p></div>' +
                    '<button class="btn btn-fantasma btn-pequeno" data-apagar-metodo="' + m.id + '">Remover</button>' +
                  '</div>';
                }).join('')
              : '<p class="pequeno silenciado">Ainda sem métodos guardados.</p>') +
            '<div class="campo-duplo" style="margin-top:14px">' +
              '<div class="campo"><label for="mp-tipo">Tipo</label><select id="mp-tipo">' +
                Object.keys(TIPOS_METODO).map(function (k) {
                  return '<option value="' + k + '">' + TIPOS_METODO[k] + '</option>';
                }).join('') +
              '</select></div>' +
              '<div class="campo"><label for="mp-etiqueta">Etiqueta</label>' +
                '<input id="mp-etiqueta" placeholder="Ex.: BAI principal"></div>' +
            '</div>' +
            '<div class="campo-duplo">' +
              '<div class="campo"><label for="mp-ref">Referência ou IBAN</label>' +
                '<input id="mp-ref" placeholder="Guardamos só os últimos dígitos"></div>' +
              '<div class="campo"><label for="mp-titular">Titular</label><input id="mp-titular"></div>' +
            '</div>' +
            '<button class="btn btn-secundario" id="mp-guardar">Acrescentar método</button>' +
          '</div>' +

          '<div class="cartao">' +
            '<h3 style="margin-bottom:6px">Eliminar conta</h3>' +
            '<p class="pequeno silenciado" style="margin-bottom:12px">' +
              'O pedido é analisado pela equipa. As encomendas antigas mantêm-se no ' +
              'histórico da loja por obrigação legal.</p>' +
            '<div class="campo"><input id="del-motivo" placeholder="Motivo (opcional)"></div>' +
            '<button class="btn btn-perigo" id="del-conta">Pedir eliminação</button>' +
          '</div>';

        ligarDefinicoes(d);
      })
      .catch(function (e) {
        document.getElementById('painel-definicoes').innerHTML =
          '<div class="aviso aviso-erro">' + ui.escapar(e.message) + '</div>';
      });
  }

  function ligarDefinicoes() {
    document.getElementById('df-guardar').addEventListener('click', function (ev) {
      var b = ev.currentTarget;
      b.disabled = true;
      api.put('/definicoes/preferencias', {
        idioma: document.getElementById('df-idioma').value,
        notificar_email: document.getElementById('df-email').checked,
        notificar_plataforma: document.getElementById('df-plataforma').checked,
      })
        .then(function (r) { ui.notificar(r.mensagem, 'ok'); })
        .catch(function (e) { ui.notificar(e.message, 'erro'); })
        .then(function () { b.disabled = false; });
    });

    document.getElementById('mp-guardar').addEventListener('click', function (ev) {
      var b = ev.currentTarget;
      var etiqueta = document.getElementById('mp-etiqueta').value.trim();
      if (etiqueta.length < 2) return ui.notificar('Escreva uma etiqueta.', 'erro');

      b.disabled = true;
      api.post('/definicoes/pagamentos', {
        para: 'pessoal',
        tipo: document.getElementById('mp-tipo').value,
        etiqueta: etiqueta,
        referencia: document.getElementById('mp-ref').value.trim() || undefined,
        titular: document.getElementById('mp-titular').value.trim() || undefined,
      })
        .then(function (r) { ui.notificar(r.mensagem, 'ok'); verDefinicoes(); })
        .catch(function (e) { ui.notificar(e.message, 'erro'); b.disabled = false; });
    });

    document.querySelectorAll('[data-apagar-metodo]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        api.del('/definicoes/pagamentos/' + b.getAttribute('data-apagar-metodo'))
          .then(function (r) { ui.notificar(r.mensagem, 'ok'); verDefinicoes(); })
          .catch(function (e) { ui.notificar(e.message, 'erro'); b.disabled = false; });
      });
    });

    document.getElementById('del-conta').addEventListener('click', function (ev) {
      if (!confirm('Pedir a eliminação da sua conta TEskBuy?')) return;
      var b = ev.currentTarget;
      b.disabled = true;
      api.post('/definicoes/eliminar-conta', {
        motivo: document.getElementById('del-motivo').value.trim() || undefined,
      })
        .then(function (r) { ui.notificar(r.mensagem, 'ok'); })
        .catch(function (e) { ui.notificar(e.message, 'erro'); b.disabled = false; });
    });
  }

  function desenhar() {
    if (separador === 'mensagens') return verMensagens();
    if (separador === 'denuncias') return verDenuncias();
    if (separador === 'definicoes') return verDefinicoes();
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
