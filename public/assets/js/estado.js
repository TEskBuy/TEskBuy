/* ============================================================
   TeskBuy — estado local (carrinho e favoritos de visitante)
   O carrinho de quem ainda não tem sessão vive no dispositivo
   e é enviado para a conta assim que o cliente entra.
   ============================================================ */
(function (global) {
  'use strict';

  var CHAVE_CARRINHO = 'tb.carrinho';
  var CHAVE_FAVORITOS = 'tb.favoritos';
  var ouvintes = [];

  function ler(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave)) || padrao; } catch (e) { return padrao; }
  }
  function gravar(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
    ouvintes.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  var carrinho = {
    itens: function () { return ler(CHAVE_CARRINHO, []); },
    contar: function () {
      return carrinho.itens().reduce(function (t, i) { return t + i.quantidade; }, 0);
    },
    subtotal: function () {
      return carrinho.itens().reduce(function (t, i) { return t + i.preco * i.quantidade; }, 0);
    },
    adicionar: function (produto, quantidade) {
      quantidade = quantidade || 1;
      var itens = carrinho.itens();
      var existente = itens.filter(function (i) { return i.produto_id === produto.id; })[0];
      var stock = produto.stock_quantity != null ? produto.stock_quantity : 99;

      if (existente) {
        existente.quantidade = Math.min(stock, existente.quantidade + quantidade);
      } else {
        itens.push({
          produto_id: produto.id,
          nome: produto.name || produto.nome,
          slug: produto.slug,
          preco: Number(produto.price != null ? produto.price : produto.preco),
          imagem: produto.imagem || null,
          condicao: produto.condition || produto.condicao || 'novo',
          stock: stock,
          quantidade: Math.min(stock, quantidade),
        });
      }
      gravar(CHAVE_CARRINHO, itens);
      return itens;
    },
    definirQuantidade: function (produtoId, quantidade) {
      var itens = carrinho.itens();
      if (quantidade <= 0) return carrinho.remover(produtoId);
      itens.forEach(function (i) {
        if (i.produto_id === produtoId) i.quantidade = Math.min(i.stock || 99, quantidade);
      });
      gravar(CHAVE_CARRINHO, itens);
      return itens;
    },
    remover: function (produtoId) {
      var itens = carrinho.itens().filter(function (i) { return i.produto_id !== produtoId; });
      gravar(CHAVE_CARRINHO, itens);
      return itens;
    },
    limpar: function () { gravar(CHAVE_CARRINHO, []); },
    paraSincronizar: function () {
      return carrinho.itens().map(function (i) {
        return { produto_id: i.produto_id, quantidade: i.quantidade };
      });
    },
  };

  var favoritos = {
    ids: function () { return ler(CHAVE_FAVORITOS, []); },
    tem: function (id) { return favoritos.ids().indexOf(id) !== -1; },
    definir: function (ids) { gravar(CHAVE_FAVORITOS, ids || []); },
    alternar: function (id) {
      var ids = favoritos.ids();
      var pos = ids.indexOf(id);
      if (pos === -1) ids.push(id); else ids.splice(pos, 1);
      gravar(CHAVE_FAVORITOS, ids);
      return ids.indexOf(id) !== -1;
    },
  };

  global.TBEstado = {
    carrinho: carrinho,
    favoritos: favoritos,
    aoMudar: function (fn) { ouvintes.push(fn); },
    /** Total de itens: da conta quando há sessão, do dispositivo quando não há. */
    contagemCarrinho: function () {
      var u = global.TBApi && global.TBApi.utilizador.obter();
      if (u && u.carrinho_itens != null) return u.carrinho_itens;
      return carrinho.contar();
    },
  };
})(window);
