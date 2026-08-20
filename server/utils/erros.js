'use strict';

/** Erro de aplicação com código HTTP e código de negócio legível. */
class ErroApi extends Error {
  constructor(mensagem, estado = 400, codigo = 'ERRO', detalhes = null) {
    super(mensagem);
    this.name = 'ErroApi';
    this.estado = estado;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

const erros = {
  pedidoInvalido: (m = 'Pedido inválido.', d) => new ErroApi(m, 400, 'PEDIDO_INVALIDO', d),
  naoAutenticado: (m = 'Precisa de iniciar sessão.') => new ErroApi(m, 401, 'NAO_AUTENTICADO'),
  semPermissao: (m = 'Não tem permissão para esta operação.') => new ErroApi(m, 403, 'SEM_PERMISSAO'),
  naoEncontrado: (m = 'Recurso não encontrado.') => new ErroApi(m, 404, 'NAO_ENCONTRADO'),
  conflito: (m = 'Conflito com o estado actual.') => new ErroApi(m, 409, 'CONFLITO'),
  demasiadosPedidos: (m = 'Demasiados pedidos. Tente novamente daqui a pouco.') =>
    new ErroApi(m, 429, 'DEMASIADOS_PEDIDOS'),
  interno: (m = 'Ocorreu um erro no servidor.') => new ErroApi(m, 500, 'ERRO_INTERNO'),
};

/** Traduz erros vindos do Postgres/Supabase para mensagens de loja. */
function traduzErroBd(erro) {
  if (!erro) return null;
  const msg = String(erro.message || '');

  if (msg.includes('STOCK_INSUFICIENTE')) {
    const produto = msg.split('STOCK_INSUFICIENTE:')[1];
    return new ErroApi(
      produto ? `Sem stock suficiente para${produto}.` : 'Sem stock suficiente.',
      409,
      'STOCK_INSUFICIENTE'
    );
  }
  if (msg.includes('CARRINHO_VAZIO')) return new ErroApi('O carrinho está vazio.', 400, 'CARRINHO_VAZIO');
  if (msg.includes('CUPAO_INVALIDO')) return new ErroApi('Cupão inválido ou expirado.', 400, 'CUPAO_INVALIDO');
  if (msg.includes('PRODUTO_INDISPONIVEL')) {
    const produto = msg.split('PRODUTO_INDISPONIVEL:')[1];
    return new ErroApi(`O produto${produto || ''} deixou de estar disponível.`, 409, 'PRODUTO_INDISPONIVEL');
  }
  if (msg.includes('PRODUTO_NAO_ENCONTRADO')) return erros.naoEncontrado('Produto não encontrado.');
  if (msg.includes('ENCOMENDA_NAO_ENCONTRADA')) return erros.naoEncontrado('Encomenda não encontrada.');
  if (msg.includes('NAO_AUTORIZADO')) return erros.semPermissao();

  // Falta de permissão na base de dados. Sem isto aparecia como "erro no
  // servidor", que não diz nada a ninguém e esconde uma política em falta.
  if (erro.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new ErroApi(
      'Não tem permissão para esta operação.',
      403,
      'SEM_PERMISSAO',
      { origem: 'base_de_dados' }
    );
  }

  if (erro.code === '23505') return new ErroApi('Este registo já existe.', 409, 'DUPLICADO');
  if (erro.code === '23503') return new ErroApi('Referência inválida.', 400, 'REFERENCIA_INVALIDA');
  if (erro.code === 'PGRST116') return erros.naoEncontrado();

  return null;
}

module.exports = { ErroApi, erros, traduzErroBd };
