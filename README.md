# @schema-forms-data/renderer

> Renderizador de formulários SchemaForms — transforma um `FormSchema` em um formulário multi-step funcional com react-hook-form.

[![npm](https://img.shields.io/npm/v/@schema-forms-data/renderer)](https://www.npmjs.com/package/@schema-forms-data/renderer)
[![license](https://img.shields.io/npm/l/@schema-forms-data/renderer)](./LICENSE)

O componente principal do ecossistema para quem só precisa **renderizar** formulários (sem o builder visual). Inclui validação com Zod, lógica condicional de campos e mais de 20 tipos de campo.

## Install

```bash
pnpm add @schema-forms-data/renderer
```

## O que inclui

- **`FormRenderer`** — componente principal multi-step
- **`StepRenderer` / `ContainerRenderer`** — renderização granular por step/container
- **`FormSpy`** — observa o estado do formulário em tempo real
- **`FormApiContext`** — controle programático do formulário
- **20+ componentes de campo:** `DFTextField`, `DFSelect`, `DFCheckbox`, `DFRadioGroup`, `DFDateField`, `DFDateRange`, `DFFileUpload`, `DFColorPicker`, `DFRating`, `DFSlider`, `DFCepField`, `DFPaymentMethod`, `DFParticipationType`, `DFSubForm`, e mais
- Validação com **Zod** e **react-hook-form**

## Peer dependencies

```bash
pnpm add react react-dom react-hook-form lucide-react
```

## Dependências em outros pacotes

| Depende de | Motivo |
|---|---|
| `@schema-forms-data/core` | Tipos `FormSchema`, `FieldType`, utilitários de validação |
| `@schema-forms-data/templates` | Sistema de temas/CSS variables |
| `@schema-forms-data/ui` | Componentes UI (Input, Select, Dialog, etc.) |

> Ao instalar `@schema-forms-data/renderer`, as três dependências acima já vêm automaticamente.

## Uso

```tsx
import { FormRenderer } from '@schema-forms-data/renderer';
import '@schema-forms-data/ui/style.css';

<FormRenderer
  schema={mySchema}
  onSubmit={(data) => console.log(data)}
/>
```

---

## Build

```bash
pnpm install
pnpm build      # tsc -> dist/
```

## Publicar

Automático: a cada **push na `main`**, o workflow (`.github/workflows/publish.yml`)
publica **somente se a versão do `package.json` ainda não existir no npm**. Push de
README/refactor não republica nada — pra lançar, basta dar bump na versão:

```bash
npm version patch        # 4.0.7 -> 4.0.8 (faz commit + tag)
git push --follow-tags   # push na main dispara o publish da nova versão
```

Usa **npm Trusted Publishing (OIDC)** — sem `NPM_TOKEN` armazenado — e anexa
**provenance** automaticamente.

> Primeira publicação: o Trusted Publisher do npm precisa do pacote já existindo.
> Faça a versão inicial uma vez manualmente (`npm publish`), depois configure o Trusted
> Publisher no npmjs.com e deixe o restante por conta do workflow.

## Licença

[MIT](LICENSE) © Inovex Tecnologia
