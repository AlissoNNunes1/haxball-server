// Balanceamento hibrido combinando Elo geral, Elo por posicao e forma recente
export function scorePlayer(ratings, recentPerformance) {
  const base = ratings?.overall ?? 1000;
  const position = ratings?.byPosition ?? {};
  const recent = recentPerformance ?? 0;
  const positionWeight = 0.6;
  const recentWeight = 0.2;
  const overallWeight = 1 - positionWeight - recentWeight;
  return overallWeight * base + positionWeight * (position?.value ?? base) + recentWeight * recent;
}

export function sortPlayers(players) {
  return [...players].sort(
    (a, b) => scorePlayer(b.ratings, b.recent) - scorePlayer(a.ratings, a.recent)
  );
}

export function splitTeams(sortedPlayers) {
  const red = [];
  const blue = [];
  sortedPlayers.forEach((player, idx) => {
    if (idx % 2 === 0) red.push(player);
    else blue.push(player);
  });
  return { red, blue };
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
