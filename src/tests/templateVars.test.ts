import { describe, it, expect } from 'vitest';
import type { FormField, FormContainer, FormStep } from '@schema-forms-data/core';
import { FieldType } from '@schema-forms-data/core';
import {
    interpolate,
    interpolateField,
    interpolateContainer,
    interpolateStep,
} from '../utils/templateVars';

// VAR_REGEX = /\{\{\s*(?:event|evento)\.([a-zA-Z0-9_.]+)\s*\}\}/g
// replacement: vars[`evento.${key}`] ?? vars[key] ?? _match

describe('interpolate', () => {
    it('substitui {{evento.x}} pelo valor de vars["evento.x"]', () => {
        expect(interpolate('Olá {{evento.nome}}', { 'evento.nome': 'Festa' })).toBe('Olá Festa');
    });

    it('aceita o prefixo "event." tratando como "evento." na lookup', () => {
        // a chave capturada é "nome"; procura vars["evento.nome"] primeiro
        expect(interpolate('{{event.nome}}', { 'evento.nome': 'X' })).toBe('X');
    });

    it('faz fallback para vars[key] quando vars["evento.key"] ausente', () => {
        expect(interpolate('{{evento.nome}}', { nome: 'Y' })).toBe('Y');
    });

    it('prioriza vars["evento.key"] sobre vars[key]', () => {
        expect(interpolate('{{evento.nome}}', { 'evento.nome': 'A', nome: 'B' })).toBe('A');
    });

    it('mantém o match literal quando a variável não existe', () => {
        expect(interpolate('{{evento.nome}}', {})).toBe('{{evento.nome}}');
    });

    it('tolera espaços internos {{  evento.nome  }}', () => {
        expect(interpolate('{{  evento.nome  }}', { 'evento.nome': 'Z' })).toBe('Z');
    });

    it('suporta chaves com pontos (aninhadas)', () => {
        expect(interpolate('{{evento.endereco.cidade}}', { 'evento.endereco.cidade': 'SP' })).toBe(
            'SP',
        );
    });

    it('substitui múltiplas ocorrências (flag global)', () => {
        expect(
            interpolate('{{evento.a}} e {{evento.b}}', { 'evento.a': '1', 'evento.b': '2' }),
        ).toBe('1 e 2');
    });

    it('não altera texto sem placeholders', () => {
        expect(interpolate('texto simples', { x: 'y' })).toBe('texto simples');
    });

    it('ignora prefixos diferentes de event/evento', () => {
        expect(interpolate('{{outro.nome}}', { 'outro.nome': 'X' })).toBe('{{outro.nome}}');
    });

    it('retorna string vazia para text vazio/null/undefined', () => {
        expect(interpolate('', { x: 'y' })).toBe('');
        expect(interpolate(null, {})).toBe('');
        expect(interpolate(undefined, {})).toBe('');
    });

    it('substitui valor vazio quando vars contém string vazia', () => {
        // '' ?? ... → '' é falsy mas não nullish, então usa a string vazia
        expect(interpolate('[{{evento.nome}}]', { 'evento.nome': '' })).toBe('[]');
    });
});

// ── fixtures tipadas ──────────────────────────────────────────────────────────

const makeField = (over: Partial<FormField> = {}): FormField => ({
    id: 'f1',
    nome: 'campo',
    label: '{{evento.nome}}',
    tipo: FieldType.TEXTO,
    obrigatorio: false,
    tamanho: 12,
    ordem: 0,
    ...over,
});

describe('interpolateField', () => {
    it('interpola label, placeholder e hint', () => {
        const out = interpolateField(
            makeField({
                label: 'Label {{evento.nome}}',
                placeholder: 'Place {{evento.nome}}',
                hint: 'Hint {{evento.nome}}',
            }),
            { 'evento.nome': 'X' },
        );
        expect(out.label).toBe('Label X');
        expect(out.placeholder).toBe('Place X');
        expect(out.hint).toBe('Hint X');
    });

    it('placeholder/hint indefinidos viram string vazia (interpolate de undefined)', () => {
        const out = interpolateField(makeField({ placeholder: undefined, hint: undefined }), {});
        expect(out.placeholder).toBe('');
        expect(out.hint).toBe('');
    });

    it('interpola defaultValue apenas quando for string', () => {
        const strOut = interpolateField(makeField({ defaultValue: '{{evento.nome}}' }), {
            'evento.nome': 'D',
        });
        expect(strOut.defaultValue).toBe('D');

        const numOut = interpolateField(makeField({ defaultValue: 42 }), {});
        expect(numOut.defaultValue).toBe(42);

        const boolOut = interpolateField(makeField({ defaultValue: true }), {});
        expect(boolOut.defaultValue).toBe(true);
    });

    it('interpola labels das opcoes preservando outras props', () => {
        const out = interpolateField(
            makeField({
                opcoes: [
                    { valor: 'a', label: '{{evento.nome}}', disabled: true },
                    { valor: 'b', label: 'fixo' },
                ],
            }),
            { 'evento.nome': 'OP' },
        );
        expect(out.opcoes).toEqual([
            { valor: 'a', label: 'OP', disabled: true },
            { valor: 'b', label: 'fixo' },
        ]);
    });

    it('opcoes undefined permanece undefined', () => {
        const out = interpolateField(makeField({ opcoes: undefined }), {});
        expect(out.opcoes).toBeUndefined();
    });

    it('preserva campos não interpolados (id, nome, tipo)', () => {
        const out = interpolateField(makeField({ id: 'X1', nome: 'meu', tipo: FieldType.EMAIL }), {});
        expect(out.id).toBe('X1');
        expect(out.nome).toBe('meu');
        expect(out.tipo).toBe(FieldType.EMAIL);
    });
});

const makeContainer = (over: Partial<FormContainer> = {}): FormContainer => ({
    id: 'c1',
    titulo: '{{evento.nome}}',
    ordem: 0,
    campos: [],
    ...over,
});

describe('interpolateContainer', () => {
    it('interpola titulo e descricao e os campos', () => {
        const out = interpolateContainer(
            makeContainer({
                titulo: 'T {{evento.nome}}',
                descricao: 'D {{evento.nome}}',
                campos: [makeField({ label: 'L {{evento.nome}}' })],
            }),
            { 'evento.nome': 'X' },
        );
        expect(out.titulo).toBe('T X');
        expect(out.descricao).toBe('D X');
        expect(out.campos[0]!.label).toBe('L X');
    });

    it('descricao undefined vira string vazia', () => {
        const out = interpolateContainer(makeContainer({ descricao: undefined }), {});
        expect(out.descricao).toBe('');
    });
});

const makeStep = (over: Partial<FormStep> = {}): FormStep => ({
    id: 's1',
    titulo: '{{evento.nome}}',
    ordem: 0,
    containers: [],
    ...over,
});

describe('interpolateStep', () => {
    it('interpola titulo, descricao e containers recursivamente', () => {
        const out = interpolateStep(
            makeStep({
                titulo: 'S {{evento.nome}}',
                descricao: 'SD {{evento.nome}}',
                containers: [
                    makeContainer({
                        titulo: 'C {{evento.nome}}',
                        campos: [makeField({ label: 'F {{evento.nome}}' })],
                    }),
                ],
            }),
            { 'evento.nome': 'X' },
        );
        expect(out.titulo).toBe('S X');
        expect(out.descricao).toBe('SD X');
        expect(out.containers[0]!.titulo).toBe('C X');
        expect(out.containers[0]!.campos[0]!.label).toBe('F X');
    });

    it('descricao undefined vira string vazia', () => {
        const out = interpolateStep(makeStep({ descricao: undefined }), {});
        expect(out.descricao).toBe('');
    });
});
