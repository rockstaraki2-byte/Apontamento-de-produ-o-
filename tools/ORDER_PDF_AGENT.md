# Agente local de exportação de pedidos em PDF

Este agente existe para permitir o fluxo:

ChatGPT -> comando autenticado no GitHub -> agente local no Windows -> Apontamento -> PDF salvo na pasta existente do representante.

## Regras

- Não cria pastas de representantes.
- Procura primeiro por `Pedidos <Representante>` dentro da pasta principal.
- Também reconhece uma pasta cujo nome corresponda ao representante, ignorando acentos, a palavra `Pedidos` e a palavra `Representante`.
- Se a pasta não existir, o pedido é registrado como erro e nada é criado.
- Gera um PDF por pedido, sempre em Folha Inteira.
- Sobrescreve um PDF de mesmo nome.
- Nunca envia para impressora física.
- Só marca o pedido como impresso depois de gravar o arquivo com sucesso.
- Processa um pedido por vez.

## Pasta padrão

`C:\Users\Micro\Documents\Exports Faturamento TekSystem`

## Configuração inicial no computador que fará as exportações

1. Tenha Node.js instalado e o projeto clonado/atualizado.
2. Rode `npm install`.
3. Rode `npm run pdf-agent:setup`.
4. Uma janela do navegador será aberta. Faça login normalmente no Apontamento. O agente guarda somente a sessão do navegador em um perfil local próprio; ele não precisa gravar sua senha em arquivo.
5. Para permitir que o agente publique o resultado de volta no GitHub, use o GitHub CLI autenticado (`gh auth login`) ou defina a variável de ambiente `IMPERIO_PDF_AGENT_GITHUB_TOKEN` com permissão de Issues de leitura/escrita neste repositório.
6. Inicie o agente com `npm run pdf-agent`.

O agente fica verificando novas tarefas a cada 20 segundos por padrão.

## Comando criado pelo ChatGPT

O ChatGPT cria uma Issue no repositório com título iniciado por `[PDF-EXPORT]` e corpo JSON, por exemplo:

```json
{
  "pedidoInicial": 67277,
  "pedidoFinal": 67279,
  "statusImpressao": "Não Impresso",
  "layoutPdf": "folha_inteira",
  "umPedidoPorArquivo": true,
  "imprimirFisicamente": false
}
```

O agente somente aceita tarefas abertas criadas pelo usuário GitHub `rockstaraki2-byte`.

## Retorno

Depois de concluir, o agente comenta na própria Issue um bloco `[PDF-EXPORT-RESULT]` com:

- pedidos processados;
- representante;
- caminho completo do PDF;
- pedidos ignorados e motivo;
- erros.

Em seguida, fecha a Issue.

Isso permite que o ChatGPT consulte o resultado e responda no chat sem precisar de botão dentro do Apontamento.
