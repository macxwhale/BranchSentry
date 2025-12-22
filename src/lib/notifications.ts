"use server";

import { z } from "zod";

const notificationSchema = z.object({
  channel: z.string().min(1, "Channel is required."),
  title: z.string().min(1, "Title is required."),
  body: z.string().min(1, "Body is required."),
  format: z.enum(["markdown", "html", "text"]),
  notify_type: z.enum(["success", "info", "warning", "error"]),
  silent: z.boolean(),
  attach: z.string().url("Attachment must be a valid URL.").optional().or(z.literal('')),
});

const notificationApiSchema = notificationSchema.extend({
    attach: z.array(z.string().url()).optional(),
})

export type NotificationInput = z.infer<typeof notificationSchema>;
export type FormState = {
    message: string;
    errors?: {
        [key in keyof NotificationInput]?: string[];
    };
};

/**
 * Sends a notification to the configured notification service.
 * @param notification - The notification object to send.
 * @returns A promise that resolves to the response from the notification service.
 */
export async function sendNotificationApi(notification: z.infer<typeof notificationApiSchema>) {
    try {
        const payload: any = { ...notification };
        
        // If attach is present but is an empty array, remove it.
        // The API might reject requests with an empty `attach` field.
        if (payload.attach && payload.attach.length === 0) {
            delete payload.attach;
        }

        const response = await fetch("https://notify-woi3.onrender.com/api/notify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.NOTIFY_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Notification API Error:", errorBody);
            throw new Error(`API request failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to send notification:", error);
        throw error;
    }
}


export async function sendNotification(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = notificationSchema.safeParse({
        channel: formData.get("channel"),
        title: formData.get("title"),
        body: formData.get("body"),
        format: formData.get("format"),
        notify_type: formData.get("notify_type"),
        silent: formData.get("silent") === "on",
        attach: formData.get("attach"),
    });

    if (!validatedFields.success) {
        return {
            message: "Validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const requestBody: any = { ...validatedFields.data };
    if (!requestBody.attach) {
        delete requestBody.attach;
    } else {
        requestBody.attach = [requestBody.attach];
    }

    try {
        await sendNotificationApi(requestBody);
        return { message: "Notification sent successfully!" };
    } catch (error) {
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { message: `Failed to send notification: ${errorMessage}` };
    }
}
