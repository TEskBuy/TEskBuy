'use strict';
const { z } = require('zod');

const uuid = z.string().uuid('Identificador inválido.');
const texto = (min, max, campo) =>
  z.string().trim().min(min, `${campo} é obrigatório.`).max(max, `${campo} é demasiado longo.`);

const telefoneAngola = z
  .string()
  .trim()
  .regex(/^(\+244)?\s?9\d{2}\s?\d{3}\s?\d{3}$/, 'Indique um número angolano válido (ex.: +244 943 277 184).');

// ── Autenticação ───────────────────────────────────────────
const registo = z.object({
  nome: texto(2, 120, 'O nome'),
  email: z.string().trim().toLowerCase().email('Indique um e-mail válido.'),
  palavra_passe: z.string().min(8, 'A palavra-passe deve ter pelo menos 8 caracteres.').max(72),
  telefone: telefoneAngola.optional().or(z.literal('')),
});

const login = z.object({
  email: z.string().trim().toLowerCase().email('Indique um e-mail válido.'),
  palavra_passe: z.string().min(1, 'Escreva a palavra-passe.'),
});

const recuperacao = z.object({
  email: z.string().trim().toLowerCase().email('Indique um e-mail válido.'),
});

const confirmacaoCodigo = z.object({
  email: z.string().trim().toLowerCase().email('Indique um e-mail válido.'),
  codigo: z.string().trim().regex(/^\d{6}$/, 'O código tem de ter 6 dígitos.'),
});

const reenvioCodigo = z.object({
  email: z.string().trim().toLowerCase().email('Indique um e-mail válido.'),
});

// Tokens que a Google devolve, através do Supabase, no fim do consentimento.
const sessaoGoogle = z.object({
  access_token: z.string().trim().min(20, 'Falta o token de acesso.').max(4000),
  refresh_token: z.string().trim().min(10, 'Falta o token de renovação.').max(4000),
  expira_em: z.coerce.number().int().positive().optional(),
});

const novaPalavraPasse = z.object({
  palavra_passe: z.string().min(8, 'A palavra-passe deve ter pelo menos 8 caracteres.').max(72),
});

/* ── candidaturas a vendedor e a afiliado ──────────────────── */

// Campo curto de candidatura: obrigatório quando se passa o nome do campo.
const campo = (max, nome) =>
  nome ? texto(2, max, nome) : z.string().trim().max(max).optional();

// Documentos já carregados para o Storage: só guardamos o caminho.
const documentoKyc = z.object({
  tipo: z.string().trim().min(2).max(40),
  caminho: z.string().trim().min(3).max(400),
  mime: z.string().trim().max(100).optional(),
});

const dadosKyc = z.object({
  nome_completo: campo(120, 'O nome completo'),
  tipo_documento: campo(40, 'O tipo de documento'),
  numero_documento: campo(60, 'O número do documento'),
  data_nascimento: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.').optional(),
  morada: campo(240),
});

const candidaturaVendedor = z.object({
  nome_empresa: campo(120, 'O nome da empresa'),
  nome_legal: campo(160),
  nif: campo(40, 'O NIF'),
  email: z.string().trim().toLowerCase().email('Indique um e-mail válido.'),
  telefone: campo(40, 'O telefone'),
  provincia: campo(60),
  municipio: campo(60),
  morada: campo(240),
  descricao: z.string().trim().max(1000).optional(),
  kyc: dadosKyc,
  documentos: z.array(documentoKyc).max(8).default([]),
});

const candidaturaAfiliado = z.object({
  nome: campo(120, 'O nome'),
  telefone: campo(40, 'O telefone'),
  canais: z.string().trim().max(500).optional(),   // onde tenciona divulgar
  motivo: z.string().trim().max(1000).optional(),
  kyc: dadosKyc,
  documentos: z.array(documentoKyc).max(8).default([]),
});

const decisaoCandidatura = z.object({
  decisao: z.enum(['aprovar', 'rejeitar', 'pedir_info']),
  nota: z.string().trim().max(1000).optional(),
  comissao: z.coerce.number().min(0).max(100).optional(),
});

/* ── área do comerciante ───────────────────────────────────── */

const dadosEmpresa = z.object({
  name: campo(120, 'O nome'),
  legal_name: campo(160),
  tax_id: campo(40),
  email: z.string().trim().toLowerCase().email('Indique um e-mail válido.').optional(),
  phone: campo(40),
  province: campo(60),
  municipality: campo(60),
  address: campo(240),
  logo_url: z.string().trim().url('Endereço de imagem inválido.').optional().or(z.literal('')),
  cover_url: z.string().trim().url('Endereço de imagem inválido.').optional().or(z.literal('')),
  description: z.string().trim().max(1000).optional(),
}).partial();

// O parceiro define o produto, mas não o estado de moderação nem o destaque:
// esses campos nem sequer são aceites aqui.
const produtoParceiroBase = {
  sku: texto(2, 40, 'O SKU'),
  name: texto(2, 200, 'O nome'),
  slug: z.string().trim().min(2).max(200)
    .regex(/^[a-z0-9-]+$/, 'O endereço só pode ter letras minúsculas, números e hífens.'),
  short_description: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(6000).optional().nullable(),
  category_id: uuid.optional().nullable(),
  brand_id: uuid.optional().nullable(),
  condition: z.enum(['novo', 'usado', 'recondicionado']).default('novo'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
  compare_at_price: z.coerce.number().min(0).optional().nullable(),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(3),
  warranty_months: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  imagens: z.array(z.union([
    z.string().url(),
    z.object({ url: z.string().url(), alt: z.string().optional() }),
  ])).max(8).optional(),
};

const produtoParceiro = z.object(produtoParceiroBase);
const produtoParceiroParcial = z.object(produtoParceiroBase).partial();

const respostaAvaliacao = z.object({
  resposta: texto(2, 1000, 'A resposta'),
});

/* ── parcerias de afiliados ────────────────────────────────── */

const pedidoParceria = z.object({
  empresa_id: uuid,
  mensagem: z.string().trim().max(1000).optional(),
});

const decisaoParceriaAdmin = z.object({
  decisao: z.enum(['encaminhar', 'travar', 'analisar']),
  nota: z.string().trim().max(1000).optional(),
  comissao: z.coerce.number().min(0).max(100).optional(),
});

const decisaoParceriaEmpresa = z.object({
  decisao: z.enum(['aceitar', 'recusar']),
  nota: z.string().trim().max(1000).optional(),
  comissao: z.coerce.number().min(0).max(100).optional(),
});

/* ── denúncias, avaliações e suporte ───────────────────────── */

const MOTIVOS = [
  'mau_estado', 'diferente_descricao', 'falsificado', 'danificado',
  'ma_qualidade', 'nao_recebido', 'informacao_enganosa', 'outro',
];

const denuncia = z.object({
  produto_id: uuid.optional(),
  encomenda_id: uuid.optional(),
  motivo: z.enum(MOTIVOS, { errorMap: () => ({ message: 'Escolha um motivo.' }) }),
  descricao: z.string().trim().max(2000).optional(),
  anexos: z.array(z.object({
    caminho: z.string().trim().min(3).max(400),
    mime: z.string().trim().max(100).optional(),
  })).max(6).default([]),
}).refine((d) => d.produto_id || d.encomenda_id, {
  message: 'Indique o produto ou a encomenda em causa.',
});

const tratarDenuncia = z.object({
  estado: z.enum(['nova', 'em_analise', 'resolvida', 'rejeitada']),
  resolucao: z.string().trim().max(2000).optional(),
});

const avaliacaoVendedor = z.object({
  empresa_id: uuid,
  encomenda_id: uuid,
  estrelas: z.coerce.number().int().min(1, 'Escolha de 1 a 5 estrelas.').max(5),
  comentario: z.string().trim().max(1500).optional(),
});

const novoTicket = z.object({
  assunto: texto(3, 160, 'O assunto'),
  categoria: z.enum([
    'conta', 'produtos', 'encomendas', 'pagamentos', 'comissoes',
    'afiliados', 'reembolsos', 'tecnico', 'contestacao', 'outro',
  ]),
  mensagem: texto(5, 4000, 'A mensagem'),
});

const mensagemTicket = z.object({ mensagem: texto(1, 4000, 'A mensagem') });

const estadoTicket = z.object({
  estado: z.enum(['aberto', 'em_analise', 'aguarda_empresa', 'aguarda_admin', 'resolvido', 'fechado']),
});

/* ── definições da conta ───────────────────────────────────── */

const preferencias = z.object({
  idioma: z.enum(['pt', 'en']).optional(),
  notificar_email: z.boolean().optional(),
  notificar_plataforma: z.boolean().optional(),
});

// Nunca se recebe aqui um número de cartão completo: o campo "referencia"
// é guardado mascarado, só com os últimos dígitos à vista.
const metodoPagamento = z.object({
  para: z.enum(['pessoal', 'empresa']).default('pessoal'),
  tipo: z.enum(['multicaixa_express', 'transferencia_bancaria', 'numerario', 'iban']),
  etiqueta: texto(2, 60, 'A etiqueta'),
  referencia: z.string().trim().max(60).optional(),
  titular: z.string().trim().max(120).optional(),
  banco: z.string().trim().max(80).optional(),
  por_omissao: z.boolean().default(false),
});

const eliminarConta = z.object({
  motivo: z.string().trim().max(500).optional(),
});

const novaConversa = z.object({
  empresa_id: uuid,
  assunto: z.string().trim().max(160).optional(),
  mensagem: texto(1, 4000, 'A mensagem'),
});

/* ── ficheiros ─────────────────────────────────────────────── */

const autorizacaoFicheiro = z.object({
  finalidade: z.enum(['produto', 'logotipo', 'loja', 'kyc', 'denuncia', 'avatar']),
  mime: z.string().trim().max(100),
  nome: z.string().trim().max(200).optional(),
});

const alteracaoPalavraPasse = z.object({
  actual: z.string().min(1, 'Escreva a palavra-passe actual.'),
  nova: z.string().min(8, 'A nova palavra-passe deve ter pelo menos 8 caracteres.').max(72),
});

// ── Catálogo ───────────────────────────────────────────────
const listagemProdutos = z.object({
  q: z.string().trim().max(120).optional(),
  categoria: z.string().trim().max(120).optional(),
  marca: z.string().trim().max(120).optional(),
  condicao: z.enum(['novo', 'usado', 'recondicionado']).optional(),
  preco_min: z.coerce.number().min(0).optional(),
  preco_max: z.coerce.number().min(0).optional(),
  destaque: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  apenas_com_stock: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  ordenar: z.enum(['recentes', 'antigos', 'preco_asc', 'preco_desc', 'nome', 'populares', 'avaliacao']).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(48).default(12),
});

const produtoBase = {
  sku: texto(2, 40, 'O SKU'),
  name: texto(2, 200, 'O nome'),
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9-]+$/, 'O slug só pode ter letras minúsculas, números e hífens.'),
  short_description: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(6000).optional().nullable(),
  category_id: uuid.optional().nullable(),
  brand_id: uuid.optional().nullable(),
  condition: z.enum(['novo', 'usado', 'recondicionado']).default('novo'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
  compare_at_price: z.coerce.number().min(0).optional().nullable(),
  cost_price: z.coerce.number().min(0).optional().nullable(),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(3),
  warranty_months: z.coerce.number().int().min(0).default(0),
  supplier: z.string().trim().max(80).optional().nullable(),
  specs: z.record(z.string()).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  imagens: z.array(z.union([z.string().url(), z.object({ url: z.string().url(), alt: z.string().optional() })])).max(8).optional(),
};

const criarProduto = z.object(produtoBase);
const actualizarProduto = z.object(produtoBase).partial();

const categoria = z.object({
  name: texto(2, 80, 'O nome'),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Slug inválido.'),
  description: z.string().trim().max(400).optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  parent_id: uuid.optional().nullable(),
  position: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
});

const avaliacao = z.object({
  rating: z.coerce.number().int().min(1, 'Escolha de 1 a 5 estrelas.').max(5),
  title: z.string().trim().max(120).optional().nullable(),
  comment: z.string().trim().max(1500).optional().nullable(),
});

// ── Carrinho ───────────────────────────────────────────────
const adicionarAoCarrinho = z.object({
  produto_id: uuid,
  quantidade: z.coerce.number().int().min(1).max(99).default(1),
});

const actualizarItemCarrinho = z.object({
  quantidade: z.coerce.number().int().min(0).max(99),
});

const sincronizarCarrinho = z.object({
  itens: z
    .array(z.object({ produto_id: uuid, quantidade: z.coerce.number().int().min(1).max(99) }))
    .max(50)
    .default([]),
});

// ── Encomendas ─────────────────────────────────────────────
const criarEncomenda = z.object({
  // código do afiliado que trouxe esta compra, quando existe
  ref: z.string().trim().max(60).optional(),
  nome: texto(2, 120, 'O nome'),
  telefone: telefoneAngola,
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  metodo_pagamento: z.enum(['multicaixa_express', 'transferencia_bancaria', 'numerario'], {
    errorMap: () => ({ message: 'Escolha um método de pagamento.' }),
  }),
  provincia: texto(2, 60, 'A província').default('Luanda'),
  municipio: texto(2, 80, 'O município'),
  bairro: z.string().trim().max(120).optional().or(z.literal('')),
  rua: z.string().trim().max(160).optional().or(z.literal('')),
  referencia: z.string().trim().max(200).optional().or(z.literal('')),
  notas: z.string().trim().max(500).optional().or(z.literal('')),
  cupao: z.string().trim().max(40).optional().or(z.literal('')),
});

const estadoEncomenda = z.object({
  estado: z.enum(['pendente', 'confirmada', 'em_preparacao', 'enviada', 'entregue', 'cancelada', 'reembolsada']),
  nota: z.string().trim().max(300).optional().nullable(),
});

// ── Perfil e moradas ───────────────────────────────────────
const perfil = z.object({
  nome: texto(2, 120, 'O nome').optional(),
  telefone: telefoneAngola.optional().or(z.literal('')),
  avatar_url: z.string().url().optional().nullable(),
});

const morada = z.object({
  label: z.string().trim().max(40).default('Casa'),
  recipient_name: texto(2, 120, 'O nome de quem recebe'),
  phone: telefoneAngola,
  province: texto(2, 60, 'A província').default('Luanda'),
  municipality: texto(2, 80, 'O município'),
  neighbourhood: z.string().trim().max(120).optional().nullable(),
  street: z.string().trim().max(160).optional().nullable(),
  reference_point: z.string().trim().max(200).optional().nullable(),
  is_default: z.boolean().default(false),
});

// ── Stock e administração ──────────────────────────────────
const movimentoStock = z.object({
  produto_id: uuid,
  tipo: z.enum(['entrada', 'saida', 'ajuste', 'devolucao']),
  quantidade: z.coerce.number().int(),
  motivo: z.string().trim().max(200).optional().nullable(),
});

const papelUtilizador = z.object({
  papel: z.enum(['cliente', 'gestor', 'admin']),
});

const cupao = z.object({
  code: z.string().trim().toUpperCase().min(3).max(40),
  description: z.string().trim().max(200).optional().nullable(),
  type: z.enum(['percentagem', 'fixo']).default('percentagem'),
  value: z.coerce.number().positive('O valor tem de ser maior que zero.'),
  min_order: z.coerce.number().min(0).default(0),
  max_uses: z.coerce.number().int().min(1).optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  is_active: z.boolean().default(true),
});

const paginacao = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  estado: z.string().trim().max(40).optional(),
  papel: z.string().trim().max(20).optional(),
});

const paramsId = z.object({ id: uuid });
const paramsProdutoId = z.object({ produtoId: uuid });

module.exports = {
  registo, login, recuperacao, novaPalavraPasse, alteracaoPalavraPasse,
  confirmacaoCodigo, reenvioCodigo, sessaoGoogle,
  candidaturaVendedor, candidaturaAfiliado, decisaoCandidatura,
  dadosEmpresa, produtoParceiro, produtoParceiroParcial, respostaAvaliacao,
  autorizacaoFicheiro,
  pedidoParceria, decisaoParceriaAdmin, decisaoParceriaEmpresa,
  denuncia, tratarDenuncia, avaliacaoVendedor, novoTicket, mensagemTicket, estadoTicket,
  preferencias, metodoPagamento, eliminarConta, novaConversa,
  listagemProdutos, criarProduto, actualizarProduto, categoria, avaliacao,
  adicionarAoCarrinho, actualizarItemCarrinho, sincronizarCarrinho,
  criarEncomenda, estadoEncomenda, perfil, morada,
  movimentoStock, papelUtilizador, cupao, paginacao, paramsId, paramsProdutoId,
};
