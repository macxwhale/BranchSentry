import { NextResponse } from 'next/server';
import { getAllIssues, getBranches } from '@/lib/firestore';
import { sendNotificationApi } from '@/lib/notifications';
import { Issue, Branch } from '@/lib/types';
import { format } from 'date-fns';

export async function GET() {
  try {
    const [allIssues, allBranches] = await Promise.all([
        getAllIssues(),
        getBranches()
    ]);

    const openIssues = allIssues.filter(
      (issue) => issue.status === 'Open' || issue.status === 'In Progress'
    );

    if (openIssues.length === 0) {
      console.log('No open issues to report.');
      return NextResponse.json({ message: 'No open issues to report.' });
    }

    const branchesById = allBranches.reduce((acc, branch) => {
        acc[branch.id] = branch;
        return acc;
    }, {} as Record<string, Branch>);

    const issuesByResponsibility = openIssues.reduce((acc, issue) => {
      const { responsibility } = issue;
      if (!acc[responsibility]) {
        acc[responsibility] = [];
      }
      acc[responsibility].push(issue);
      return acc;
    }, {} as Record<string, Issue[]>);

    let markdownBody = `**Daily Open Issues Report - ${format(new Date(), 'dd MMM yyyy')}**\n\n`;
    markdownBody += `There are currently **${openIssues.length}** open or in-progress issues.\n\n---\n\n`;

    for (const responsibility in issuesByResponsibility) {
      markdownBody += `### 👤 Assigned to: ${responsibility}\n`;
      const issues = issuesByResponsibility[responsibility];
      
      issues.forEach(issue => {
        const branchName = branchesById[issue.branchId]?.name || 'Unknown Branch';
        markdownBody += `- **${branchName}**: ${issue.description} (Status: *${issue.status}*, Opened: *${format(new Date(issue.date), 'dd MMM')}*)\n`;
      });
      markdownBody += `\n`;
    }

    await sendNotificationApi({
        channel: 'telegram',
        title: `🚨 ${openIssues.length} Open Issues Report`,
        body: markdownBody,
        format: 'markdown',
        notify_type: 'info',
        silent: false,
    });

    return NextResponse.json({ message: 'Open issues report sent successfully.' });
  } catch (error)_ {
    console.error('Failed to send open issues report:', error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return new NextResponse(JSON.stringify({ message: `Failed to send report: ${errorMessage}` }), { status: 500 });
  }
}
