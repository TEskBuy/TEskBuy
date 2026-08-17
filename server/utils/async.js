'use strict';

/** Embrulha handlers assíncronos para encaminhar rejeições ao middleware de erro. */
const capturar = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { capturar };
