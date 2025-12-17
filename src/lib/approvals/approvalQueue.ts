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
      // Fetch pending leave requests
      const { data: leaveRequests, error } = await supabase
        .from('leave_requests')
        .select(`
          id,
          employee_id,
          leave_type,
          start_date,
          end_date,
          status,
          created_at,
          profiles!inner(
            voornaam,
            achternaam,
            manager_id
          )
        `)
        .eq('status', 'pending')
        .eq('profiles.manager_id', managerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      interface LeaveRequestWithProfile {
        id: string;
        employee_id: string;
        leave_type: string;
        start_date: string;
        end_date: string;
        created_at: string;
        profiles: {
          voornaam: string;
          achternaam: string;
        };
      }

      return (
        (leaveRequests as unknown as LeaveRequestWithProfile[])?.map((item) => ({
          id: item.id,
          type: 'leave' as const,
          employeeName: `${item.profiles.voornaam} ${item.profiles.achternaam}`,
          employeeAvatar: null,
          title: `${item.leave_type} request`,
          details: `From ${item.start_date} to ${item.end_date}`,
          submittedDate: new Date(item.created_at),
          priority: calculatePriority({ submitted_at: item.created_at, start_date: item.start_date }),
          metadata: {
            employeeId: item.employee_id,
            startDate: item.start_date,
            endDate: item.end_date,
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
      // Update the actual leave request
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'approved',
          approved_by: managerId,
          approved_at: new Date().toISOString()
        })
        .eq('id', approvalId);

      if (updateError) throw updateError;

      // Log the action
      await supabase.from('activity_logs').insert({
        user_id: managerId,
        action_type: 'approve_leave',
        entity_type: 'leave_request',
        entity_id: approvalId,
        description: `Approved leave request${reason ? `: ${reason}` : ''}`
      });

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
      // Update the actual leave request
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'rejected', 
          rejection_reason: reason,
          approved_by: managerId,
          approved_at: new Date().toISOString()
        })
        .eq('id', approvalId);

      if (updateError) throw updateError;

      // Log the action
      await supabase.from('activity_logs').insert({
        user_id: managerId,
        action_type: 'reject_leave',
        entity_type: 'leave_request',
        entity_id: approvalId,
        description: `Rejected leave request: ${reason}`
      });

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
  static async undoAction(managerId: string, requestId: string): Promise<boolean> {
    try {
      // Fetch the leave request to check approval time
      const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('approved_at, approved_by')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Check if approved by this manager
      if (request.approved_by !== managerId) {
        throw new Error('Can only undo your own actions');
      }

      // Check if within undo window (5 minutes)
      const now = new Date();
      const approvedAt = new Date(request.approved_at);
      const minutesElapsed = (now.getTime() - approvedAt.getTime()) / (1000 * 60);

      if (minutesElapsed > 5) {
        throw new Error('Undo window expired (5 minutes)');
      }

      // Revert the leave request back to pending
      const { error: revertError } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'pending',
          approved_by: null,
          approved_at: null,
          rejection_reason: null
        })
        .eq('id', requestId);

      if (revertError) throw revertError;

      // Log the undo action
      await supabase.from('activity_logs').insert({
        user_id: managerId,
        action_type: 'undo_approval',
        entity_type: 'leave_request',
        entity_id: requestId,
        description: 'Undid previous approval decision'
      });

      return true;
    } catch (error) {
      console.error('Failed to undo action:', error);
      return false;
    }
  }

  // Get approval stats
  static async getApprovalStats(managerId: string) {
    try {
      const [approvals, denials] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('approved_by', managerId)
          .eq('status', 'approved')
          .then((r) => r.count || 0),
        supabase
          .from('leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('approved_by', managerId)
          .eq('status', 'rejected')
          .then((r) => r.count || 0),
      ]);

      return {
        approved: approvals,
        denied: denials,
        undone: 0, // Not tracked separately
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
  item: { submitted_at: string; start_date?: string }
): 'high' | 'normal' | 'low' {
  const now = new Date();
  const submittedDate = new Date(item.submitted_at);
  const hoursAgo = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);

  // High priority if submitted over 48 hours ago
  if (hoursAgo > 48) return 'high';
  
  // High priority if leave starts within 7 days
  if (item.start_date) {
    const startDate = new Date(item.start_date);
    const daysUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilStart < 7) return 'high';
  }

  if (hoursAgo > 24) return 'normal';
  return 'low';
}
