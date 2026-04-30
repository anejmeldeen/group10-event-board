"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Err = exports.Ok = void 0;
const Ok = (value) => ({ ok: true, value });
exports.Ok = Ok;
const Err = (value) => ({ ok: false, value });
exports.Err = Err;
