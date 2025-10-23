
import { NextResponse } from 'next/server';
import { getAllIssues, getBranches, getReportConfigurations } from '@/lib/firestore';
import { sendNotificationApi } from '@/lib/notifications';
import { Issue, Branch, ReportConfiguration } from '@/lib/types';
import { format } from 'date-fns-tz';

const DEFAULT_CONFIG_ID = "default";

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


async function sendConfiguredReport(config: ReportConfiguration, issues: Issue[], branchesById: Record<string, Branch>) {
    const { title, body } = formatReportBody(config, issues, branchesById);

    const notificationPayload: Parameters<typeof sendNotificationApi>[0] = {
        channel: config.channel || 'telegram',
        title,
        body,
        format: 'markdown',
        notify_type: config.notify_type || 'info',
        silent: config.silent ?? false,
    };

    if (config.attach) {
        notificationPayload.attach = [config.attach];
    }

    await sendNotificationApi(notificationPayload);
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
    const defaultConfig: ReportConfiguration = configMap.get(DEFAULT_CONFIG_ID) || {
        id: DEFAULT_CONFIG_ID,
        time: '09:00',
        enabled: true,
        channel: 'telegram',
        notify_type: 'info',
        silent: false,
        attach: '',
        reportTitle: '',
        reportBody: '',
    };


    // --- Manual Trigger Logic ---
    if (manualTrigger) {
        let reportsSentCount = 0;
        const responsiblePartiesWithOpenIssues = Object.keys(issuesByResponsibility);

        if (responsiblePartiesWithOpenIssues.length === 0) {
            return NextResponse.json({ message: 'No teams had open issues to report.' });
        }

        for (const team of responsiblePartiesWithOpenIssues) {
            const issuesForTeam = issuesByResponsibility[team];
            const teamSpecificConfig = configMap.get(team) || {};
            // Merge defaults with team-specific settings
            const finalConfig = { ...defaultConfig, ...teamSpecificConfig, id: team };
            
            await sendConfiguredReport(finalConfig, issuesForTeam, branchesById);
            reportsSentCount++;
        }
        
        return NextResponse.json({ message: `Manually triggered ${reportsSentCount} report(s) successfully.` });
    }

    // --- Scheduled Cron Job Logic ---
    if (openIssues.length === 0) {
      console.log('Cron job ran: No open issues to report.');
      return NextResponse.json({ message: 'Cron job ran. No open issues.' });
    }

    const now = new Date();
    const currentTimeEAT = format(now, 'HH:mm', { timeZone: 'Africa/Nairobi' });
    let reportsSentCount = 0;
    
    const teamConfigs = reportConfigs.filter(c => c.id !== DEFAULT_CONFIG_ID);

    for (const teamConfig of teamConfigs) {
      if (teamConfig.enabled && teamConfig.time === currentTimeEAT) {
        const responsibility = teamConfig.id;
        const issuesForTeam = issuesByResponsibility[responsibility];

        if (issuesForTeam && issuesForTeam.length > 0) {
          const finalConfig = { ...defaultConfig, ...teamConfig };
          await sendConfiguredReport(finalConfig, issuesForTeam, branchesById);
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
