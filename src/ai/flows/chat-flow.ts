'use server';
/**
 * @fileOverview A chatbot flow that can answer questions about branches and issues.
 *
 * - chat - A function that handles the chat conversation.
 */

import { ai } from '@/ai/genkit';
import { collection, getDocs } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { Branch, Issue } from '@/lib/types';
import { z } from 'zod';
import { subDays, formatISO } from 'date-fns';
import { addIssue, updateBranch } from '@/lib/firestore';

// Define Zod schemas for our data structures
const BranchSchema = z.object({
  id: z.string().describe('The unique identifier for the branch.'),
  branchId: z.string().describe('The human-readable ID for the branch.'),
  name: z.string().describe('The name of the branch.'),
  ipAddress: z.string().describe('The IP address of the branch.'),
  lastWorked: z.string().optional().describe('The last time the branch was confirmed to be working, in ISO string format.'),
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
    const branchesCol = collection(db, 'branches');
    const branchSnapshot = await getDocs(branchesCol);
    const branchList = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
    return branchList;
  }
);

const getAllIssuesTool = ai.defineTool(
  {
    name: 'getAllIssues',
    description: 'Get a list of all issues across all branches.',
    outputSchema: z.array(IssueSchema),
  },
  async () => {
    const issuesCol = collection(db, 'issues');
    const issueSnapshot = await getDocs(issuesCol);
    const issueList = issueSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
    return issueList;
  }
);

const logIssueTool = ai.defineTool(
  {
    name: 'logIssue',
    description: 'Log a new issue for a branch.',
    inputSchema: z.object({
      branchName: z.string().describe('The name of the branch to log the issue against.'),
      description: z.string().describe('The description of the new issue.'),
      responsibility: z.enum(['CRDB', 'Zaoma', 'Wavetec']).describe('Who is responsible for this issue.'),
    }),
    outputSchema: z.string(),
  },
  async ({ branchName, description, responsibility }) => {
    const branchesCol = collection(db, 'branches');
    const branchSnapshot = await getDocs(branchesCol);
    const branches = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));

    const targetBranch = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase());

    if (!targetBranch) {
      return `Error: Could not find a branch named '${branchName}'. Please use one of the existing branch names.`;
    }

    try {
      await addIssue({
        branchId: targetBranch.id,
        description,
        responsibility,
        status: 'Open',
        date: new Date().toISOString(),
      });
      return `Successfully logged a new issue for the ${targetBranch.name} branch.`;
    } catch (e) {
      return 'Error: There was a problem logging the new issue.';
    }
  }
);

const getDateFromDaysAgoTool = ai.defineTool(
    {
      name: 'getDateFromDaysAgo',
      description: 'Calculates a date that was a certain number of days in the past. Useful for filtering issues by a time window (e.g., "last 7 days").',
      inputSchema: z.object({
          days: z.number().describe('The number of days to go back from today.'),
      }),
      outputSchema: z.string(),
    },
    async ({ days }) => {
      const pastDate = subDays(new Date(), days);
      return formatISO(pastDate);
    }
);

const updateLastWorkedFromTicketDataTool = ai.defineTool(
  {
    name: 'updateLastWorkedFromTicketData',
    description: 'Processes a list of branches with their total ticket counts and updates their `lastWorked` status in the database. This should be used when the user provides a JSON string containing an array of branch objects and asks to update their status.',
    inputSchema: z.object({
      branchData: z.string().describe('A JSON string representing an array of branch objects. Each object must have "name" (string) and "totalTickets" (number) properties.'),
    }),
    outputSchema: z.string(),
  },
  async ({ branchData }) => {
    let branchesToProcess: { name: string; totalTickets: number }[];
    try {
      branchesToProcess = JSON.parse(branchData);
    } catch (e) {
      return "Error: The provided data is not a valid JSON string. Please provide the data in the correct JSON format.";
    }

    if (!Array.isArray(branchesToProcess) || branchesToProcess.length === 0) {
      return "Error: No data provided to process, or the JSON is not an array.";
    }
    
    const branchesCol = collection(db, 'branches');
    const branchSnapshot = await getDocs(branchesCol);
    const allBranches = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
    const branchesByName = new Map(allBranches.map(b => [b.name.toLowerCase(), b]));

    let updatedCount = 0;
    const updatePromises: Promise<any>[] = [];
    const newDate = new Date().toISOString();

    for (const branch of branchesToProcess) {
      if (!branch.name || typeof branch.totalTickets !== 'number') continue;
      
      const name = branch.name.trim();
      const totalTickets = branch.totalTickets;

      const branchToUpdate = branchesByName.get(name.toLowerCase());

      if (branchToUpdate && totalTickets > 0) {
        updatePromises.push(
          updateBranch(branchToUpdate.id, { lastWorked: newDate })
        );
        updatedCount++;
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    return `Successfully processed the JSON data. Updated the 'lastWorked' status for ${updatedCount} branches.`;
  }
);


const chatPrompt = ai.definePrompt(
  {
    name: 'chatPrompt',
    input: { schema: z.string() },
    output: { schema: z.string() },
    tools: [getBranchesTool, getAllIssuesTool, logIssueTool, getDateFromDaysAgoTool, updateLastWorkedFromTicketDataTool],
    prompt: `
      You are Branch Sentry AI, a friendly and powerful assistant for an application called Branch Sentry.
      Your personality is helpful, proactive, and conversational.

      Your ONLY source of information is the set of tools provided to you. You MUST use these tools to answer questions and perform actions.

      **CRITICAL INSTRUCTIONS:**
      1.  **Tool Usage:**
        *   Use 'getBranches' for any questions about branch details (like name, ID, or IP address).
        *   Use 'getAllIssues' for any questions about issues (like status, description, or responsibility).
        *   Use 'logIssue' when the user asks you to create, log, or add a new issue. You will need to ask for the branch name, description, and who is responsible if it is not provided.
        *   Use 'getDateFromDaysAgo' when the user asks a question about a specific time period, like "in the last week" or "in the last 30 days".
        *   Use 'updateLastWorkedFromTicketData' when the user provides a JSON string containing an array of branch objects, and asks to update the system based on this data. The tool will handle updating the 'lastWorked' date for branches with more than zero tickets.

      2.  **Answering Questions About Specific Branches:**
        *   To answer a question like "What issues does Tarime branch have?", you must first find the branch in the output of 'getBranches'. **Perform a case-insensitive search** for the branch name.
        *   Once you find the branch, get its 'id'.
        *   Then, filter the output of 'getAllIssues' to find issues where the 'branchId' matches the branch's 'id'.
        *   If you find the branch but there are no matching issues, you should say something like "The Tarime branch currently has no open issues."
      
      3.  **General Behavior:**
        *   If a question is general (e.g., "how many open issues are there?"), you should synthesize, summarize, and analyze the data. Count them and provide a friendly response like "There are currently 5 open issues."
        *   If you need more information to use a tool (like the branch name for logging an issue), ask the user for it.
        *   If you use the tools and still cannot find the information (e.g., a branch name does not exist), say "I can't seem to find that information in our database. I can only answer questions about branches and their issues."
        *   Do not answer questions that are not related to branches or issues. Politely decline by saying something like "I'm the Branch Sentry AI, and my expertise is limited to information about your branches and issues. I can't help with that."

      User question: {{input}}
    `,
  }
);


const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (query) => {
    let llmResponse = await chatPrompt(query);

    while (llmResponse.toolRequests.length > 0) {
      const toolResponses = await Promise.all(
        llmResponse.toolRequests.map(async (toolRequest) => {
          return {
            toolResult: await ai.runTool(toolRequest),
          };
        })
      );
      
      llmResponse = await chatPrompt(query, { toolResponses });
    }
    
    return llmResponse.text;
  }
);

export async function chat(query: string): Promise<string> {
  return await chatFlow(query);
}
