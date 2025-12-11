//Arquivo principal do bot CIRS Stadium

const { Game } = require('../shared/config/cirs-rules.cjs');
const { getRealSoccerMap } = require('../shared/config/maps.cjs');
const { announce, whisper } = require('../shared/config/cirs-messages.cjs');
const { sleep } = require('../shared/config/utils.cjs');
const {
  roomName,
  roomPassword,
  maxPlayers,
  roomPublic,
  token,
  gameTime,
} = require('../shared/config/variables.cjs');

// Cria a sala PRIMEIRO antes de definir handlers
if (typeof HBInit === 'function' && typeof room === 'undefined') {
  room = HBInit({
    roomName: roomName,
    password: roomPassword,
    maxPlayers: maxPlayers,
    public: roomPublic,
    token: token,
    noPlayer: true,
    geo: { code: 'BR', lat: -23.5505, lon: -46.6333 },
  });

  room.setCustomStadium(getRealSoccerMap());
  room.setScoreLimit(0);
  room.setTimeLimit(gameTime);
}

// DEPOIS importa handlers (ja inclui commands.cjs com autenticacao)
require('../shared/config/cirs-handlers.cjs');

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
