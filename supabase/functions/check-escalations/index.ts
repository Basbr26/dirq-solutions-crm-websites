// deno-lint-ignore no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// deno-lint-ignore no-explicit-any
import { differenceInHours, differenceInDays } from "https://esm.sh/date-fns@2.30.0";

// deno-lint-ignore no-explicit-any
const supabaseUrl = (Deno as any).env.get("SUPABASE_URL")!;
// deno-lint-ignore no-explicit-any
const supabaseServiceKey = (Deno as any).env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  due_date: string;
  priority: string;
  status: string;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
}

interface EscalationRule {
  task_type: string;
  escalate_after_hours: number;
  escalate_to_role: string;
  notify_manager: boolean;
  notify_admin: boolean;
  max_escalations: number;
}

/**
 * Check for overdue tasks and escalate them
 * Runs every hour
 */
// deno-lint-ignore no-explicit-any
// deno-lint-ignore no-explicit-any
(Deno as any).serve(async (req: any) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const escalationRules: EscalationRule[] = [
      {
        task_type: "poortwachter_week1",
        escalate_after_hours: 24,
        escalate_to_role: "manager",
        notify_manager: true,
        notify_admin: false,
        max_escalations: 2,
      },
      {
        task_type: "poortwachter_week6",
        escalate_after_hours: 12,
        escalate_to_role: "hr",
        notify_manager: true,
        notify_admin: true,
        max_escalations: 3,
      },
      {
        task_type: "leave_approval",
        escalate_after_hours: 48,
        escalate_to_role: "hr",
        notify_manager: true,
        notify_admin: false,
        max_escalations: 2,
      },
    ];

    let escalated = 0;

    // Check each escalation rule
    for (const rule of escalationRules) {
      const escalatedTasks = await checkAndEscalateOverdueTasks(rule);
      escalated += escalatedTasks;
    }

    // Check for deadline warnings (notify 24 hours before)
    const warned = await checkAndNotifyDeadlineWarnings();

    return new Response(
      JSON.stringify({
        escalated: escalated,
        warned: warned,
        timestamp: new Date().toISOString(),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Check escalations error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
});

/**
 * Check for overdue tasks matching rule and escalate
 */
async function checkAndEscalateOverdueTasks(rule: EscalationRule): Promise<number> {
  try {
    const thresholdTime = new Date(
      Date.now() - rule.escalate_after_hours * 3600000
    ).toISOString();

    // Get tasks that haven't been escalated yet or need re-escalation
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        description,
        assigned_to,
        due_date,
        priority,
        status,
        related_entity_type,
        related_entity_id,
        created_at,
        escalations!task_id(id, escalated_to)
      `
      )
      .eq("status", "pending")
      .lt("created_at", thresholdTime)
      .like("related_entity_type", rule.task_type)
      .limit(50);

    if (error) {
      console.error("Error fetching overdue tasks:", error);
      return 0;
    }

    if (!tasks || tasks.length === 0) {
      return 0;
    }

    let escalatedCount = 0;

    for (const task of tasks as Task[]) {
      try {
        // Get escalation count
        const { count } = await supabase
          .from("escalations")
          .select("id", { count: "exact" })
          .eq("task_id", task.id);

        const escalationCount = count || 0;

        // Don't escalate if max reached
        if (escalationCount >= rule.max_escalations) {
          // Notify admin instead
          if (rule.notify_admin) {
            await createNotification({
              recipient_id: "admin",
              type: "escalation_max_reached",
              title: `Maximum escalations reached: ${task.title}`,
              body: `Task ${task.title} has reached maximum escalation levels`,
              priority: "critical",
              channels: ["in_app", "email"],
              deep_link: `/tasks/${task.id}`,
            });
          }
          continue;
        }

        // Get assignee info to escalate to manager
        const { data: currentAssignee } = await supabase
          .from("profiles")
          .select("id, manager_id, email, name")
          .eq("id", task.assigned_to)
          .single();

        if (!currentAssignee?.manager_id) {
          continue;
        }

        // Create escalation record
        const { error: escalateError } = await supabase
          .from("escalations")
          .insert({
            task_id: task.id,
            escalated_from: task.assigned_to,
            escalated_to: currentAssignee.manager_id,
            reason: `Escalated automatically: overdue by ${rule.escalate_after_hours} hours`,
            created_at: new Date().toISOString(),
          });

        if (escalateError) {
          console.error("Error creating escalation:", escalateError);
          continue;
        }

        // Reassign task to manager
        await supabase
          .from("tasks")
          .update({ assigned_to: currentAssignee.manager_id })
          .eq("id", task.id);

        // Create notifications
        const taskHoursOverdue = differenceInHours(
          new Date(),
          new Date(task.created_at)
        );

        // Notify new assignee
        await createNotification({
          recipient_id: currentAssignee.manager_id,
          type: "escalation_received",
          title: `Task Escalated: ${task.title}`,
          body: `${currentAssignee.name} has escalated "${task.title}" to you. It's been overdue for ${taskHoursOverdue} hours.`,
          priority: "high",
          channels: ["in_app", "email", "sms"],
          deep_link: `/tasks/${task.id}`,
          actions: [
            {
              label: "View Task",
              type: "navigate",
              target: `/tasks/${task.id}`,
              variant: "primary",
            },
          ],
        });

        // Notify original assignee
        await createNotification({
          recipient_id: task.assigned_to,
          type: "escalation_sent",
          title: `Task Escalated: ${task.title}`,
          body: `Your task has been escalated to management`,
          priority: "normal",
          channels: ["in_app", "email"],
          deep_link: `/tasks/${task.id}`,
        });

        escalatedCount++;
      } catch (error) {
        console.error(`Error escalating task ${task.id}:`, error);
      }
    }

    return escalatedCount;
  } catch (error) {
    console.error("Error in checkAndEscalateOverdueTasks:", error);
    return 0;
  }
}

/**
 * Check for tasks due in 24 hours and send deadline warnings
 */
async function checkAndNotifyDeadlineWarnings(): Promise<number> {
  try {
    const tomorrow = new Date(Date.now() + 24 * 3600000);
    const today = new Date();

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, title, assigned_to, due_date, priority")
      .eq("status", "pending")
      .gte("due_date", today.toISOString())
      .lte("due_date", tomorrow.toISOString())
      .limit(100);

    if (error || !tasks) {
      return 0;
    }

    let notified = 0;

    for (const task of tasks as Task[]) {
      const hoursUntilDue = differenceInHours(
        new Date(task.due_date),
        new Date()
      );

      await createNotification({
        recipient_id: task.assigned_to,
        type: "deadline_warning",
        title: `Deadline Approaching: ${task.title}`,
        body: `Task is due in ${hoursUntilDue} hours`,
        priority: hoursUntilDue < 6 ? "high" : "normal",
        channels: ["in_app", "email"],
        deep_link: `/tasks/${task.id}`,
      });

      notified++;
    }

    return notified;
  } catch (error) {
    console.error("Error in checkAndNotifyDeadlineWarnings:", error);
    return 0;
  }
}

/**
 * Helper to create notification
 */
async function createNotification(params: {
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  priority: string;
  channels: string[];
  deep_link?: string;
  actions?: unknown[];
}) {
  try {
    await supabase.from("notifications").insert({
      recipient_id: params.recipient_id,
      type: params.type,
      title: params.title,
      body: params.body,
      priority: params.priority,
      channels: params.channels,
      deep_link: params.deep_link,
      actions: params.actions,
      scheduled_send: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}
