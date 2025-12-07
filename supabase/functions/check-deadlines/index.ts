import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskWithCase {
  id: string;
  title: string;
  deadline: string;
  assigned_to: string;
  case_id: string;
  task_status: string;
  profiles: {
    email: string;
    voornaam: string;
    achternaam: string;
  } | null;
  sick_leave_cases: {
    employee_id: string;
    profiles: {
      voornaam: string;
      achternaam: string;
    } | null;
  } | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    console.log("Checking for upcoming deadlines...");
    console.log(`Today: ${today.toISOString()}, Three days from now: ${threeDaysFromNow.toISOString()}`);

    // Get tasks with deadlines in the next 3 days that are not completed
    const { data: upcomingTasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        deadline,
        assigned_to,
        case_id,
        task_status,
        profiles!tasks_assigned_to_fkey (
          email,
          voornaam,
          achternaam
        ),
        sick_leave_cases (
          employee_id,
          profiles (
            voornaam,
            achternaam
          )
        )
      `)
      .lte("deadline", threeDaysFromNow.toISOString().split("T")[0])
      .gte("deadline", today.toISOString().split("T")[0])
      .neq("task_status", "afgerond");

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    console.log(`Found ${upcomingTasks?.length || 0} tasks with upcoming deadlines`);

    const notifications: Array<{
      user_id: string;
      case_id: string;
      task_id: string;
      title: string;
      message: string;
      notification_type: string;
    }> = [];

    const emailsToSend: Array<{
      to: string;
      subject: string;
      html: string;
    }> = [];

    for (const task of (upcomingTasks as unknown as TaskWithCase[]) || []) {
      const daysUntilDeadline = Math.ceil(
        (new Date(task.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const employeeName = task.sick_leave_cases?.profiles
        ? `${task.sick_leave_cases.profiles.voornaam} ${task.sick_leave_cases.profiles.achternaam}`
        : "Onbekend";

      const urgencyText = daysUntilDeadline === 0 
        ? "VANDAAG" 
        : daysUntilDeadline === 1 
          ? "morgen" 
          : `over ${daysUntilDeadline} dagen`;

      // Check if notification already exists for this task today
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("task_id", task.id)
        .eq("user_id", task.assigned_to)
        .gte("created_at", today.toISOString().split("T")[0])
        .single();

      if (!existingNotification) {
        notifications.push({
          user_id: task.assigned_to,
          case_id: task.case_id,
          task_id: task.id,
          title: daysUntilDeadline === 0 ? "⚠️ Deadline vandaag!" : "📅 Deadline nadert",
          message: `Taak "${task.title}" voor ${employeeName} is ${urgencyText} verlopen.`,
          notification_type: "deadline_warning",
        });

        // Only prepare email if Resend is configured
        if (resendApiKey && task.profiles?.email) {
          emailsToSend.push({
            to: task.profiles.email,
            subject: daysUntilDeadline === 0 
              ? `⚠️ URGENT: Deadline vandaag - ${task.title}`
              : `📅 Herinnering: Deadline ${urgencyText} - ${task.title}`,
            html: `
              <h2>Wet Poortwachter Deadline Herinnering</h2>
              <p>Beste ${task.profiles.voornaam},</p>
              <p>De volgende taak heeft een deadline die ${urgencyText} verloopt:</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <strong>${task.title}</strong><br>
                <span style="color: #666;">Medewerker: ${employeeName}</span><br>
                <span style="color: ${daysUntilDeadline === 0 ? '#dc2626' : '#f59e0b'};">
                  Deadline: ${new Date(task.deadline).toLocaleDateString('nl-NL')}
                </span>
              </div>
              <p>Log in op het Dirq Solutions Verzuim platform om deze taak af te ronden.</p>
              <p>Met vriendelijke groet,<br>Dirq Solutions Verzuim</p>
            `,
          });
        }
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
        throw insertError;
      }
      console.log(`Created ${notifications.length} notifications`);
    }

    // Send emails if Resend is configured
    let emailsSent = 0;
    if (resendApiKey && emailsToSend.length > 0) {
      console.log(`Resend API key found, sending ${emailsToSend.length} emails...`);
      
      for (const email of emailsToSend) {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Dirq Solutions <noreply@resend.dev>",
              to: [email.to],
              subject: email.subject,
              html: email.html,
            }),
          });

          if (response.ok) {
            emailsSent++;
            // Mark notification as email sent
            await supabase
              .from("notifications")
              .update({ email_sent: true })
              .eq("user_id", notifications.find(n => n.title === email.subject)?.user_id);
          } else {
            const errorData = await response.json();
            console.error("Resend error:", errorData);
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }
      console.log(`Sent ${emailsSent} emails`);
    } else if (!resendApiKey) {
      console.log("Resend API key not configured, skipping email notifications");
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
        emailsSent,
        resendConfigured: !!resendApiKey,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in check-deadlines function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
