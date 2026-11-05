// Startup. The screens still live in app/legacy.js (step 6 moves them into pages/ and
// features/); importing it sets them up, and start() draws the first screen.
import { start } from './legacy';

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

start();
