'use strict';

/** Formato uniforme de resposta para toda a API. */
function ok(res, dados, extra = {}) {
  return res.json({ sucesso: true, dados, ...extra });
}

function criado(res, dados, extra = {}) {
  return res.status(201).json({ sucesso: true, dados, ...extra });
}

function paginado(res, dados, { pagina, limite, total }) {
  return res.json({
    sucesso: true,
    dados,
    paginacao: {
      pagina,
      limite,
      total,
      paginas: limite > 0 ? Math.ceil(total / limite) : 0,
    },
  });
}

module.exports = { ok, criado, paginado };
