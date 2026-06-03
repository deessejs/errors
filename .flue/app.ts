import { registerProvider } from '@flue/runtime';
import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';

// Register MiniMax as an OpenAI-compatible provider
// MiniMax's endpoint accepts OpenAI-compatible requests
registerProvider('minimax', {
  api: 'openai-completions',
  baseUrl: 'https://api.minimax.io/v1',
  apiKey: process.env.MINIMAX_API_KEY,
});

// Create the app
const app = new Hono();
app.route('/', flue());

export default app;