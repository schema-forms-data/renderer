import type { FieldValidatorConfig } from '@schema-forms-data/core';
import type { ValidatorMapper } from '../../RendererContext';

/**
 * Executa um array de `FieldValidatorConfig` sequencialmente.
 * Retorna a primeira mensagem de erro encontrada, ou `undefined` se tudo ok.
 */
export const runCustomValidators = async (
    configs: FieldValidatorConfig[],
    _fieldName: string,
    value: unknown,
    allValues: Record<string, unknown>,
    externalData: Record<string, unknown>,
    validatorMapper: ValidatorMapper,
): Promise<string | undefined> => {
    for (const cfg of configs) {
        const fn = validatorMapper[cfg.type];
        if (!fn) continue;
        const msg = await fn(value, allValues, cfg, externalData);
        if (msg) return cfg.message ?? msg;
    }
    return undefined;
};
