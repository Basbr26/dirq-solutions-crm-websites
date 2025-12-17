// Gamification System

export const ACHIEVEMENT_DEFINITIONS = {
  // Tenure achievements
  newcomer: {
    name: 'Newcomer',
    icon: '🌱',
    color: 'green',
    points: 10,
    type: 'tenure',
    requirement: 'employed_since_1year',
  },
  veteran: {
    name: 'Veteran',
    icon: '🏆',
    color: 'blue',
    points: 50,
    type: 'tenure',
    requirement: 'employed_since_5years',
  },
  legend: {
    name: 'Legend',
    icon: '💎',
    color: 'purple',
    points: 150,
    type: 'tenure',
    requirement: 'employed_since_10years',
  },

  // Performance achievements
  high_performer: {
    name: 'High Performer',
    icon: '🚀',
    color: 'pink',
    points: 50,
    type: 'performance',
    requirement: 'exceeded_goals_3x',
  },
  always_present: {
    name: 'Always Present',
    icon: '⭐',
    color: 'yellow',
    points: 30,
    type: 'performance',
    requirement: 'perfect_attendance_year',
  },

  // Social achievements
  team_player: {
    name: 'Team Player',
    icon: '🤝',
    color: 'blue',
    points: 25,
    type: 'social',
    requirement: 'helped_colleagues_10x',
  },
  talent_scout: {
    name: 'Talent Scout',
    icon: '👥',
    color: 'green',
    points: 75,
    type: 'social',
    requirement: 'referrals_3+',
  },

  // Learning achievements
  learning_champion: {
    name: 'Learning Champion',
    icon: '📚',
    color: 'blue',
    points: 50,
    type: 'learning',
    requirement: 'certifications_5+',
  },
  course_master: {
    name: 'Course Master',
    icon: '🎓',
    color: 'purple',
    points: 40,
    type: 'learning',
    requirement: 'completed_courses_10+',
  },
};

export const POINTS_ACTIONS = {
  training_completed: 10,
  referral_hired: 100,
  perfect_attendance_month: 50,
  feedback_given: 5,
  goal_achieved: 30,
  certification_earned: 25,
  helped_colleague: 5,
  timesheet_filled_ontime: 2,
  survey_completed: 10,
};

export const POINT_REDEMPTION = {
  extra_day_off: { points: 250, label: 'Extra verlofdag' },
  training_budget_boost: { points: 150, label: '€150 trainingsbudget' },
  lunch_with_ceo: { points: 300, label: 'Lunch met CEO' },
  company_merch: { points: 100, label: 'Company merchandise' },
  parking_spot: { points: 200, label: 'VIP parkeerplaats (1 maand)' },
};

/**
 * Check if employee earned an achievement
 */
export function checkAchievement(
  employeeMetrics: any,
  achievementKey: string
): boolean {
  const achievement = ACHIEVEMENT_DEFINITIONS[achievementKey];
  if (!achievement) return false;

  switch (achievement.requirement) {
    case 'employed_since_1year':
      return employeeMetrics.yearsOfService >= 1;
    case 'employed_since_5years':
      return employeeMetrics.yearsOfService >= 5;
    case 'employed_since_10years':
      return employeeMetrics.yearsOfService >= 10;
    case 'exceeded_goals_3x':
      return employeeMetrics.goalsExceededCount >= 3;
    case 'perfect_attendance_year':
      return employeeMetrics.absenceCount === 0;
    case 'helped_colleagues_10x':
      return employeeMetrics.helpEventsCount >= 10;
    case 'referrals_3+':
      return employeeMetrics.successfulReferralsCount >= 3;
    case 'certifications_5+':
      return employeeMetrics.certificationsCount >= 5;
    case 'completed_courses_10+':
      return employeeMetrics.completedCoursesCount >= 10;
    default:
      return false;
  }
}

/**
 * Calculate streak (consecutive days of activity)
 */
export function calculateStreak(
  events: Array<{ date: Date }>,
  consecutiveDaysThreshold: number = 1
): number {
  if (events.length === 0) return 0;

  let streak = 1;
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (let i = 1; i < sortedEvents.length; i++) {
    const currDate = new Date(sortedEvents[i].date);
    const prevDate = new Date(sortedEvents[i - 1].date);

    const diffInDays = Math.floor(
      (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get recommended achievements for employee based on metrics
 */
export function getRecommendedAchievements(employeeMetrics: any): string[] {
  const recommended: string[] = [];

  Object.entries(ACHIEVEMENT_DEFINITIONS).forEach(([key, achievement]) => {
    if (!employeeMetrics.earnedAchievements?.includes(key)) {
      if (checkAchievement(employeeMetrics, key)) {
        recommended.push(key);
      }
    }
  });

  return recommended;
}

/**
 * Get achievement progress (percentage to next achievement)
 */
export function getAchievementProgress(
  current: number,
  target: number
): number {
  if (target === 0) return 100;
  return Math.min(Math.round((current / target) * 100), 99);
}
