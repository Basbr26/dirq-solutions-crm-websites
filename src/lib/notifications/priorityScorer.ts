/**
 * Priority Scorer
 * AI-based priority calculation for intelligent notification sorting
 */

import type {
  NotificationType,
  NotificationPriority,
  PriorityScoreFactors,
} from '@/types/notifications';

export class PriorityScorer {
  /**
   * Calculate comprehensive priority score (0-100)
   */
  static calculateScore(
    type: NotificationType,
    deadline: Date | null,
    userRole: string,
    metadata: Record<string, any> = {}
  ): { score: number; priority: NotificationPriority; factors: PriorityScoreFactors } {
    const factors: PriorityScoreFactors = {
      base_type_score: this.getBaseTypeScore(type),
      deadline_modifier: this.getDeadlineModifier(deadline),
      role_modifier: this.getRoleModifier(userRole),
      critical_flag: this.getCriticalModifier(metadata),
      legal_compliance: this.getLegalComplianceModifier(metadata),
      total: 0,
    };

    // Calculate total score
    factors.total = Math.min(
      100,
      Math.max(
        0,
        factors.base_type_score +
          factors.deadline_modifier +
          factors.role_modifier +
          factors.critical_flag +
          factors.legal_compliance
      )
    );

    // Determine priority enum from score
    const priority = this.scoreToPriority(factors.total);

    return {
      score: factors.total,
      priority,
      factors,
    };
  }

  /**
   * Base score by notification type
   */
  private static getBaseTypeScore(type: NotificationType): number {
    const scores: Record<NotificationType, number> = {
      escalation: 90,
      approval: 70,
      deadline: 60,
      reminder: 40,
      update: 30,
      digest: 20,
    };

    return scores[type] || 50;
  }

  /**
   * Deadline proximity modifier (-40 to +40)
   */
  private static getDeadlineModifier(deadline: Date | null): number {
    if (!deadline) return 0;

    const now = new Date();
    const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 0) return 40; // Overdue
    if (hoursUntil < 1) return 35; // < 1 hour
    if (hoursUntil < 6) return 30; // < 6 hours
    if (hoursUntil < 24) return 25; // < 24 hours
    if (hoursUntil < 72) return 20; // < 3 days
    if (hoursUntil < 168) return 10; // < 1 week
    if (hoursUntil < 336) return 5; // < 2 weeks

    return 0; // > 2 weeks
  }

  /**
   * User role modifier (0-10)
   */
  private static getRoleModifier(role: string): number {
    const modifiers: Record<string, number> = {
      super_admin: 10,
      hr: 8,
      manager: 5,
      medewerker: 0,
    };

    return modifiers[role] || 0;
  }

  /**
   * Critical flag modifier (0-25)
   */
  private static getCriticalModifier(metadata: Record<string, any>): number {
    if (metadata.is_critical === true) return 25;
    if (metadata.is_urgent === true) return 15;
    if (metadata.is_important === true) return 10;

    return 0;
  }

  /**
   * Legal compliance modifier (0-20)
   */
  private static getLegalComplianceModifier(metadata: Record<string, any>): number {
    if (metadata.legal_compliance === true) return 20;
    if (metadata.wet_poortwachter === true) return 20;
    if (metadata.compliance_required === true) return 15;

    return 0;
  }

  /**
   * Convert score to priority enum
   */
  private static scoreToPriority(score: number): NotificationPriority {
    if (score >= 90) return 'critical';
    if (score >= 75) return 'urgent';
    if (score >= 60) return 'high';
    if (score >= 40) return 'normal';
    return 'low';
  }

  /**
   * Sort notifications by priority score
   */
  static sortByPriority<T extends { priority_score: number }>(
    notifications: T[]
  ): T[] {
    return [...notifications].sort((a, b) => b.priority_score - a.priority_score);
  }

  /**
   * Group notifications by priority
   */
  static groupByPriority<T extends { priority: NotificationPriority }>(
    notifications: T[]
  ): Record<NotificationPriority, T[]> {
    const groups: Record<NotificationPriority, T[]> = {
      critical: [],
      urgent: [],
      high: [],
      normal: [],
      low: [],
    };

    for (const notification of notifications) {
      groups[notification.priority].push(notification);
    }

    return groups;
  }

  /**
   * Filter notifications by minimum priority
   */
  static filterByMinimumPriority<T extends { priority_score: number }>(
    notifications: T[],
    minimumScore: number
  ): T[] {
    return notifications.filter((n) => n.priority_score >= minimumScore);
  }

  /**
   * Calculate urgency decay factor
   * Returns multiplier (0-1) based on time elapsed since creation
   */
  static calculateUrgencyDecay(createdAt: Date, halfLife: number = 24): number {
    const hoursElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    
    // Exponential decay: urgency = 0.5^(hoursElapsed/halfLife)
    return Math.pow(0.5, hoursElapsed / halfLife);
  }

  /**
   * Apply time-based decay to notification scores
   */
  static applyTimeDecay<T extends { priority_score: number; created_at: string }>(
    notifications: T[],
    halfLifeHours: number = 24
  ): Array<T & { decayed_score: number }> {
    return notifications.map((n) => ({
      ...n,
      decayed_score: Math.round(
        n.priority_score * this.calculateUrgencyDecay(new Date(n.created_at), halfLifeHours)
      ),
    }));
  }

  /**
   * Predict optimal notification time
   * Returns recommended send time based on user behavior patterns
   */
  static predictOptimalSendTime(
    userActivity: Array<{ hour: number; engagement_rate: number }>
  ): number {
    // Find hour with highest engagement
    const optimal = userActivity.reduce((best, current) =>
      current.engagement_rate > best.engagement_rate ? current : best
    );

    return optimal.hour;
  }

  /**
   * Calculate notification fatigue score
   * Returns 0-100 where higher = more fatigued
   */
  static calculateFatigueScore(recentNotificationCount: number, timeWindowHours: number = 24): number {
    // Fatigue increases exponentially with notification count
    const baseThreshold = 10; // Comfortable notification count per day
    const ratio = recentNotificationCount / (baseThreshold * (timeWindowHours / 24));
    
    return Math.min(100, Math.round(ratio * 50));
  }

  /**
   * Recommend batching strategy based on fatigue
   */
  static recommendBatchingStrategy(fatigueScore: number): {
    shouldBatch: boolean;
    batchDelayMinutes: number;
    maxBatchSize: number;
  } {
    if (fatigueScore < 30) {
      return {
        shouldBatch: false,
        batchDelayMinutes: 0,
        maxBatchSize: 1,
      };
    }

    if (fatigueScore < 60) {
      return {
        shouldBatch: true,
        batchDelayMinutes: 15,
        maxBatchSize: 5,
      };
    }

    return {
      shouldBatch: true,
      batchDelayMinutes: 60,
      maxBatchSize: 10,
    };
  }

  /**
   * ML-based priority prediction (placeholder for future ML model)
   * Currently uses heuristics, can be replaced with actual ML model
   */
  static async predictPriority(
    features: {
      type: NotificationType;
      deadline?: Date;
      userRole: string;
      metadata: Record<string, any>;
      historicalEngagement?: number;
      similarNotificationPriority?: number;
    }
  ): Promise<{ score: number; confidence: number }> {
    // Calculate base score
    const result = this.calculateScore(
      features.type,
      features.deadline || null,
      features.userRole,
      features.metadata
    );

    // Adjust based on historical engagement
    let adjustedScore = result.score;
    let confidence = 0.8;

    if (features.historicalEngagement !== undefined) {
      // Users who engage more with certain types → increase priority
      adjustedScore += features.historicalEngagement * 10;
      confidence += 0.1;
    }

    if (features.similarNotificationPriority !== undefined) {
      // Use similar notification priority as signal
      adjustedScore = (adjustedScore + features.similarNotificationPriority) / 2;
      confidence += 0.1;
    }

    return {
      score: Math.min(100, Math.max(0, Math.round(adjustedScore))),
      confidence: Math.min(1, confidence),
    };
  }
}
