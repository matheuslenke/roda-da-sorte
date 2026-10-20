# Roda da Comunidade

Sorteador web inspirado nos programas de auditório brasileiros. React, TypeScript e Vite, sem backend ou integrações externas de participantes nesta versão.

## Rodar

```sh
npm install
npm run dev
```

`npm test` valida CSV, duplicados, exportação, seleção aleatória e alinhamento da roleta. `npm run build` verifica os tipos e gera `dist/`.

## Recursos

- Lista inicial de 16 nomes; cadastro individual, lista com um nome por linha e CSV com vírgula ou ponto e vírgula.
- Até 300 participantes, nomes de até 80 caracteres, duplicados ignorados por espaços, caixa e acentos.
- Sorteio uniforme com `crypto.getRandomValues` e rejection sampling; a roleta apresenta o resultado escolhido e para no centro do segmento correto.
- Resultado salvo em `localStorage` antes da animação, histórico e exportação CSV. O histórico é local, não é uma auditoria externa e pode ser alterado pelo dono do navegador.
- Exclusão opcional de vencedores, suspense de 5/8/12 segundos, painel de letras, confetes, modo apresentação e respeito a movimento reduzido.
- Efeitos sonoros sintetizados opcionais. As duas trilhas indicadas são incorporadas do YouTube em um player visível; dependem da disponibilidade, conexão, regras de autoplay e políticas do YouTube. Nenhum áudio foi extraído ou redistribuído.

Os dados ficam somente no navegador. Para conservar os resultados fora dele, exporte o histórico. Integrações e sincronização entre dispositivos ficam para uma próxima versão.

Homenagem independente, sem afiliação ao SBT ou à Jequiti.
