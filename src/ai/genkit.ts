import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is automatically read from the GEMINI_API_KEY environment variable.
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
