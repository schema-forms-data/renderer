import { describe, it, expect } from 'vitest';
import type { FormField, FormStep, FormContainer } from '@schema-forms-data/core';
import { FieldType } from '@schema-forms-data/core';
import {
    CPF_REGEX,
    TELEFONE_REGEX,
    CEP_REGEX,
    EMAIL_REGEX,
    isValidCpfDigits,
} from '../formResolver/utils/regexes';
import { setNestedError } from '../formResolver/utils/setNestedError';
import { getNonRepeatableFields } from '../formResolver/utils/getNonRepeatableFields';
import { validateSingleField } from '../formResolver/utils/validateSingleField';

// ── regexes (re-export de core) ─────────────────────────────────────────────────

describe('CPF_REGEX', () => {
    it('aceita CPF formatado e sem formatação', () => {
        expect(CPF_REGEX.test('123.456.789-09')).toBe(true);
        expect(CPF_REGEX.test('12345678909')).toBe(true);
    });
    it('rejeita comprimento incorreto e caracteres inválidos', () => {
        expect(CPF_REGEX.test('123.456.789')).toBe(false);
        expect(CPF_REGEX.test('abc.def.ghi-jk')).toBe(false);
        expect(CPF_REGEX.test('')).toBe(false);
    });
});

describe('TELEFONE_REGEX', () => {
    it('aceita formatos comuns (8 e 9 dígitos, com/sem DDD formatado)', () => {
        expect(TELEFONE_REGEX.test('(11) 91234-5678')).toBe(true);
        expect(TELEFONE_REGEX.test('11912345678')).toBe(true);
        expect(TELEFONE_REGEX.test('1133334444')).toBe(true);
    });
    it('rejeita números muito curtos', () => {
        expect(TELEFONE_REGEX.test('1234')).toBe(false);
        expect(TELEFONE_REGEX.test('')).toBe(false);
    });
});

describe('CEP_REGEX', () => {
    it('aceita CEP com e sem hífen', () => {
        expect(CEP_REGEX.test('12345-678')).toBe(true);
        expect(CEP_REGEX.test('12345678')).toBe(true);
    });
    it('rejeita formatos inválidos', () => {
        expect(CEP_REGEX.test('1234-567')).toBe(false);
        expect(CEP_REGEX.test('abcde-fgh')).toBe(false);
    });
});

describe('EMAIL_REGEX', () => {
    it('aceita e-mails válidos', () => {
        expect(EMAIL_REGEX.test('a@b.co')).toBe(true);
        expect(EMAIL_REGEX.test('joao.claro@arcom.com.br')).toBe(true);
    });
    it('rejeita e-mails inválidos', () => {
        expect(EMAIL_REGEX.test('semarroba.com')).toBe(false);
        expect(EMAIL_REGEX.test('a@b')).toBe(false);
        expect(EMAIL_REGEX.test('a @b.co')).toBe(false);
    });
});

describe('isValidCpfDigits', () => {
    it('valida CPF com dígitos verificadores corretos', () => {
        expect(isValidCpfDigits('529.982.247-25')).toBe(true);
        expect(isValidCpfDigits('52998224725')).toBe(true);
    });
    it('rejeita dígitos verificadores incorretos', () => {
        expect(isValidCpfDigits('529.982.247-20')).toBe(false);
    });
    it('rejeita todos dígitos iguais e comprimento errado', () => {
        expect(isValidCpfDigits('111.111.111-11')).toBe(false);
        expect(isValidCpfDigits('123')).toBe(false);
    });
});

// ── setNestedError ──────────────────────────────────────────────────────────────

describe('setNestedError', () => {
    const err = { type: 'manual', message: 'erro' };

    it('seta erro em path simples', () => {
        const obj: Record<string, unknown> = {};
        setNestedError(obj, 'nome', err);
        expect(obj).toEqual({ nome: err });
    });

    it('cria estrutura aninhada para path com pontos', () => {
        const obj: Record<string, unknown> = {};
        setNestedError(obj, 'enderecos.0.cidade', err);
        expect(obj).toEqual({ enderecos: { '0': { cidade: err } } });
    });

    it('reaproveita objetos intermediários existentes', () => {
        const obj: Record<string, unknown> = { a: { existente: 1 } };
        setNestedError(obj, 'a.b', err);
        expect(obj).toEqual({ a: { existente: 1, b: err } });
    });

    it('sobrescreve nó intermediário não-objeto por objeto', () => {
        const obj: Record<string, unknown> = { a: 'string' };
        setNestedError(obj, 'a.b', err);
        expect(obj).toEqual({ a: { b: err } });
    });

    it('bloqueia prototype pollution em chave intermediária (__proto__)', () => {
        const obj: Record<string, unknown> = {};
        setNestedError(obj, '__proto__.polluted', err);
        expect(obj).toEqual({});
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('bloqueia chave final perigosa (constructor)', () => {
        const obj: Record<string, unknown> = {};
        setNestedError(obj, 'constructor', err);
        expect(obj).toEqual({});
    });

    it('bloqueia "prototype" como chave intermediária', () => {
        const obj: Record<string, unknown> = {};
        setNestedError(obj, 'prototype.x', err);
        expect(obj).toEqual({});
    });
});

// ── getNonRepeatableFields ───────────────────────────────────────────────────────

const field = (over: Partial<FormField>): FormField => ({
    id: over.id ?? 'f',
    nome: over.nome ?? 'n',
    label: 'L',
    tipo: FieldType.TEXTO,
    obrigatorio: false,
    tamanho: 12,
    ordem: over.ordem ?? 0,
    ...over,
});

const container = (over: Partial<FormContainer>): FormContainer => ({
    id: over.id ?? 'c',
    titulo: 'T',
    ordem: over.ordem ?? 0,
    campos: over.campos ?? [],
    ...over,
});

describe('getNonRepeatableFields', () => {
    it('filtra containers repeatable e mantém os não-repetíveis', () => {
        const step: FormStep = {
            id: 's',
            titulo: 'S',
            ordem: 0,
            containers: [
                container({ id: 'c1', ordem: 0, campos: [field({ nome: 'a', ordem: 0 })] }),
                container({
                    id: 'c2',
                    ordem: 1,
                    repeatable: true,
                    campos: [field({ nome: 'rep', ordem: 0 })],
                }),
            ],
        };
        const result = getNonRepeatableFields(step);
        expect(result.map((f) => f.nome)).toEqual(['a']);
    });

    it('ordena containers por ordem e campos por ordem dentro deles', () => {
        const step: FormStep = {
            id: 's',
            titulo: 'S',
            ordem: 0,
            containers: [
                container({
                    id: 'c2',
                    ordem: 1,
                    campos: [field({ nome: 'b2', ordem: 1 }), field({ nome: 'b1', ordem: 0 })],
                }),
                container({
                    id: 'c1',
                    ordem: 0,
                    campos: [field({ nome: 'a2', ordem: 1 }), field({ nome: 'a1', ordem: 0 })],
                }),
            ],
        };
        const result = getNonRepeatableFields(step);
        expect(result.map((f) => f.nome)).toEqual(['a1', 'a2', 'b1', 'b2']);
    });

    it('não muta o array original de containers (usa cópia para sort)', () => {
        const containers = [
            container({ id: 'c2', ordem: 1 }),
            container({ id: 'c1', ordem: 0 }),
        ];
        const step: FormStep = { id: 's', titulo: 'S', ordem: 0, containers };
        getNonRepeatableFields(step);
        expect(containers.map((c) => c.id)).toEqual(['c2', 'c1']);
    });

    it('retorna [] quando todos containers são repeatable', () => {
        const step: FormStep = {
            id: 's',
            titulo: 'S',
            ordem: 0,
            containers: [container({ id: 'c1', repeatable: true, campos: [field({ nome: 'x' })] })],
        };
        expect(getNonRepeatableFields(step)).toEqual([]);
    });
});

// ── validateSingleField (função pura, sem RHF/DOM) ───────────────────────────────

describe('validateSingleField', () => {
    it('CHECKBOX obrigatório sem valor → erro; com valor → undefined', () => {
        const f = field({ tipo: FieldType.CHECKBOX, obrigatorio: true });
        expect(validateSingleField(f, false)).toBe('Campo obrigatório');
        expect(validateSingleField(f, true)).toBeUndefined();
    });

    it('SWITCH obrigatório sem valor → erro', () => {
        const f = field({ tipo: FieldType.SWITCH, obrigatorio: true });
        expect(validateSingleField(f, false)).toBe('Campo obrigatório');
    });

    it('SLIDER respeita min/max e trata vazio como sem valor', () => {
        const f = field({ tipo: FieldType.SLIDER, validacao: { min: 5, max: 10 } });
        expect(validateSingleField(f, 4)).toBe('Valor mínimo: 5');
        expect(validateSingleField(f, 11)).toBe('Valor máximo: 10');
        expect(validateSingleField(f, 7)).toBeUndefined();
        expect(validateSingleField(f, '')).toBeUndefined();
        const req = field({ tipo: FieldType.SLIDER, obrigatorio: true });
        expect(validateSingleField(req, null)).toBe('Campo obrigatório');
    });

    it('RATING obrigatório exige nota >= 1', () => {
        const f = field({ tipo: FieldType.RATING, obrigatorio: true });
        expect(validateSingleField(f, 0)).toBe('Avaliação obrigatória');
        expect(validateSingleField(f, 3)).toBeUndefined();
    });

    it('DATE_RANGE valida obrigatoriedade e ordem das datas', () => {
        const f = field({ tipo: FieldType.DATE_RANGE, obrigatorio: true });
        expect(validateSingleField(f, { start: '', end: '' })).toBe('Data inicial obrigatória');
        expect(validateSingleField(f, { start: '2020-01-01' })).toBe('Data final obrigatória');
        expect(validateSingleField(f, { start: '2020-02-01', end: '2020-01-01' })).toBe(
            'A data inicial deve ser menor ou igual à data final',
        );
        expect(validateSingleField(f, { start: '2020-01-01', end: '2020-02-01' })).toBeUndefined();
    });

    it('CHECKBOX_GROUP obrigatório exige ao menos uma opção', () => {
        const f = field({ tipo: FieldType.CHECKBOX_GROUP, obrigatorio: true });
        expect(validateSingleField(f, [])).toBe('Selecione pelo menos uma opção');
        expect(validateSingleField(f, ['a'])).toBeUndefined();
    });

    it('TERMS obrigatório exige valor "accepted"', () => {
        const f = field({ tipo: FieldType.TERMS, obrigatorio: true });
        expect(validateSingleField(f, 'nope')).toBe(
            'Você precisa aceitar os termos para continuar',
        );
        expect(validateSingleField(f, 'accepted')).toBeUndefined();
    });

    it('NUMBER valida numérico e faixa min/max', () => {
        const f = field({ tipo: FieldType.NUMBER, validacao: { min: 1, max: 10 } });
        expect(validateSingleField(f, 'abc')).toBe('Deve ser um número');
        expect(validateSingleField(f, 0)).toBe('Valor mínimo: 1');
        expect(validateSingleField(f, 11)).toBe('Valor máximo: 10');
        expect(validateSingleField(f, 5)).toBeUndefined();
    });

    it('EMAIL inválido → erro; válido → undefined', () => {
        const f = field({ tipo: FieldType.EMAIL });
        expect(validateSingleField(f, 'nao-email')).toBe('E-mail inválido');
        expect(validateSingleField(f, 'a@b.co')).toBeUndefined();
    });

    it('CPF: formato inválido e dígitos inválidos', () => {
        const f = field({ tipo: FieldType.CPF });
        expect(validateSingleField(f, '123')).toBe('CPF inválido');
        expect(validateSingleField(f, '111.111.111-11')).toBe('CPF inválido');
        expect(validateSingleField(f, '529.982.247-25')).toBeUndefined();
    });

    it('TELEFONE e CEP inválidos', () => {
        expect(validateSingleField(field({ tipo: FieldType.TELEFONE }), '1')).toBe(
            'Telefone inválido',
        );
        expect(validateSingleField(field({ tipo: FieldType.CEP }), 'xyz')).toBe('CEP inválido');
    });

    it('campo de texto obrigatório vazio (só espaços) → erro', () => {
        const f = field({ tipo: FieldType.TEXTO, obrigatorio: true });
        expect(validateSingleField(f, '   ')).toBe('Campo obrigatório');
        expect(validateSingleField(f, 'ok')).toBeUndefined();
    });

    it('minLength e maxLength em texto', () => {
        const f = field({ tipo: FieldType.TEXTO, validacao: { minLength: 3, maxLength: 5 } });
        expect(validateSingleField(f, 'ab')).toBe('Mínimo 3 caracteres');
        expect(validateSingleField(f, 'abcdef')).toBe('Máximo 5 caracteres');
        expect(validateSingleField(f, 'abcd')).toBeUndefined();
    });

    it('DATE valida minDate/maxDate por comparação lexicográfica de string', () => {
        const f = field({
            tipo: FieldType.DATE,
            validacao: { minDate: '2020-01-01', maxDate: '2020-12-31' },
        });
        expect(validateSingleField(f, '2019-12-31')).toBe('Data mínima: 2020-01-01');
        expect(validateSingleField(f, '2021-01-01')).toBe('Data máxima: 2020-12-31');
        expect(validateSingleField(f, '2020-06-15')).toBeUndefined();
    });

    it('DATE valida idade mínima usando data de referência de externalData', () => {
        const f = field({ tipo: FieldType.DATE, validacao: { minAge: 18 } });
        // referência fixa para teste determinístico
        const ext = { 'evento.dataInicioEvento': '2020-01-01' };
        expect(validateSingleField(f, '2010-01-01', ext)).toBe('Idade mínima: 18 anos');
        expect(validateSingleField(f, '2000-01-01', ext)).toBeUndefined();
    });

    it('regex customizada inválida usa regexMessage', () => {
        const f = field({
            tipo: FieldType.TEXTO,
            validacao: { regex: '^[0-9]+$', regexMessage: 'Só números' },
        });
        expect(validateSingleField(f, 'abc')).toBe('Só números');
        expect(validateSingleField(f, '123')).toBeUndefined();
    });

    it('regex em formato /.../flags é ignorada (retorna null no compilador)', () => {
        const f = field({
            tipo: FieldType.TEXTO,
            validacao: { regex: '/^[0-9]+$/g', regexMessage: 'x' },
        });
        // padrão delimitado por barras → getCompiledRegex retorna null → sem validação
        expect(validateSingleField(f, 'abc')).toBeUndefined();
    });

    it('campo opcional vazio não dispara nenhuma validação', () => {
        const f = field({ tipo: FieldType.EMAIL, validacao: { minLength: 5 } });
        expect(validateSingleField(f, '')).toBeUndefined();
    });
});
