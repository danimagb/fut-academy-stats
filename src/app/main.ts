// Startup: connect screens, actions, listeners, sync and timers, then draw the first screen.
import { boot, start } from './boot';

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
start();
