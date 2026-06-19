// Sistema de interpolação de variáveis de template
//
// Substitui ocorrências de {{event.x}} ou {{evento.x}} por valores do mapa de variáveis.
//
// Sintaxe aceita:
//   {{event.nome}}              → vars['evento.nome']
//   {{evento.nome}}             → vars['evento.nome']
//   {{evento.dataInicioEvento}} → vars['evento.dataInicioEvento']

import type { FormField, FormContainer, FormStep, FieldOption } from '@schema-forms-data/core';


const VAR_REGEX = /\{\{\s*(?:event|evento)\.([a-zA-Z0-9_.]+)\s*\}\}/g;

export const interpolate = (text: string | undefined | null, vars: Record<string, string>): string => {
    if (!text) return text ?? '';
    return text.replace(VAR_REGEX, (_match, key: string) => {
        return vars[`evento.${key}`] ?? vars[key] ?? _match;
    });
};

const interpolateOption = (opt: FieldOption, vars: Record<string, string>): FieldOption => ({
    ...opt,
    label: interpolate(opt.label, vars),
});

export const interpolateField = (field: FormField, vars: Record<string, string>): FormField => ({
    ...field,
    label: interpolate(field.label, vars),
    placeholder: interpolate(field.placeholder, vars),
    hint: interpolate(field.hint, vars),
    defaultValue:
        typeof field.defaultValue === 'string'
            ? interpolate(field.defaultValue, vars)
            : field.defaultValue,
    opcoes: field.opcoes?.map((opt) => interpolateOption(opt, vars)),
});

export const interpolateContainer = (container: FormContainer, vars: Record<string, string>): FormContainer => ({
    ...container,
    titulo: interpolate(container.titulo, vars),
    descricao: interpolate(container.descricao, vars),
    campos: container.campos.map((field) => interpolateField(field, vars)),
});

export const interpolateStep = (step: FormStep, vars: Record<string, string>): FormStep => ({
    ...step,
    titulo: interpolate(step.titulo, vars),
    descricao: interpolate(step.descricao, vars),
    containers: step.containers.map((container) => interpolateContainer(container, vars)),
});
