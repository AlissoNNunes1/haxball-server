//Arquivo principal do bot CIRS Stadium

const { Game } = require('./cirs-rules.cjs');
const { getRealSoccerMap } = require('./maps.cjs');
const { announce, whisper } = require('./cirs-messages.cjs');
const { sleep } = require('./utils.cjs');
const {
  roomName,
  roomPassword,
  maxPlayers,
  roomPublic,
  token,
  gameTime,
} = require('./variables.cjs');

// Import handlers
require('./cirs-handlers.cjs');

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

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
