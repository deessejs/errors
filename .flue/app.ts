import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';

// Create the app
const app = new Hono();
app.route('/', flue());

export default app;