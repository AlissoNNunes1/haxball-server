// Presets globais de campeonatos CIRS
// Usar em salas temporarias de campeonato/ligas/eventos
// Mantem compatibilidade com loadCustomSettings (estrutura semelhante a outras configs)

const presets = {
  default: {
    name: 'CIRS Real Soccer - Campeonato',
    disableBalance: true,
    allowSpectators: true,
    draftEnabled: false,
    uniforms: {
      home: { name: 'Home', color1: '#ff0000', color2: '#ffffff' },
      away: { name: 'Away', color1: '#0000ff', color2: '#ffffff' },
    },
    rules: {
      matchTimeMinutes: 20,
      extraTime: false,
      goldenGoal: false,
      fouls: true,
      offsides: true,
      barriers: true,
    },
    reserved: {
      haxball: {
        maxPlayers: 30,
        public: false,
        noPlayer: false,
        password: '',
      },
    },
  },

  rs5: {
    extends: 'default',
    name: 'CIRS Real Soccer 5x5',
    format: '5x5',
    map: 'shared/maps/real_soccer_5x5.hbs',
  },

  rs6: {
    extends: 'default',
    name: 'CIRS Real Soccer 6x6',
    format: '6x6',
    map: 'shared/maps/real_soccer_6x6.hbs',
  },

  rs7: {
    extends: 'default',
    name: 'CIRS Real Soccer 7x7',
    format: '7x7',
    map: 'shared/maps/real_soccer_7x7.hbs',
  },

  rs11: {
    extends: 'default',
    name: 'CIRS Real Soccer 11x11',
    format: '11x11',
    map: 'shared/maps/real_soccer_11x11.hbs',
    rules: {
      matchTimeMinutes: 25,
      extraTime: true,
      goldenGoal: false,
      fouls: true,
      offsides: true,
      barriers: true,
    },
  },
};

module.exports = { presets };

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
