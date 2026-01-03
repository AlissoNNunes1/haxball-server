//Modulo para mensagens e utilitarios de comunicacao

const { allowPublicAdmin } = require('../../shared/config/variables.cjs');
const { announce, whisper, welcomeWhispers, startCommunityAnnouncements, matchStartAnnouncement, matchGoalAnnouncement, matchVictoryAnnouncement } = require('../../shared/config/messages.cjs');

function isAdminPresent() {
  var players = room.getPlayerList();
  if (players.find((player) => player.admin) != 'assu') {
    return true;
  } else {
    return false;
  }
}

function displayAdminMessage(room) {
  if (isAdminPresent() == false && allowPublicAdmin == true) {
    announce(room, 'Sem admin presente, digite !admin para assumir a sala!');
  }
}

module.exports = {
  announce,
  whisper,
  welcomeWhispers,
  startCommunityAnnouncements,
  matchStartAnnouncement,
  matchGoalAnnouncement,
  matchVictoryAnnouncement,
  isAdminPresent,
  displayAdminMessage,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
