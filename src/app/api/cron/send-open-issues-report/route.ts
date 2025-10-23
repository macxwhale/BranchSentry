
import { NextResponse } from 'next/server';
import { getAllIssues, getBranches, getReportConfigurations } from '@/lib/firestore';
import { sendNotificationApi } from '@/lib/notifications';
import { Issue, Branch, ReportConfiguration } from '@/lib/types';
import { format, formatInTimeZone } from 'date-fns-tz';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const manualTrigger = searchParams.get('manual') === 'true';

  try {
    const [allIssues, allBranches, reportConfigs] = await Promise.all([
      getAllIssues(),
      getBranches(),
      getReportConfigurations(),
    ]);

    const openIssues = allIssues.filter(
      (issue) => issue.status === 'Open' || issue.status === 'In Progress'
    );

    if (openIssues.length === 0) {
      console.log('No open issues to report.');
      if (manualTrigger) {
        return NextResponse.json({ message: 'No open issues to report.' });
      }
      return NextResponse.json({ message: 'Cron job ran. No open issues.' });
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

    // Get current time in UTC
    const nowUTC = new Date();
    const currentTimeUTC = format(nowUTC, 'HH:mm', { timeZone: 'UTC' });

    let reportsSentCount = 0;

    for (const config of reportConfigs) {
      const shouldSend = (manualTrigger && config.id === 'CRDB') || // CRDB is a sample for manual trigger
                          (!manualTrigger && config.enabled && config.time === currentTimeUTC);

      if (shouldSend) {
        const responsibility = config.id;
        const issuesForTeam = issuesByResponsibility[responsibility];

        if (issuesForTeam && issuesForTeam.length > 0) {
          let markdownBody = `**🚨 Daily Open Issues Report for ${responsibility} - ${format(new Date(), 'dd MMM yyyy')}**\n\n`;
          markdownBody += `There are currently **${issuesForTeam.length}** open or in-progress issues assigned to you.\n\n---\n\n`;

          issuesForTeam.forEach(issue => {
            const branchName = branchesById[issue.branchId]?.name || 'Unknown Branch';
            markdownBody += `**🏢 Branch: ${branchName}**\n`;
            markdownBody += `📊 Status: ${issue.status}\n`;
            markdownBody += `🐛 Issue: ${issue.description}\n`;
            markdownBody += `_(Opened: ${format(new Date(issue.date), 'dd MMM')})_\n\n`;
          });

          await sendNotificationApi({
            channel: 'telegram', // This could be made configurable in the future
            title: `🚨 ${issuesForTeam.length} Open Issues Report for ${responsibility}`,
            body: markdownBody,
            format: 'markdown',
            notify_type: 'info',
            silent: false,
          });
          reportsSentCount++;
        }
      }
    }
    
    if (manualTrigger) {
         if (reportsSentCount > 0) {
            return NextResponse.json({ message: `Manually triggered report sent successfully to CRDB.` });
         } else {
             return NextResponse.json({ message: `CRDB has no open issues to report.` });
         }
    }

    return NextResponse.json({ message: `Cron job finished. Sent ${reportsSentCount} reports.` });

  } catch (error) {
    console.error('Failed to process and send open issues report:', error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return new NextResponse(JSON.stringify({ message: `Failed to process report: ${errorMessage}` }), { status: 500 });
  }
}
