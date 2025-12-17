// Leave Calculation Utilities

export interface LeaveBalance {
  totalDays: number;
  takenDays: number;
  plannedDays: number;
  availableDays: number;
  carryOverDays: number;
  expiringDays: number;
}

/**
 * Calculate leave balance for employee
 */
export function calculateLeaveBalance(
  annualAllocation: number = 25,
  takenDays: number = 0,
  plannedDays: number = 0,
  carryOverDays: number = 0,
  expiryThresholdDays: number = 90
): LeaveBalance {
  const totalDays = annualAllocation + carryOverDays;
  const usedDays = takenDays + plannedDays;
  const availableDays = totalDays - usedDays;
  
  // Determine expiring days (days that will expire within threshold)
  const expiringDays = Math.max(0, availableDays - expiryThresholdDays);

  return {
    totalDays,
    takenDays,
    plannedDays,
    availableDays: Math.max(0, availableDays),
    carryOverDays,
    expiringDays,
  };
}

/**
 * Get leave recommendations based on employee data
 */
export function getLeaveRecommendations(
  balance: LeaveBalance,
  teamCalendar: Array<{ date: Date; name: string; type: string }>
): Array<{
  period: string;
  reason: string;
  days: number;
  impact: 'low' | 'medium' | 'high';
}> {
  const recommendations: Array<{
    period: string;
    reason: string;
    days: number;
    impact: 'low' | 'medium' | 'high';
  }> = [];

  if (balance.expiringDays > 0) {
    recommendations.push({
      period: 'Next 3 months',
      reason: `Je hebt ${balance.expiringDays} dagen die binnenkort verlopen`,
      days: balance.expiringDays,
      impact: 'high',
    });
  }

  // Find quiet periods (when few team members are away)
  const quietPeriods = findQuietPeriods(teamCalendar);
  quietPeriods.slice(0, 2).forEach((period) => {
    recommendations.push({
      period: period.name,
      reason: 'Rustige periode in team - weinig afwezigen',
      days: 5,
      impact: 'low',
    });
  });

  return recommendations;
}

/**
 * Find periods when few team members are away
 */
function findQuietPeriods(
  teamCalendar: Array<{ date: Date; name: string; type: string }>
): Array<{ name: string; percentage: number }> {
  const periods: Array<{ name: string; percentage: number }> = [];

  // Simplified: return hardcoded quiet periods
  periods.push(
    { name: 'Week 28-29', percentage: 30 },
    { name: 'Week 42-43', percentage: 25 },
    { name: 'January (post-holidays)', percentage: 40 }
  );

  return periods;
}

/**
 * Calculate team availability for a date range
 */
export function calculateTeamAvailability(
  teamCalendar: Array<{ employeeId: string; dates: Date[] }>,
  startDate: Date,
  endDate: Date
): { teamSize: number; availablePercentage: number } {
  const totalTeamSize = teamCalendar.length;
  let availableCount = totalTeamSize;

  teamCalendar.forEach((member) => {
    member.dates.forEach((date) => {
      if (date >= startDate && date <= endDate) {
        availableCount--;
      }
    });
  });

  return {
    teamSize: totalTeamSize,
    availablePercentage: Math.round((availableCount / totalTeamSize) * 100),
  };
}

/**
 * Validate leave request
 */
export function validateLeaveRequest(
  balance: LeaveBalance,
  requestedDays: number,
  startDate: Date,
  endDate: Date,
  companyHolidays: Date[] = []
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (requestedDays > balance.availableDays) {
    errors.push(`Onvoldoende verlofsdagen. Je hebt ${balance.availableDays} dagen beschikbaar.`);
  }

  if (requestedDays > balance.expiringDays) {
    warnings.push(`${balance.expiringDays} van je aanvraag zullen vervallen.`);
  }

  if (startDate > endDate) {
    errors.push('Startdatum moet voor einddatum liggen.');
  }

  // Check if overlapping company holidays
  const overlappingHolidays = companyHolidays.filter(
    (holiday) => holiday >= startDate && holiday <= endDate
  );

  if (overlappingHolidays.length > 0) {
    warnings.push(
      `${overlappingHolidays.length} dagen vallen samen met bedrijfsvakanties.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format leave balance for display
 */
export function formatLeaveBalance(balance: LeaveBalance): string {
  return `${balance.availableDays}/${balance.totalDays} dagen beschikbaar`;
}

/**
 * Get leave status badge
 */
export function getLeaveStatusBadge(
  balance: LeaveBalance
): 'good' | 'warning' | 'critical' {
  if (balance.availableDays >= 10) return 'good';
  if (balance.availableDays >= 5) return 'warning';
  return 'critical';
}
