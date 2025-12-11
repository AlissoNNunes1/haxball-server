//Modulo para utilitarios compartilhados

function pointDistance(p1, p2) {
  var d1 = p1.x - p2.x;
  var d2 = p1.y - p2.y;
  return Math.sqrt(d1 * d1 + d2 * d2);
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function ballWarning(origColour, warningCount) {
  sleep(200).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(400).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
  sleep(600).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(800).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
  sleep(1000).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(1200).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
  sleep(1400).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
}

module.exports = {
  pointDistance,
  sleep,
  ballWarning,
};

//   __  ____ ____ _  _ 
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
