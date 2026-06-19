import type { FormStep, FormField } from '@schema-forms-data/core';

export const getNonRepeatableFields = (step: FormStep): FormField[] =>
    [...step.containers]
        .sort((a, b) => a.ordem - b.ordem)
        .filter((c) => !c.repeatable)
        .flatMap((c) => [...c.campos].sort((a, b) => a.ordem - b.ordem));
