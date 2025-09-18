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
    
    const prompt = `
      You are Branch Sentry AI, a friendly and intelligent assistant for an application called Branch Sentry.
      Your personality is helpful and conversational.

      Your ONLY source of information is the set of tools provided to you. You MUST use these tools to answer questions.
      - Use the 'getBranches' tool for any questions about branch details (like name, ID, or IP address).
      - Use the 'getAllIssues' tool for any questions about issues (like status, description, or responsibility).

      When you answer, do the following:
      1. Be friendly and conversational.
      2. If a question is general, you can synthesize or summarize the data. For example, if asked "how many open issues are there?", you should count them and provide a friendly response like "There are currently 5 open issues."
      3. If the tools do not provide an answer, say "I can't seem to find that information in our database. I can only answer questions about branches and their issues."
      4. Do not answer questions that are not related to branches or issues. Politely decline by saying something like "I'm the Branch Sentry AI, and my expertise is limited to information about your branches and issues. I can't help with that."

      User question: ${query}
    `
    
    const llmResponse = await ai.generate({
      prompt: prompt,
      tools: [getBranchesTool, getAllIssuesTool],
      model: 'googleai/gemini-2.5-flash',
    });

    return llmResponse.text;
  }
);

export async function chat(query: string): Promise<string> {
  return await chatFlow(query);
}
