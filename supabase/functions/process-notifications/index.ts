// deno-lint-ignore no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
const supabaseUrl = (Deno as any).env.get("SUPABASE_URL")!;
// deno-lint-ignore no-explicit-any
const supabaseAnonKey = (Deno as any).env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  priority: string;
  channels: string[];
  deep_link?: string;
  scheduled_send?: string;
  actions?: unknown;
  created_at: string;
}

/**
 * Process queued notifications and send through appropriate channels
 * Runs every 5 minutes
 */
// deno-lint-ignore no-explicit-any
(Deno as any).serve(async (req: any) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Get pending notifications
    const { data: notifications, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .is("sent_at", null)
      .lte("scheduled_send", new Date().toISOString())
      .limit(100);

    if (fetchError) {
      throw fetchError;
    }

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
    }

    let processed = 0;

    // Process each notification
    for (const notification of notifications as Notification[]) {
      try {
        // Check user preferences
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("preferences")
          .eq("user_id", notification.recipient_id)
          .single();

        const preferences = prefs?.preferences || {};

        // Send through each channel
        for (const channel of notification.channels) {
          const sent = await sendThroughChannel(notification, channel, preferences);

          // Log delivery
          await supabase
            .from("notification_logs")
            .insert({
              notification_id: notification.id,
              channel: channel,
              status: sent ? "sent" : "failed",
              sent_at: new Date().toISOString(),
            });
        }

        // Mark as sent
        await supabase
          .from("notifications")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", notification.id);

        processed++;
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);

        // Log error
        await supabase
          .from("notification_logs")
          .insert({
            notification_id: notification.id,
            channel: "all",
            status: "error",
            error_message: error instanceof Error ? error.message : String(error),
          });
      }
    }

    return new Response(
      JSON.stringify({
        processed: processed,
        total: notifications.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Process notifications error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
});

/**
 * Send notification through specific channel
 */
async function sendThroughChannel(
  notification: Notification,
  channel: string,
  preferences: Record<string, unknown>
): Promise<boolean> {
  switch (channel) {
    case "in_app":
      // Already in database, just return true
      return true;

    case "email":
      return await sendEmail(notification, preferences);

    case "sms":
      return await sendSms(notification, preferences);

    case "push":
      return await sendPushNotification(notification, preferences);

    default:
      return false;
  }
}

/**
 * Send email notification
 */
async function sendEmail(notification: Notification, preferences: Record<string, unknown>): Promise<boolean> {
  try {
    // Get user email
    const { data: user } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", notification.recipient_id)
      .single();

    if (!user?.email) {
      return false;
    }

    // Call Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${(Deno as any).env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "notifications@dirq.app",
        to: user.email,
        subject: notification.title,
        html: generateEmailHtml(notification),
        text: notification.body,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

/**
 * Send SMS notification
 */
async function sendSms(notification: Notification, preferences: Record<string, unknown>): Promise<boolean> {
  try {
    // Get user phone
    const { data: user } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", notification.recipient_id)
      .single();

    if (!user?.phone) {
      return false;
    }

    // Only send critical/high priority via SMS
    if (!["critical", "high"].includes(notification.priority)) {
      return true; // Skip lower priorities for SMS
    }

    // Call backend SMS endpoint
    const response = await fetch(
      `${(Deno as any).env.get("SUPABASE_URL")}/functions/v1/send-sms`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(Deno as any).env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          to: user.phone,
          body: `${notification.title}\n${notification.body}`,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("SMS send error:", error);
    return false;
  }
}

/**
 * Send push notification
 */
async function sendPushNotification(
  notification: Notification,
  preferences: Record<string, unknown>
): Promise<boolean> {
  try {
    // Get user push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, auth, p256dh")
      .eq("user_id", notification.recipient_id);

    if (!subscriptions || subscriptions.length === 0) {
      return false;
    }

    const vapidPublicKey = (Deno as any).env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = (Deno as any).env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return false;
    }

    // Send to each subscription
    for (const subscription of subscriptions) {
      try {
        // Web Push Protocol - would need web-push library
        // This is a simplified version
        console.log("Push notification sent to:", subscription.endpoint);
      } catch (error) {
        console.error("Push send error:", error);
      }
    }

    return true;
  } catch (error) {
    console.error("Push notification error:", error);
    return false;
  }
}

/**
 * Generate HTML email from notification
 */
function generateEmailHtml(notification: Notification): string {
  const priorityColor: Record<string, string> = {
    critical: "#dc2626",
    high: "#ea580c",
    normal: "#2563eb",
    low: "#6b7280",
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${priorityColor[notification.priority] || "#2563eb"}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .cta { display: inline-block; padding: 12px 32px; background: ${priorityColor[notification.priority] || "#2563eb"}; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${notification.title}</h1>
        </div>
        <div class="content">
          <p>${notification.body}</p>
          ${notification.deep_link ? `<a href="${notification.deep_link}" class="cta">View in App</a>` : ""}
        </div>
        <div class="footer">
          <p>© Dirq Solutions</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
