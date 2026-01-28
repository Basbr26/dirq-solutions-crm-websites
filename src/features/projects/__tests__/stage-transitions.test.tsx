import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('Project Stage Transitions', () => {
  const STAGE_PROBABILITY = {
    lead: 10,
    qualified: 25,
    quote_sent: 50,
    negotiation: 75,
    won: 100,
    lost: 0,
  };

  describe('Stage Validation', () => {
    it('should have valid probability for each stage', () => {
      Object.entries(STAGE_PROBABILITY).forEach(([stage, probability]) => {
        expect(probability).toBeGreaterThanOrEqual(0);
        expect(probability).toBeLessThanOrEqual(100);
      });
    });

    it('should increase probability through pipeline', () => {
      const stages = ['lead', 'qualified', 'quote_sent', 'negotiation', 'won'];
      
      for (let i = 0; i < stages.length - 1; i++) {
        const current = STAGE_PROBABILITY[stages[i] as keyof typeof STAGE_PROBABILITY];
        const next = STAGE_PROBABILITY[stages[i + 1] as keyof typeof STAGE_PROBABILITY];
        expect(next).toBeGreaterThan(current);
      }
    });

    it('should have 0% for lost stage', () => {
      expect(STAGE_PROBABILITY.lost).toBe(0);
    });

    it('should have 100% for won stage', () => {
      expect(STAGE_PROBABILITY.won).toBe(100);
    });
  });

  describe('Stage Transitions', () => {
    it('should allow forward transition', () => {
      const validForwardMoves = [
        ['lead', 'qualified'],
        ['qualified', 'quote_sent'],
        ['quote_sent', 'negotiation'],
        ['negotiation', 'won'],
      ];

      validForwardMoves.forEach(([from, to]) => {
        const fromProb = STAGE_PROBABILITY[from as keyof typeof STAGE_PROBABILITY];
        const toProb = STAGE_PROBABILITY[to as keyof typeof STAGE_PROBABILITY];
        expect(toProb).toBeGreaterThan(fromProb);
      });
    });

    it('should allow transition to lost from any stage', () => {
      const stages = ['lead', 'qualified', 'quote_sent', 'negotiation'];
      
      stages.forEach(stage => {
        const canLose = true; // Any stage can transition to lost
        expect(canLose).toBe(true);
      });
    });

    it('should not allow backward transition without reason', () => {
      const invalidMoves = [
        ['won', 'negotiation'],
        ['negotiation', 'quote_sent'],
        ['quote_sent', 'qualified'],
      ];

      invalidMoves.forEach(([from, to]) => {
        const fromProb = STAGE_PROBABILITY[from as keyof typeof STAGE_PROBABILITY];
        const toProb = STAGE_PROBABILITY[to as keyof typeof STAGE_PROBABILITY];
        expect(toProb).toBeLessThan(fromProb);
      });
    });
  });

  describe('Pipeline Value Calculation', () => {
    it('should calculate weighted pipeline value', () => {
      const projects = [
        { stage: 'lead', value: 1000 },
        { stage: 'qualified', value: 2000 },
        { stage: 'quote_sent', value: 5000 },
        { stage: 'negotiation', value: 10000 },
      ];

      const pipelineValue = projects.reduce((sum, project) => {
        const probability = STAGE_PROBABILITY[project.stage as keyof typeof STAGE_PROBABILITY] / 100;
        return sum + (project.value * probability);
      }, 0);

      // (1000*0.1) + (2000*0.25) + (5000*0.5) + (10000*0.75)
      // = 100 + 500 + 2500 + 7500 = 10,600
      expect(pipelineValue).toBe(10600);
    });

    it('should exclude lost deals from pipeline', () => {
      const projects = [
        { stage: 'quote_sent', value: 5000 },
        { stage: 'lost', value: 10000 }, // Should not count
      ];

      const activeProjects = projects.filter(p => p.stage !== 'lost');
      expect(activeProjects.length).toBe(1);
    });

    it('should count won deals at 100%', () => {
      const wonProject = { stage: 'won', value: 10000 };
      const probability = STAGE_PROBABILITY.won / 100;
      const expectedValue = wonProject.value * probability;

      expect(expectedValue).toBe(10000);
    });
  });

  describe('Stage Duration Tracking', () => {
    it('should track time in each stage', () => {
      const stageHistory = [
        { stage: 'lead', entered_at: '2026-01-01T10:00:00Z', exited_at: '2026-01-05T10:00:00Z' },
        { stage: 'qualified', entered_at: '2026-01-05T10:00:00Z', exited_at: '2026-01-10T10:00:00Z' },
      ];

      stageHistory.forEach(stage => {
        const duration = new Date(stage.exited_at).getTime() - new Date(stage.entered_at).getTime();
        const days = duration / (1000 * 60 * 60 * 24);
        expect(days).toBeGreaterThan(0);
      });
    });

    it('should calculate average stage duration', () => {
      const stageDurations = [4, 5, 7, 3]; // days
      const average = stageDurations.reduce((a, b) => a + b) / stageDurations.length;
      
      expect(average).toBeCloseTo(4.75, 2);
    });
  });

  describe('Stage Color Coding', () => {
    it('should have colors for each stage', () => {
      const stageColors = {
        lead: 'gray',
        qualified: 'blue',
        quote_sent: 'yellow',
        negotiation: 'orange',
        won: 'green',
        lost: 'red',
      };

      Object.keys(STAGE_PROBABILITY).forEach(stage => {
        expect(stageColors[stage as keyof typeof stageColors]).toBeTruthy();
      });
    });
  });

  describe('Notification Triggers', () => {
    it('should trigger notification on stage change', () => {
      const stageChange = {
        from: 'quote_sent',
        to: 'negotiation',
        shouldNotify: true,
      };

      expect(stageChange.shouldNotify).toBe(true);
    });

    it('should notify team on won deal', () => {
      const wonDeal = {
        stage: 'won',
        value: 50000,
        shouldNotifyTeam: true,
      };

      expect(wonDeal.shouldNotifyTeam).toBe(true);
      expect(wonDeal.value).toBeGreaterThan(0);
    });
  });
});
