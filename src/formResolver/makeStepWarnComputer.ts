import type { FormStep } from '@schema-forms-data/core';
import type { ValidatorMapper } from '../RendererContext';
import { evaluateFieldCondition } from '@schema-forms-data/core';
import { runCustomValidators } from './utils/runCustomValidators';

/**
 * Retorna uma função que computa os avisos (`warn`) de todos os campos do step.
 * Os avisos não bloqueiam o submit — são apenas informativos.
 * Chame o resultado com os valores do form para obter `Record<fieldName, warnMessage>`.
 */
export const makeStepWarnComputer = (
    step: FormStep,
    externalData: Record<string, unknown> = {},
    validatorMapper: ValidatorMapper = {},
) => async (values: Record<string, unknown>): Promise<Record<string, string>> => {
    const warnings: Record<string, string> = {};
    const sortedContainers = [...step.containers].sort((a, b) => a.ordem - b.ordem);

    for (const container of sortedContainers) {
        // Pula o container inteiro se a condicional do container não for satisfeita
        if (
            container.condicional &&
            !evaluateFieldCondition(container.condicional, values, externalData)
        ) continue;

        // Containers repetíveis: avalia warn por item
        if (container.repeatable && container.nome) {
            const items = Array.isArray(values[container.nome])
                ? (values[container.nome] as Record<string, unknown>[])
                : [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                for (const field of [...container.campos].sort((a, b) => a.ordem - b.ordem)) {
                    if (!field.warn?.length) continue;
                    const visible = evaluateFieldCondition(field.condicional, item, externalData);
                    if (!visible) continue;
                    const msg = await runCustomValidators(
                        field.warn, field.nome, item[field.nome], item, externalData, validatorMapper,
                    );
                    if (msg) warnings[`${container.nome}.${i}.${field.nome}`] = msg;
                }
            }
            continue;
        }

        for (const field of [...container.campos].sort((a, b) => a.ordem - b.ordem)) {
            if (!field.warn?.length) continue;
            const visible = evaluateFieldCondition(field.condicional, values, externalData);
            if (!visible) continue;

            const msg = await runCustomValidators(
                field.warn, field.nome, values[field.nome], values, externalData, validatorMapper,
            );
            if (msg) warnings[field.nome] = msg;
        }
    }

    return warnings;
};
