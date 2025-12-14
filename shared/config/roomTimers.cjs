// Central registry de timers por sala
// Permite registrar e limpar timers (intervals/timeouts/immediates) associados a uma sala

function _getRegistry() {
  const key = '__CIRS_ROOM_TIMERS__';
  if (!globalThis[key]) globalThis[key] = new Map();
  return globalThis[key];
}

function _getRoomKey(room) {
  if (!room) return 'global';
  if (typeof room === 'string' || typeof room === 'number') return String(room);
  return room.id ?? room.link ?? room.name ?? JSON.stringify(room);
}

function registerTimer(room, handle, type = 'interval') {
  const registry = _getRegistry();
  const key = _getRoomKey(room);
  if (!registry.has(key)) registry.set(key, []);
  registry.get(key).push({ handle, type });
}
function registerNamedTimer(room, name, handle, type = 'interval') {
  const registry = _getRegistry();
  const key = _getRoomKey(room);
  if (!registry.has(key)) registry.set(key, []);
  registry.get(key).push({ name, handle, type });
}

function hasNamedTimer(room, name) {
  const registry = _getRegistry();
  const key = _getRoomKey(room);
  const items = registry.get(key) || [];
  return items.some((i) => i.name === name);
}

function createNamedInterval(room, name, fn, ms) {
  if (hasNamedTimer(room, name)) return null;
  const handle = setInterval(fn, ms);
  if (handle && typeof handle.unref === 'function') try { handle.unref(); } catch (e) {}
  registerNamedTimer(room, name, handle, 'interval');
  return handle;
}

function createNamedTimeout(room, name, fn, ms) {
  if (hasNamedTimer(room, name)) return null;
  const handle = setTimeout(fn, ms);
  if (handle && typeof handle.unref === 'function') try { handle.unref(); } catch (e) {}
  registerNamedTimer(room, name, handle, 'timeout');
  return handle;
}

function createInterval(room, fn, ms) {
  const handle = setInterval(fn, ms);
  if (handle && typeof handle.unref === 'function') try { handle.unref(); } catch (e) {}
  registerTimer(room, handle, 'interval');
  return handle;
}

function createTimeout(room, fn, ms) {
  const handle = setTimeout(fn, ms);
  if (handle && typeof handle.unref === 'function') try { handle.unref(); } catch (e) {}
  registerTimer(room, handle, 'timeout');
  return handle;
}

function createImmediate(room, fn) {
  const handle = setImmediate(fn);
  if (handle && typeof handle.unref === 'function') try { handle.unref(); } catch (e) {}
  registerTimer(room, handle, 'immediate');
  return handle;
}

function clearRoomTimers(room) {
  const registry = _getRegistry();
  const key = _getRoomKey(room);
  const items = registry.get(key);
  if (!items) return;
  for (const { handle, type } of items) {
    try {
      if (type === 'interval') clearInterval(handle);
      else if (type === 'timeout') clearTimeout(handle);
      else if (type === 'immediate') clearImmediate(handle);
      else if (handle && typeof handle.cancel === 'function') handle.cancel();
    } catch (e) {
      try { console.error('[TIMERS] Erro ao limpar timer:', e); } catch (ee) {}
    }
  }
  registry.delete(key);
}

function clearNamedTimer(room, name) {
  const registry = _getRegistry();
  const key = _getRoomKey(room);
  const items = registry.get(key);
  if (!items) return;
  const keep = [];
  for (const it of items) {
    if (it.name === name) {
      try {
        if (it.type === 'interval') clearInterval(it.handle);
        else if (it.type === 'timeout') clearTimeout(it.handle);
        else if (it.type === 'immediate') clearImmediate(it.handle);
      } catch (e) {
        // noop
      }
    } else {
      keep.push(it);
    }
  }
  if (keep.length > 0) registry.set(key, keep); else registry.delete(key);
}

function clearAllRoomTimers() {
  const registry = _getRegistry();
  for (const key of Array.from(registry.keys())) {
    clearRoomTimers(key);
  }
}

function hasRoomTimers(room) {
  const registry = _getRegistry();
  const key = _getRoomKey(room);
  const items = registry.get(key);
  return !!(items && items.length > 0);
}

module.exports = {
  registerTimer,
  registerNamedTimer,
  hasNamedTimer,
  createNamedInterval,
  createNamedTimeout,
  createInterval,
  createTimeout,
  createImmediate,
  clearRoomTimers,
  clearNamedTimer,
  clearAllRoomTimers,
  hasRoomTimers,
};
