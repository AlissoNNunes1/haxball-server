// Mensagens padrao para salas e bots
export const messages = {
  welcome: (playerName) => `Bem vindo ${playerName}!`,
  goodbye: (playerName) => `Valeu ${playerName}, volta sempre!`,
  goal: ({ scorer, team }) => `Gol de ${scorer} para ${team}!`,
  assist: ({ assister, scorer }) => `Assistencia de ${assister} para ${scorer}!`,
  fairPlay: 'Jogo limpo e respeito sempre.',
  start: 'Partida iniciada, boa sorte!',
  stop: 'Partida pausada.',
  resume: 'Partida retomada.',
};

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
