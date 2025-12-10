# apps/discord-bot

Ponto de integracao entre o bot Discord e os modulos de sala em ESM.

## Ideia

- Reaproveitar o ControlPanel legado para tokens e autorizacao.
- Mapear comandos para modulos de sala expostos em `rooms/`.
- Adapter `openRoomWithAdapter` espera um `serverAdapter` (ex.: wrapper sobre Server atual) que exponha `open(script, token)`.

## Passos sugeridos

1. Importar `listAvailableRooms()` para popular comandos.
2. Criar um adapter fino sobre `Server` que aceite um script ESM pronto.
3. Expandir para registrar stats no DB usando `database/client.mjs`.
