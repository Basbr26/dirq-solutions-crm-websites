/**
 * OutreachTrackerWidget Component
 * Tracks weekly outreach goals for finance professional targeting
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Video, Mailbox, MessageSquare, TrendingUp, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { startOfWeek, endOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';

interface OutreachGoal {
  type: 'linkedin_video_audit' | 'physical_mail' | 'call';
  label: string;
  icon: React.ElementType;
  goal: number;
  current: number;
  color: string;
  bgColor: string;
}

export function OutreachTrackerWidget() {
  const [goals, setGoals] = useState<OutreachGoal[]>([
    {
      type: 'linkedin_video_audit',
      label: 'LinkedIn Video Audits',
      icon: Video,
      goal: 50,
      current: 0,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      type: 'physical_mail',
      label: 'Fysieke Kaartjes',
      icon: Mailbox,
      goal: 25,
      current: 0,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      type: 'call',
      label: 'LinkedIn Direct Berichten',
      icon: MessageSquare,
      goal: 25,
      current: 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyStats();
  }, []);

  const fetchWeeklyStats = async () => {
    const weekStart = startOfWeek(new Date(), { locale: nl, weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { locale: nl, weekStartsOn: 1 });

    const { data: interactions, error } = await supabase
      .from('interactions')
      .select('type')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .in('type', ['linkedin_video_audit', 'physical_mail', 'call']);

    if (error) {
      console.error('Error fetching weekly stats:', error);
      setLoading(false);
      return;
    }

    // Count interactions by type
    const counts = {
      linkedin_video_audit: 0,
      physical_mail: 0,
      call: 0,
    };

    interactions?.forEach((interaction) => {
      if (interaction.type in counts) {
        counts[interaction.type as keyof typeof counts]++;
      }
    });

    // Update goals with current counts
    setGoals((prevGoals) =>
      prevGoals.map((goal) => ({
        ...goal,
        current: counts[goal.type] || 0,
      }))
    );

    setLoading(false);
  };

  const totalGoal = goals.reduce((sum, goal) => sum + goal.goal, 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0);
  const totalProgress = (totalCurrent / totalGoal) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Wekelijkse Outreach Doelen
            </CardTitle>
            <CardDescription>
              Finance Professional Targeting - Week {new Date().getWeek()}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{totalCurrent}/{totalGoal}</div>
            <div className="text-sm text-muted-foreground">Totaal voortgang</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Totale Voortgang</span>
            <span className="text-muted-foreground">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-3" />
        </div>

        {/* Individual Goals */}
        <div className="space-y-4">
          {goals.map((goal) => {
            const Icon = goal.icon;
            const progress = (goal.current / goal.goal) * 100;
            const isComplete = goal.current >= goal.goal;

            return (
              <div key={goal.type} className={`rounded-lg p-4 ${goal.bgColor}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${goal.color}`} />
                    <span className="font-medium">{goal.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${goal.color}`}>
                      {goal.current}/{goal.goal}
                    </span>
                    {isComplete && (
                      <Badge variant="default" className="bg-green-500">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Behaald!
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress
                  value={progress}
                  className={`h-2 ${isComplete ? '[&>div]:bg-green-500' : ''}`}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  {goal.goal - goal.current > 0
                    ? `Nog ${goal.goal - goal.current} te gaan`
                    : 'Doel bereikt! 🎉'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly Summary */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Gemiddeld per dag</div>
              <div className="text-lg font-semibold">
                {Math.round(totalCurrent / new Date().getDay() || 0)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Nodig voor doel</div>
              <div className="text-lg font-semibold">
                {Math.max(0, Math.ceil((totalGoal - totalCurrent) / (7 - new Date().getDay())))} /dag
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Date extension for week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function () {
  const onejan = new Date(this.getFullYear(), 0, 1);
  const millisecsInDay = 86400000;
  return Math.ceil(((this.getTime() - onejan.getTime()) / millisecsInDay + onejan.getDay() + 1) / 7);
};
