'use server';
/**
 * @fileOverview A chatbot flow that can answer questions about branches and issues.
 *
 * - chat - A function that handles the chat conversation.
 */

import { ai } from '@/ai/genkit';
import { getBranches, getAllIssues } from '@/lib/firestore';
import { z } from 'zod';

// Define tools for the AI to use
const getBranchesTool = ai.defineTool(
  {
    name: 'getBranches',
    description: 'Get a list of all branches.',
    outputSchema: z.any(),
  },
  async () => {
    return await getBranches();
  }
);

const getAllIssuesTool = ai.defineTool(
  {
    name: 'getAllIssues',
    description: 'Get a list of all issues across all branches.',
    outputSchema: z.any(),
  },
  async () => {
    return await getAllIssues();
  }
);


const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (query) => {
    const llmResponse = await ai.generate({
      prompt: `
        You are a helpful assistant for an application called Branch Sentry.
        Your goal is to answer questions based on the data available to you through the provided tools.
        The data is about bank branches and their reported issues.
        Be concise and answer only the user's question. Do not add any extra information or pleasantries.
        If you don't know the answer or the data is not available, say "I don't have enough information to answer that."

        User question: ${query}
      `,
      tools: [getBranchesTool, getAllIssuesTool],
    });

    return llmResponse.text;
  }
);

export async function chat(query: string): Promise<string> {
  return await chatFlow(query);
}
