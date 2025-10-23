
import { NextResponse } from 'next/server';
import { getAllIssues, getBranches, getReportConfigurations } from '@/lib/firestore';
import { sendNotificationApi } from '@/lib/notifications';
import { Issue, Branch, ReportConfiguration } from '@/lib/types';
import { format } from 'date-fns-tz';

function formatDefaultIssueList(issues: Issue[], branchesById: Record<string, Branch>): string {
    let issueListStr = "";
    issues.forEach(issue => {
        const branchName = branchesById[issue.branchId]?.name || 'Unknown Branch';
        issueListStr += `**🏢 Branch: ${branchName}**\n`;
        issueListStr += `📊 Status: ${issue.status}\n`;
        issueListStr += `🐛 Issue: ${issue.description}\n`;
        issueListStr += `_(Opened: ${format(new Date(issue.date), 'dd MMM')})_\n\n`;
    });
    return issueListStr;
}

function formatReportBody(
    config: ReportConfiguration, 
    issues: Issue[], 
    branchesById: Record<string, Branch>
): { title: string, body: string } {
    const assignee = config.id;
    const issueCount = issues.length;
    const currentDate = format(new Date(), 'dd MMM yyyy');

    const issueList = formatDefaultIssueList(issues, branchesById);

    // Default title and body
    let title = `🚨 ${issueCount} Open Issues Report for ${assignee}`;
    let body = `**🚨 Daily Open Issues Report for ${assignee} - ${currentDate}**\n\n`;
    body += `There are currently **${issueCount}** open or in-progress issues assigned to you.\n\n---\n\n`;
    body += issueList;

    // Use custom templates if they exist
    if (config.reportTitle) {
        title = config.reportTitle
            .replace(/{assignee}/g, assignee)
            .replace(/{issueCount}/g, issueCount.toString())
            .replace(/{date}/g, currentDate);
    }

    if (config.reportBody) {
        body = config.reportBody
            .replace(/{assignee}/g, assignee)
            .replace(/{issueCount}/g, issueCount.toString())
            .replace(/{date}/g, currentDate)
            .replace(/{issueList}/g, issueList);
    }
    
    return { title, body };
}

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
    
    const configMap = new Map(reportConfigs.map(c => [c.id, c]));

    // --- Manual Trigger Logic ---
    if (manualTrigger) {
        let reportsSentCount = 0;
        const teamsWithIssues = Object.keys(issuesByResponsibility);

        if (teamsWithIssues.length === 0) {
            return NextResponse.json({ message: 'Manual trigger: No open issues to report for any team.' });
        }

        for (const team of teamsWithIssues) {
            const issuesForTeam = issuesByResponsibility[team];
            const teamConfig = configMap.get(team) || { id: team, time: '09:00', enabled: true }; // Default config
            
            if (issuesForTeam && issuesForTeam.length > 0) {
                const { title, body } = formatReportBody(teamConfig, issuesForTeam, branchesById);
                await sendNotificationApi({
                    channel: 'telegram',
                    title,
                    body,
                    format: 'markdown',
                    notify_type: 'info',
                    silent: false,
                });
                reportsSentCount++;
            }
        }
        
        if (reportsSentCount > 0) {
            return NextResponse.json({ message: `Manually triggered ${reportsSentCount} report(s) successfully.` });
        } else {
            return NextResponse.json({ message: 'No teams had open issues to report.' });
        }
    }

    // --- Scheduled Cron Job Logic ---
    if (openIssues.length === 0) {
      console.log('Cron job ran: No open issues to report.');
      return NextResponse.json({ message: 'Cron job ran. No open issues.' });
    }

    const nowUTC = new Date();
    const currentTimeUTC = format(nowUTC, 'HH:mm', { timeZone: 'UTC' });
    let reportsSentCount = 0;

    for (const config of reportConfigs) {
      if (config.enabled && config.time === currentTimeUTC) {
        const responsibility = config.id;
        const issuesForTeam = issuesByResponsibility[responsibility];

        if (issuesForTeam && issuesForTeam.length > 0) {
          const { title, body } = formatReportBody(config, issuesForTeam, branchesById);
          await sendNotificationApi({
            channel: 'telegram',
            title,
            body,
            format: 'markdown',
            notify_type: 'info',
            silent: false,
          });
          reportsSentCount++;
        }
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
