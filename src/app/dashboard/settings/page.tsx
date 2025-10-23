
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

export default function SettingsPage() {
  const [formState, formAction] = useActionState(sendNotification, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isSendingReport, setIsSendingReport] = React.useState(false);


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
                Manually trigger automated reports. The "Open Issues Report" is also sent automatically every day at 9 AM UTC.
                </CardDescription>
            </CardHeader>
            <CardFooter className="border-t px-6 py-4">
                 <Button onClick={handleSendReport} disabled={isSendingReport}>
                    {isSendingReport ? 'Sending Report...' : 'Send Open Issues Report'}
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
