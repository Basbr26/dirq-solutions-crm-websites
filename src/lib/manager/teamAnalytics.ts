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
      // Fetch team members
      const { data: teamMembers, error: membersError } = await supabase
        .from('manager_team_assignments')
        .select('team_member_id, active')
        .eq('manager_id', managerId)
        .eq('active', true);

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

      // Fetch team capacity for today
      const { data: capacityData, error: capacityError } = await supabase
        .from('team_daily_status')
        .select('*')
        .eq('manager_id', managerId)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      if (capacityError && capacityError.code !== 'PGRST116') {
        throw capacityError;
      }

      // Fetch individual metrics for each team member
      const memberMetrics = await Promise.all(
        teamMembers.map((member) =>
          this.getMemberMetrics(member.team_member_id)
        )
      );

      const topPerformer = memberMetrics.reduce((best, current) =>
        current.performanceScore > (best?.performanceScore || 0) ? current : best
      );

      const alerts = memberMetrics
        .flatMap((member) => this.generateAlerts(member))
        .slice(0, 5); // Limit to 5 alerts

      return {
        totalMembers: teamMembers.length,
        availableToday: (capacityData?.total_team_size || 0) - (capacityData?.on_leave || 0) - (capacityData?.sick || 0),
        onLeave: capacityData?.on_leave || 0,
        sick: capacityData?.sick || 0,
        averageCapacity: Math.round(capacityData?.capacity_percentage || 0),
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
        .select('id, voornaam, achternaam, avatar_url, department')
        .eq('id', memberId)
        .single();

      if (profileError) throw profileError;

      // Fetch performance metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('employee_id', memberId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (metricsError && metricsError.code !== 'PGRST116') {
        throw metricsError;
      }

      // Calculate performance score (0-100)
      const performanceScore = calculatePerformanceScore(metrics);

      return {
        memberId,
        memberName: `${profile?.voornaam} ${profile?.achternaam}`,
        memberAvatar: profile?.avatar_url,
        department: profile?.department || 'Unknown',
        approvalRate: metrics?.approval_rate || 85,
        averageResponseTime: metrics?.avg_response_time_hours || 2,
        tasksCompleted: metrics?.tasks_completed || 0,
        tasksOverdue: metrics?.tasks_overdue || 0,
        absenceRate: metrics?.absence_rate || 5,
        performanceScore,
        trends: {
          thisWeek: metrics?.week_trend || 0,
          thisMonth: metrics?.month_trend || 0,
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
function calculatePerformanceScore(metrics: any): number {
  if (!metrics) return 50; // Default mid-score

  const approval = (metrics.approval_rate || 85) * 0.3;
  const responseTime = Math.max(0, 100 - (metrics.avg_response_time_hours || 0) * 5) * 0.3;
  const tasksCompleted = Math.min(100, (metrics.tasks_completed || 0) / 5) * 0.2;
  const absence = Math.max(0, 100 - (metrics.absence_rate || 0) * 2) * 0.2;

  return Math.round(approval + responseTime + tasksCompleted + absence);
}
