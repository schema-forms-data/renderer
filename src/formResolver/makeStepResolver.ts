import type { Resolver, FieldErrors } from 'react-hook-form';
import { FieldType, type FormStep, validateStepData, evaluateFieldCondition } from '@schema-forms-data/core';
import type { ValidatorMapper } from '../RendererContext';
import { setNestedError } from './utils/setNestedError';
import { runCustomValidators } from './utils/runCustomValidators';

export const makeStepResolver = (
    step: FormStep,
    externalData: Record<string, unknown> = {},
    validatorMapper: ValidatorMapper = {},
): Resolver<Record<string, unknown>> => {
    return async (values) => {
        const errors: Record<string, unknown> = {};

        // ── Validação estrutural via validateStepData (core) ──────────────────
        // Respeita condicionais AND/OR, valida todos os tipos de campo.
        const { errors: structErrors } = validateStepData(step, values, externalData);
        for (const e of structErrors) {
            // FIELD_ARRAY sub-fields usam path "array[i].campo" → converter para "array.i.campo"
            const path = e.campo.replace(/\[(\d+)\]/g, '.$1');
            setNestedError(errors, path, { type: 'custom', message: e.message });
        }

        // ── Custom validators (validatorMapper) — campos simples ──────────────
        const sortedContainers = [...step.containers].sort((a, b) => a.ordem - b.ordem);

        for (const container of sortedContainers) {
            if (container.repeatable) continue;
            if (!evaluateFieldCondition(container.condicional, values, externalData)) continue;

            for (const field of container.campos) {
                if (field.tipo === FieldType.HIDDEN || field.isDisabled || field.isReadOnly) continue;
                if (!evaluateFieldCondition(field.condicional, values, externalData)) continue;

                if (field.tipo === FieldType.FIELD_ARRAY) {
                    const items = Array.isArray(values[field.nome])
                        ? (values[field.nome] as Record<string, unknown>[])
                        : [];
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        for (const subField of (field.subFields ?? [])) {
                            if (subField.isDisabled || subField.isReadOnly) continue;
                            if (!evaluateFieldCondition(subField.condicional, item, externalData)) continue;
                            if (!subField.validate?.length) continue;
                            if (errors[`${field.nome}.${i}.${subField.nome}`]) continue;
                            const customErr = await runCustomValidators(
                                subField.validate, subField.nome, item[subField.nome], item, externalData, validatorMapper,
                            );
                            if (customErr) {
                                setNestedError(errors, `${field.nome}.${i}.${subField.nome}`, { type: 'custom', message: customErr });
                            }
                        }
                    }
                    continue;
                }

                if (field.tipo === FieldType.SUB_FORM) {
                    const subValues = (values[field.nome] as Record<string, unknown> | null | undefined) ?? {};
                    for (const subField of (field.subSchema?.fields ?? [])) {
                        if (subField.isDisabled || subField.isReadOnly) continue;
                        if (!subField.validate?.length) continue;
                        if (errors[`${field.nome}.${subField.nome}`]) continue;
                        const customErr = await runCustomValidators(
                            subField.validate, subField.nome, subValues[subField.nome], subValues, externalData, validatorMapper,
                        );
                        if (customErr) setNestedError(errors, `${field.nome}.${subField.nome}`, { type: 'custom', message: customErr });
                    }
                    continue;
                }

                if (!field.validate?.length || errors[field.nome]) continue;
                const customErr = await runCustomValidators(
                    field.validate, field.nome, values[field.nome], values, externalData, validatorMapper,
                );
                if (customErr) errors[field.nome] = { type: 'custom', message: customErr };
            }
        }

        // ── Containers repetíveis ─────────────────────────────────────────────
        for (const container of sortedContainers) {
            if (!container.repeatable || !container.nome) continue;
            if (!evaluateFieldCondition(container.condicional, values, externalData)) continue;

            const items = Array.isArray(values[container.nome])
                ? (values[container.nome] as Record<string, unknown>[])
                : [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                for (const field of container.campos) {
                    if (field.tipo === FieldType.HIDDEN || field.isDisabled || field.isReadOnly) continue;
                    if (!evaluateFieldCondition(field.condicional, item, externalData)) continue;
                    if (!field.validate?.length) continue;
                    if (errors[`${container.nome}.${i}.${field.nome}`]) continue;
                    const customErr = await runCustomValidators(
                        field.validate, field.nome, item[field.nome], item, externalData, validatorMapper,
                    );
                    if (customErr) {
                        setNestedError(errors, `${container.nome}.${i}.${field.nome}`, { type: 'custom', message: customErr });
                    }
                }
            }
        }

        const hasErrors = Object.keys(errors).length > 0;
        if (hasErrors) {
            return { values: {}, errors: errors as FieldErrors<Record<string, unknown>> };
        }
        return { values, errors: {} };
    };
};
