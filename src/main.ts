import { mount } from 'svelte';
import App from './App.svelte';
import { loadGame } from './lib/game.svelte';

loadGame(0);

const app = mount(App, {
  target: document.getElementById('app')!
});

export default app;
