'use server';
/**
 * @fileOverview A chatbot flow that can answer questions about branches and issues.
 *
 * - chat - A function that handles the chat conversation.
 */

import { ai } from '@/ai/genkit';
import { getBranches, getAllIssues } from '@/lib/firestore';
import { z } from 'zod';

// Define Zod schemas for our data structures
const BranchSchema = z.object({
  id: z.string().describe('The unique identifier for the branch.'),
  branchId: z.string().describe('The human-readable ID for the branch.'),
  name: z.string().describe('The name of the branch.'),
  ipAddress: z.string().describe('The IP address of the branch.'),
});

const IssueSchema = z.object({
    id: z.string().describe('The unique identifier for the issue.'),
    branchId: z.string().describe('The ID of the branch this issue belongs to.'),
    description: z.string().describe('A description of the issue.'),
    date: z.string().describe('The date the issue was opened, in ISO string format.'),
    responsibility: z.string().describe('The person or team responsible for the issue (e.g., CRDB, Zaoma, Wavetec).'),
    status: z.enum(['Open', 'In Progress', 'Resolved']).describe('The current status of the issue.'),
    ticketNumber: z.string().optional().describe('The ticket number associated with the issue.'),
    ticketUrl: z.string().optional().describe('The URL for the ticket.'),
    closingDate: z.string().optional().describe('The date the issue was closed, in ISO string format.'),
});


// Define tools for the AI to use
const getBranchesTool = ai.defineTool(
  {
    name: 'getBranches',
    description: 'Get a list of all bank branches.',
    outputSchema: z.array(BranchSchema),
  },
  async () => {
    return await getBranches();
  }
);

const getAllIssuesTool = ai.defineTool(
  {
    name: 'getAllIssues',
    description: 'Get a list of all issues across all branches.',
    outputSchema: z.array(IssueSchema),
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
      prompt: query,
      system: `
        You are a helpful assistant for an application called Branch Sentry.
        Your goal is to answer questions based on the data available to you.
        To do this, you MUST use the tools provided: 'getBranches' for questions about branches and 'getAllIssues' for questions about issues.
        The data is about bank branches and their reported issues.
        Be concise and answer only the user's question. Do not add any extra information or pleasantries.
        If you use the tools and still cannot find the information, say "I don't have enough information to answer that."
      `,
      tools: [getBranchesTool, getAllIssuesTool],
      model: 'googleai/gemini-2.5-flash',
    });

    return llmResponse.text;
  }
);

export async function chat(query: string): Promise<string> {
  return await chatFlow(query);
}
