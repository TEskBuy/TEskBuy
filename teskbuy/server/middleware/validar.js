'use strict';
const { erros } = require('../utils/erros');

/**
 * Valida body / query / params com esquemas Zod e substitui pelos valores tratados.
 * Uso: validar({ body: esquema })
 */
function validar(esquemas) {
  return (req, _res, next) => {
    for (const chave of ['body', 'query', 'params']) {
      const esquema = esquemas[chave];
      if (!esquema) continue;

      const resultado = esquema.safeParse(req[chave]);
      if (!resultado.success) {
        const detalhes = resultado.error.issues.map((i) => ({
          campo: i.path.join('.'),
          mensagem: i.message,
        }));
        return next(erros.pedidoInvalido('Há campos por corrigir.', detalhes));
      }
      if (chave === 'query') {
        req.consulta = resultado.data;
      } else {
        req[chave] = resultado.data;
      }
    }
    next();
  };
}

module.exports = { validar };
