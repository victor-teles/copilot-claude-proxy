## ADDED Requirements

### Requirement: Disponibilizar uma CLI do copilot-claude-proxy
O projeto DEVE disponibilizar uma interface de linha de comando (CLI) invocável como `copilot-claude-proxy`.

A CLI DEVE expor um comando `start` para iniciar o servidor HTTP do proxy.

#### Scenario: Ajuda da CLI é acessível
- **WHEN** um usuário executa `copilot-claude-proxy --help`
- **THEN** a CLI imprime instruções de uso (usage), lista de comandos disponíveis e opções principais, e finaliza com código de saída `0`

### Requirement: Iniciar o servidor via comando start
Ao executar `copilot-claude-proxy start`, a CLI DEVE iniciar o servidor HTTP do proxy (mesmas rotas e comportamento do servidor existente), sem exigir que o usuário conheça scripts internos do monorepo.

#### Scenario: Startup do servidor com configuração mínima
- **WHEN** um usuário executa `copilot-claude-proxy start` com `CORS_ORIGIN` configurado (via flag ou variável de ambiente)
- **THEN** o servidor inicia e passa a aceitar requisições HTTP nas rotas já suportadas

### Requirement: Suportar configuração por flags com fallback para variáveis de ambiente
O comando `start` DEVE aceitar configuração por flags, com precedência `flags > variáveis de ambiente > defaults`.

No mínimo, o comando `start` DEVE suportar:
- `--host` (fallback: `HOST`, default: `localhost`)
- `--port` (fallback: `PORT`, default: `3000`)
- `--cors-origin` (fallback: `CORS_ORIGIN`, obrigatório)

#### Scenario: Precedência de flags sobre variáveis de ambiente
- **WHEN** `PORT` está definido e o usuário executa `copilot-claude-proxy start --port <valor>`
- **THEN** o servidor escuta na porta informada via flag (e não no valor de `PORT`)

#### Scenario: Defaults são aplicados quando host/port não são informados
- **WHEN** `HOST` e `PORT` não estão definidos e o usuário executa `copilot-claude-proxy start` (com `CORS_ORIGIN` configurado)
- **THEN** o servidor escuta em `localhost:3000`

### Requirement: Validar configuração e falhar com códigos de saída consistentes
A CLI DEVE validar os valores de entrada antes de iniciar o servidor.

Se `CORS_ORIGIN` não estiver definido (nem via `--cors-origin` nem via variável de ambiente), o comando `start` DEVE falhar rapidamente com uma mensagem de erro clara e código de saída diferente de zero.

Se `--port`/`PORT` estiver inválido (não-numérico, fora do intervalo 1-65535), o comando `start` DEVE falhar rapidamente com uma mensagem de erro clara e código de saída diferente de zero.

#### Scenario: Falha quando CORS_ORIGIN está ausente
- **WHEN** um usuário executa `copilot-claude-proxy start` sem `--cors-origin` e sem `CORS_ORIGIN` definido
- **THEN** a CLI imprime um erro indicando que `CORS_ORIGIN` é obrigatório e finaliza com código de saída diferente de zero

#### Scenario: Falha quando porta é inválida
- **WHEN** um usuário executa `copilot-claude-proxy start --port 0`
- **THEN** a CLI imprime um erro indicando que a porta é inválida e finaliza com código de saída diferente de zero

### Requirement: Padronizar logs de startup
Ao iniciar com sucesso, a CLI DEVE imprimir ao menos:
- a URL efetiva de escuta (incluindo host e porta)
- a origem de CORS efetiva (`CORS_ORIGIN`)

#### Scenario: Logs informam URL e CORS efetivos
- **WHEN** `copilot-claude-proxy start` inicia com sucesso
- **THEN** a saída padrão inclui a URL de escuta e o valor efetivo de `CORS_ORIGIN`
