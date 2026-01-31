## 1. Estrutura e entrada da CLI

- [x] 1.1 Definir onde a CLI vai viver no monorepo (ex.: `apps/cli` ou `packages/cli`) e como será invocada como `copilot-claude-proxy`
- [x] 1.2 Criar o pacote da CLI com `package.json`, `tsconfig.json` e entrypoint (ex.: `src/index.ts`) compatível com Bun
- [x] 1.3 Configurar `bin`/shebang para expor o executável `copilot-claude-proxy` no workspace
- [x] 1.4 Adicionar comando `--help` (e/ou `help`) imprimindo usage, comandos e opções principais com exit code `0`

## 2. Parsing de argumentos e validação

- [x] 2.1 Implementar parsing do comando `start` e das flags `--host`, `--port`, `--cors-origin` (usando lib pequena ou parsing mínimo)
- [x] 2.2 Implementar precedência `flags > env > defaults` para `host`/`port` e leitura obrigatória de `cors-origin`
- [x] 2.3 Validar porta (numérica, intervalo 1-65535) e falhar rapidamente com mensagem clara e exit code != 0
- [x] 2.4 Validar presença de `CORS_ORIGIN` (via flag ou env) e falhar rapidamente com mensagem clara e exit code != 0

## 3. Reuso do servidor e bootstrap

- [x] 3.1 Identificar o ponto de inicialização atual do servidor em `apps/server` e mapear o que precisa ser reutilizado pela CLI
- [x] 3.2 Extrair uma função de bootstrap/factory pública (ex.: `createServer`/`startServer`) sem alterar rotas/comportamento HTTP
- [x] 3.3 Garantir que a configuração efetiva (host/port/cors) seja aplicada via um único caminho (sem duplicar validações)

## 4. Start do servidor via CLI

- [x] 4.1 Implementar `copilot-claude-proxy start` iniciando o servidor do proxy usando o bootstrap reutilizável
- [x] 4.2 Padronizar logs de startup: imprimir URL efetiva (host+porta) e `CORS_ORIGIN` efetivo
- [x] 4.3 Padronizar logs/erros de falha de inicialização com mensagens claras e códigos de saída previsíveis

## 5. Tooling, smoke e documentação

- [x] 5.1 Adicionar script/target para executar a CLI localmente (ex.: `bun run`), sem depender de scripts internos para usuários finais
- [x] 5.2 Adicionar/atualizar smoke test para validar `--help` e `start` (com e sem `CORS_ORIGIN`) cobrindo casos de sucesso e falha
- [x] 5.3 Atualizar o README com instruções de uso da CLI (incluindo exemplos de flags/env e comportamento de defaults)
