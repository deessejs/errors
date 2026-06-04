import { registerProvider } from '@flue/runtime';
import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';

// Register MiniMax as an OpenAI-compatible provider
registerProvider('minimax', {
  api: 'openai-completions',
  baseUrl: 'https://api.minimax.io/v1',
  headers: {
    'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
  },
});

// Create the app
const app = new Hono();
app.route('/', flue());

export default app;