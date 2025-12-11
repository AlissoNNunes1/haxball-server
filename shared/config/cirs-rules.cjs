//Modulo para regras do jogo, formacoes e logica de jogo

const room = globalThis.room;
const { announce } = require('./cirs-messages.cjs');
const { sleep } = require('./utils.cjs');

class Game {
  constructor() {
    this.time = 0;
    this.paused = false;
    this.ballRadius;
    this.rsTouchTeam = 0;
    this.rsActive = true;
    this.rsReady = false;
    this.rsCorner = false;
    this.rsGoalKick = false;
    this.rsFoul = false;
    this.rsSwingTimer = 1000;
    this.rsTimer;
    this.rsPenalty = false;
    this.ballOutPositionX;
    this.ballOutPositionY;
    this.throwInPosY;
    this.outStatus = '';
    this.warningCount = 0;
    this.bringThrowBack = false;
    this.extraTime = false;
    this.extraTimeCount = 0;
    this.extraTimeEnd;
    this.extraTimeAnnounced = false;
    this.lastPlayAnnounced = false;
    this.boosterState;
    this.throwinKicked = false;
    this.pushedOut;
    this.lastKickerId;
    this.lastKickerName;
    this.lastKickerTeam;
    this.secondLastKickerId;
    this.secondLastKickerName;
    this.secondLastKickerTeam;
    this.redScore = 0;
    this.blueScore = 0;
    this.powershotCounter = 0;
    this.powershotID = 0;
    this.powershotTrigger = false;
    this.touchTrigger = false;
    this.airBallTrigger = false;
    this.ballInAir = false;
    this.penaltyKickerId;
  }

  updateLastKicker(id, name, team) {
    this.secondLastKickerId = this.lastKickerId;
    this.secondLastKickerName = this.lastKickerName;
    this.secondLastKickerTeam = this.lastKickerTeam;

    this.lastKickerId = id;
    this.lastKickerName = name;
    this.lastKickerTeam = team;
  }
}

const positions = {
  red: {
    GK: { x: -1595, y: 0, radius: 18 },
    ZD: { x: -1150, y: 180 },
    ZE: { x: -1150, y: -180 },
    MC: { x: -650, y: 0 },
    PD: { x: -350, y: 650 },
    PE: { x: -350, y: -650 },
    CA: { x: -300, y: 0 },
  },
  blue: {},
};

// Adicione uma nova formação (green) ao objeto positions
positions.f231 = {
  GK: { x: -1595, y: 0, radius: 18 },
  ZD: { x: -1150, y: 180 },
  ZE: { x: -1150, y: -180 },
  VL: { x: -600, y: 100 },
  V2: { x: -550, y: -100 },
  MA: { x: -500, y: 0 },
  CA: { x: -300, y: 0 },
};

positions.f321 = {
  GK: { x: -1595, y: 0, radius: 18 },
  ZD: { x: -1150, y: 180 },
  ZE: { x: -1150, y: -180 },
  ZC: { x: -1150, y: 0 },
  VE: { x: -550, y: -100 },
  VD: { x: -550, y: 100 },
  CA: { x: -300, y: 0 },
};

positions.f2211 = {
  GK: { x: -1595, y: 0, radius: 18 },
  ZD: { x: -1150, y: 180 },
  ZE: { x: -1150, y: -180 },
  MD: { x: -550, y: 300 },
  ME: { x: -550, y: -300 },
  MC: { x: -450, y: 0 },
  CA: { x: -300, y: 0 },
};
for (const position in positions.red) {
  positions.blue[position] = {
    ...positions.red[position],
    x: -positions.red[position].x,
    y: -positions.red[position].y,
  };
}

let activeFormation_red = 'red';
let activeFormation_blue = 'blue';
let choosePositionMode = false,
  teamPositions = {
    1: { ...positions.red },
    2: { ...positions.blue },
  },
  playersPositions = {};

function updateChoosePositionMode() {
  console.log('updateChoosePositionMode called');

  if (room.getScores() !== null) {
    const playersWithoutPosition = getPlayersWithoutPosition();
    console.log(
      'Players without position:',
      playersWithoutPosition.map((p) => p.name)
    );

    if (playersWithoutPosition.length > 0) {
      if (!choosePositionMode) {
        room.pauseGame(true);
        choosePositionMode = true;
        console.log('choosePositionMode set to true');
      }
    } else if (choosePositionMode) {
      choosePositionMode = false;
      room.pauseGame(false);
      console.log('choosePositionMode set to false');
    }
  } else if (choosePositionMode) {
    choosePositionMode = false;
    console.log('choosePositionMode set to false (scores are null)');
  }
}

function isPositionAvailable(team, position) {
  return teamPositions[team][position];
}

function getAvailablePositions(team) {
  return Object.keys(positions.red).filter((position) => teamPositions[team][position]);
}

function getPlayersWithoutPosition() {
  return room.getPlayerList().filter((player) => player.team !== 0 && !playersPositions[player.id]);
}

async function setPlayerPosition(player, team, position) {
  if (isPositionAvailable(team, position)) {
    if (playersPositions[player.id]) {
      teamPositions[team][playersPositions[player.id]] =
        positions[team == 1 ? 'red' : 'blue'][playersPositions[player.id]];
    }
    playersPositions[player.id] = position;

    teamPositions[team][position].x = Math.abs(teamPositions[team][position].x);

    if (team == 1) {
      teamPositions[team][position].x = -teamPositions[team][position].x;
    }

    position == 'GK'
      ? room.setPlayerDiscProperties(player.id, teamPositions[team][position])
      : room.setPlayerDiscProperties(player.id, { ...teamPositions[team][position], radius: 15 });
    delete teamPositions[team][position];
    room.setPlayerAvatar(player.id, position);
    room.sendAnnouncement(`Você escolheu a posição ${position}`, player.id);
    const playersOnSameTeam = room.getPlayerList().filter((p) => p.team == team);
    for (const p of playersOnSameTeam) {
      await announce(`Posições disponíveis: ${getAvailablePositions(team).join(', ')}`, p.id);
    }
    updateChoosePositionMode();
  } else {
    room.sendAnnouncement(
      `A posição ${position} não está disponível no seu time.\nPosições disponíveis: ${getAvailablePositions(
        team
      ).join(', ')}`,
      player.id
    );
  }
}

function changeFormation(player, formation, team) {
  if (positions[formation]) {
    console.log(`Mudando formação para: ${formation}`);
    //activeFormation = formation;
    if (team == 1) {
      activeFormation_red = formation;
      teamPositions[1] = { ...positions[activeFormation_red] };
      for (var pos in teamPositions[1]) {
        teamPositions[1][pos].x = -Math.abs(teamPositions[1][pos].x);
      }
    } else if (team == 2) {
      activeFormation_blue = formation;
      teamPositions[2] = { ...positions[activeFormation_blue] }; // Ambos os times compartilham a mesma formação
      for (var pos in teamPositions[2]) {
        teamPositions[2][pos].x = Math.abs(teamPositions[2][pos].x);
      }
    }

    room.sendAnnouncement(`O time ${team} mudou para a formação ${formation}`);
    if (choosePositionMode) {
      const players = room.getPlayerList().filter((p) => p.team !== 0);
      for (const player of players) {
        announce(
          `Posições disponíveis: ${getAvailablePositions(player.team).join(', ')}`,
          player.id
        );
      }
    }
    positionThePlayers();
  } else {
    console.error(`Formação ${formation} não existe.`);
    room.sendAnnouncement(`A formação ${formation} não existe.`);
  }
}

function shouldCheckOffside(player) {
  const game = globalThis.game;
  if (!game) {
    return false;
  }

  return (
    player.team !== 0 &&
    game.lastKickerTeam !== player.team &&
    game.lastKickerTeam !== 0 &&
    game.rsActive &&
    !game.rsPenalty &&
    !game.rsGoalKick &&
    !game.rsCorner &&
    !game.rsFoul
  );
}

async function checkOffside(player, isKick) {
  const game = globalThis.game;
  if (!game) {
    return;
  }

  if (!shouldCheckOffside(player)) return;

  const ballPosition = room.getBallPosition();
  const playerPosition = room.getPlayerDiscProperties(player.id);

  if (player.team === 1) {
    // Red team attacking right
    if (ballPosition.x > 0 && playerPosition.x > ballPosition.x) {
      // Check if player is ahead of the ball and in opponent's half
      const defenders = room.getPlayerList().filter((p) => p.team === 2);
      const lastDefender = defenders.reduce((last, current) => {
        const currentPos = room.getPlayerDiscProperties(current.id);
        const lastPos = room.getPlayerDiscProperties(last.id);
        return currentPos.x > lastPos.x ? current : last;
      });

      if (playerPosition.x > room.getPlayerDiscProperties(lastDefender.id).x) {
        // Offside
        game.rsFoul = true;
        game.rsActive = false;
        game.outStatus = 'offside';
        game.ballOutPositionX = ballPosition.x;
        game.ballOutPositionY = ballPosition.y;
        room.sendAnnouncement(
          `Impedimento! ${player.name} está em posição de impedimento.`,
          null,
          0xff0000
        );
        await sleep(2000);
        room.setBallPosition({ x: game.ballOutPositionX, y: game.ballOutPositionY });
        room.setPlayerPosition(player.id, playerPosition.x - 100, playerPosition.y);
        game.rsFoul = false;
        game.rsActive = true;
      }
    }
  } else if (player.team === 2) {
    // Blue team attacking left
    if (ballPosition.x < 0 && playerPosition.x < ballPosition.x) {
      // Check if player is ahead of the ball and in opponent's half
      const defenders = room.getPlayerList().filter((p) => p.team === 1);
      const lastDefender = defenders.reduce((last, current) => {
        const currentPos = room.getPlayerDiscProperties(current.id);
        const lastPos = room.getPlayerDiscProperties(last.id);
        return currentPos.x < lastPos.x ? current : last;
      });

      if (playerPosition.x < room.getPlayerDiscProperties(lastDefender.id).x) {
        // Offside
        game.rsFoul = true;
        game.rsActive = false;
        game.outStatus = 'offside';
        game.ballOutPositionX = ballPosition.x;
        game.ballOutPositionY = ballPosition.y;
        room.sendAnnouncement(
          `Impedimento! ${player.name} está em posição de impedimento.`,
          null,
          0xff0000
        );
        await sleep(2000);
        room.setBallPosition({ x: game.ballOutPositionX, y: game.ballOutPositionY });
        room.setPlayerPosition(player.id, playerPosition.x + 100, playerPosition.y);
        game.rsFoul = false;
        game.rsActive = true;
      }
    }
  }
}

function positionThePlayers() {
  for (const playerId in playersPositions) {
    const player = room.getPlayer(playerId);
    if (player && player.team !== 0) {
      const position = playersPositions[playerId];
      const team = player.team;
      const posData = teamPositions[team][position];
      if (posData) {
        position == 'GK'
          ? room.setPlayerDiscProperties(playerId, posData)
          : room.setPlayerDiscProperties(playerId, { ...posData, radius: 15 });
        room.setPlayerAvatar(playerId, position);
      }
    }
  }
}

function removePlayerPosition(player, team) {
  if (playersPositions[player.id]) {
    teamPositions[team][playersPositions[player.id]] =
      positions[team == 1 ? 'red' : 'blue'][playersPositions[player.id]];
    delete playersPositions[player.id];
    room.setPlayerAvatar(player.id, null);
    updateChoosePositionMode();
  }
}

module.exports = {
  Game,
  positions,
  activeFormation_red,
  activeFormation_blue,
  choosePositionMode,
  teamPositions,
  playersPositions,
  updateChoosePositionMode,
  isPositionAvailable,
  getAvailablePositions,
  getPlayersWithoutPosition,
  setPlayerPosition,
  changeFormation,
  shouldCheckOffside,
  checkOffside,
  positionThePlayers,
  removePlayerPosition,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
