"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const result_1 = require("../src/lib/result");
describe('result helpers', () => {
    it('creates Ok results', () => {
        const result = (0, result_1.Ok)('value');
        expect(result).toEqual({ ok: true, value: 'value' });
    });
    it('creates Err results', () => {
        const result = (0, result_1.Err)('error');
        expect(result).toEqual({ ok: false, value: 'error' });
    });
});
