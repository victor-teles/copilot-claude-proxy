## Context

O projeto hoje é executado principalmente via scripts do monorepo (ex.: `bun run dev:server`) e configuração por `.env`. Isso atende bem ao desenvolvimento local, mas cria atrito para:

- Usuários que querem “só rodar o proxy” sem entender Turbo/Bun workspace.
- Ambientes de CI/CD e deploy, onde flags explícitas são preferíveis.
- Diagnóstico/operabilidade (ex.: validar config efetiva, imprimir URL, validar dependências).

O servidor HTTP é implementado em TypeScript com Bun e Hono, e já possui uma superfície de API compatível com Claude/Anthropic (parcial) via `GET /v1/models` e `POST /v1/messages`.

Restrições/considerações:

- Manter compatibilidade com Bun (runtime principal).
- Evitar alterações de comportamento nas rotas HTTP existentes (não é uma mudança de requisitos de API).
- Configuração deve continuar suportando variáveis de ambiente atuais, com a CLI funcionando como uma camada adicional (flags → env).

## Goals / Non-Goals

**Goals:**

- Fornecer uma CLI para iniciar o proxy (comando `start`) sem depender de scripts internos do monorepo.
- Permitir configuração por flags com fallback para variáveis de ambiente (mínimo: host/porta e `CORS_ORIGIN`).
- Padronizar logs de startup e falhas: informar URL de escuta, config relevante e erros com códigos de saída previsíveis.
- Preparar o `apps/server` para ser “embutido”/reutilizado pela CLI via uma função de bootstrap (se necessário) sem duplicar lógica.

**Non-Goals:**

- Alterar o contrato HTTP da API (rotas, payloads, compatibilidade Anthropic/Claude).
- Implementar uma suite completa de comandos administrativos (ex.: gestão de tokens, UI interativa).
- Resolver instalação/distribuição global em todos os ambientes (o foco é oferecer uma entrada CLI, não um instalador).

## Decisions

- **Estrutura da CLI**: criar um entrypoint dedicado (ex.: um pacote/app de CLI no monorepo) que exponha o comando `start`.
  - *Alternativas*: (a) manter apenas scripts no `package.json`; (b) adicionar um script “wrapper” em JS/TS no root.
  - *Racional*: um entrypoint de CLI permite ergonomia de flags, mensagens de ajuda (`--help`) e uma base para evoluir comandos sem acoplar ao ambiente do monorepo.

- **Parsing de argumentos**: adotar uma biblioteca pequena e estável para parsing (ou implementar parsing mínimo se a dependência não compensar).
  - *Alternativas*: (a) parsing manual; (b) libs de CLI mais completas.
  - *Racional*: reduzir complexidade e dependências, mantendo uma UX consistente (`--host`, `--port`, `--cors-origin`, etc.).

- **Configuração efetiva**: normalizar precedência como `flags > env > defaults`.
  - *Racional*: flags são explícitas para quem está executando no momento; env mantém compatibilidade e facilita deploy.

- **Reuso do servidor**: extrair (se necessário) um “factory”/bootstrap do app Hono para evitar duplicação.
  - *Racional*: a CLI deve apenas inicializar o servidor e configurar runtime (host/porta/cors), sem reimplementar rotas.

- **Erros e códigos de saída**: falhas de configuração (ex.: `CORS_ORIGIN` ausente quando obrigatório) devem falhar rapidamente com mensagem clara e `exitCode` não-zero.
  - *Racional*: previsibilidade para automação (CI, systemd, etc.).

## Risks / Trade-offs

- **Acoplamento a detalhes do monorepo** → Mitigação: encapsular o start do servidor em uma API pública mínima reutilizável pela CLI.
- **Duplicação de validação entre CLI e env parser** → Mitigação: centralizar validação no pacote de env existente, com a CLI apenas mapeando flags para env/config.
- **Aumento de dependências** → Mitigação: escolher biblioteca mínima ou parsing manual limitado ao necessário.
- **Mudanças no fluxo de execução** (ex.: host/porta) podem expor comportamentos não testados → Mitigação: adicionar smoke test/execução automatizada do comando `start` no nível do app.
