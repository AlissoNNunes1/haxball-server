import { initDb } from '../dist/database/client.js';

async function main() {
  const db = initDb('./haxball-test.sqlite');
  const sessionId = await db.createRoomSession('test-room');
  console.log('sessionId', sessionId);
  const matchId = await db.createMatch(sessionId);
  console.log('matchId', matchId);
  const userId = await db.ensureUserByName('testuser', 'discord-123');
  console.log('userId', userId);
  await db.insertMatchEvent(matchId, userId, 'touch', { x: 1 }, Date.now());
  await db.incrementStatCount(matchId, userId, 'touches', 1);
  console.log('Wrote test event');
}

main().catch((e) => console.error(e));
