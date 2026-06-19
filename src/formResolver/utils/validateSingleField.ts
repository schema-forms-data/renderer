import { FieldType, type FormField } from '@schema-forms-data/core';
import { CPF_REGEX, TELEFONE_REGEX, CEP_REGEX, EMAIL_REGEX, isValidCpfDigits } from './regexes';

// Cache de RegExp compiladas: evita recompilar a cada keystroke e previne ReDoS por
// padrões complexos compilados repetidamente (o objeto RegExp é compartilhado, não re-criado).
const regexCache = new Map<string, RegExp | null>();
const getCompiledRegex = (pattern: string): RegExp | null => {
    if (regexCache.has(pattern)) return regexCache.get(pattern)!;
    if (/^\/.*\/[gimsuy]*$/.test(pattern)) {
        regexCache.set(pattern, null);
        return null;
    }
    try {
        const re = new RegExp(pattern);
        regexCache.set(pattern, re);
        return re;
    } catch {
        regexCache.set(pattern, null);
        return null;
    }
};

export const validateSingleField = (
    field: FormField,
    rawValue: unknown,
    externalData: Record<string, unknown> = {},
): string | undefined => {
    const v = field.validacao;

    if (field.tipo === FieldType.CHECKBOX) {
        if (field.obrigatorio && !rawValue) return 'Campo obrigatório';
        return undefined;
    }

    if (field.tipo === FieldType.SWITCH) {
        if (field.obrigatorio && !rawValue) return 'Campo obrigatório';
        return undefined;
    }

    if (field.tipo === FieldType.SLIDER) {
        // null e '' devem ser tratados como "sem valor" (não apenas undefined)
        const num = (rawValue !== undefined && rawValue !== null && rawValue !== '') ? Number(rawValue) : NaN;
        if (field.obrigatorio && isNaN(num)) return 'Campo obrigatório';
        if (isNaN(num)) return undefined;
        if (v?.min !== undefined && num < v.min) return `Valor mínimo: ${v.min}`;
        if (v?.max !== undefined && num > v.max) return `Valor máximo: ${v.max}`;
        return undefined;
    }

    if (field.tipo === FieldType.RATING) {
        const num = rawValue !== undefined ? Number(rawValue) : 0;
        if (field.obrigatorio && (!num || num < 1)) return 'Avaliação obrigatória';
        return undefined;
    }

    if (field.tipo === FieldType.DATE_RANGE) {
        const val = rawValue as { start?: string; end?: string } | null | undefined;
        if (field.obrigatorio) {
            if (!val?.start) return 'Data inicial obrigatória';
            if (!val?.end) return 'Data final obrigatória';
        }
        if (val?.start && val?.end && val.start > val.end) {
            return 'A data inicial deve ser menor ou igual à data final';
        }
        return undefined;
    }

    if (field.tipo === FieldType.PARTICIPATION_TYPE) {
        if (!field.obrigatorio) return undefined;
        const val = rawValue as { tipo?: string; data?: string | null; genero?: string | null } | null | undefined;
        if (!val?.tipo) return 'Selecione o tipo de participação';
        if (val.tipo === 'por_dia' && !val.data) return 'Selecione um dia para participar';
        if ('genero' in (val ?? {}) && !val?.genero) return 'Selecione o sexo';
        return undefined;
    }

    if (field.tipo === FieldType.CHECKBOX_GROUP) {
        const arr = Array.isArray(rawValue) ? rawValue : [];
        if (field.obrigatorio && arr.length === 0) return 'Selecione pelo menos uma opção';
        return undefined;
    }

    if (field.tipo === FieldType.FILE) {
        if (field.obrigatorio && !rawValue) return 'Arquivo obrigatório';
        return undefined;
    }

    if (field.tipo === FieldType.TERMS) {
        if (field.obrigatorio && rawValue !== 'accepted')
            return 'Você precisa aceitar os termos para continuar';
        return undefined;
    }

    if (field.tipo === FieldType.NUMBER) {
        const str = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
        if (field.obrigatorio && !str) return 'Campo obrigatório';
        if (!str) return undefined;
        const num = Number(str);
        if (isNaN(num)) return 'Deve ser um número';
        if (v?.min !== undefined && num < v.min) return `Valor mínimo: ${v.min}`;
        if (v?.max !== undefined && num > v.max) return `Valor máximo: ${v.max}`;
        return undefined;
    }

    const str = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';

    if (field.obrigatorio && !str.trim()) return 'Campo obrigatório';
    if (!str) return undefined;

    if (field.tipo === FieldType.EMAIL && !EMAIL_REGEX.test(str)) return 'E-mail inválido';
    if (field.tipo === FieldType.CPF) {
        if (!CPF_REGEX.test(str)) return 'CPF inválido';
        if (!isValidCpfDigits(str)) return 'CPF inválido';
    }
    if (field.tipo === FieldType.TELEFONE && !TELEFONE_REGEX.test(str)) return 'Telefone inválido';
    if (field.tipo === FieldType.CEP && !CEP_REGEX.test(str)) return 'CEP inválido';

    if (v?.minLength && str.length < v.minLength) return `Mínimo ${v.minLength} caracteres`;
    if (v?.maxLength && str.length > v.maxLength) return `Máximo ${v.maxLength} caracteres`;

    if ((field.tipo === FieldType.DATE || field.tipo === FieldType.DATETIME) && str) {
        if (v?.minDate && str < v.minDate) return `Data mínima: ${v.minDate}`;
        if (v?.maxDate && str > v.maxDate) return `Data máxima: ${v.maxDate}`;
    }

    if (
        (field.tipo === FieldType.DATE || field.tipo === FieldType.DATETIME) &&
        str &&
        (v?.minAge != null || v?.maxAge != null)
    ) {
        const datePart = str.split('T')[0];
        const birth = new Date(datePart + 'T00:00:00');
        const eventoDataStr = externalData['evento.dataInicioEvento'] as string | undefined;
        const reference = eventoDataStr
            ? new Date(eventoDataStr.split('T')[0] + 'T00:00:00')
            : new Date();
        let age = reference.getFullYear() - birth.getFullYear();
        const m = reference.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && reference.getDate() < birth.getDate())) age--;
        if (v!.minAge != null && age < v!.minAge)
            return `Idade mínima: ${v!.minAge} ano${v!.minAge !== 1 ? 's' : ''}`;
        if (v!.maxAge != null && age > v!.maxAge)
            return `Idade máxima: ${v!.maxAge} ano${v!.maxAge !== 1 ? 's' : ''}`;
    }

    if (v?.regex) {
        const re = getCompiledRegex(v.regex);
        if (re && !re.test(str)) return v.regexMessage || 'Formato inválido';
    }

    return undefined;
};
