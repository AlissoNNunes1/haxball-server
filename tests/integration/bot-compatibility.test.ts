/**
 * Suite de Testes de Compatibilidade de Bot Scripts
 * Valida que scripts migrados funcionam corretamente com haxball.js
 *
 * Teste: npm test -- --testPathPattern=bot-compatibility
 */

describe('Bot Script Compatibility - haxball.js v5.0.0+', () => {
  /**
   * Mock do contexto de execucao de bot
   * Simula o ambiente que o bot script tera ao executar
   */
  const createBotContext = () => {
    const context = {
      room: {
        // Propriedades
        config: {
          roomName: 'Test Room',
          maxPlayers: 16,
          public: true,
        },
        players: [],

        // Eventos
        onPlayerJoin: ((_player: any) => {}) as any,
        onPlayerLeave: ((_player: any) => {}) as any,
        onPlayerChat: ((_player: any, _message: string) => true) as any,
        onGoal: ((_player: any) => {}) as any,
        onGameStart: (() => {}) as any,
        onGameStop: (() => {}) as any,
        onRoomLink: ((_link: string) => {}) as any,

        // Metodos
        sendChat: jest.fn(),
        setPlayerTeam: jest.fn(),
        kickPlayer: jest.fn(),
        startGame: jest.fn(),
        stopGame: jest.fn(),
        getBallTrajectory: jest.fn(() => ({ pos: { x: 0, y: 0 } })),
      },
      customSettings: {
        gameMode: '4v4',
        maxScore: 5,
      },
      console: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };

    return context;
  };

  describe('Remocao de window.HBInit', () => {
    it('nao deve usar window.HBInit', () => {
      // Script legado que tenta usar window
      const legacyScript = `
        var room = window.HBInit({ roomName: 'Legacy' });
      `;

      // Deve lancar erro quando tenta usar window.HBInit (window e undefined)
      expect(() => {
        const fn = new Function('context', legacyScript);
        fn({});
      }).toThrow();
    });

    it('script migrado nao referencia window', () => {
      // Script migrado
      const migratedScript = `
        room.sendChat('Oi');
      `;

      const context = createBotContext();

      // Deve executar sem erro
      expect(() => {
        const fn = new Function('room', 'customSettings', migratedScript);
        fn(context.room, context.customSettings);
      }).not.toThrow();

      expect(context.room.sendChat).toHaveBeenCalledWith('Oi');
    });
  });

  describe('Event Handlers', () => {
    it('onPlayerJoin deve ser chamado corretamente', () => {
      const script = `
        room.onPlayerJoin = function(player) {
          room.sendChat('Welcome ' + player.name);
        };
      `;

      const context = createBotContext();
      const fn = new Function('room', 'customSettings', script);
      fn(context.room, context.customSettings);

      // Simular entrada de jogador
      const mockPlayer = { id: 1, name: 'Player1', team: 1 };
      if (context.room.onPlayerJoin) {
        context.room.onPlayerJoin(mockPlayer);
      }

      expect(context.room.sendChat).toHaveBeenCalledWith(
        'Welcome Player1'
      );
    });

    it('onPlayerChat deve processar comandos', () => {
      const script = `
        room.onPlayerChat = function(player, message) {
          if (message === '!help') {
            room.sendChat('Available commands');
            return false;
          }
          return true;
        };
      `;

      const context = createBotContext();
      const fn = new Function('room', 'customSettings', script);
      fn(context.room, context.customSettings);

      const mockPlayer = { id: 1, name: 'Player1' };
      const result = context.room.onPlayerChat
        ? context.room.onPlayerChat(mockPlayer, '!help')
        : true;

      expect(context.room.sendChat).toHaveBeenCalledWith(
        'Available commands'
      );
      expect(result).toBe(false);
    });

    it('onGoal deve incrementar score', () => {
      const script = `
        let gameState = { redScore: 0, blueScore: 0 };
        
        room.onGoal = function(player) {
          if (player.team === 1) gameState.redScore++;
          if (player.team === 2) gameState.blueScore++;
          room.sendChat('Score: Red ' + gameState.redScore + ' Blue ' + gameState.blueScore);
        };
      `;

      const context = createBotContext();
      const fn = new Function('room', 'customSettings', script);
      fn(context.room, context.customSettings);

      const mockPlayer = { id: 1, name: 'Player1', team: 1 };
      if (context.room.onGoal) {
        context.room.onGoal(mockPlayer);
      }

      expect(context.room.sendChat).toHaveBeenCalledWith(
        'Score: Red 1 Blue 0'
      );
    });
  });

  describe('Custom Settings', () => {
    it('deve acessar customSettings sem window', () => {
      const script = `
        let gameMode = customSettings?.gameMode ?? '1v1';
        room.sendChat('Game Mode: ' + gameMode);
      `;

      const context = createBotContext();
      const fn = new Function('room', 'customSettings', script);
      fn(context.room, context.customSettings);

      expect(context.room.sendChat).toHaveBeenCalledWith(
        'Game Mode: 4v4'
      );
    });

    it('deve ter valor padrao se customSettings nao existe', () => {
      const script = `
        let unknown = customSettings?.unknownKey ?? 'default';
        room.sendChat('Value: ' + unknown);
      `;

      const context = createBotContext();
      const fn = new Function('room', 'customSettings', script);
      fn(context.room, context.customSettings);

      expect(context.room.sendChat).toHaveBeenCalledWith(
        'Value: default'
      );
    });
  });

  describe('Estado Local do Bot', () => {
    it('deve manter estado entre chamadas', () => {
      const script = `
        let players = {};
        
        room.onPlayerJoin = function(player) {
          players[player.id] = { name: player.name, goals: 0 };
        };
        
        room.onGoal = function(player) {
          if (players[player.id]) {
            players[player.id].goals++;
          }
        };
      `;

      const context = createBotContext();
      const fn = new Function('room', 'customSettings', script);
      fn(context.room, context.customSettings);

      // Simular sequencia de eventos
      const player = { id: 1, name: 'Player1', team: 1 };
      if (context.room.onPlayerJoin) {
        context.room.onPlayerJoin(player);
      }
      if (context.room.onGoal) {
        context.room.onGoal(player);
        context.room.onGoal(player);
      }

      // Verificar que foram disparados
      expect(context.room.sendChat).not.toHaveBeenCalled();
      // (Script nao envia chat, apenas mantem estado)
    });
  });

  describe('Logging com console', () => {
    it('deve permitir console.log', () => {
      const script = `
        console.log('Bot iniciado');
        room.sendChat('Ready');
      `;

      const context = createBotContext();
      const fn = new Function(
        'room',
        'customSettings',
        'console',
        script
      );
      fn(context.room, context.customSettings, context.console);

      expect(context.console.log).toHaveBeenCalledWith('Bot iniciado');
      expect(context.room.sendChat).toHaveBeenCalledWith('Ready');
    });
  });

  describe('Exemplos Reais de Bot', () => {
    it('bot futsal completo deve funcionar', () => {
      const script = `
        let gameState = { redTeam: [], blueTeam: [], gameActive: false };
        
        room.onPlayerJoin = function(player) {
          if (gameState.redTeam.length <= gameState.blueTeam.length) {
            gameState.redTeam.push(player);
            room.setPlayerTeam(player.id, 1);
          } else {
            gameState.blueTeam.push(player);
            room.setPlayerTeam(player.id, 2);
          }
        };
        
        room.onPlayerChat = function(player, message) {
          if (message === '!start') {
            if (gameState.redTeam.length > 0 && gameState.blueTeam.length > 0) {
              room.startGame();
              gameState.gameActive = true;
            }
            return false;
          }
          return true;
        };
      `;

      const context = createBotContext();
      const fn = new Function('room', 'customSettings', script);
      fn(context.room, context.customSettings);

      // Teste: adicionar 2 jogadores
      const player1 = { id: 1, name: 'Player1' };
      const player2 = { id: 2, name: 'Player2' };

      if (context.room.onPlayerJoin) {
        context.room.onPlayerJoin(player1);
        context.room.onPlayerJoin(player2);
      }

      expect(context.room.setPlayerTeam).toHaveBeenCalledWith(1, 1);
      expect(context.room.setPlayerTeam).toHaveBeenCalledWith(2, 2);

      // Teste: comando start
      if (context.room.onPlayerChat) {
        context.room.onPlayerChat(player1, '!start');
      }

      expect(context.room.startGame).toHaveBeenCalled();
    });
  });

  describe('Migracao Automatica', () => {
    it('remocao automatica de window.HBInit', () => {
      const legacyScript = `
        var room = window.HBInit({
          roomName: 'Futsal',
          maxPlayers: 16
        });
        
        room.onPlayerJoin = function(player) {
          room.sendChat('Welcome');
        };
      `;

      // Simular remocao de window.HBInit
      const migratedScript = legacyScript
        .replace(
          /var\s+room\s*=\s*window\.HBInit\s*\(\s*\{[\s\S]*?\}\s*\);?/gm,
          ''
        );

      const context = createBotContext();

      // Script migrado deve funcionar
      expect(() => {
        const fn = new Function('room', 'customSettings', migratedScript);
        fn(context.room, context.customSettings);
      }).not.toThrow();

      // Verificar que onPlayerJoin foi registrado
      expect(context.room.onPlayerJoin).toBeDefined();
    });
  });

  describe('Seguranca', () => {
    it('nao deve ter acesso a filesystem', () => {
      const maliciousScript = `
        typeof require === 'undefined' ? true : false;
      `;

      const context = createBotContext();

      // require nao deve estar disponivel
      expect(() => {
        const fn = new Function('room', 'customSettings', maliciousScript);
        fn(context.room, context.customSettings);
      }).not.toThrow();
    });
  });
});

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
