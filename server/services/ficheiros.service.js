'use strict';
/**
 * Carregamento de ficheiros para o Supabase Storage.
 *
 * O ficheiro nunca passa por aqui. O servidor só assina uma autorização
 * de escrita para um caminho concreto, e o navegador envia os bytes
 * directamente para o Supabase. Assim não há limites de tamanho de pedido
 * nem funções a segurar imagens em memória.
 *
 * Quem pode escrever onde é decidido pelas políticas do Storage, escritas
 * a pensar no caminho: produtos/<empresa>/…, kyc/<utilizador>/…
 */
const { comUtilizador } = require('../config/supabase');
const env = require('../config/env');
const { erros } = require('../utils/erros');

const IMAGENS = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'];
const DOCUMENTOS = IMAGENS.concat(['application/pdf']);

/** Cada finalidade decide o cofre, a pasta e os tipos aceites. */
const FINALIDADES = {
  produto: { cofre: 'publico', pasta: 'produtos', escopo: 'empresa', mimes: IMAGENS },
  logotipo: { cofre: 'publico', pasta: 'empresas', escopo: 'empresa', mimes: IMAGENS },
  loja: { cofre: 'publico', pasta: 'loja', escopo: 'equipa', mimes: IMAGENS },
  avatar: { cofre: 'publico', pasta: 'avatares', escopo: 'utilizador', mimes: IMAGENS },
  kyc: { cofre: 'documentos', pasta: 'kyc', escopo: 'utilizador', mimes: DOCUMENTOS },
  denuncia: { cofre: 'documentos', pasta: 'denuncias', escopo: 'utilizador', mimes: DOCUMENTOS },
};

const EXTENSOES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

function identificador() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

/**
 * Devolve uma autorização de escrita e o caminho onde o ficheiro vai ficar.
 * `empresaId` só é preciso nas finalidades de empresa.
 */
async function autorizarCarregamento(token, utilizador, { finalidade, mime }, empresaId) {
  const regra = FINALIDADES[finalidade];
  if (!regra) throw erros.pedidoInvalido('Finalidade de ficheiro desconhecida.');

  if (regra.mimes.indexOf(mime) === -1) {
    throw erros.pedidoInvalido(
      'Tipo de ficheiro não aceite. Use ' +
        (regra.cofre === 'publico' ? 'PNG, JPG ou WEBP.' : 'PNG, JPG, WEBP ou PDF.')
    );
  }

  if (regra.escopo === 'equipa' && utilizador.papel !== 'admin' && utilizador.papel !== 'gestor') {
    throw erros.semPermissao('Só a equipa TEskBuy pode carregar imagens da loja.');
  }
  if (regra.escopo === 'empresa' && !empresaId) {
    throw erros.semPermissao('Só empresas aprovadas podem carregar estas imagens.');
  }

  const dono =
    regra.escopo === 'empresa' ? empresaId
      : regra.escopo === 'utilizador' ? utilizador.id
        : 'geral';

  const caminho = `${regra.pasta}/${dono}/${identificador()}.${EXTENSOES[mime]}`;

  const cliente = comUtilizador(token);
  const { data, error } = await cliente.storage.from(regra.cofre).createSignedUploadUrl(caminho);
  if (error) {
    if (/row-level security|policy/i.test(error.message || '')) {
      throw erros.semPermissao('Não tem permissão para carregar ficheiros aqui.');
    }
    throw erros.interno('Não foi possível preparar o carregamento. Tente novamente.');
  }

  return {
    cofre: regra.cofre,
    caminho,
    url_carregamento: data.signedUrl,
    token: data.token,
    // Só o cofre público tem endereço directo; os documentos pedem-se assinados.
    url_publica: regra.cofre === 'publico'
      ? `${env.supabase.url}/storage/v1/object/public/${regra.cofre}/${caminho}`
      : null,
  };
}

/** Endereço temporário para ver um documento privado (KYC, anexos). */
async function urlAssinada(token, caminho, segundos = 300) {
  const cliente = comUtilizador(token);
  const { data, error } = await cliente.storage
    .from('documentos')
    .createSignedUrl(caminho, segundos);
  if (error) throw erros.naoEncontrado('Documento não encontrado ou sem permissão.');
  return { url: data.signedUrl, expira_em: segundos };
}

module.exports = { autorizarCarregamento, urlAssinada, FINALIDADES };
