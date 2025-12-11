(async () => {
  try {
    const path = require('path');
    const { pathToFileURL } = require('url');
    const p = pathToFileURL(path.resolve('rooms/examples/mini-soccer.mjs')).href;
    console.log('Importing', p);
    const mod = await import(p);
    console.log('Loaded keys:', Object.keys(mod));
  } catch (e) {
    console.error('Error:', e && e.stack ? e.stack : e);
  }
})();
