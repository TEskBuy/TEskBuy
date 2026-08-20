/* ============================================================
   TEskBuy — componentes partilhados da interface
   ============================================================ */
(function (global) {
  'use strict';

  var api = global.TBApi;
  var estado = global.TBEstado;

  /* ── ícones ─────────────────────────────────────────────── */
  var ico = {
    procurar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    carrinho: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h2.2l1 4h13.4a1 1 0 0 1 .96 1.28l-1.9 6.3a1.6 1.6 0 0 1-1.53 1.14H8.1a1.6 1.6 0 0 1-1.55-1.2L4.2 3"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>',
    coracao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.7-7.5-9.6A4.4 4.4 0 0 1 12 8.3a4.4 4.4 0 0 1 7.5 2.6c0 4.9-7.5 9.6-7.5 9.6z"/></svg>',
    coracaoCheio: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.7-7.5-9.6A4.4 4.4 0 0 1 12 8.3a4.4 4.4 0 0 1 7.5 2.6c0 4.9-7.5 9.6-7.5 9.6z"/></svg>',
    conta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    correio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
    telefone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 3.5h3l1.5 3.8-2 1.4a12 12 0 0 0 5.6 5.6l1.4-2 3.8 1.5v3a1.8 1.8 0 0 1-2 1.8A16.5 16.5 0 0 1 4.4 5.5a1.8 1.8 0 0 1 1.8-2z"/></svg>',
    local: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    sino: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5"/><path d="M10.5 19a1.8 1.8 0 0 0 3 0"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8.2h2.75l.41-3.2h-3.16V7.6c0-.93.26-1.56 1.6-1.56h1.7V3.14C16.5 3.1 15.53 3 14.4 3 12.03 3 10.4 4.44 10.4 7.3v2.3H7.65v3.2h2.75V21h3.1z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.25-.13-1.48-.73-1.7-.81-.23-.09-.4-.13-.56.12-.17.25-.65.8-.8.97-.14.16-.29.19-.54.06a6.7 6.7 0 0 1-3.3-2.9c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.42-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.41-.56-.42h-.47c-.16 0-.42.06-.64.3-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.13.16 1.7 2.6 4.12 3.64 1.53.66 2.13.72 2.9.6.46-.06 1.48-.6 1.69-1.19.2-.58.2-1.08.15-1.19-.06-.1-.23-.16-.48-.28z"/></svg>',
    seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    lixo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M9 7V4.6h6V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/></svg>',
    estrela: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3.6 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8z"/></svg>',
    escudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5.5c0 4.3-3 8-7 9.5-4-1.5-7-5.2-7-9.5V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    camiao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7h11v9H2zM13 10h4l4 3.2V16h-8z"/><circle cx="6.5" cy="18" r="1.7"/><circle cx="17" cy="18" r="1.7"/></svg>',
    cartao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19"/></svg>',
  };

  /* ── formatação ─────────────────────────────────────────── */
  var fmtNumero = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function kz(valor) {
    var n = Number(valor || 0);
    return fmtNumero.format(Math.round(n)) + ' Kz';
  }

  function data(iso, comHora) {
    if (!iso) return '—';
    var d = new Date(iso);
    var opcoes = { day: '2-digit', month: 'long', year: 'numeric' };
    if (comHora) { opcoes.hour = '2-digit'; opcoes.minute = '2-digit'; }
    return d.toLocaleDateString('pt-PT', opcoes);
  }

  var NOMES_ESTADO = {
    pendente: 'Pendente',
    confirmada: 'Confirmada',
    em_preparacao: 'Em preparação',
    enviada: 'Enviada',
    entregue: 'Entregue',
    cancelada: 'Cancelada',
    reembolsada: 'Reembolsada',
  };
  var NOMES_PAGAMENTO = {
    multicaixa_express: 'Multicaixa Express',
    transferencia_bancaria: 'Transferência bancária',
    numerario: 'Numerário na entrega',
  };
  var NOMES_CONDICAO = { novo: 'Novo', usado: 'Usado', recondicionado: 'Recondicionado' };

  function escapar(txt) {
    return String(txt == null ? '' : txt).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── imagem de reserva com a identidade da marca ────────── */
  function imagem(produto) {
    var url = produto && (produto.imagem || (produto.imagens && produto.imagens[0] && produto.imagens[0].url));
    if (url) return url;

    var nome = (produto && (produto.name || produto.nome)) || 'TEskBuy';
    var iniciais = nome.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '').split(/\s+/).slice(0, 2)
      .map(function (p) { return p.charAt(0).toUpperCase(); }).join('');

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#0a3947"/><stop offset="1" stop-color="#06303c"/></linearGradient></defs>' +
      '<rect width="400" height="400" fill="url(#g)"/>' +
      '<g opacity="0.13" stroke="#f5ead9" stroke-width="2">' +
      '<path d="M40 0v400M120 0v400M200 0v400M280 0v400M360 0v400"/></g>' +
      '<g transform="translate(200 168)" fill="none" stroke="#f2660d" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M-58 -44h20l10 22h84c6 0 10 6 8 12l-17 50c-2 5-6 8-11 8h-56c-5 0-9-3-11-8l-21-62"/>' +
      '<circle cx="-24" cy="70" r="9"/><circle cx="34" cy="70" r="9" stroke="#12839e"/></g>' +
      '<text x="200" y="332" text-anchor="middle" font-family="IBM Plex Mono, monospace" ' +
      'font-size="46" font-weight="600" fill="#f5ead9" opacity="0.85">' + escapar(iniciais) + '</text></svg>';

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  /* ── notificações ───────────────────────────────────────── */
  function notificar(mensagem, tipo) {
    var caixa = document.getElementById('notificacoes');
    if (!caixa) {
      caixa = document.createElement('div');
      caixa.id = 'notificacoes';
      document.body.appendChild(caixa);
    }
    var nota = document.createElement('div');
    nota.className = 'nota nota-' + (tipo || 'info');
    nota.textContent = mensagem;
    caixa.appendChild(nota);
    setTimeout(function () {
      nota.style.opacity = '0';
      nota.style.transform = 'translateY(8px)';
      nota.style.transition = 'opacity .25s, transform .25s';
      setTimeout(function () { nota.remove(); }, 260);
    }, 3600);
  }

  /* ── quem é esta conta ────────────────────────────────────
     O menu não pode depender só do papel: uma pessoa pode ser cliente,
     afiliada, vendedora, ou as duas coisas. Isto guarda a última resposta
     do servidor para o menu já nascer certo, e volta a perguntar em cada
     página para não ficar preso a um estado antigo. */
  var CHAVE_PERFIL = 'tb.perfil';

  function perfilGuardado() {
    try {
      var g = JSON.parse(localStorage.getItem(CHAVE_PERFIL) || 'null');
      var u = api.utilizador.obter();
      // se mudou de conta, o que está guardado não serve
      if (!g || !u || g.utilizador !== u.id) return null;
      return g;
    } catch (e) { return null; }
  }

  function guardarPerfil(dados) {
    var u = api.utilizador.obter();
    if (!u) { try { localStorage.removeItem(CHAVE_PERFIL); } catch (e) {} return null; }
    var g = {
      utilizador: u.id,
      empresa: dados && dados.empresa ? dados.empresa : null,
      afiliado: dados && dados.afiliado ? dados.afiliado : null,
    };
    try { localStorage.setItem(CHAVE_PERFIL, JSON.stringify(g)); } catch (e) {}
    return g;
  }

  function ehVendedor(perfil) {
    return Boolean(perfil && perfil.empresa && perfil.empresa.status === 'aprovada');
  }
  function ehAfiliado(perfil) {
    return Boolean(perfil && perfil.afiliado && perfil.afiliado.status === 'aprovada');
  }

  /* ── foto de perfil ───────────────────────────────────────
     Sem foto mostramos a inicial, nunca o boneco genérico. */
  function avatar(u) {
    if (u && u.avatar_url) {
      return '<img class="avatar" src="' + escapar(u.avatar_url) + '" alt="A minha conta">';
    }
    var nome = String((u && (u.nome || u.email)) || '?').trim();
    return '<span class="avatar avatar-letra">' + escapar(nome.charAt(0).toUpperCase()) + '</span>';
  }

  /* ── opções do menu conforme o tipo de conta ──────────────
     Segue a matriz da revisão. É o estado real da sessão que manda:
     nada é escondido com CSS. */
  function opcoesDaConta(u, perfil) {
    function item(href, icone, texto) {
      return '<a class="nav-contacto" href="' + href + '">' + icone + '<span>' + texto + '</span></a>';
    }

    if (!u) {
      // o "Entrar" já está no cabeçalho, ao lado; aqui só duplicava
      return item('/carrinho', ico.carrinho, 'O meu carrinho') +
             item('/parceiro', ico.camiao, 'Vender na TEskBuy') +
             item('/parceiro?tipo=afiliado', ico.estrela, 'Ser Afiliado');
    }

    var vendedor = ehVendedor(perfil);
    var afiliado = ehAfiliado(perfil);
    var html = item('/conta', ico.conta, 'A minha conta');

    if (vendedor) html += item('/comerciante', ico.camiao, 'Área de Vendas');
    if (afiliado) html += item('/afiliado', ico.estrela, 'Área de Afiliado');
    // quem ainda não é nem uma coisa nem outra vê os dois convites
    if (!afiliado && !vendedor) {
      html += item('/parceiro?tipo=afiliado', ico.estrela, 'Tornar-se Afiliado');
      html += item('/parceiro', ico.camiao, 'Vender na TEskBuy');
    }

    html += item('/favoritos', ico.coracao, 'Favoritos');
    html += item('/carrinho', ico.carrinho, 'O meu carrinho');
    html += item('/encomendas', ico.camiao, 'As minhas encomendas');
    html += item('/conta?sep=mensagens', ico.correio, 'Mensagens');
    html += item('/conta?sep=definicoes', ico.escudo, 'Definições');
    return html;
  }

  /** Os blocos todos da gaveta, na ordem pedida na revisão. */
  function blocosDaGaveta(u, perfil) {
    var r = CONTEUDO_PADRAO.rodape;

    return '' +
      '<div class="nav-bloco" id="nav-bloco-categorias">' +
        '<h4>Categorias</h4>' +
        '<div class="nav-categorias" id="nav-categorias">' +
          '<a class="nav-contacto" href="/loja"><span>Ver toda a loja</span></a>' +
        '</div>' +
      '</div>' +
      '<div class="nav-bloco" id="nav-bloco-conta">' +
        '<h4>' + (u ? 'A minha conta' : 'Comece por aqui') + '</h4>' +
        opcoesDaConta(u, perfil) +
      '</div>' +
      '<div class="nav-bloco">' +
        '<h4>Precisa de ajuda?</h4>' +
        '<a class="nav-contacto" id="nav-tel-lig" href="tel:">' +
          ico.telefone + '<span id="nav-telefone">' + escapar(r.telefone) + '</span></a>' +
        '<a class="nav-contacto" href="mailto:' + escapar(r.email) + '" id="nav-email-lig">' +
          ico.correio + '<span id="nav-email">' + escapar(r.email) + '</span></a>' +
      '</div>' +
      '<div class="nav-bloco">' +
        '<h4>Siga-nos</h4>' +
        '<div class="nav-redes">' +
          '<a id="nav-facebook" href="' + escapar(r.facebook) + '" target="_blank" rel="noopener" aria-label="Facebook">' +
            ico.facebook + '</a>' +
          '<a id="nav-whatsapp" href="' + escapar(r.whatsapp) + '" target="_blank" rel="noopener" aria-label="WhatsApp">' +
            ico.whatsapp + '</a>' +
        '</div>' +
      '</div>' +
      '<div class="nav-bloco">' +
        '<h4>Métodos de pagamento</h4>' +
        '<div class="nav-pagamentos">' +
          PAGAMENTOS.map(function (m) {
            return '<img src="/assets/img/pagamentos/' + m.ficheiro + '" alt="' + escapar(m.nome) +
              '" style="height:' + m.altura + 'px" loading="lazy">';
          }).join('') +
        '</div>' +
        '<p class="pequeno silenciado" style="margin-top:8px">Pague também em numerário na entrega.</p>' +
      '</div>';
  }

  /* ── cabeçalho ──────────────────────────────────────────── */
  function cabecalho(paginaActiva) {
    var alvo = document.getElementById('cabecalho');
    if (!alvo) return;

    var u = api.utilizador.obter();
    // No telemóvel a lupa e o carrinho só ficam na página inicial; nas outras
    // páginas o cabeçalho fica com o essencial. O CSS trata do resto.
    var naInicio = /^\/(index\.html)?$/.test(location.pathname);
    document.body.classList.toggle('fora-do-inicio', !naInicio);

    alvo.className = 'cabecalho';
    alvo.innerHTML =
      '<div class="env cabecalho-int">' +
        '<button class="icone-btn menu-btn" id="btn-menu" aria-label="Abrir menu">' + ico.menu + '</button>' +
        '<a class="logo" href="/" aria-label="TEskBuy — início">' +
          '<img class="logo-completo" src="/assets/img/logo-full.png" alt="TEskBuy">' +
          '<img class="logo-icone" src="/assets/img/logo-icon.png" alt="TEskBuy">' +
        '</a>' +
        '<nav class="nav" id="nav">' +
          // "Categorias" abre um painel com tudo o que existe na loja
          '<div class="cat-menu">' +
            '<button type="button" class="cat-botao' + (paginaActiva === 'loja' ? ' activo' : '') + '" ' +
              'id="btn-categorias" aria-expanded="false" aria-controls="painel-categorias">' +
              '<span>Categorias</span>' + ico.chevron +
            '</button>' +
            '<div class="cat-painel" id="painel-categorias" hidden>' +
              '<p class="pequeno silenciado" style="padding:6px 4px">A carregar…</p>' +
            '</div>' +
          '</div>' +
          // só visível quando o menu abre no telemóvel
          '<div class="nav-extra" id="nav-extra">' + blocosDaGaveta(u, perfilGuardado()) + '</div>' +
        '</nav>' +
        '<form class="procura" id="form-procura" role="search">' +
          ico.procurar +
          '<input type="search" name="q" id="campo-procura" placeholder="Procurar produtos…" aria-label="Procurar na loja">' +
          '<select id="procura-categoria" aria-label="Categoria a procurar">' +
            '<option value="">Todas</option>' +
          '</select>' +
        '</form>' +
        '<div class="accoes">' +
          '<button class="icone-btn" id="btn-procura-movel" aria-label="Procurar">' + ico.procurar + '</button>' +
          // o sino só existe para quem tem sessão
          (u
            ? '<button class="icone-btn" id="btn-sino" aria-label="Notificações">' + ico.sino +
                '<span class="crachas" id="crachas-sino"></span></button>'
            : '') +
          // o carrinho fica sempre à vista: quem entra de novo tem de poder comprar
          '<a class="icone-btn accao-carrinho" href="/carrinho" aria-label="Carrinho">' + ico.carrinho +
            '<span class="crachas" id="crachas-carrinho"></span></a>' +
          // sem sessão não há ícone de pessoa nenhum, só a porta de entrada
          (u
            ? '<a class="avatar-ligacao" href="/conta" aria-label="A minha conta">' + avatar(u) + '</a>'
            : '<a class="btn btn-secundario btn-entrar" href="/entrar">Entrar</a>') +
        '</div>' +
      '</div>';

    /* ── gaveta do menu no telemóvel ──────────────────────────
       O botão passa a X enquanto está aberta e o fundo deixa de
       rolar, para o menu se comportar como um painel a sério. */
    var nav = document.getElementById('nav');
    var botaoMenu = document.getElementById('btn-menu');

    function menu(abrir) {
      nav.classList.toggle('aberta', abrir);
      botaoMenu.innerHTML = abrir ? ico.fechar : ico.menu;
      botaoMenu.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
      botaoMenu.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      document.body.classList.toggle('sem-rolagem', abrir);
    }

    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.addEventListener('click', function () {
      menu(!nav.classList.contains('aberta'));
    });
    nav.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) menu(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && nav.classList.contains('aberta')) menu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1120 && nav.classList.contains('aberta')) menu(false);
    });

    ligarPainelCategorias();

    if (u) ligarSino();

    // contactos reais do painel, assim que chegarem
    conteudo(function (c) {
      var r = c.rodape;
      var limpo = String(r.telefone || '').replace(/[^0-9+]/g, '');
      var tel = document.getElementById('nav-tel-lig');
      var telTexto = document.getElementById('nav-telefone');
      var mail = document.getElementById('nav-email-lig');
      var mailTexto = document.getElementById('nav-email');
      var fb = document.getElementById('nav-facebook');
      var wa = document.getElementById('nav-whatsapp');
      if (tel) tel.href = 'tel:' + limpo;
      if (telTexto) telTexto.textContent = r.telefone;
      if (mail) mail.href = 'mailto:' + r.email;
      if (mailTexto) mailTexto.textContent = r.email;
      if (fb) fb.href = r.facebook;
      if (wa) wa.href = r.whatsapp;
    });

    document.getElementById('btn-procura-movel').addEventListener('click', function () {
      var p = document.getElementById('form-procura');
      p.classList.toggle('aberta');
      if (p.classList.contains('aberta')) document.getElementById('campo-procura').focus();
    });

    var params = new URLSearchParams(location.search);
    if (params.get('q')) document.getElementById('campo-procura').value = params.get('q');

    // preenche as categorias da barra de procura
    var escolhaCategoria = document.getElementById('procura-categoria');
    categorias(function (lista) {
      escolhaCategoria.innerHTML =
        '<option value="">Todas</option>' +
        lista.map(function (c) {
          return '<option value="' + escapar(c.slug) + '">' + escapar(c.name) + '</option>';
        }).join('');
      if (params.get('categoria')) escolhaCategoria.value = params.get('categoria');

      // painel do computador
      var painel = document.getElementById('painel-categorias');
      if (painel) {
        painel.innerHTML = lista.length
          ? '<div class="cat-grelha">' +
              lista.map(function (c) {
                return '<a href="/loja?categoria=' + encodeURIComponent(c.slug) + '">' +
                  '<strong>' + escapar(c.name) + '</strong>' +
                  (c.description ? '<span>' + escapar(c.description) + '</span>' : '') +
                '</a>';
              }).join('') +
            '</div>' +
            '<a class="cat-tudo" href="/loja">Ver toda a loja' + ico.seta + '</a>'
          : '<a class="cat-tudo" href="/loja">Ver toda a loja' + ico.seta + '</a>';
      }

      // as mesmas categorias, agora dentro da gaveta do telemóvel
      var caixa = document.getElementById('nav-categorias');
      if (!caixa) return;
      caixa.innerHTML =
        lista.map(function (c) {
          return '<a class="nav-contacto" href="/loja?categoria=' + encodeURIComponent(c.slug) + '">' +
            '<span>' + escapar(c.name) + '</span></a>';
        }).join('') +
        '<a class="nav-contacto nav-ver-tudo" href="/loja"><span>Ver toda a loja</span>' + ico.seta + '</a>';
    });

    document.getElementById('form-procura').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var procura = new URLSearchParams();
      var termo = document.getElementById('campo-procura').value.trim();
      var cat = escolhaCategoria.value;
      if (termo) procura.set('q', termo);
      if (cat) procura.set('categoria', cat);
      var qs = procura.toString();
      location.href = '/loja' + (qs ? '?' + qs : '');
    });

    /* Perguntar ao servidor o que esta conta é, e voltar a desenhar a
       gaveta se afinal é vendedora ou afiliada. */
    if (u) {
      api.get('/definicoes/perfil')
        .then(function (r) {
          var antes = JSON.stringify(perfilGuardado() || {});
          var agora = guardarPerfil(r.dados);
          if (JSON.stringify(agora) === antes) return;
          var bloco = document.getElementById('nav-bloco-conta');
          if (bloco) {
            bloco.innerHTML = '<h4>A minha conta</h4>' + opcoesDaConta(u, agora);
          }
        })
        .catch(function () { /* menu fica com o que já tinha */ });
    } else {
      try { localStorage.removeItem(CHAVE_PERFIL); } catch (e) { /* nada */ }
      conviteVisitante();
    }

    actualizarCrachas();
  }

  /* ── convite a quem chega sem sessão ──────────────────────
     Aparece uma vez, encosta ao fundo, fecha-se e não volta a chatear
     durante uma semana. Nunca tapa a navegação. */
  var CHAVE_CONVITE = 'tb.convite';

  function conviteVisitante() {
    if (document.getElementById('convite-entrar')) return;
    // nas próprias páginas de entrada seria absurdo
    if (/^\/(entrar|registar|recuperar|nova-palavra-passe)/.test(location.pathname)) return;

    try {
      var ate = Number(localStorage.getItem(CHAVE_CONVITE) || 0);
      if (ate && Date.now() < ate) return;
    } catch (e) { /* segue */ }

    var caixa = document.createElement('div');
    caixa.id = 'convite-entrar';
    caixa.className = 'convite';
    caixa.setAttribute('role', 'complementary');
    caixa.innerHTML =
      '<button class="convite-fechar" aria-label="Fechar">' + ico.fechar + '</button>' +
      '<div class="convite-texto">' +
        '<strong>Bem-vindo à TEskBuy</strong>' +
        '<span>Entre para guardar favoritos, acompanhar encomendas e comprar mais depressa.</span>' +
      '</div>' +
      '<div class="convite-accoes">' +
        '<a class="btn btn-principal" href="/entrar">Entrar</a>' +
        '<a class="btn btn-secundario" href="/registar">Criar conta</a>' +
      '</div>';

    function fechar() {
      caixa.classList.remove('visivel');
      try { localStorage.setItem(CHAVE_CONVITE, String(Date.now() + 7 * 24 * 3600 * 1000)); } catch (e) {}
      setTimeout(function () { caixa.remove(); }, 300);
    }
    caixa.querySelector('.convite-fechar').addEventListener('click', fechar);
    caixa.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', fechar); });

    document.body.appendChild(caixa);
    setTimeout(function () { caixa.classList.add('visivel'); }, 1200);
  }

  /* ── painel de categorias do computador ───────────────────
     Abre com clique, fecha com clique fora, com Escape e ao escolher. */
  function ligarPainelCategorias() {
    var botao = document.getElementById('btn-categorias');
    var painel = document.getElementById('painel-categorias');
    if (!botao || !painel) return;

    function abrir(sim) {
      painel.hidden = !sim;
      painel.classList.toggle('aberto', sim);
      botao.classList.toggle('aberto', sim);
      botao.setAttribute('aria-expanded', sim ? 'true' : 'false');
    }

    botao.addEventListener('click', function (ev) {
      ev.stopPropagation();
      abrir(painel.hidden);
    });
    painel.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) abrir(false);
    });
    document.addEventListener('click', function (ev) {
      if (painel.hidden) return;
      if (!painel.contains(ev.target) && !botao.contains(ev.target)) abrir(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !painel.hidden) abrir(false);
    });
  }

  /* ── sino de notificações ─────────────────────────────────
     Serve os quatro perfis: o que cada um vê é decidido pela política
     da base de dados, não por este código. */
  function ligarSino() {
    var botao = document.getElementById('btn-sino');
    var cracha = document.getElementById('crachas-sino');
    if (!botao) return;

    function contar() {
      api.get('/notificacoes/por-ler')
        .then(function (r) {
          var n = r.dados.total;
          cracha.textContent = n > 99 ? '99+' : n;
          cracha.classList.toggle('visivel', n > 0);
        })
        .catch(function () { /* sem sessão válida, fica calado */ });
    }

    botao.addEventListener('click', function () {
      var aberta = document.getElementById('painel-notificacoes');
      if (aberta) { aberta.remove(); return; }

      var painel = document.createElement('div');
      painel.id = 'painel-notificacoes';
      painel.className = 'notificacoes-painel';
      painel.innerHTML = '<p class="pequeno silenciado" style="padding:14px">A carregar…</p>';
      botao.parentNode.appendChild(painel);

      api.get('/notificacoes', { limite: 20 })
        .then(function (r) {
          var itens = r.dados || [];
          painel.innerHTML =
            '<div class="notificacoes-topo">' +
              '<strong class="pequeno">Notificações</strong>' +
              (itens.some(function (n) { return !n.lida; })
                ? '<button class="pilula" id="marcar-todas">Marcar lidas</button>' : '') +
            '</div>' +
            (itens.length
              ? itens.map(function (n) {
                  return '<a class="notificacao' + (n.lida ? '' : ' por-ler') + '" ' +
                    'href="' + escapar(n.ligacao || '#') + '" data-nid="' + n.id + '">' +
                    '<strong>' + escapar(n.titulo) + '</strong>' +
                    (n.texto ? '<span>' + escapar(n.texto) + '</span>' : '') +
                    '<time>' + data(n.criada_em, true) + '</time>' +
                  '</a>';
                }).join('')
              : '<p class="pequeno silenciado" style="padding:14px">Sem notificações.</p>');

          var todas = document.getElementById('marcar-todas');
          if (todas) {
            todas.addEventListener('click', function (ev) {
              ev.preventDefault();
              api.post('/notificacoes/todas-lidas').then(function () {
                painel.remove();
                contar();
              });
            });
          }

          painel.querySelectorAll('[data-nid]').forEach(function (a) {
            a.addEventListener('click', function () {
              api.post('/notificacoes/' + a.getAttribute('data-nid') + '/lida').catch(function () {});
            });
          });
        })
        .catch(function (e) {
          painel.innerHTML = '<p class="pequeno" style="padding:14px">' +
            escapar(e.message || 'Não foi possível carregar.') + '</p>';
        });
    });

    // fecha ao clicar fora
    document.addEventListener('click', function (ev) {
      var painel = document.getElementById('painel-notificacoes');
      if (!painel) return;
      if (!painel.contains(ev.target) && !botao.contains(ev.target)) painel.remove();
    });

    contar();
  }

  function actualizarCrachas() {
    var carrinho = document.getElementById('crachas-carrinho');
    var favoritos = document.getElementById('crachas-favoritos');
    if (carrinho) {
      var n = estado.contagemCarrinho();
      carrinho.textContent = n > 99 ? '99+' : n;
      carrinho.classList.toggle('visivel', n > 0);
    }
    if (favoritos) {
      var f = estado.favoritos.ids().length;
      favoritos.textContent = f > 99 ? '99+' : f;
      favoritos.classList.toggle('visivel', f > 0);
    }
  }

  /* ── conteúdo editável pelo painel ──────────────────────────
     Fica guardado na chave "conteudo_site" das definições. Se ainda
     não existir, ou se a leitura falhar, valem estes valores — o site
     nunca fica em branco por causa disto. */
  var CONTEUDO_PADRAO = {
    inicio: {
      eyebrow: 'Loja aberta · Entregamos em Angola',
      titulo: 'Tecnologia e livros',
      titulo_destaque: 'com qualidade garantida',
      intro: 'Telemóveis, computadores, impressoras, livros e eletrodomésticos — novos e usados, verificados um a um antes de saírem do nosso armazém.',
      botao1: 'Ver a loja',
      botao2: 'Usados verificados',
      slides: [
        { titulo: 'Tudo o que precisa,', destaque: 'num só lugar',
          texto: 'Uma loja angolana dedicada a eletrodomésticos, telemóveis, computadores, livros e impressoras — novos e usados, sempre em bom estado.',
          botao: 'Ver a loja', botao_href: '/loja',
          imagem: '/assets/img/hero/loja.webp', imagem_movel: '/assets/img/hero/loja-movel.webp' },
        { titulo: 'Parcerias que fazem a', destaque: 'diferença',
          texto: 'Trabalhamos com redes internacionais de confiança, como a Xianyu e a YITOO, para trazer as melhores ofertas até Angola.',
          botao: 'Ver novidades', botao_href: '/loja?ordenar=recentes',
          imagem: '/assets/img/hero/parcerias.webp', imagem_movel: '/assets/img/hero/parcerias-movel.webp' },
        { titulo: 'Paga como', destaque: 'preferir',
          texto: 'Multicaixa Express, transferência bancária ou numerário na entrega. Escolhe no checkout, sem complicações.',
          botao: 'Começar a comprar', botao_href: '/loja',
          imagem: '/assets/img/hero/pagamentos.webp', imagem_movel: '/assets/img/hero/pagamentos-movel.webp' },
        { titulo: 'Fale', destaque: 'connosco',
          texto: 'Estamos a um telefonema de distância — tire dúvidas antes de comprar.',
          mostrar_contactos: true, botao: 'Contacte-nos', botao_href: '/informacoes?p=contacte-nos',
          imagem: '/assets/img/hero/contacto.webp', imagem_movel: '/assets/img/hero/contacto-movel.webp' },
      ],
      confianca: [
        { titulo: 'Qualidade verificada', texto: 'Cada artigo é testado antes de sair do armazém.' },
        { titulo: 'Entrega em Angola', texto: '24 a 48 horas em Luanda, 3 a 7 dias nas províncias.' },
        { titulo: 'Pague à sua maneira', texto: 'Multicaixa Express, transferência ou numerário.' },
        { titulo: 'Novos e usados', texto: 'Usados com estado descrito com honestidade.' },
      ],
      parceiros_titulo: 'Redes parceiras',
      parceiros: ['Xianyu', 'YITOO', '+ outras redes parceiras'],
      newsletter_titulo: 'Novidades e descontos, sem spam',
      newsletter_texto: 'Avisamos quando chegam produtos novos e quando há campanhas.',
    },
    rodape: {
      descricao: 'A loja online angolana de eletrodomésticos, telemóveis, computadores, livros e impressoras — novos e usados, sempre em bom estado.',
      telefone: '+244 943 277 184',
      email: 'info@teskbuy.com',
      local: 'Luanda, Angola',
      facebook: 'https://web.facebook.com/teskbuygroup',
      whatsapp: 'https://wa.me/244943277184',
    },
  };

  /* Logótipos dos meios de pagamento mostrados no rodapé, pela ordem indicada. */
  /* A altura é diferente de propósito: o Multicaixa é quadrado e os outros
     são alongados. Com a mesma altura, os alongados pareciam bem maiores. */
  var PAGAMENTOS = [
    { ficheiro: 'multicaixa-express.png', nome: 'Multicaixa Express', altura: 19 },
    { ficheiro: 'visa.png', nome: 'Visa', altura: 15 },
    { ficheiro: 'mastercard.png', nome: 'MasterCard', altura: 15 },
    { ficheiro: 'apple-pay.png', nome: 'Apple Pay', altura: 15 },
    { ficheiro: 'google-pay.png', nome: 'Google Pay', altura: 15 },
  ];

  var conteudoCache = null;
  var conteudoPedido = null;

  /* Categorias — lidas uma única vez e reaproveitadas em toda a página. */
  var categoriasCache = null;
  var categoriasPedido = null;

  function categorias(callback) {
    if (categoriasCache) { callback(categoriasCache); return; }
    if (!categoriasPedido) {
      categoriasPedido = api.get('/catalogo/categorias')
        .then(function (r) { categoriasCache = r.dados || []; return categoriasCache; })
        .catch(function () { categoriasCache = []; return categoriasCache; });
    }
    categoriasPedido.then(callback);
  }

  /** Junta o que está gravado por cima dos valores por omissão. */
  function juntar(padrao, gravado) {
    var saida = {};
    Object.keys(padrao).forEach(function (seccao) {
      saida[seccao] = {};
      Object.keys(padrao[seccao]).forEach(function (campo) {
        var v = gravado && gravado[seccao] ? gravado[seccao][campo] : undefined;
        var vazio = v === undefined || v === null || v === '' ||
                    (Array.isArray(v) && v.length === 0);
        saida[seccao][campo] = vazio ? padrao[seccao][campo] : v;
      });
    });
    return saida;
  }

  /** Lê o conteúdo do site uma única vez, mesmo com vários pedidos em simultâneo. */
  function conteudo(callback) {
    if (conteudoCache) { callback(conteudoCache); return; }

    if (!conteudoPedido) {
      conteudoPedido = api.get('/catalogo/definicoes')
        .then(function (r) {
          conteudoCache = juntar(CONTEUDO_PADRAO, (r.dados || {}).conteudo_site);
          return conteudoCache;
        })
        .catch(function () {
          conteudoCache = juntar(CONTEUDO_PADRAO, null);
          return conteudoCache;
        });
    }

    conteudoPedido.then(callback);
  }

  /* ── rodapé ─────────────────────────────────────────────── */
  function rodape(c) {
    var alvo = document.getElementById('rodape');
    if (!alvo) return;

    var r = (c && c.rodape) || CONTEUDO_PADRAO.rodape;
    var telefoneLimpo = String(r.telefone || '').replace(/[^0-9+]/g, '');

    var i = (c && c.inicio) || CONTEUDO_PADRAO.inicio;
    var iconesConfianca = [ico.escudo, ico.camiao, ico.cartao, ico.estrela];

    alvo.className = 'rodape';
    alvo.innerHTML =
      '<div class="env">' +

        // faixa de confiança, agora em todas as páginas
        '<div class="rodape-confianca">' +
          (i.confianca || []).map(function (x, n) {
            return '<div>' + iconesConfianca[n % iconesConfianca.length] +
              '<div><strong>' + escapar(x.titulo) + '</strong>' +
              '<span>' + escapar(x.texto) + '</span></div></div>';
          }).join('') +
        '</div>' +

        '<div class="rodape-grelha">' +
          '<div>' +
            // sem logótipo nem descrição: o logótipo já está no cabeçalho
            // e a descrição repetia o que a página inicial diz melhor
            '<form class="rodape-newsletter" id="form-newsletter-rodape" style="margin-top:0">' +
              '<label for="email-newsletter">' + escapar(i.newsletter_titulo) + '</label>' +
              '<p class="silenciado pequeno">' + escapar(i.newsletter_texto) + '</p>' +
              '<div class="linha-flex" style="gap:8px;margin-top:10px">' +
                '<input type="email" id="email-newsletter" placeholder="o.seu.email@exemplo.ao" required aria-label="E-mail">' +
                '<button class="btn btn-principal btn-pequeno" type="submit">Subscrever</button>' +
              '</div>' +
            '</form>' +
            '<div class="rodape-redes">' +
              '<h4>Siga-nos</h4>' +
              '<div>' +
                '<a href="' + escapar(r.facebook) + '" target="_blank" rel="noopener" aria-label="Facebook">' + ico.facebook + '</a>' +
                '<a href="' + escapar(r.whatsapp) + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ico.whatsapp + '</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
          coluna('Empresa',
            '<li><a href="/informacoes?p=sobre-nos">Sobre Nós</a></li>' +
            '<li><a href="/informacoes?p=contacte-nos">Contacte-nos</a></li>' +
            '<li><a href="/parceiro">Vender na TEskBuy</a></li>' +
            '<li><a href="/parceiro">Programa de afiliados</a></li>') +
          coluna('Links úteis',
            '<li><a href="/loja">Pesquisa</a></li>' +
            '<li><a href="/informacoes?p=perguntas-frequentes">Perguntas Frequentes</a></li>') +
          coluna('Conformidade',
            '<li><a href="/informacoes?p=termos">Termos de Serviço</a></li>' +
            '<li><a href="/informacoes?p=privacidade">Política de Privacidade</a></li>' +
            '<li><a href="/informacoes?p=envio">Política de Envio</a></li>' +
            '<li><a href="/informacoes?p=devolucoes">Devoluções e Reembolsos</a></li>' +
            '<li><a href="/informacoes?p=garantia">Política de Garantia</a></li>') +
          coluna('Contactos',
            '<li><a href="tel:' + escapar(telefoneLimpo) + '">' + ico.telefone + escapar(r.telefone) + '</a></li>' +
            '<li><a href="mailto:' + escapar(r.email) + '">' + ico.correio + escapar(r.email) + '</a></li>' +
            '<li><span class="silenciado">' + ico.local + escapar(r.local) + '</span></li>', true) +
        '</div>' +
        '<div class="rodape-base">' +
          '<div class="rodape-pagamentos">' +
            '<p class="pagamentos">Nós aceitamos</p>' +
            '<div class="rodape-logos">' +
              PAGAMENTOS.map(function (p) {
                return '<img src="/assets/img/pagamentos/' + p.ficheiro + '" alt="' + escapar(p.nome) + '" ' +
                  'title="' + escapar(p.nome) + '" loading="lazy" ' +
                  'style="height:' + p.altura + 'px;width:auto;display:block">';
              }).join('') +
            '</div>' +
          '</div>' +
          '<p class="rodape-direitos">Copyright ' + new Date().getFullYear() +
            ' TEskBuy. Todos os direitos reservados.</p>' +
        '</div>' +
      '</div>';

    ligarNewsletter();
    ligarSanfonaRodape();
  }

  /** Uma coluna do rodapé. No telemóvel fecha-se e abre ao toque. */
  function coluna(titulo, itens, aberta) {
    return '<div class="rodape-col' + (aberta ? ' aberta' : '') + '">' +
      '<h4><span>' + escapar(titulo) + '</span>' + ico.chevron + '</h4>' +
      '<ul>' + itens + '</ul></div>';
  }

  /** Só tem efeito no telemóvel — no computador as colunas estão sempre abertas. */
  function ligarSanfonaRodape() {
    Array.prototype.slice.call(document.querySelectorAll('.rodape-col > h4')).forEach(function (t) {
      t.addEventListener('click', function () {
        if (window.innerWidth > 700) return;
        t.parentNode.classList.toggle('aberta');
      });
    });
  }

  /** Subscrição da newsletter, agora no rodapé de todas as páginas. */
  function ligarNewsletter() {
    var form = document.getElementById('form-newsletter-rodape');
    if (!form) return;

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var campo = document.getElementById('email-newsletter');
      var botao = form.querySelector('button');
      botao.disabled = true;

      api.post('/newsletter', { email: campo.value.trim() })
        .then(function (r) { notificar(r.mensagem, 'ok'); campo.value = ''; })
        .catch(function (e) { notificar(e.message, 'erro'); })
        .then(function () { botao.disabled = false; });
    });
  }

  /* ── cartão de produto ──────────────────────────────────── */
  function cartaoProduto(p) {
    var preco = Number(p.price != null ? p.price : p.preco);
    var antigo = Number(p.compare_at_price || 0);
    var desconto = antigo > preco ? Math.round(((antigo - preco) / antigo) * 100) : 0;
    var stock = p.stock_quantity != null ? p.stock_quantity : 0;
    var favorito = estado.favoritos.tem(p.id);

    var selos = '';
    if (desconto > 0) selos += '<span class="selo selo-desconto">−' + desconto + '%</span>';
    if (p.condition === 'usado') selos += '<span class="selo selo-usado">Usado</span>';
    if (p.condition === 'recondicionado') selos += '<span class="selo selo-usado">Recondicionado</span>';
    if (stock === 0) selos += '<span class="selo selo-esgotado">Esgotado</span>';

    return (
      '<article class="produto">' +
        '<div class="selos">' + selos + '</div>' +
        '<button class="btn-favorito' + (favorito ? ' activo' : '') + '" data-favorito="' + p.id + '" ' +
          'aria-label="Guardar nos favoritos">' + (favorito ? ico.coracaoCheio : ico.coracao) + '</button>' +
        '<a href="/produto?slug=' + encodeURIComponent(p.slug) + '" class="produto-img">' +
          '<img src="' + imagem(p) + '" alt="' + escapar(p.name || p.nome) + '" loading="lazy">' +
        '</a>' +
        '<div class="produto-corpo">' +
          '<span class="produto-cat">' + escapar((p.categoria && p.categoria.name) || NOMES_CONDICAO[p.condition] || '') + '</span>' +
          '<a href="/produto?slug=' + encodeURIComponent(p.slug) + '" class="produto-nome" style="text-decoration:none">' +
            escapar(p.name || p.nome) + '</a>' +
          '<div class="produto-preco">' +
            '<span class="preco">' + kz(preco) + '</span>' +
            (antigo > preco ? '<span class="preco-antigo">' + kz(antigo) + '</span>' : '') +
          '</div>' +
          '<button class="btn btn-secundario btn-pequeno" data-adicionar="' + p.id + '"' +
            (stock === 0 ? ' disabled' : '') + '>' +
            (stock === 0 ? 'Sem stock' : 'Adicionar ao carrinho') + '</button>' +
        '</div>' +
      '</article>'
    );
  }

  /** Liga os botões de favorito e "adicionar" dentro de um contentor. */
  function ligarAccoesProduto(contentor, produtosPorId) {
    contentor.querySelectorAll('[data-favorito]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        alternarFavorito(btn.getAttribute('data-favorito'), btn);
      });
    });

    contentor.querySelectorAll('[data-adicionar]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        var id = btn.getAttribute('data-adicionar');
        adicionarAoCarrinho(produtosPorId[id] || { id: id }, 1, btn);
      });
    });
  }

  function alternarFavorito(produtoId, btn) {
    if (api.sessao.activa()) {
      api.post('/favoritos/' + produtoId)
        .then(function (r) {
          var ids = estado.favoritos.ids();
          var pos = ids.indexOf(produtoId);
          if (r.dados.favorito && pos === -1) ids.push(produtoId);
          if (!r.dados.favorito && pos !== -1) ids.splice(pos, 1);
          estado.favoritos.definir(ids);
          if (btn) { btn.classList.toggle('activo', r.dados.favorito); btn.innerHTML = r.dados.favorito ? ico.coracaoCheio : ico.coracao; }
          actualizarCrachas();
          notificar(r.mensagem, 'ok');
        })
        .catch(function (e) { notificar(e.message, 'erro'); });
      return;
    }

    var activo = estado.favoritos.alternar(produtoId);
    if (btn) { btn.classList.toggle('activo', activo); btn.innerHTML = activo ? ico.coracaoCheio : ico.coracao; }
    actualizarCrachas();
    notificar(activo ? 'Guardado nos favoritos neste dispositivo.' : 'Removido dos favoritos.', 'ok');
  }

  function adicionarAoCarrinho(produto, quantidade, btn) {
    quantidade = quantidade || 1;
    var texto = btn && btn.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'A adicionar…'; }

    function terminar(mensagem, tipo) {
      if (btn) { btn.disabled = false; btn.textContent = texto; }
      actualizarCrachas();
      notificar(mensagem, tipo);
    }

    if (api.sessao.activa()) {
      api.post('/carrinho/itens', { produto_id: produto.id, quantidade: quantidade })
        .then(function (r) {
          var u = api.utilizador.obter() || {};
          u.carrinho_itens = r.dados.total_itens;
          api.utilizador.guardar(u);
          terminar('Adicionado ao carrinho.', 'ok');
        })
        .catch(function (e) { terminar(e.message, 'erro'); });
      return;
    }

    if (!produto.slug) {
      api.get('/produtos/' + produto.id)
        .then(function (r) {
          estado.carrinho.adicionar(Object.assign({}, r.dados.produto, { imagem: r.dados.produto.imagem }), quantidade);
          terminar('Adicionado ao carrinho.', 'ok');
        })
        .catch(function (e) { terminar(e.message, 'erro'); });
      return;
    }

    estado.carrinho.adicionar(produto, quantidade);
    terminar('Adicionado ao carrinho.', 'ok');
  }

  /* ── esqueletos ─────────────────────────────────────────── */
  function esqueletos(n, classe) {
    var saida = '';
    for (var i = 0; i < n; i += 1) saida += '<div class="esqueleto ' + (classe || 'esqueleto-produto') + '"></div>';
    return saida;
  }

  /* ── sessão ─────────────────────────────────────────────── */
  function exigirSessao(destino) {
    if (api.sessao.activa()) return true;
    location.href = '/entrar?voltar=' + encodeURIComponent(destino || location.pathname + location.search);
    return false;
  }

  /** Sincroniza o carrinho e os favoritos do dispositivo com a conta. */
  function sincronizarAposLogin() {
    var itens = estado.carrinho.paraSincronizar();
    var pedidos = [];

    if (itens.length) {
      pedidos.push(
        api.post('/carrinho/sincronizar', { itens: itens }).then(function () { estado.carrinho.limpar(); })
      );
    }

    var favs = estado.favoritos.ids();
    if (favs.length) {
      pedidos.push(Promise.all(favs.map(function (id) { return api.post('/favoritos/' + id).catch(function () {}); })));
    }

    return Promise.all(pedidos)
      .then(function () { return api.eu(); })
      .then(function (r) {
        estado.favoritos.definir(r.dados.favoritos || []);
        var u = api.utilizador.obter() || {};
        u.carrinho_itens = r.dados.carrinho.total_itens;
        api.utilizador.guardar(u);
      })
      .catch(function () {});
  }

  /** Actualiza contagens a partir do servidor quando há sessão. */
  function refrescarSessao() {
    if (!api.sessao.activa()) return Promise.resolve(null);
    return api.eu()
      .then(function (r) {
        estado.favoritos.definir(r.dados.favoritos || []);
        var u = api.utilizador.obter() || {};
        u.carrinho_itens = r.dados.carrinho.total_itens;
        api.utilizador.guardar(u);
        actualizarCrachas();
        return r.dados;
      })
      .catch(function () { return null; });
  }

  /* ── arranque comum ─────────────────────────────────────── */
  /**
   * Rede de segurança da entrada com a Google.
   *
   * Quando o endereço de regresso não está na lista de "Redirect URLs" do
   * Supabase, ele não dá erro: manda o cliente para o Site URL — normalmente a
   * página inicial — com os tokens no fim do endereço (#access_token=…).
   * Sem isto, o cliente autenticava-se na Google e voltava à loja como se nada
   * fosse. Aqui apanhamos esses tokens em qualquer página e concluímos a entrada.
   */
  function capturarSessaoDoEndereco() {
    if (!location.hash || location.hash.indexOf('access_token') === -1) return false;

    var frag = new URLSearchParams(location.hash.replace(/^#/, ''));
    var acesso = frag.get('access_token');
    var renovacao = frag.get('refresh_token');
    if (!acesso || !renovacao) return false;

    // a recuperação de palavra-passe tem página própria — não lhe tocamos
    if (frag.get('type') === 'recovery') return false;
    if (/nova-palavra-passe|entrar-google/.test(location.pathname)) return false;

    history.replaceState(null, '', location.pathname + location.search);

    api.post('/auth/sessao-google', {
      access_token: acesso,
      refresh_token: renovacao,
      expira_em: frag.get('expires_at') || undefined,
    })
      .then(function (r) {
        api.sessao.guardar(r.dados.sessao);
        api.utilizador.guardar(r.dados.utilizador);
        return sincronizarAposLogin();
      })
      .then(function () { location.reload(); })
      .catch(function (e) {
        notificar(e.message || 'Não foi possível concluir a entrada com a Google.', 'erro');
      });

    return true;
  }

  /**
   * Envia um ficheiro para o Supabase Storage.
   *
   * O ficheiro não passa pela nossa API: pedimos-lhe apenas uma autorização
   * de escrita e os bytes seguem directos para o Supabase. Devolve o caminho
   * e, quando o cofre é público, o endereço definitivo da imagem.
   */
  function carregarFicheiro(ficheiro, finalidade) {
    if (!ficheiro) return Promise.reject(new Error('Escolha um ficheiro.'));

    return api.post('/ficheiros/autorizacao', {
      finalidade: finalidade,
      mime: ficheiro.type,
      nome: ficheiro.name,
    }).then(function (r) {
      var a = r.dados;
      return fetch(a.url_carregamento, {
        method: 'PUT',
        headers: { 'Content-Type': ficheiro.type },
        body: ficheiro,
      }).then(function (resposta) {
        if (!resposta.ok) throw new Error('O envio do ficheiro falhou. Tente novamente.');
        return { caminho: a.caminho, url: a.url_publica, cofre: a.cofre };
      });
    });
  }

  /**
   * Guarda o código do afiliado que trouxe a visita.
   *
   * Fica 30 dias. Se o cliente comprar dentro desse prazo, a comissão é
   * atribuída a quem divulgou. O código sai do endereço à vista, para não
   * andar a passear pelas ligações que o cliente possa partilhar.
   */
  var CHAVE_REF = 'tb.ref';
  var DIAS_REF = 30;

  function guardarReferencia() {
    var codigo = new URLSearchParams(location.search).get('ref');
    if (!codigo) return;

    try {
      localStorage.setItem(CHAVE_REF, JSON.stringify({
        codigo: codigo.trim().toLowerCase(),
        ate: Date.now() + DIAS_REF * 86400000,
      }));
    } catch (e) { /* sem localStorage, a atribuição perde-se — não é grave */ }

    var procura = new URLSearchParams(location.search);
    procura.delete('ref');
    var qs = procura.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  /** Código válido, ou null se não houver ou já ter expirado. */
  function referencia() {
    try {
      var guardado = JSON.parse(localStorage.getItem(CHAVE_REF) || 'null');
      if (!guardado || !guardado.codigo) return null;
      if (guardado.ate && guardado.ate < Date.now()) {
        localStorage.removeItem(CHAVE_REF);
        return null;
      }
      return guardado.codigo;
    } catch (e) { return null; }
  }

  function iniciar(paginaActiva) {
    guardarReferencia();
    capturarSessaoDoEndereco();
    cabecalho(paginaActiva);
    rodape();
    estado.aoMudar(actualizarCrachas);
    refrescarSessao();
    // volta a desenhar o rodapé com os textos gravados no painel
    conteudo(function (c) { rodape(c); });
  }

  global.TBUI = {
    ico: ico, kz: kz, data: data, escapar: escapar, imagem: imagem,
    NOMES_ESTADO: NOMES_ESTADO, NOMES_PAGAMENTO: NOMES_PAGAMENTO, NOMES_CONDICAO: NOMES_CONDICAO,
    notificar: notificar, cabecalho: cabecalho, rodape: rodape, iniciar: iniciar,
    conteudo: conteudo, CONTEUDO_PADRAO: CONTEUDO_PADRAO,
    cartaoProduto: cartaoProduto, ligarAccoesProduto: ligarAccoesProduto,
    alternarFavorito: alternarFavorito, adicionarAoCarrinho: adicionarAoCarrinho,
    actualizarCrachas: actualizarCrachas, esqueletos: esqueletos,
    exigirSessao: exigirSessao, sincronizarAposLogin: sincronizarAposLogin, refrescarSessao: refrescarSessao,
    carregarFicheiro: carregarFicheiro, referencia: referencia,
  };
})(window);
