# Cenário e trilhas

## Cenário

Gerado com a ferramenta nativa image_gen a partir das duas imagens de referência do usuário, inspecionado e convertido para WebP para uso na web. O arquivo final é `public/images/studio-roda-v2.webp` (1672 × 941). A imagem preenche o viewport com `object-fit: cover`; a roleta e o painel são componentes interativos sobre o cenário.

As fontes locais Archivo Black e Barlow Condensed reproduzem o estilo pesado da referência visual. Não foi fornecido um arquivo de fonte original. Outfit permanece nos controles e textos corridos.

### Prompt final utilizado

```text
Use case: stylized-concept.
Asset type: production background environment for a fullscreen Brazilian TV game-show web game, landscape 16:9, 2048x1152 or larger.
Primary request: a beautiful high-budget 3D-rendered television game-show set inspired by the Roda a Roda Jequiti / Silvio Santos references. Use the supplied images as visual reference for royal blue puzzle tiles, cyan neon outlines, glossy stage, colorful wheel-show aesthetic, gold and silver fixtures. This is the ENVIRONMENT ONLY; a real interactive wheel and a real interactive letter board will be composited over it in the web app.
Composition: symmetrical frontal wide shot of the entire studio. Keep the central 65 percent of the image uncluttered dark royal navy, with a broad dark recessed area in the upper center reserved for a live puzzle board, and clear space at center bottom for a live large wheel. Curving stepped cobalt-blue stage floor in the bottom quarter with subtle glossy reflections, side staircases and curved tiered cyan LED light strips. Deep royal blue velvet curtains, large golden illuminated arches and chrome trim on the outer edges, magenta and purple lighting on the far left/right wings. Bright spotlights from upper outer corners aimed toward the center, gentle volumetric light, luminous highlights, theatrical depth. Include abstract empty blue puzzle tile motifs on the far side walls, not in the middle.
Style: sophisticated glossy 3D video-game environment, nostalgic Brazilian television spectacle, rich saturated blue and electric cyan with magenta and gold accents, crisp premium materials, strong depth and realistic reflections, dark center for readable interface.
Constraints: no text, no letters, no logos, no people, no actual wheel, no UI controls, no confetti, no watermark. Do not render the reference screenshots literally. The middle remains usable negative space. Full bleed image, no margins, no browser frame.
```

## Áudio local

Trilhas baixadas dos links enviados pelo usuário e convertidas com FFmpeg para MP3 de 160 kbit/s. Os arquivos são servidos pelo próprio site; não há player, iframe ou requisição ao YouTube durante a reprodução.

| Arquivo                   | Origem fornecida                            | Duração  |
| ------------------------- | ------------------------------------------- | -------- |
| `public/audio/intro.mp3`  | https://www.youtube.com/watch?v=BOzaFMFzeJY | 67,029 s |
| `public/audio/roleta.mp3` | https://www.youtube.com/watch?v=290hVMFdonE | 21,073 s |
| `public/audio/resultado.mp3` | https://www.youtube.com/watch?v=hrYwcivPyNA | 8,057 s |

A intro toca em loop; ao sortear, entra a trilha da roleta. Ao revelar o vencedor, toca `public/audio/resultado.mp3` (https://www.youtube.com/watch?v=hrYwcivPyNA). A trilha do resultado toca uma vez e então a intro retorna; avançar para a próxima rodada também retorna à intro. Música e efeitos têm controles separados e começam habilitados; o navegador pode exigir uma primeira interação para liberar a reprodução. O botão Liberar áudio fica disponível nesse caso.
