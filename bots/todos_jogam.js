//Arquivo principal do bot Todos Jogam
//Sala futsal sem restricoes - todos podem jogar

const { getFutsalMap } = require('../shared/config/maps.cjs');
const {
  roomName,
  roomPassword,
  maxPlayers,
  roomPublic,
  token,
} = require('../shared/config/variables.cjs');

// Cria a sala PRIMEIRO antes de definir handlers
room = HBInit({
  roomName: 'Todos Jogam - Futsal',
  password: '',
  maxPlayers: 16,
  public: true,
  token: token,
  noPlayer: true,
  geo: { code: 'BR', lat: -23.5505, lon: -46.6333 },
});

// Inicia com mapa minimo (sera ajustado quando jogadores entrarem)
room.setCustomStadium(getFutsalMap(4));
room.setScoreLimit(3);
room.setTimeLimit(5);

// DEPOIS importa handlers
require('./todos_jogam/handlers.cjs');

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
