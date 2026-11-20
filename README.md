# Caderno de Lembretes — Integração Front-end, Back-end e Estilização

Trabalho bimestral de Programação III (UMFG). Front-end em HTML, CSS e JavaScript puro que consome a Minimal API de lembretes fornecida pelo professor.

## Estrutura

```
index.html        → página da aplicação
css/style.css     → estilização própria (tema "papelaria")
js/app.js         → comunicação com a API (fetch) e regras da tela
api/Program.cs    → Program.cs da API do professor, com a correção da ordenação
```

A API completa é a do professor (https://github.com/leicam/umfg-programacao-iii-minimal-api-2026); basta substituir o `Program.cs` dela pelo `api/Program.cs` deste repositório.

## Como executar

1. **API** — clone a API do professor, substitua o `Program.cs` pelo deste repositório e abra o `.sln` no Visual Studio (ou rode `dotnet run --launch-profile https` na pasta do projeto). Configure a `ConnectionString` do MySQL no `appsettings` do ambiente usado.
2. **Front-end** — abra o `index.html` no navegador (ou use a extensão *Live Server* do VS Code).
3. A URL da API fica no topo de `js/app.js` (`API_URL = "https://localhost:7063"`). Se usar o perfil `http`, troque para `http://localhost:5207`.

> Se o navegador bloquear o certificado HTTPS de desenvolvimento, rode `dotnet dev-certs https --trust` ou acesse `https://localhost:7063/lembretes` uma vez e aceite o certificado.

## Etapa 1 — Estrutura do projeto

- **Front-end:** uma página com cabeçalho, painel de filtros, tabela (grid) com paginação e dois modais (`<dialog>`) — um para cadastro/edição e outro para confirmar a exclusão.
- **Comunicação:** todas as chamadas passam pela função `requisitar()` em `app.js`, que usa `fetch`, diferencia **erro de rede** (API fora do ar) de **erro HTTP** (404, 400, 500) e trata o JSON da resposta.

Endpoints da API:

| Método | Rota | Uso no front-end |
|---|---|---|
| GET | `/lembretes` | lista todos os ativos (não usado na grid, que usa o filtro) |
| GET | `/lembretes/filtro` | grid com filtros, paginação e ordenação |
| GET | `/lembretes/{id}` | carregar o lembrete ao clicar em **Editar** |
| POST | `/lembretes` | cadastrar (**Novo lembrete**) |
| PUT | `/lembretes/{id}` | salvar a edição |
| DELETE | `/lembretes/{id}` | excluir (exclusão lógica: `IsAtivo = false`) |
| GET | `/lembretes/imprimir` | gerar o PDF com os mesmos filtros da tela |

## Etapa 2 — Requisições HTTP

Todas as operações (GET, GET por ID, POST, PUT e DELETE) estão ligadas a botões da interface.

## Etapa 3 — CORS

O navegador considera "origem" a combinação **protocolo + domínio + porta**. O front-end roda em uma origem (ex.: `http://127.0.0.1:5500` ou `file://`) e a API em outra (`https://localhost:7063`). Por segurança, o navegador bloqueia respostas de outra origem, a menos que o servidor autorize com o cabeçalho `Access-Control-Allow-Origin`.

Para requisições com `Content-Type: application/json` (POST/PUT) ou métodos como PUT/DELETE, o navegador ainda envia antes uma requisição **preflight** (`OPTIONS`) perguntando se o método e os cabeçalhos são permitidos.

Na API, a política `"Frontend"` usa `AllowAnyOrigin()`, `AllowAnyHeader()` e `AllowAnyMethod()` e é ativada com `app.UseCors("Frontend")`. Isso é adequado para desenvolvimento; em produção o correto é restringir com `.WithOrigins("https://dominio-do-front")`.

## Etapa 4 — Estilização

Tema próprio inspirado em papelaria: fundo creme pontilhado, verde-floresta e mostarda, títulos em *Fraunces* e textos em *Work Sans*. Botões arredondados com sombra deslocada, status em etiquetas, linhas zebradas com destaque ao passar o mouse e toasts coloridos por tipo.

**Responsividade:** abaixo de 960 px os filtros vão para cima da lista; abaixo de 680 px a tabela vira uma lista de cartões, mantendo a ordenação pelos títulos das colunas.

## Etapa 5 — Filtros

Descrição, data de cadastro inicial e final, data de atualização inicial e final. A tela valida se a data inicial não é maior que a final antes de enviar.

Observação: no DTO da API, os valores padrão de `DataCadastroFinal` (`MinValue`) e `DataAtualizacaoInicial` (`MaxValue`) fazem o filtro retornar vazio quando esses campos não são enviados. Por isso o front-end sempre envia as quatro datas, usando `1900-01-01` e `2999-12-31` quando o campo fica em branco.

## Etapa 6 — Paginação e ordenação

- Paginação com primeira, anterior, números de página, próxima e última, além de "Exibindo X–Y de N registros".
- Quantidade por página: 5, 10, 20 ou 50.
- Ordenação ao clicar no título das colunas **Descrição**, **Cadastro** e **Atualização**; clicar de novo inverte a direção (▲ ASC / ▼ DESC).

**Correção na API:** o método `FiltrarLembretes` fazia `query.OrderBy(x => dto.Ordem)`, ou seja, ordenava por um texto constante e a ordenação não tinha efeito. Ele foi trocado por um `switch` que mapeia `Descricao`, `DataCadastro` e `DataAtualizacao` para as propriedades da entidade.

## Etapa 7 — Validação no DevTools

Na aba **Network** (F12) é possível ver, para cada ação, o método, a URL com a query string (`NumeroPagina`, `TamanhoPagina`, `Ordem`, `Direcao`, `Descricao` e as datas), os cabeçalhos (`Content-Type: application/json` no POST/PUT; `Access-Control-Allow-Origin` na resposta), o corpo enviado (`{"descricao": "..."}`) e a resposta. Os parâmetros de cada consulta também aparecem no **Console**.

## Etapa 8 — Erros e usabilidade

- **Erro de comunicação com a API:** faixa de aviso com botão "Tentar novamente", mais um toast.
- **Nenhum registro encontrado:** mensagem na grid.
- **Campo obrigatório:** a descrição vazia é destacada com uma mensagem abaixo do campo, além do contador de caracteres (máx. 500).
- **Período inválido nos filtros:** mensagem abaixo das datas.
- **Sucesso:** toasts verdes ao cadastrar, editar, excluir e gerar o PDF.
- A descrição é exibida com `textContent`, o que impede que um HTML digitado seja executado (XSS).

## Etapa 9 — Testes realizados

Cadastro, consulta, edição, exclusão, cada filtro, validação de período, paginação (primeira/anterior/próxima/última/tamanho), ordenação nas três colunas, estado vazio, API fora do ar e layout em celular (390 px) sem rolagem horizontal.
