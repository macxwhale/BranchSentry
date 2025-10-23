
"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { sendNotification, type FormState } from "@/lib/notifications";
import { Switch } from "@/components/ui/switch";
import { ReportConfiguration } from "@/lib/types";
import { getReportConfigurations, updateReportConfiguration } from "@/lib/firestore";
import { Skeleton } from "@/components/ui/skeleton";

const initialState: FormState = {
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending..." : "Send Notification"}
    </Button>
  );
}

function ReportConfigRow({ config, onUpdate, isSaving }: { config: ReportConfiguration, onUpdate: (config: ReportConfiguration) => void, isSaving: boolean }) {
    return (
        <div className="flex items-center justify-between space-x-4">
            <div className="font-medium">{config.id}</div>
            <div className="flex items-center space-x-2">
                <Label htmlFor={`time-${config.id}`} className="sr-only">Time</Label>
                <Input
                    id={`time-${config.id}`}
                    type="time"
                    value={config.time}
                    onChange={(e) => onUpdate({ ...config, time: e.target.value })}
                    className="w-[120px]"
                    disabled={isSaving}
                />
                <Label htmlFor={`enabled-${config.id}`} className="sr-only">Enabled</Label>
                <Switch
                    id={`enabled-${config.id}`}
                    checked={config.enabled}
                    onCheckedChange={(checked) => onUpdate({ ...config, enabled: checked })}
                    disabled={isSaving}
                />
            </div>
        </div>
    );
}

export default function SettingsPage() {
  const [formState, formAction] = useActionState(sendNotification, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isSendingReport, setIsSendingReport] = React.useState(false);
  const [reportConfigs, setReportConfigs] = React.useState<ReportConfiguration[]>([]);
  const [loadingConfigs, setLoadingConfigs] = React.useState(true);
  const [isSavingConfig, setIsSavingConfig] = React.useState(false);

  const responsibleParties = ['CRDB', 'Zaoma', 'Wavetec'];

  React.useEffect(() => {
    async function fetchConfigs() {
      setLoadingConfigs(true);
      try {
        const configsFromDb = await getReportConfigurations();
        const configsMap = new Map(configsFromDb.map(c => [c.id, c]));
        
        const initialConfigs = responsibleParties.map(id => {
          const existingConfig = configsMap.get(id);
          return existingConfig || { id, time: '09:00', enabled: true };
        });

        setReportConfigs(initialConfigs);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not fetch report configurations." });
      } finally {
        setLoadingConfigs(false);
      }
    }
    fetchConfigs();
  }, [toast]);


  React.useEffect(() => {
    if (formState.message) {
      if (formState.errors) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: formState.message,
        });
      } else {
        toast({
          title: "Success",
          description: formState.message,
        });
        formRef.current?.reset();
      }
    }
  }, [formState, toast]);

  const handleSendReport = async () => {
    setIsSendingReport(true);
    try {
        const response = await fetch('/api/cron/send-open-issues-report');
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to send report.');
        }
        toast({
            title: "Report Sent",
            description: "The open issues report has been successfully sent.",
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error Sending Report",
            description: error.message || "An unknown error occurred.",
        });
    } finally {
        setIsSendingReport(false);
    }
  };

  const handleConfigUpdate = (updatedConfig: ReportConfiguration) => {
    setReportConfigs(reportConfigs.map(c => c.id === updatedConfig.id ? updatedConfig : c));
  };
  
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await Promise.all(reportConfigs.map(config => updateReportConfiguration(config)));
      toast({
        title: "Configuration Saved",
        description: "Your report settings have been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Saving",
        description: "Could not save report configurations.",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification System</CardTitle>
          <CardDescription>
            Send alerts and notifications to various channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter notification title"
              />
               {formState.errors?.title && <p className="text-destructive text-sm">{formState.errors.title.join(", ")}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                name="body"
                placeholder="Enter notification body. Markdown is supported."
                className="min-h-32"
              />
              {formState.errors?.body && <p className="text-destructive text-sm">{formState.errors.body.join(", ")}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="grid gap-2">
                    <Label htmlFor="channel">Channel</Label>
                    <Input
                        id="channel"
                        name="channel"
                        placeholder="e.g., telegram"
                    />
                    {formState.errors?.channel && <p className="text-destructive text-sm">{formState.errors.channel.join(", ")}</p>}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="notify_type">Notification Type</Label>
                    <Select name="notify_type" defaultValue="info">
                        <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="format">Format</Label>
                    <Select name="format" defaultValue="markdown">
                        <SelectTrigger>
                        <SelectValue placeholder="Select a format" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex items-center space-x-2 pt-6">
                    <Switch id="silent" name="silent" />
                    <Label htmlFor="silent">Send Silently</Label>
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="attach">Attachment URL (Optional)</Label>
                <Input
                    id="attach"
                    name="attach"
                    placeholder="https://example.com/image.png"
                />
                 {formState.errors?.attach && <p className="text-destructive text-sm">{formState.errors.attach.join(", ")}</p>}
            </div>


            <div className="flex justify-end">
              <SubmitButton />
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Automated Reports</CardTitle>
          <CardDescription>
            Configure and manually trigger automated reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
             <h3 className="text-lg font-medium">Daily Report Schedule (UTC)</h3>
             {loadingConfigs ? (
                <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
             ) : (
                reportConfigs.map(config => (
                  <ReportConfigRow key={config.id} config={config} onUpdate={handleConfigUpdate} isSaving={isSavingConfig} />
                ))
             )}
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex justify-between items-center">
          <Button onClick={handleSaveConfig} disabled={isSavingConfig}>
            {isSavingConfig ? 'Saving...' : 'Save Report Schedule'}
          </Button>
          <Button onClick={handleSendReport} disabled={isSendingReport} variant="secondary">
            {isSendingReport ? 'Sending Report...' : 'Send Open Issues Report Now'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
