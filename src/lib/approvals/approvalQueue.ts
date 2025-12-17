import { supabase } from '@/integrations/supabase/client';

export interface ApprovalQueueItem {
  id: string;
  type: 'leave' | 'overtime' | 'expense' | 'timesheet';
  employeeName: string;
  employeeAvatar: string | null;
  title: string;
  details: string;
  submittedDate: Date;
  priority: 'high' | 'normal' | 'low';
  metadata: Record<string, unknown>;
}

export interface ApprovalResult {
  approved: boolean;
  reason?: string;
  actionTime: Date;
}

export class ApprovalQueueService {
  // Fetch pending approvals for manager
  static async getPendingApprovals(
    managerId: string
  ): Promise<ApprovalQueueItem[]> {
    try {
      const { data, error } = await supabase
        .from('manager_pending_approvals')
        .select('*')
        .limit(50);

      if (error) throw error;

      return (
        data?.map((item) => ({
          id: item.id,
          type: item.request_type,
          employeeName: `${item.voornaam} ${item.achternaam}`,
          employeeAvatar: item.avatar_url,
          title: `${item.leave_type} request`,
          details: item.details || `${item.days_requested} days from ${item.start_date} to ${item.end_date}`,
          submittedDate: new Date(item.submitted_at),
          priority: calculatePriority(item),
          metadata: {
            employeeId: item.employee_id,
            startDate: item.start_date,
            endDate: item.end_date,
            daysRequested: item.days_requested,
            caseId: item.case_id,
          },
        })) || []
      );
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      return [];
    }
  }

  // Approve an action
  static async approveAction(
    managerId: string,
    approvalId: string,
    reason?: string
  ): Promise<ApprovalResult> {
    try {
      // Create approval record
      const { error: logError } = await supabase
        .from('approval_actions')
        .insert({
          manager_id: managerId,
          request_id: approvalId,
          request_type: 'leave',
          action: 'approve',
          reason,
        });

      if (logError) throw logError;

      // Update the actual leave request
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ status: 'approved' })
        .eq('id', approvalId);

      if (updateError) throw updateError;

      return {
        approved: true,
        actionTime: new Date(),
      };
    } catch (error) {
      console.error('Failed to approve action:', error);
      return {
        approved: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        actionTime: new Date(),
      };
    }
  }

  // Deny an action
  static async denyAction(
    managerId: string,
    approvalId: string,
    reason: string
  ): Promise<ApprovalResult> {
    try {
      // Create denial record
      const { error: logError } = await supabase
        .from('approval_actions')
        .insert({
          manager_id: managerId,
          request_id: approvalId,
          request_type: 'leave',
          action: 'deny',
          reason,
        });

      if (logError) throw logError;

      // Update the actual leave request
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', approvalId);

      if (updateError) throw updateError;

      return {
        approved: false,
        reason,
        actionTime: new Date(),
      };
    } catch (error) {
      console.error('Failed to deny action:', error);
      return {
        approved: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        actionTime: new Date(),
      };
    }
  }

  // Undo an action (within 5 minutes)
  static async undoAction(managerId: string, actionId: string): Promise<boolean> {
    try {
      // Fetch the action to get original request info
      const { data: action, error: fetchError } = await supabase
        .from('approval_actions')
        .select('*')
        .eq('id', actionId)
        .single();

      if (fetchError) throw fetchError;

      // Check if within undo window
      const now = new Date();
      const undoDeadline = new Date(action.undo_before);

      if (now > undoDeadline) {
        throw new Error('Undo window expired (5 minutes)');
      }

      // Mark as undone
      const { error: undoError } = await supabase
        .from('approval_actions')
        .update({ undone: true })
        .eq('id', actionId);

      if (undoError) throw undoError;

      // Revert the leave request back to pending
      const { error: revertError } = await supabase
        .from('leave_requests')
        .update({ status: 'pending' })
        .eq('id', action.request_id);

      if (revertError) throw revertError;

      return true;
    } catch (error) {
      console.error('Failed to undo action:', error);
      return false;
    }
  }

  // Get approval stats
  static async getApprovalStats(managerId: string) {
    try {
      const [approvals, denials, undone] = await Promise.all([
        supabase
          .from('approval_actions')
          .select('count', { count: 'exact' })
          .eq('manager_id', managerId)
          .eq('action', 'approve')
          .then((r) => r.count || 0),
        supabase
          .from('approval_actions')
          .select('count', { count: 'exact' })
          .eq('manager_id', managerId)
          .eq('action', 'deny')
          .then((r) => r.count || 0),
        supabase
          .from('approval_actions')
          .select('count', { count: 'exact' })
          .eq('manager_id', managerId)
          .eq('undone', true)
          .then((r) => r.count || 0),
      ]);

      return {
        approved: approvals,
        denied: denials,
        undone,
        total: approvals + denials,
      };
    } catch (error) {
      console.error('Failed to get approval stats:', error);
      return { approved: 0, denied: 0, undone: 0, total: 0 };
    }
  }
}

// Helper: Calculate priority based on request age
function calculatePriority(
  item: any
): 'high' | 'normal' | 'low' {
  const now = new Date();
  const submittedDate = new Date(item.submitted_at);
  const hoursAgo = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);

  if (hoursAgo > 48) return 'high';
  if (hoursAgo > 24) return 'normal';
  return 'low';
}
