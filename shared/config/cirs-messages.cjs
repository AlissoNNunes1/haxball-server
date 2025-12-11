//Modulo para mensagens e utilitarios de comunicacao

const { allowPublicAdmin } = require('./variables.cjs');
const room = globalThis.room;

function announce(msg, targetId, color, style, sound) {
  if (color == null) {
    color = 0xfffd82;
  }
  if (style == null) {
    style = 'bold';
  }
  if (sound == null) {
    sound = 0;
  }
  room.sendAnnouncement(msg, targetId, color, style, sound);
  console.log('Announce: ' + msg);
}

function whisper(msg, targetId, color, style, sound) {
  if (color == null) {
    color = 0x66c7ff;
  }
  if (style == null) {
    style = 'normal';
  }
  if (sound == null) {
    sound = 0;
  }
  room.sendAnnouncement(msg, targetId, color, style, sound);
  if (room.getPlayer(targetId) != null) {
    console.log('Whisper -> ' + room.getPlayer(targetId).name + ': ' + msg);
  }
}

function isAdminPresent() {
  var players = room.getPlayerList();
  if (players.find((player) => player.admin) != 'Bagrian') {
    return true;
  } else {
    return false;
  }
}

function displayAdminMessage() {
  if (isAdminPresent() == false && allowPublicAdmin == true) {
    announce('Sem admin presente, digite !admin para assumir a sala!');
  }
}

module.exports = {
  announce,
  whisper,
  isAdminPresent,
  displayAdminMessage,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
