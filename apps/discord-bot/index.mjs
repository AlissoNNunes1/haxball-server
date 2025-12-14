import { miniSoccerRoom } from '../../rooms/examples/mini-soccer.mjs';

// Adaptador para acoplar salas ESM diretamente ao Server legado
export function listAvailableRooms() {
  return [miniSoccerRoom].map((room) => ({ name: room.name ?? 'room', module: room }));
}

export function openRoomWithAdapter({ server, roomModule, token, settings = {} }) {
  if (!server) throw new Error('server obrigatorio');
  if (!roomModule) throw new Error('roomModule obrigatorio');
  return server.openWithModule(roomModule, token, roomModule?.name, settings);
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
