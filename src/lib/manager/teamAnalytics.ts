import { supabase } from '@/integrations/supabase/client';

export interface TeamPerformanceMetrics {
  memberId: string;
  memberName: string;
  memberAvatar: string | null;
  department: string;
  approvalRate: number; // percentage
  averageResponseTime: number; // hours
  tasksCompleted: number;
  tasksOverdue: number;
  absenceRate: number; // percentage
  performanceScore: number; // 0-100
  trends: {
    thisWeek: number; // % change
    thisMonth: number; // % change
  };
}

export interface TeamSummary {
  totalMembers: number;
  availableToday: number;
  onLeave: number;
  sick: number;
  averageCapacity: number;
  topPerformer: TeamPerformanceMetrics | null;
  criticalAlerts: Array<{
    type: 'overdue' | 'absence' | 'performance';
    message: string;
    memberId: string;
  }>;
}

export class TeamAnalyticsService {
  // Get team performance overview
  static async getTeamSummary(managerId: string): Promise<TeamSummary> {
    try {
      // Fetch team members from profiles table
      const { data: teamMembers, error: membersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', managerId);

      if (membersError) throw membersError;

      if (!teamMembers || teamMembers.length === 0) {
        return {
          totalMembers: 0,
          availableToday: 0,
          onLeave: 0,
          sick: 0,
          averageCapacity: 0,
          topPerformer: null,
          criticalAlerts: [],
        };
      }

      const today = new Date().toISOString().split('T')[0];

      // Calculate team capacity for today
      const { data: leaveToday } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);

      const { data: sickToday } = await supabase
        .from('sick_leave_cases')
        .select('id')
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`);

      const onLeave = leaveToday?.length || 0;
      const sick = sickToday?.length || 0;
      const totalMembers = teamMembers.length;
      const available = totalMembers - onLeave - sick;
      const capacity = totalMembers > 0 ? Math.round((available / totalMembers) * 100) : 100;

      // Fetch individual metrics for each team member
      const memberMetrics = await Promise.all(
        teamMembers.map((member) => this.getMemberMetrics(member.id))
      );

      const topPerformer = memberMetrics.reduce((best, current) =>
        current.performanceScore > (best?.performanceScore || 0) ? current : best
      );

      const alerts = memberMetrics
        .flatMap((member) => this.generateAlerts(member))
        .slice(0, 5); // Limit to 5 alerts

      return {
        totalMembers,
        availableToday: available,
        onLeave,
        sick,
        averageCapacity: capacity,
        topPerformer: topPerformer || null,
        criticalAlerts: alerts,
      };
    } catch (error) {
      console.error('Failed to get team summary:', error);
      return {
        totalMembers: 0,
        availableToday: 0,
        onLeave: 0,
        sick: 0,
        averageCapacity: 0,
        topPerformer: null,
        criticalAlerts: [],
      };
    }
  }

  // Get individual team member metrics
  static async getMemberMetrics(memberId: string): Promise<TeamPerformanceMetrics> {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, functie')
        .eq('id', memberId)
        .single();

      if (profileError) throw profileError;

      // Calculate real metrics from actual data
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get leave requests stats (approval rate calculated from approved requests)
      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select('status, created_at')
        .eq('employee_id', memberId);

      const totalRequests = leaveRequests?.length || 0;
      const approvedRequests = leaveRequests?.filter(r => r.status === 'approved').length || 0;
      const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 85;

      // Get tasks stats
      const { data: tasks } = await supabase
        .from('tasks')
        .select('task_status, deadline, updated_at')
        .eq('assigned_to', memberId);

      const completedTasks = tasks?.filter(t => t.task_status === 'afgerond').length || 0;
      const overdueTasks = tasks?.filter(t => {
        if (t.task_status === 'afgerond') return false;
        if (!t.deadline) return false;
        return new Date(t.deadline) < now;
      }).length || 0;

      // Calculate average response time from activity logs
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('created_at, action_type')
        .eq('user_id', memberId)
        .in('action_type', ['approve_leave', 'deny_leave', 'complete_task'])
        .order('created_at', { ascending: false })
        .limit(10);

      const avgResponseTime = activities && activities.length > 1
        ? Math.round((new Date(activities[0].created_at).getTime() - new Date(activities[activities.length - 1].created_at).getTime()) / (activities.length * 60 * 60 * 1000))
        : 2;

      // Calculate absence rate from sick leave cases
      const { data: sickCases } = await supabase
        .from('sick_leave_cases')
        .select('start_date, end_date')
        .eq('employee_id', memberId)
        .gte('start_date', oneMonthAgo.toISOString().split('T')[0]);

      const sickDays = sickCases?.reduce((total, c) => {
        const start = new Date(c.start_date);
        const end = c.end_date ? new Date(c.end_date) : now;
        const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        return total + days;
      }, 0) || 0;
      const absenceRate = Math.round((sickDays / 30) * 100);

      // Calculate trends
      const recentTasks = tasks?.filter(t => new Date(t.updated_at || t.deadline || 0) >= oneWeekAgo).length || 0;
      const monthTasks = tasks?.filter(t => new Date(t.updated_at || t.deadline || 0) >= oneMonthAgo).length || 0;

      const weekTrend = recentTasks > 0 ? Math.round((recentTasks / 7) * 100) : 0;
      const monthTrend = monthTasks > 0 ? Math.round((monthTasks / 30) * 100) : 0;

      // Calculate performance score
      const performanceScore = calculatePerformanceScore({
        approval_rate: approvalRate,
        avg_response_time_hours: avgResponseTime,
        tasks_completed: completedTasks,
        absence_rate: absenceRate,
      });

      return {
        memberId,
        memberName: profile ? `${profile.voornaam} ${profile.achternaam}` : 'Unknown',
        memberAvatar: null, // Avatar URL not available in current schema
        department: profile?.functie || 'Unknown',
        approvalRate,
        averageResponseTime: avgResponseTime,
        tasksCompleted: completedTasks,
        tasksOverdue: overdueTasks,
        absenceRate,
        performanceScore,
        trends: {
          thisWeek: weekTrend,
          thisMonth: monthTrend,
        },
      };
    } catch (error) {
      console.error('Failed to get member metrics for:', memberId, error);
      return {
        memberId,
        memberName: 'Unknown',
        memberAvatar: null,
        department: 'Unknown',
        approvalRate: 0,
        averageResponseTime: 0,
        tasksCompleted: 0,
        tasksOverdue: 0,
        absenceRate: 0,
        performanceScore: 0,
        trends: { thisWeek: 0, thisMonth: 0 },
      };
    }
  }

  // Generate alerts for member
  private static generateAlerts(
    member: TeamPerformanceMetrics
  ): Array<{ type: 'overdue' | 'absence' | 'performance'; message: string; memberId: string }> {
    const alerts: Array<{ type: 'overdue' | 'absence' | 'performance'; message: string; memberId: string }> = [];

    if (member.tasksOverdue > 0) {
      alerts.push({
        type: 'overdue',
        message: `${member.memberName} has ${member.tasksOverdue} overdue tasks`,
        memberId: member.memberId,
      });
    }

    if (member.absenceRate > 15) {
      alerts.push({
        type: 'absence',
        message: `${member.memberName} absence rate is ${member.absenceRate}%`,
        memberId: member.memberId,
      });
    }

    if (member.performanceScore < 60) {
      alerts.push({
        type: 'performance',
        message: `${member.memberName} performance score: ${member.performanceScore}%`,
        memberId: member.memberId,
      });
    }

    return alerts;
  }
}

// Helper: Calculate performance score
interface PerformanceMetrics {
  approval_rate: number;
  avg_response_time_hours: number;
  tasks_completed: number;
  absence_rate: number;
}

function calculatePerformanceScore(metrics: PerformanceMetrics | null): number {
  if (!metrics) return 50; // Default mid-score

  const approval = (metrics.approval_rate || 85) * 0.3;
  const responseTime = Math.max(0, 100 - (metrics.avg_response_time_hours || 0) * 5) * 0.3;
  const tasksCompleted = Math.min(100, (metrics.tasks_completed || 0) / 5) * 0.2;
  const absence = Math.max(0, 100 - (metrics.absence_rate || 0) * 2) * 0.2;

  return Math.round(approval + responseTime + tasksCompleted + absence);
}
