import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { ApprovalQueueService, ApprovalQueueItem } from '@/lib/approvals/approvalQueue';
import { TeamAnalyticsService } from '@/lib/manager/teamAnalytics';
import ApprovalStack from '@/components/manager/ApprovalStack';
import TeamHeatmap from '@/components/manager/TeamHeatmap';
import TeamMemberCard from '@/components/manager/TeamMemberCard';

type DashboardView = 'approvals' | 'team' | 'analytics' | 'settings';

export default function ManagerMobile() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView>('approvals');
  const [approvals, setApprovals] = useState<ApprovalQueueItem[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof TeamAnalyticsService.getTeamSummary>> | null>(null);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);

  const { isListening, command, toggleListening } = useVoiceCommands(
    handleVoiceCommand
  );

  useEffect(() => {
    if (user?.id) {
      loadApprovals();
      loadTeamStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadApprovals() {
    try {
      setIsLoadingApprovals(true);
      if (user?.id) {
        const data = await ApprovalQueueService.getPendingApprovals(user.id);
        setApprovals(data);
      }
    } catch (error) {
      console.error('Failed to load approvals:', error);
    } finally {
      setIsLoadingApprovals(false);
    }
  }

  async function loadTeamStats() {
    try {
      if (user?.id) {
        const summary = await TeamAnalyticsService.getTeamSummary(user.id);
        setStats(summary);
        // TODO: Get team member IDs from team assignments
      }
    } catch (error) {
      console.error('Failed to load team stats:', error);
    }
  }

  function handleVoiceCommand(action: string) {
    switch (action) {
      case 'approve':
        handleApprove(approvals[0]);
        break;
      case 'reject':
        handleDeny(approvals[0], 'Denied via voice command');
        break;
      case 'next':
        handleSkipApproval();
        break;
      case 'show_team':
        setCurrentView('team');
        break;
      case 'show_calendar':
        setCurrentView('team');
        break;
    }
  }

  async function handleApprove(item: ApprovalQueueItem) {
    if (!user?.id) return;

    const result = await ApprovalQueueService.approveAction(
      user.id,
      item.id
    );

    if (result.approved) {
      setApprovals((prev) => prev.filter((a) => a.id !== item.id));
    }
  }

  async function handleDeny(item: ApprovalQueueItem, reason: string) {
    if (!user?.id) return;

    const result = await ApprovalQueueService.denyAction(
      user.id,
      item.id,
      reason
    );

    if (!result.approved) {
      setApprovals((prev) => prev.filter((a) => a.id !== item.id));
    }
  }

  function handleSkipApproval() {
    // In real implementation, would rotate queue
    console.log('Skipping approval');
  }

  if (!user?.id) return null;

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <motion.div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 safe-area-inset-top">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold">Manager Dashboard</h1>
            <p className="text-sm opacity-90">Welcome back</p>
          </div>
          <motion.button
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isListening
                ? 'bg-white/20 animate-pulse'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            onClick={toggleListening}
            whileTap={{ scale: 0.95 }}
            title="Toggle voice commands"
          >
            🎤
          </motion.button>
        </div>

        {/* Voice feedback */}
        <AnimatePresence>
          {command && (
            <motion.div
              className="text-sm bg-white/20 rounded-lg px-3 py-2 mt-2"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {command.isFinal ? (
                <>
                  ✓ Understood: <strong>{command.transcript}</strong>
                </>
              ) : (
                <>
                  🎙️ Listening: <em>{command.transcript}</em>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tab navigation */}
      <div className="flex gap-2 bg-card border-b border-border p-2 overflow-x-auto">
        {[
          { id: 'approvals', label: '📋 Approvals', icon: '📋' },
          { id: 'team', label: '👥 Team', icon: '👥' },
          { id: 'analytics', label: '📊 Analytics', icon: '📊' },
          { id: 'settings', label: '⚙️ Settings', icon: '⚙️' },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium text-sm transition-all ${
              currentView === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={() => setCurrentView(tab.id as DashboardView)}
            whileTap={{ scale: 0.95 }}
          >
            {tab.icon} {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {currentView === 'approvals' && (
            <motion.div
              key="approvals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full"
            >
              <div className="flex flex-col h-full gap-4">
                <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
                  <ApprovalStack
                    items={approvals}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    isLoading={isLoadingApprovals}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{approvals.length}</p>
                  </div>
                  <div className="bg-green-600/10 rounded-lg p-3 border border-green-600/20">
                    <p className="text-xs text-muted-foreground">Team Size</p>
                    <p className="text-2xl font-bold">
                      {stats?.totalMembers || 0}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'team' && (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Team heatmap */}
              <TeamHeatmap managerId={user.id} />

              {/* Team summary */}
              {stats && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground">Available Today</p>
                    <p className="text-2xl font-bold">{stats.availableToday}</p>
                    <p className="text-xs mt-1">of {stats.totalMembers}</p>
                  </div>
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted-foreground">Avg Capacity</p>
                    <p className="text-2xl font-bold">{stats.averageCapacity}%</p>
                    <p className="text-xs mt-1">🤒 {stats.sick} • 📅 {stats.onLeave}</p>
                  </div>
                </div>
              )}

              {/* Critical alerts */}
              {stats?.criticalAlerts && stats.criticalAlerts.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    ⚠️ Critical Alerts ({stats.criticalAlerts.length})
                  </h3>
                  <div className="space-y-1">
                    {stats.criticalAlerts.map((alert: { type: string; message: string; memberId: string }, idx: number) => (
                      <p key={idx} className="text-sm">
                        {alert.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {stats?.topPerformer && (
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-border">
                  <h3 className="font-semibold mb-3">⭐ Top Performer</h3>
                  <TeamMemberCard memberId={stats.topPerformer.memberId} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card rounded-lg p-3 border border-border text-center">
                  <p className="text-xs text-muted-foreground">On Leave</p>
                  <p className="text-lg font-bold">{stats?.onLeave || 0}</p>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border text-center">
                  <p className="text-xs text-muted-foreground">Sick</p>
                  <p className="text-lg font-bold">{stats?.sick || 0}</p>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border text-center">
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="text-lg font-bold">{stats?.averageCapacity || 0}%</p>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-card rounded-lg p-4 border border-border">
                <h3 className="font-semibold mb-3">Preferences</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Enable notifications</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Voice commands</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Offline mode</span>
                  </label>
                </div>
              </div>

              <button className="w-full px-4 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 font-medium">
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Safe area for bottom navigation */}
      <div className="safe-area-inset-bottom" />
    </div>
  );
}
