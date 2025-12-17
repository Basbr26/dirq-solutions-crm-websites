import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getHours } from "https://esm.sh/date-fns@2.30.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  priority: string;
  created_at: string;
  deep_link?: string;
}

/**
 * Compile and send digest emails
 * Runs at 9am, 1pm, and 5pm
 */
// deno-lint-ignore no-explicit-any
Deno.serve(async (req: any) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const hour = getHours(new Date());
    let digestType: "morning" | "afternoon" | "evening" = "morning";

    if (hour >= 13 && hour < 17) {
      digestType = "afternoon";
    } else if (hour >= 17) {
      digestType = "evening";
    }

    const sent = await sendDigestEmails(digestType);

    return new Response(
      JSON.stringify({
        digest_type: digestType,
        sent: sent,
        timestamp: new Date().toISOString(),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Send digests error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
});

/**
 * Send digest emails to users who prefer digests
 */
async function sendDigestEmails(digestType: "morning" | "afternoon" | "evening"): Promise<number> {
  try {
    // Get users who prefer digests
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("user_id, preferences")
      .eq("preferences->digest_preference", '"daily"')
      .or("preferences->digest_preference.eq.hourly");

    if (prefError || !preferences) {
      console.error("Error fetching user preferences:", prefError);
      return 0;
    }

    let sentCount = 0;

    for (const pref of preferences) {
      try {
        // Get unread notifications for user
        const { data: notifications, error: notifError } = await supabase
          .from("notifications")
          .select("*")
          .eq("recipient_id", pref.user_id)
          .eq("read", false)
          .neq("channels", '["sms"]') // Exclude SMS-only notifications
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        if (notifError || !notifications || notifications.length === 0) {
          continue;
        }

        // Get user email and name
        const { data: user } = await supabase
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("id", pref.user_id)
          .single();

        if (!user?.email) {
          continue;
        }

        const userName = `${user.first_name || "User"}`;
        const digestHtml = generateDigestHtml(
          notifications as Notification[],
          userName,
          digestType
        );

        // Send via Resend
        const emailSent = await sendDigestEmail(user.email, digestHtml);

        if (emailSent) {
          // Mark notifications as "digest_sent"
          await supabase
            .from("notifications")
            .update({ digest_sent: true })
            .in(
              "id",
              notifications.map((n: Notification) => n.id)
            );

          sentCount++;
        }
      } catch (error) {
        console.error(`Error sending digest for user ${pref.user_id}:`, error);
      }
    }

    return sentCount;
  } catch (error) {
    console.error("Error in sendDigestEmails:", error);
    return 0;
  }
}

/**
 * Send digest email via Resend
 */
async function sendDigestEmail(email: string, htmlContent: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "notifications@dirq.app",
        to: email,
        subject: "Your Dirq Notifications Digest",
        html: htmlContent,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending digest email:", error);
    return false;
  }
}

/**
 * Generate digest HTML email
 */
function generateDigestHtml(
  notifications: Notification[],
  userName: string,
  digestType: string
): string {
  const groupedByPriority = {
    critical: notifications.filter((n) => n.priority === "critical"),
    high: notifications.filter((n) => n.priority === "high"),
    normal: notifications.filter((n) => n.priority === "normal"),
    low: notifications.filter((n) => n.priority === "low"),
  };

  const priorityColors: Record<string, string> = {
    critical: "#dc2626",
    high: "#ea580c",
    normal: "#2563eb",
    low: "#6b7280",
  };

  const notificationRows = Object.entries(groupedByPriority)
    .filter(([_, items]) => items.length > 0)
    .map(([priority, items]) => {
      return `
      <div style="margin-bottom: 20px; border-left: 4px solid ${priorityColors[priority]}; padding-left: 16px;">
        <h3 style="margin: 0 0 12px 0; color: ${priorityColors[priority]}; font-size: 14px; font-weight: 600;">
          ${priority.toUpperCase()} PRIORITY (${items.length})
        </h3>
        <ul style="margin: 0; padding: 0; list-style: none;">
          ${items
            .map(
              (n) => `
            <li style="margin-bottom: 12px; padding: 12px; background: #f8f9fa; border-radius: 6px;">
              <strong style="display: block; margin-bottom: 4px;">${n.title}</strong>
              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${n.body}</p>
              ${
                n.deep_link
                  ? `<a href="${n.deep_link}" style="color: ${priorityColors[priority]}; text-decoration: none; font-size: 13px;">View Details →</a>`
                  : ""
              }
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Dirq Notifications Digest</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          background: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 32px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 8px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 32px 20px;
        }
        .greeting {
          margin-bottom: 24px;
          font-size: 15px;
        }
        .summary {
          background: #f0f4ff;
          border-left: 4px solid #667eea;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
          font-size: 14px;
        }
        .notifications-section {
          margin-bottom: 32px;
        }
        .cta-button {
          display: inline-block;
          padding: 12px 32px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          text-align: center;
          margin-top: 24px;
        }
        .cta-button:hover {
          background: #764ba2;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #eee;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📬 Notifications Digest</h1>
          <p>Your ${digestType === "morning" ? "morning" : digestType === "afternoon" ? "afternoon" : "evening"} summary</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            <p>Hello ${userName},</p>
            <p>You have <strong>${notifications.length} notification${notifications.length !== 1 ? "s" : ""}</strong> to review.</p>
          </div>
          
          <div class="summary">
            ${
              groupedByPriority.critical.length > 0
                ? `<strong style="color: #dc2626;">🚨 ${groupedByPriority.critical.length} Critical</strong> • `
                : ""
            }
            ${
              groupedByPriority.high.length > 0
                ? `<strong style="color: #ea580c;">⚠️ ${groupedByPriority.high.length} High</strong> • `
                : ""
            }
            ${
              groupedByPriority.normal.length > 0
                ? `<strong style="color: #2563eb;">ℹ️ ${groupedByPriority.normal.length} Normal</strong>`
                : ""
            }
          </div>

          <div class="notifications-section">
            ${notificationRows}
          </div>

          <center>
            <a href="https://dirq.app/notifications" class="cta-button">View All Notifications</a>
          </center>
        </div>

        <div class="footer">
          <p><a href="https://dirq.app/settings/notifications">Manage notification preferences</a></p>
          <p>© Dirq Solutions | Verzuim Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
