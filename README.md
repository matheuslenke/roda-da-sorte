# Roda da Comunidade

Sorteador web inspirado nos programas de auditório brasileiros. React, TypeScript e Vite, sem backend ou integrações externas de participantes nesta versão.

## Rodar

```sh
npm install
npm run dev
```

`npm test` valida CSV, duplicados, exportação, painel, seleção aleatória, agrupamento e alinhamento da roleta. `npm run build` verifica os tipos e gera `dist/`.

Para testar 500 participantes sem alterar a lista nem o histórico reais, abra `http://127.0.0.1:5173/?demo=500` no servidor de desenvolvimento. Essa demonstração é temporária e fica desativada no build de produção.

## Recursos

- Lista inicial de 16 nomes; cadastro individual, lista com um nome por linha e CSV com vírgula ou ponto e vírgula.
- Até 1.000 participantes, nomes de até 80 caracteres, duplicados ignorados por espaços, caixa e acentos.
- Sorteio uniforme com `crypto.getRandomValues` e rejection sampling; a roleta apresenta o resultado escolhido e para no centro do segmento correto.
- Acima de 48 nomes, a apresentação mostra primeiro o grupo e depois a pessoa, com até 25 pessoas por grupo. O vencedor é escolhido uma única vez no conjunto completo; os grupos não alteram a probabilidade individual. Fatias de grupos são proporcionais ao número de pessoas, inclusive com grupos incompletos.
- Resultado salvo em `localStorage` antes da animação, histórico e exportação CSV. O histórico é local, não é uma auditoria externa e pode ser alterado pelo dono do navegador.
- Exclusão opcional de vencedores, suspense de 5/8/12 segundos, painel de letras, confetes, modo apresentação e respeito a movimento reduzido.
- Roleta 3D em Three.js com aro, pinos, luzes e espessura. Arraste para orbitar, use as setas do teclado ou restaure o ângulo inicial. O Play central acompanha a projeção da peça em 3D. Há fallback em SVG para dispositivos sem WebGL e recuperação de perda de contexto.
- Cenário gerado em WebP preenchendo a tela, painel compacto lateral, controles nas laterais, fontes locais e modo de apresentação com fullscreen nativo quando disponível.
- Efeitos sonoros ativados por padrão, com botão dedicado e independente da música. As duas trilhas enviadas pelo usuário estão em `public/audio/intro.mp3` e `public/audio/roleta.mp3`. A intro toca no início e a trilha da roleta entra automaticamente durante o sorteio. Não há player externo. O navegador pode exigir a primeira interação para liberar áudio.

O prompt final do cenário, as fontes e as origens das trilhas estão em [docs/studio-assets.md](docs/studio-assets.md).

Os dados ficam somente no navegador. Para conservar os resultados fora dele, exporte o histórico. Integrações e sincronização entre dispositivos ficam para uma próxima versão.

Homenagem independente, sem afiliação ao SBT ou à Jequiti.

Modos do mouse: **Explorar 3D** altera o ângulo; **Girar arrastando** permite segurar uma borda e soltá-la para iniciar o sorteio. O gesto define só a direção da animação; o vencedor continua uniforme via Web Crypto. A trilha `public/audio/resultado.mp3` toca na comemoração e, ao terminar, a intro retorna.
