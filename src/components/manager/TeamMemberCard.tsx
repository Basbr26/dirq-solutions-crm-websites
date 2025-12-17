import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TeamAnalyticsService, TeamPerformanceMetrics } from '@/lib/manager/teamAnalytics';

interface TeamMemberCardProps {
  memberId: string;
  onSelect?: (member: TeamPerformanceMetrics) => void;
}

export default function TeamMemberCard({ memberId, onSelect }: TeamMemberCardProps) {
  const [metrics, setMetrics] = useState<TeamPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await TeamAnalyticsService.getMemberMetrics(memberId);
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch member metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [memberId]);

  if (isLoading) {
    return (
      <div className="h-48 bg-card rounded-xl border border-border animate-pulse" />
    );
  }

  if (!metrics) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return '📈 ';
    if (trend < 0) return '📉 ';
    return '➡️ ';
  };

  return (
    <motion.div
      className="bg-card rounded-xl border border-border overflow-hidden shadow-lg"
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)' }}
      onClick={() => onSelect?.(metrics)}
      role="button"
      tabIndex={0}
    >
      {/* Header with avatar */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 flex items-start justify-between">
        <div className="flex items-center gap-4 flex-1">
          {metrics.memberAvatar ? (
            <img
              src={metrics.memberAvatar}
              alt={metrics.memberName}
              className="w-12 h-12 rounded-full object-cover border-2 border-primary"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-bold">
              {metrics.memberName.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-semibold">{metrics.memberName}</h3>
            <p className="text-xs text-muted-foreground">{metrics.department}</p>
          </div>
        </div>
        <div className={`text-3xl font-bold ${getScoreColor(metrics.performanceScore)}`}>
          {metrics.performanceScore}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="p-4 space-y-3">
        {/* Performance score */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground">Performance</span>
            <span className="text-sm font-semibold">{metrics.performanceScore}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getScoreColor(metrics.performanceScore).replace('text-', 'bg-')}`}
              initial={{ width: 0 }}
              animate={{ width: `${metrics.performanceScore}%` }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />
          </div>
        </div>

        {/* Metrics row 1 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Approval Rate</p>
            <p className="font-semibold">{metrics.approvalRate}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Avg Response</p>
            <p className="font-semibold">{metrics.averageResponseTime}h</p>
          </div>
        </div>

        {/* Metrics row 2 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Tasks Completed</p>
            <p className="font-semibold">{metrics.tasksCompleted}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Overdue Tasks</p>
            <p className={`font-semibold ${metrics.tasksOverdue > 0 ? 'text-red-600' : ''}`}>
              {metrics.tasksOverdue}
            </p>
          </div>
        </div>

        {/* Absence rate */}
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-xs text-muted-foreground">Absence Rate</p>
          <p className="font-semibold">{metrics.absenceRate}%</p>
        </div>

        {/* Trends */}
        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 mt-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">This Week</p>
            <p className="font-semibold">
              {getTrendIcon(metrics.trends.thisWeek)}
              {Math.abs(metrics.trends.thisWeek)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">This Month</p>
            <p className="font-semibold">
              {getTrendIcon(metrics.trends.thisMonth)}
              {Math.abs(metrics.trends.thisMonth)}%
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="border-t border-border grid grid-cols-3 divide-x">
        <button className="px-3 py-2 hover:bg-muted text-xs font-medium transition-colors">
          Chat
        </button>
        <button className="px-3 py-2 hover:bg-muted text-xs font-medium transition-colors">
          1-on-1
        </button>
        <button className="px-3 py-2 hover:bg-muted text-xs font-medium transition-colors">
          Feedback
        </button>
      </div>
    </motion.div>
  );
}
