'use server';

/**
 * @fileOverview Anomaly detection summary flow.
 *
 * - anomalyDetectionSummary - A function that detects anomalies and summarizes them.
 * - AnomalyDetectionSummaryInput - The input type for the anomalyDetectionSummary function.
 * - AnomalyDetectionSummaryOutput - The return type for the anomalyDetectionSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnomalyDetectionSummaryInputSchema = z.object({
  branchId: z.string().describe('The ID of the branch to analyze.'),
  issueHistory: z.string().describe('A complete history of issues for the branch, sorted by date.'),
  systemPerformanceMetrics: z.string().describe('System performance metrics for the branch.'),
});
export type AnomalyDetectionSummaryInput = z.infer<typeof AnomalyDetectionSummaryInputSchema>;

const AnomalyDetectionSummaryOutputSchema = z.object({
  summary: z.string().describe('A short summary of the anomalies detected.'),
});
export type AnomalyDetectionSummaryOutput = z.infer<typeof AnomalyDetectionSummaryOutputSchema>;

export async function anomalyDetectionSummary(input: AnomalyDetectionSummaryInput): Promise<AnomalyDetectionSummaryOutput> {
  return anomalyDetectionSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'anomalyDetectionSummaryPrompt',
  input: {schema: AnomalyDetectionSummaryInputSchema},
  output: {schema: AnomalyDetectionSummaryOutputSchema},
  prompt: `You are an expert anomaly detection system. Analyze the following data and provide a short summary of the anomalies detected.

Branch ID: {{{branchId}}}
Issue History: {{{issueHistory}}}
System Performance Metrics: {{{systemPerformanceMetrics}}}

Summary:`,
});

const anomalyDetectionSummaryFlow = ai.defineFlow(
  {
    name: 'anomalyDetectionSummaryFlow',
    inputSchema: AnomalyDetectionSummaryInputSchema,
    outputSchema: AnomalyDetectionSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
