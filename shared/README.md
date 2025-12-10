# shared

Configs e utilitarios compartilhados para scripts de sala.

## Conteudo

- `config/messages.js`: textos padrao de eventos.
- `config/uniforms.js`: paleta e avatares simbolicos.
- `config/rules.js`: regras e limites padrao.
- `config/stats.js`: toggles de coleta de estatisticas.
- `config/balance.js`: funcoes de pontuacao e split de times.
- `config/constants.js`: enum de posicoes, times e eventos.
- `config/index.js`: reexports para import unico.

## Uso rapido (ESM)

```js
import { messages, rules, scorePlayer } from '../shared/config/index.js';
```
