//Modulo para handlers de eventos da sala CIRS Stadium

const { announce, whisper, isAdminPresent, displayAdminMessage } = require('./messages.cjs');
const room = globalThis.room;
const { sleep, pointDistance, ballWarning } = require('../../shared/config/utils.cjs');
const { processCommand } = require('../../shared/config/commands.cjs');

// Handlers globais reutilizaveis
const { handleGoal } = require('../../shared/handlers/goalHandlers.cjs');
const {
  avatarCelebration,
  goalCelebration,
  assistCelebration,
} = require('../../shared/utils/celebrationUtils.cjs');

const {
  positions,
  activeFormation_red,
  activeFormation_blue,
  choosePositionMode,
  teamPositions,
  playersPositions,
  updateChoosePositionMode,
  getAvailablePositions,
  setPlayerPosition,
  changeFormation,
  positionThePlayers,
  removePlayerPosition,
  Game,
  checkOffside,
  shouldCheckOffside,
} = require('./rules.cjs');
const {
  getRealSoccerMap,
  currentStadium,
  goalsCoord,
  penalArea,
  penalMark,
  goalKickCoord,
  cornerKickCoord,
  cornerKickStrength,
  goalKickStrength,
} = require('../../shared/config/maps.cjs');
const variables = require('../../shared/config/variables.cjs');
let {
  fieldWidth,
  fieldHeight,
  fieldWidthLimit,
  fieldHeightLimit,
  throwTimeOut,
  gkTimeOut,
  ckTimeOut,
  throwinDistance,
  mapBGColor,
  superAdminCode,
  allowPublicAdmin,
  powerShotMode,
  amarelo,
  vermelho,
  azul,
  verde,
  roomName,
  roomPassword,
  maxPlayers,
  roomPublic,
  token,
  roomLink,
  gameTime,
  superAdmins,
} = variables;

let game;
let gamePaused = false;
let unpauseTimeout;
let sala_mutada = false;
let playersOldTeam = {};
let offsidePlayersIDs = [];
let playersPosOnOffside = {};
let ballPosOnOffside = {};
let isSleeping = false;

room.onRoomLink = function (url) {
  console.log(url);
  // When the room link changes (server restarted/hosted), ensure map is set to RSR custom map
  if (variables.map == 'RSR') {
    room.setCustomStadium(getRealSoccerMap());
  }
};

room.onStadiumChange = function (newStadiumName, byPlayer) {
  if (byPlayer != null) {
    variables.map = 'custom';
  } else {
    variables.map = 'RSR';
  }

  if (currentStadium && currentStadium.bg) {
    fieldWidth = currentStadium.bg.width;
    fieldHeight = currentStadium.bg.height;
    fieldWidthLimit = fieldWidth + 11.45;
    fieldHeightLimit = fieldHeight + 11.45;
  }
};

room.onPlayerJoin = function (player) {
  console.log(player.name + ' joined the room');
  whisper('Ola, seja bem vindo a CIRS! Um servidor de Real Soccer', player.id, 0x61ddff, 'bold', 0);
  whisper(' ██████╗██╗██████╗ ███████╗ ', player.id, 0x61ddff, 'bold', 0);
  whisper('██ ╔═══╝██║██╔══██╗██╔════╝ ', player.id, 0x61ddff, 'bold', 0);
  whisper('██ ║    	    ██║██████╔╝███████╗ ', player.id, 0x61ddff, 'bold', 0);
  whisper('██ ║    	    ██║██╔══██╗╚════██║ ', player.id, 0x61ddff, 'bold', 0);
  whisper(' ██████╗██║██║     ██║███████║ ', player.id, 0x61ddff, 'bold', 0);
  whisper('Nosso discord: https://discord.gg/mWzatsxjTA', player.id, 0x61e7ff, 'bold', 0);

  // Verifica se jogador tem conta cadastrada
  try {
    const getAuthDb = require('../../dist/database/auth-client').getAuthDb;
    const db = getAuthDb();
    const account = db.getAccountByNick(player.name);

    if (account) {
      // Conta encontrada - pede login
      whisper('', player.id, null, null, 0);
      whisper('✓ Conta encontrada!', player.id, 0x00ff00, 'bold', 1);
      whisper('Use !login <senha> para autenticar', player.id, 0xffaa00, 'bold', 1);
      whisper(
        `Seu ranking: ${account.ranking} | Pontos: ${account.points}`,
        player.id,
        0xaaaaaa,
        'small',
        1
      );
    } else {
      // Conta nao encontrada - sugere registro
      whisper('', player.id, null, null, 0);
      whisper('Voce ainda nao tem uma conta CIRS', player.id, 0xffaa00, 'normal', 1);
      whisper('Registre-se no Discord com /register', player.id, 0xaaaaaa, 'small', 1);
      whisper('Digite !help para ver comandos', player.id, 0xaaaaaa, 'small', 1);
    }
  } catch (error) {
    console.error('[CIRS] Erro ao verificar conta:', error.message);
    whisper('Digite !help para ver comandos disponiveis', player.id, 0xaaaaaa, 'small', 1);
  }

  displayAdminMessage();
};

room.onPlayerLeave = function (player) {
  removePlayerPosition(player, player.team);
  if (variables.map == 'RSR') updateChoosePositionMode();
  displayAdminMessage();
  console.log(player.name + ' saiu da sala');

  let index = superAdmins.indexOf(player.id);
  if (index > -1) {
    sleep(100).then(() => {
      superAdmins.splice(index, 1);
    });
  }
  delete playersOldTeam[player.id];
};

room.onPlayerAdminChange = function (changedPlayer, byPlayer) {
  if (byPlayer != null) {
    if (changedPlayer.id != byPlayer.id) {
      if (superAdmins.indexOf(changedPlayer.id) > -1) {
        room.kickPlayer(byPlayer.id, 'You cannot remove a Super Admin', false);
        room.setPlayerAdmin(changedPlayer.id, true);
      }
    } else {
      if (changedPlayer.admin == false) {
        let index = superAdmins.indexOf(changedPlayer.id);
        if (index > -1) {
          superAdmins.splice(index, 1);
        }
      }
    }
  }
};

room.onGameStart = function (byPlayer) {
  gamePaused = false;
  if (variables.map == 'RSR') {
    room.setDiscProperties(0, { invMass: 1.05 });
    if (byPlayer == null) {
      game = new Game();
      globalThis.game = game;
      announce('Tempo de jogo: ' + gameTime + ' minutos');
      positionThePlayers();
      updateChoosePositionMode();
      if (choosePositionMode) {
        const players = room.getPlayerList().filter((p) => p.team !== 0);
        for (const player of players) {
          announce(
            `Posicoes disponiveis: ${getAvailablePositions(player.team).join(', ')}`,
            player.id
          );
        }
      }
    } else {
      if (room.getScores().timeLimit != 0) {
        gameTime = room.getScores().timeLimit / 60;
      } else {
        gameTime = 10;
      }
      room.stopGame();
      room.setTimeLimit(0);
      room.startGame();
    }
  }
};

room.onGameStop = function (byPlayer) {
  offsidePlayersIDs = [];
  playersPosOnOffside = {};
  ballPosOnOffside = {};
  isSleeping = false;
  if (variables.map == 'RSR') {
    updateChoosePositionMode();
    if (byPlayer != null) {
      room.setTimeLimit(gameTime);
    }
  }
};

room.onGamePause = function (byPlayer) {
  if (byPlayer != null) {
    room.sendAnnouncement(`Jogo pausado por ${byPlayer.name}!`, null, null, 'bold', 0);
  } else if (!game.rsFoul) {
    if (choosePositionMode) return room.pauseGame(true);
    room.sendAnnouncement(`Jogo pausado!`, null, null, 'bold', 0);
  }
  clearTimeout(unpauseTimeout);
  gamePaused = true;
};

room.onGameUnpause = function (byPlayer) {
  if (choosePositionMode) return room.pauseGame(true);
  unpauseTimeout = setTimeout(() => {
    gamePaused = false;
  }, 2000);
  if (byPlayer != null) {
    room.sendAnnouncement(`Jogo despausado por ${byPlayer.name}!`, null, null, 'bold', 0);
  } else if (!game.rsFoul) {
    room.sendAnnouncement(`Jogo despausado!`, null, null, 'bold', 0);
  }
};

room.onPlayerBallKick = function (player) {
  if (variables.map == 'RSR') {
    game.rsTouchTeam = player.team;
    game.updateLastKicker(player.id, player.name, player.team);

    //=========== POWERSHOT CODE ===========
    if (powerShotMode == true) {
      if (room.getDiscProperties(0).color !== 0xffffff && game.outStatus == '') {
        room.setDiscProperties(0, {
          xgravity: -room.getPlayerDiscProperties(player.id).yspeed / 30,
          ygravity: -room.getPlayerDiscProperties(player.id).yspeed / 30,
        });
        room.setDiscProperties(0, { color: '0xffffff' });
        game.rsSwingTimer = 50;
      }
      game.powershotCounter = 0;
      game.powershotID = 0;
      game.powershotTrigger = false;
      if (game.airBallTrigger && !game.ballInAir) {
        const ball_cMask = room.getDiscProperties(0).cMask;
        room.setDiscProperties(0, { cMask: ball_cMask - 7, invMass: 1.05 }); // ball + red + blue = 7
        game.ballInAir = true;
        sleep(2000).then(() => {
          room.setDiscProperties(0, { cMask: ball_cMask, invMass: 1.05 });
          game.airBallTrigger = false;
          game.ballInAir = false;
        });
      } else if (parseFloat(room.getDiscProperties(0).invMass.toFixed(2)) != 1.05) {
        room.setDiscProperties(0, { invMass: 1.05 });
      }
    }
    //=========== POWERSHOT CODE ===========

    checkOffside(player, true);

    if (game.rsReady == true) {
      var players = room.getPlayerList().filter((player) => player.team != 0);
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass.toFixed(1) != 0.3) {
          room.setPlayerDiscProperties(player.id, { invMass: 0.3 });
        }
      });
    }

    if (game.rsActive == false && game.rsReady == true) {
      // make game active on kick from CK/GK
      if (game.rsCorner == true || game.rsGoalKick == true) {
        game.boosterState = true;

        room.setDiscProperties(1, { x: 2000, y: 2000 });
        room.setDiscProperties(2, { x: 2000, y: 2000 });
        room.setDiscProperties(0, { color: '0xffffff' });
        game.rsTimer = 1000000;
        game.warningCount++;

        // set gravity for real soccer corners/goalkicks
        if (game.rsCorner == true) {
          room.setDiscProperties(0, {
            xgravity: (room.getPlayerDiscProperties(player.id).xspeed / 16) * -1,
            ygravity: (room.getPlayerDiscProperties(player.id).yspeed / 16) * -1,
          });
        }
        if (game.rsGoalKick == true) {
          room.setDiscProperties(0, {
            xgravity: 0,
            ygravity: (room.getPlayerDiscProperties(player.id).yspeed / 20) * -1,
          });
        }

        game.rsCorner = false;
        game.rsGoalKick = false;
        game.outStatus = '';

        room.setDiscProperties(0, { cMask: room.getDiscProperties(0).cMask - 7 }); // remove a colisão da bola com os jogadores
        game.ballInAir = true;
        sleep(2000).then(() => {
          // tempo até que a bola volte a colidir com os jogadores
          room.setDiscProperties(0, { cMask: 63 });
          game.ballInAir = false;
        });
      }
      if (game.outStatus == 'redThrow' || game.outStatus == 'blueThrow') {
        game.outStatus = '';
        room.setDiscProperties(0, { color: '0xffffff' });
        game.rsTimer = 1000000;
        game.warningCount++;

        room.setDiscProperties(0, { cMask: room.getDiscProperties(0).cMask - 7 }); // remove a colisão da bola com os jogadores
        game.ballInAir = true;
        sleep(2000).then(() => {
          // tempo até que a bola volte a colidir com os jogadores
          room.setDiscProperties(0, { cMask: 63 });
          game.ballInAir = false;
        });
      }
      if (game.rsFoul == true || game.rsPenalty == true) {
        game.rsFoul = false;
        game.rsPenalty = false;
        room.setDiscProperties(player.team == 1 ? 2 : 1, { x: 2000, y: 2000, radius: 0 });
      }
      game.rsActive = true;
      game.rsReady = false;
    }
  }
};

room.onPlayerKicked = function (kickedPlayer, reason, ban, byPlayer) {
  if (superAdmins.indexOf(kickedPlayer.id) > -1 && byPlayer != null) {
    room.kickPlayer(byPlayer.id, 'You cannot kick/ban a Super Admin', false);
    room.clearBans();
  }
};

room.onPlayerChat = function (player, message) {
  // normalize input
  if (typeof message !== 'string') return false;
  message = message.trim();

  // PROCESSA COMANDOS GLOBAIS PRIMEIRO (commands.cjs)
  const commandHandled = processCommand(room, player, message);
  if (commandHandled) return false;

  // determine if its a command that starts with '!'
  const isCommandPrompt = message.startsWith('!');
  const incoming = isCommandPrompt ? message.substr(1).trim() : message; // remove leading '!'
  let args = incoming.split(/\s+/);

  let activeFormation = activeFormation_red;
  if (player.team == 2) activeFormation = activeFormation_blue;

  // Block chat if in choosePositionMode and message is not a command nor a position, or if the room is muted and player is not admin
  const isPositionChoice = Object.keys(positions[activeFormation]).includes(args[0].toUpperCase());
  if (
    (choosePositionMode && !isCommandPrompt && !isPositionChoice) ||
    (sala_mutada && !player.admin)
  )
    return false;
  console.log(player.name + ': ' + message);

  // Handle position selection without the need of '!'
  if (!isCommandPrompt && isPositionChoice && player.team !== 0) {
    if (choosePositionMode) {
      setPlayerPosition(player, player.team, args[0].toUpperCase());
      return false;
    }
  }
  // If it's a command, process it
  if (isCommandPrompt) {
    // unify lowercase command
    const cmd = args[0].toLowerCase();
    // handle formation command: !formacao [red|blue] [formation]
    if ((cmd === 'formacao' || cmd === 'formacao') && args.length >= 3 && player.admin) {
      const teamStr = args[1].toLowerCase();
      const formation = args[2].toLowerCase();
      if (teamStr === 'red') changeFormation(player, formation, 1);
      else if (teamStr === 'blue') changeFormation(player, formation, 2);
      return false;
    }

    // old behavior: convert to previous args usage
    message = incoming;
    args = message.split(' ');
    let activeForm = activeFormation;
    if (Object.keys(positions[activeForm]).includes(args[0].toUpperCase()) && player.team !== 0) {
      const position = args[0].toUpperCase();
      if (choosePositionMode) {
        setPlayerPosition(player, player.team, position);
      }
    } else if (cmd == 'rpos' && player.team !== 0) {
      if (choosePositionMode)
        room.sendAnnouncement(`Você removeu sua posição.`, player.id),
          removePlayerPosition(player, player.team);
      else room.sendAnnouncement('Você não pode remover posição neste momento.', player.id);
    } else if (cmd == 'admin' && args.length == 1 && allowPublicAdmin == true) {
      if (isAdminPresent() == false) {
        room.setPlayerAdmin(player.id, true);
      } else {
        whisper('O Admin já está na sala ou o comando !admin não está permitido', player.id);
      }
    } else if (cmd == 'admin' && args.length == 2) {
      if (args[1] == superAdminCode) {
        room.setPlayerAdmin(player.id, true);
        if (superAdmins.indexOf(player.id) === -1) {
          superAdmins.push(player.id);
        }
        announce(player.name + ' pegou Super Admin!');
      }
    } else if (cmd == 'clearbans') {
      if (player.admin) {
        room.clearBans();
        announce('Os bans foram retirados por: ' + player.name);
      } else {
        whisper('Apenas admins podem usar este comando', player.id);
      }
    } else if (cmd == 'court' && args.length == 1) {
      whisper('A cor do fundo do estádio atualmente é ' + mapBGColor);
    } else if (cmd == 'court' && args.length == 2 && player.admin) {
      if (room.getScores() == null) {
        if (args[1] == 'reset') {
          mapBGColor = '86A578';
          announce('Cor do fundo do mapa resetada por: ' + player.name);
        } else {
          mapBGColor = args[1];
          announce('Cor do fundo do mapa colocada como: ' + args[1] + ' por ' + player.name);
        }
        room.setCustomStadium(getRealSoccerMap());
      } else {
        whisper('Não é possível mudar a cor do mapa durante o jogo.', player.id);
      }
    } else if (cmd == 'swap') {
      if (player.admin) {
        if (args.length == 1) {
          var players = room.getPlayerList().filter((player) => player.id != 0);
          if (players.length == 0) return false;
          players.forEach(function (player) {
            if (player.team == 1) {
              room.setPlayerTeam(player.id, 2);
            }
            if (player.team == 2) {
              room.setPlayerTeam(player.id, 1);
            }
          });
          announce('Times foram trocados');
        }
      } else {
        whisper('Comando apenas de Admin', player.id);
      }
    } else if (cmd == 'setpassword' && player.admin) {
      if (superAdmins.indexOf(player.id) > -1) {
        room.setPassword(args[1]);
        roomPassword = args[1];
        announce('Senha foi trocada por: ' + player.name);
      } else {
        whisper('Apenas super admins podem mudar a senha.', player.id);
      }
    } else if (cmd == 'clearpassword' && player.admin) {
      if (superAdmins.indexOf(player.id) > -1) {
        room.setPassword(null);
        roomPassword = null;
        announce('Senha foi retirada por: ' + player.name);
      } else {
        whisper('Apenas super admins podem tirar a senha.', player.id);
      }
    } else if (cmd == 'rs' && player.admin) {
      if (room.getScores() == null) {
        room.setCustomStadium(getRealSoccerMap());
      } else {
        whisper('Não é possível mudar o mapa durante o jogo.', player.id);
      }
    } else if (cmd == 'rr' && player.admin) {
      room.stopGame();
      room.startGame();
    } else if (cmd == 'bb') {
      room.kickPlayer(player.id, 'Bye', false);
    } else if ((cmd == 'powershot' || cmd == 'ps') && player.admin) {
      if (powerShotMode == false) {
        powerShotMode = true;
        announce('MODO DE POWERSHOT ATIVADO POR ' + player.name, null, 0x00ff00);
      } else {
        powerShotMode = false;
        announce('MODO DE POWERSHOT DESATIVADO POR ' + player.name, null, 0xff0000);
      }
    } else if (cmd == 'help') {
      displayHelp(player.id, args[1]);
    } else if (cmd == 'super') {
      let superMsg = 'Super Admins: ';
      superAdmins.forEach(function (id) {
        if (room.getPlayer(id) != null || room.getPlayer(id) != undefined) {
          superMsg = superMsg + room.getPlayer(id).name + ', ';
        }
      });
      if (superAdmins.length > 0) {
        superMsg = superMsg.slice(0, -2);
      } else {
        superMsg = 'Não tem super admins presentes.';
      }
      whisper(superMsg, player.id);
    } else if (cmd == 'penal' && ['red', 'v'].includes(args[1]) && player.admin) {
      game.rsActive = false;
      game.rsReady = true;
      game.rsPenalty = true;
      const players = room.getPlayerList().filter((player) => player.team != 0);
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
      });
      room.setDiscProperties(3, { x: penalMark, y: 0, radius: 18 });
      room.setDiscProperties(0, {
        invMass: 1.8,
        x: penalMark,
        y: 0,
        xspeed: 0,
        yspeed: 0,
        color: '0xff3f34',
        xgravity: 0,
        ygravity: 0,
      });
      room.sendAnnouncement('Pênalti para o red!');
      /*sleep(5000).then(() => {
				room.setDiscProperties(3, {x: 0, y: 2000, radius: 0});
			});*/
    } else if (cmd == 'penal' && ['blue', 'a'].includes(args[1]) && player.admin) {
      game.rsActive = false;
      game.rsReady = true;
      game.rsPenalty = true;
      const players = room.getPlayerList().filter((player) => player.team != 0);
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
      });
      room.setDiscProperties(3, { x: -penalMark, y: 0, radius: 18 });
      room.setDiscProperties(0, {
        invMass: 1.8,
        x: -penalMark,
        y: 0,
        xspeed: 0,
        yspeed: 0,
        color: '0x0fbcf9',
        xgravity: 0,
        ygravity: 0,
      });
      room.sendAnnouncement('Pênalti para o blue!');
      /*sleep(5000).then(() => {
				room.setDiscProperties(3, {x: 0, y: 2000, radius: 0});
			});*/
    } else if (cmd == 'falta' && ['red', 'v'].includes(args[1]) && player.admin) {
      game.rsActive = false;
      game.rsReady = true;
      game.rsFoul = true;
      const players = room.getPlayerList().filter((player) => player.team != 0);
      const ballPosition = room.getBallPosition();
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
      });
      room.setDiscProperties(1, { x: 2000, y: 2000, radius: 0 });
      room.setDiscProperties(2, { x: ballPosition.x, y: ballPosition.y, radius: 210 });
      room.setDiscProperties(0, {
        invMass: 1.05,
        x: ballPosition.x,
        y: ballPosition.y,
        xspeed: 0,
        yspeed: 0,
        color: '0xffffff',
        xgravity: 0,
        ygravity: 0,
      });
      room.sendAnnouncement('Falta para o red!');
    } else if (cmd == 'falta' && ['blue', 'a'].includes(args[1]) && player.admin) {
      game.rsActive = false;
      game.rsReady = true;
      game.rsFoul = true;
      const players = room.getPlayerList().filter((player) => player.team != 0);
      const ballPosition = room.getBallPosition();
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
      });
      room.setDiscProperties(2, { x: 2000, y: 2000, radius: 0 });
      room.setDiscProperties(1, { x: ballPosition.x, y: ballPosition.y, radius: 210 });
      room.setDiscProperties(0, {
        invMass: 1.05,
        x: ballPosition.x,
        y: ballPosition.y,
        xspeed: 0,
        yspeed: 0,
        color: '0xffffff',
        xgravity: 0,
        ygravity: 0,
      });
      room.sendAnnouncement('Falta para o blue!');
    } else if (cmd == 'atr') {
      room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
      room.sendAnnouncement('Autorizado!');
    } else if (args[0] == 'mutarsala' && player.admin) {
      if (sala_mutada) {
        sala_mutada = false;
        room.sendAnnouncement('A sala foi desmutada.', null, vermelho, 'bold', 2);
      } else {
        sala_mutada = true;
        room.sendAnnouncement('A sala foi mutada.', null, verde, 'bold', 2);
      }
    } else if (args[0] == 'discord') {
      room.sendAnnouncement(
        'Link do discord:Discord CIRS: https://discord.gg/mWzatsxjTA | Discord Parceiros: https://discord.gg/mWzatsxjTA ',
        player.id,
        verde,
        'bold',
        1
      );
    }
    return false;
  }
  if (message.startsWith('t ')) {
    teamMsg = message.substring(1).trim();
    if (player.team == 1) {
      var players = room.getPlayerList().filter((player) => player.team == 1);
      players.forEach(function (teamPlayer) {
        room.sendAnnouncement(
          '[Team] ' + player.name + ': ' + teamMsg,
          teamPlayer.id,
          0xed6a5a,
          'normal',
          1
        );
      });
    }
    if (player.team == 2) {
      var players = room.getPlayerList().filter((player) => player.team == 2);
      players.forEach(function (teamPlayer) {
        room.sendAnnouncement(
          '[Team] ' + player.name + ': ' + teamMsg,
          teamPlayer.id,
          0x5995ed,
          'normal',
          1
        );
      });
    }
    if (player.team == 0) {
      var players = room.getPlayerList().filter((player) => player.team == 0);
      players.forEach(function (teamPlayer) {
        room.sendAnnouncement(
          '[Spec] ' + player.name + ': ' + teamMsg,
          teamPlayer.id,
          0xdee7fa,
          'normal',
          1
        );
      });
    }
    return false;
  }
  if (message.startsWith('@@')) {
    message = message.substr(2).trim();
    if (message.indexOf(' ') !== -1) {
      let args = message.match(/^(\S+)\s(.*)/).slice(1);

      if (args.length > 1) {
        var pmMsg = args[1];
        var players = room.getPlayerList();
        var pmSent = false;
        players.forEach(function (pmPlayer) {
          if (pmPlayer.name === args[0] || pmPlayer.name === args[0].replace(/_/g, ' ')) {
            whisper(
              '[PM > ' + pmPlayer.name + '] ' + player.name + ': ' + pmMsg,
              player.id,
              0xffa220,
              'normal',
              1
            );
            whisper('[PM] ' + player.name + ': ' + pmMsg, pmPlayer.id, 0xffa220, 'normal', 1);
            pmSent = true;
          }
        });
        if (pmSent == false) {
          whisper(
            "Impossível encontrar usuário '" + args[0] + "'",
            player.id,
            0xffa220,
            'normal',
            1
          );
        }
        return false;
      }
    }
  }
};

function displayHelp(id, selection) {
  if (selection == null) {
    whisper('═══ COMANDOS DA SALA ═══', id, 0x55aaff, 'bold');
    whisper(
      'Comandos gerais: !help, !afk, !bb, !admin, !clearbans, !swap, !court, t [team chat]',
      id,
      0xaaaaaa,
      'small'
    );
    whisper('Mensagem privada: @@[nick][mensagem], ex: @@urugay ola!', id, 0xaaaaaa, 'small');
    whisper(
      'Comandos de autenticacao: /help (digite /help para ver lista completa)',
      id,
      0xff9900,
      'small'
    );
  }
}

room.onPlayerTeamChange = function (changedPlayer, byPlayer) {
  removePlayerPosition(changedPlayer, playersOldTeam[changedPlayer.id]);
  if (variables.map == 'RSR') {
    if (room.getScores() != null) {
      updateChoosePositionMode();
      if (choosePositionMode && changedPlayer.team !== 0)
        announce(
          `Posições disponíveis: ${getAvailablePositions(changedPlayer.team).join(', ')}`,
          changedPlayer.id
        );
      if (game.rsActive == false) {
        if (
          game.rsGoalKick == true ||
          game.rsCorner == true ||
          game.rsFoul == true ||
          game.rsPenalty == true
        ) {
          room.setPlayerDiscProperties(changedPlayer.id, { invMass: 9999999 });
        }
      }
    }
  }
  playersOldTeam[changedPlayer.id] = changedPlayer.team;
};

room.onTeamGoal = function (team) {
  if (variables.map == 'RSR') {
    game.rsActive = false;

    // Mensagens customizadas para a sala Stadium
    const customMessages = {
      ownGoal: {
        red: 'Gol contra mano, serio?',
        blue: 'Ala kkkkkk, gol contra!',
      },
    };

    // Usa handler global com mensagens customizadas
    handleGoal(room, team, game, {
      customMessages,
      onGoal: (room, goalInfo) => {
        // Celebracao para scorer (se nao for gol contra)
        if (goalInfo.scorer && !goalInfo.isOwnGoal) {
          goalCelebration(room, goalInfo.scorer.id);
        }

        // Celebracao para assister
        if (goalInfo.assister) {
          assistCelebration(room, goalInfo.assister.id);
        }
      },
    });

    game.lastKicker = undefined;
    game.secondLastKicker = undefined;
    game.lastKickerTeam = undefined;
    game.secondLastKickerTeam = undefined;
  }
};

room.onPositionsReset = function () {
  offsidePlayersIDs = [];
  playersPosOnOffside = {};
  ballPosOnOffside = {};
  if (variables.map == 'RSR') {
    positionThePlayers();
    if (game.lastPlayAnnounced == true) {
      room.pauseGame(true);
      game.lastPlayAnnounced = false;
      announce('FIM DE PAPO!');
    }
  }
};

room.onGameTick = function () {
  if (variables.map == 'RSR' && !gamePaused) {
    updateGameStatus();
    handleBallTouch();
    realSoccerRef();
    if (!game.rsActive) {
      offsidePlayersIDs = [];
      playersPosOnOffside = {};
      ballPosOnOffside = {};
    }
  }
};

function realSoccerRef() {
  blockThrowIn();
  blockGoalKick();
  removeBlock();
  if (game.time == gameTime * 60 && game.extraTimeAnnounced == false) {
    extraTime();
    game.extraTimeAnnounced = true;
  }

  if (game.time == game.extraTimeEnd && game.lastPlayAnnounced == false) {
    announce('Last play', null, null, null, 1);
    game.lastPlayAnnounced = true;
  }
}

function blockThrowIn() {
  var players = room.getPlayerList().filter((player) => player.team != 0);
  if (room.getBallPosition().y < 0) {
    // top throw line
    if (game.outStatus == 'redThrow') {
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).y < 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 536870918) {
            room.setPlayerDiscProperties(player.id, { cGroup: 536870918 });
          }
          if (player.position.y < -(fieldHeight - 140)) {
            room.setPlayerDiscProperties(player.id, { y: -(fieldHeight - 155) });
          }
        }
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
      });
    }
    if (game.outStatus == 'blueThrow') {
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).y < 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 536870918) {
            room.setPlayerDiscProperties(player.id, { cGroup: 536870918 });
          }
          if (player.position.y < -(fieldHeight - 140)) {
            room.setPlayerDiscProperties(player.id, { y: -(fieldHeight - 155) });
          }
        }
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
      });
    }
  }
  if (room.getBallPosition().y > 0) {
    // bottom throw line
    if (game.outStatus == 'redThrow') {
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).y > 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 536870918) {
            room.setPlayerDiscProperties(player.id, { cGroup: 536870918 });
          }
          if (player.position.y > fieldHeight - 140) {
            room.setPlayerDiscProperties(player.id, { y: fieldHeight - 155 });
          }
        }
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
        if (room.getDiscProperties(21).x != fieldWidth - 1) {
          // show bottom red line
          room.setDiscProperties(21, { x: fieldWidth - 1 });
        }
        if (room.getDiscProperties(23).x != -(fieldWidth - 1)) {
          // hide bottom blue line
          room.setDiscProperties(23, { x: -(fieldWidth - 1) });
        }
      });
    }
    if (game.outStatus == 'blueThrow') {
      players.forEach(function (player) {
        if (room.getPlayerDiscProperties(player.id).invMass != 9999999) {
          room.setPlayerDiscProperties(player.id, { invMass: 9999999 });
        }
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).y > 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 536870918) {
            room.setPlayerDiscProperties(player.id, { cGroup: 536870918 });
          }
          if (player.position.y > fieldHeight - 140) {
            room.setPlayerDiscProperties(player.id, { y: fieldHeight - 155 });
          }
        }
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
        if (room.getDiscProperties(23).x != fieldWidth - 1) {
          // show bottom blue line
          room.setDiscProperties(23, { x: fieldWidth - 1 });
        }
        if (room.getDiscProperties(21).x != -(fieldWidth - 1)) {
          // hide bottom red line
          room.setDiscProperties(21, { x: -(fieldWidth - 1) });
        }
      });
    }
  }
}

function blockGoalKick() {
  var players = room.getPlayerList().filter((player) => player.team != 0);
  if (room.getBallPosition().x < 0) {
    // left side red goal kick
    if (game.outStatus == 'redGK') {
      players.forEach(function (player) {
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).x < 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 268435462) {
            room.setPlayerDiscProperties(player.id, { cGroup: 268435462 });
          }
          if (
            player.position.x < -penalArea[0] &&
            player.position.y > -penalArea[1] &&
            player.position.y < penalArea[1]
          ) {
            room.setPlayerDiscProperties(player.id, { x: -(penalArea[0] - 15) });
          }
        }
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
      });
    }
  }
  if (room.getBallPosition().x > 0) {
    // right side blue goal kick
    if (game.outStatus == 'blueGK') {
      players.forEach(function (player) {
        if (player.team == 1 && room.getPlayerDiscProperties(player.id).x > 0) {
          if (room.getPlayerDiscProperties(player.id).cGroup != 268435462) {
            room.setPlayerDiscProperties(player.id, { cGroup: 268435462 });
          }
          if (
            player.position.x > penalArea[0] &&
            player.position.y > -penalArea[1] &&
            player.position.y < penalArea[1]
          ) {
            room.setPlayerDiscProperties(player.id, { x: penalArea[0] - 15 });
          }
        }
        if (player.team == 2 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
          room.setPlayerDiscProperties(player.id, { cGroup: 2 });
        }
      });
    }
  }
}

function removeBlock() {
  var players = room.getPlayerList().filter((player) => player.team != 0);
  if (game.outStatus == '') {
    players.forEach(function (player) {
      if (player.team == 1 && room.getPlayerDiscProperties(player.id).cGroup != 2) {
        room.setPlayerDiscProperties(player.id, { cGroup: 2 });
      }
      if (player.team == 2 && room.getPlayerDiscProperties(player.id).cGroup != 4) {
        room.setPlayerDiscProperties(player.id, { cGroup: 4 });
      }
    });
  }
}

function extraTime() {
  var extraSeconds = Math.ceil(game.extraTimeCount / 60);
  game.extraTimeEnd = gameTime * 60 + extraSeconds;
  announce('Acréscimos: ' + extraSeconds + ' Seconds', null, null, null, 1);
}

function updateGameStatus() {
  game.time = Math.floor(room.getScores().time);
  game.ballRadius = room.getDiscProperties(0).radius;
}

function handleBallTouch() {
  var players = room.getPlayerList();
  var ballPosition = room.getBallPosition();
  var ballRadius = game.ballRadius;
  var playerRadius = 15;
  var triggerDistance = ballRadius + playerRadius + 0.01;

  for (var i = 0; i < players.length; i++) {
    // Iterate over all the players
    var player = players[i];
    if (player.position == null) continue;
    playerRadius = room.getPlayerDiscProperties(player.id).radius;
    triggerDistance = ballRadius + playerRadius + 0.01;
    var distanceToBall = pointDistance(player.position, ballPosition);
    if (distanceToBall < triggerDistance) {
      checkOffside(player);
      if (!game.ballInAir) game.rsTouchTeam = player.team;
      game.throwinKicked = false;

      //=========== POWERSHOT CODE ===========
      if (
        game.rsCorner == false &&
        game.rsGoalKick == false &&
        powerShotMode == true &&
        !game.ballInAir
      ) {
        const ballColor = room.getDiscProperties(0).color;
        if (game.powershotID != player.id) {
          game.powershotID = player.id;
          game.powershotTrigger = false;
          game.powershotCounter = 0;
          game.touchTrigger = true;
        } else {
          if (game.touchTrigger) {
            if (game.outStatus == 'redThrow' || game.outStatus == 'blueThrow') {
              teamBallColor = game.outStatus == 'redThrow' ? '0xff3f34' : '0x0fbcf9';
              if (ballColor == teamBallColor || ballColor == teamBallColor) {
                room.setDiscProperties(0, { invMass: 1.5, color: '0xffe600' });
              } else {
                room.setDiscProperties(0, { invMass: 1.05, color: teamBallColor });
              }
            } else if (ballColor == '0xffffff') {
              room.setDiscProperties(0, { invMass: 1.5, color: '0xffe600' });
            } else if (
              ballColor == '0xffe600' ||
              ballColor == '0xff0000' ||
              ballColor == '0x007fff'
            ) {
              room.setDiscProperties(0, { invMass: 1.05, color: '0xffffff' });
              game.airBallTrigger = false;
            }
            game.touchTrigger = false;
          }
          if (game.outStatus !== 'redThrow' && game.outStatus !== 'blueThrow') {
            if (ballColor == '0xffffff') {
              game.powershotCounter++;
              if (
                game.powershotCounter >= 100 &&
                game.powershotTrigger == false &&
                room.getDiscProperties(0).invMass != 2.2
              ) {
                room.setDiscProperties(0, { color: 0x007fff, invMass: 2.2 });
                game.powershotTrigger = true;
                game.airBallTrigger = true;
              }
            } else if (ballColor == '0xffe600') {
              game.powershotCounter++;
              if (
                game.powershotCounter >= 100 &&
                game.powershotTrigger == false &&
                room.getDiscProperties(0).invMass != 2.8
              ) {
                room.setDiscProperties(0, { invMass: 2.8, color: '0xff0000' });
                game.powershotTrigger = true;
              }
            }
          }
        }
      }
      //=========== POWERSHOT CODE ===========

      if (game.rsCorner == false && room.getDiscProperties(0).xgravity != 0) {
        room.setDiscProperties(0, { xgravity: 0, ygravity: 0 });
        game.rsSwingTimer = 10000;
      }
    }
    //=========== POWERSHOT CODE ===========
    if (
      distanceToBall > triggerDistance + 3 &&
      player.id == game.powershotID &&
      (game.powershotTrigger || !game.touchTrigger) &&
      powerShotMode == true
    ) {
      game.powershotID = 0;
    }
    //=========== POWERSHOT CODE ===========
  }
}

function secondsToMinutes(time) {
  // Hours, minutes and seconds
  var hrs = ~~(time / 3600);
  var mins = ~~((time % 3600) / 60);
  var secs = ~~time % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  var ret = '';
  if (hrs > 0) {
    ret += '' + hrs + ':' + (mins < 10 ? '0' : '');
  }
  ret += '' + mins + ':' + (secs < 10 ? '0' : '');
  ret += '' + secs;
  return ret;
}

// Funcao avatarCelebration removida - agora usando shared/utils/celebrationUtils.cjs

function anuncio() {
  room.sendAnnouncement('Discord CIRS: https://discord.gg/RQhSBA3k', null, azul, 'bold', 0);
}
try {
  const { createNamedInterval } = require('../../shared/config/roomTimers.cjs');
  createNamedInterval(room, 'stadium_announcements', anuncio, 420000);
} catch (e) {
  setInterval(anuncio, 420000);
}

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
