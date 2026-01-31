## Why

Hoje, para subir o proxy, o fluxo recomendado é usar scripts do monorepo (ex.: `bun run dev:server`) e configurar via `.env`. Isso funciona bem para desenvolvimento, mas é pouco amigável para uso “como ferramenta” (ex.: rodar em outra máquina, em CI, ou distribuir para alguém que só quer executar o binário/comando).

Adicionar uma CLI dedicada reduz fricção de adoção, padroniza a configuração (flags + env) e melhora a operabilidade (logs, health, comandos de diagnóstico).

## What Changes

- Adicionar um comando de CLI para iniciar o servidor do proxy sem depender de conhecer os scripts internos do monorepo.
- Suportar configuração via flags (com fallback para variáveis de ambiente), incluindo ao menos host/porta e `CORS_ORIGIN`.
- Padronizar a experiência de execução com mensagens de startup claras (URL, modo/config efetiva) e códigos de saída consistentes em caso de erro.
- Atualizar documentação com o novo fluxo de uso.

## Capabilities

### New Capabilities

- `cli`: Interface de linha de comando para executar o `copilot-claude-proxy` (ex.: `start`) com configuração por flags/env e comandos auxiliares voltados a operabilidade.

### Modified Capabilities

<!-- Nenhuma mudança de requisitos de API Anthropic/Claude; apenas adiciona uma nova forma de inicializar/operar o servidor. -->

## Impact

- `apps/server`: possível refatoração leve para expor uma função de bootstrap reutilizável pela CLI (sem alterar rotas/comportamento HTTP).
- Monorepo tooling: novos scripts/targets no `turbo.json` e/ou `package.json` para build/distribuição do binário.
- Documentação: atualização do README com instruções da CLI.
- Dependências: possível adição de biblioteca de parsing de CLI (ou implementação mínima), mantendo compatibilidade com Bun/TypeScript e padrões do projeto.
