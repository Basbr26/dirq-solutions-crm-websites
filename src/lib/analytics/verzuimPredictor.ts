/**
 * Predictive Analytics voor Verzuim
 * Gebruikt een eenvoudig ML model om verzuimrisico te voorspellen
 */

export type RiskLevel = 'low' | 'medium' | 'high';

export interface VerzuimPrediction {
  employeeId: string;
  employeeName: string;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  confidence: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  name: string;
  impact: number; // -1 to 1
  description: string;
}

interface VerzuimHistoryPoint {
  date: string;
  days: number;
  frequency: number;
}

/**
 * Bradford Factor berekening: S² × D
 * S = Aantal verzuimgevallen
 * D = Totaal aantal verzuimdagen
 */
export function calculateBradfordFactor(absences: Array<{ days: number }>): number {
  const totalDays = absences.reduce((sum, a) => sum + a.days, 0);
  const frequency = absences.length;
  return Math.round(frequency * frequency * totalDays);
}

/**
 * Voorspel verzuimrisico voor een medewerker
 */
export async function predictVerzuimRisk(employeeData: {
  id: string;
  name: string;
  age: number;
  tenure: number; // maanden
  department: string;
  verzuimHistory: VerzuimHistoryPoint[];
  currentAbsence?: boolean;
}): Promise<VerzuimPrediction> {
  const { verzuimHistory, age, tenure, currentAbsence } = employeeData;

  // Feature extraction
  const totalDays = verzuimHistory.reduce((sum, h) => sum + h.days, 0);
  const frequency = verzuimHistory.length;
  const avgDuration = frequency > 0 ? totalDays / frequency : 0;
  const bradfordFactor = calculateBradfordFactor(
    verzuimHistory.map(h => ({ days: h.days }))
  );

  // Seizoenseffect (winter = hoger risico)
  const month = new Date().getMonth();
  const winterMonths = [11, 0, 1, 2]; // dec, jan, feb, mrt
  const seasonalRisk = winterMonths.includes(month) ? 1.2 : 1.0;

  // Age risk (jongeren en ouderen hebben hoger risico)
  const ageRisk = age < 25 || age > 55 ? 1.3 : 1.0;

  // Tenure risk (eerste jaar = hoger risico)
  const tenureRisk = tenure < 12 ? 1.2 : 1.0;

  // Base risk score berekening
  let baseScore = 0;

  // Verzuimfrequentie (40% weight)
  if (frequency > 4) baseScore += 40;
  else if (frequency > 2) baseScore += 25;
  else if (frequency > 0) baseScore += 10;

  // Bradford Factor (30% weight)
  if (bradfordFactor > 500) baseScore += 30;
  else if (bradfordFactor > 200) baseScore += 20;
  else if (bradfordFactor > 50) baseScore += 10;

  // Gemiddelde duur (20% weight)
  if (avgDuration > 10) baseScore += 20;
  else if (avgDuration > 5) baseScore += 10;

  // Huidig verzuim (10% weight)
  if (currentAbsence) baseScore += 10;

  // Apply multipliers
  const finalScore = Math.min(
    100,
    Math.round(baseScore * seasonalRisk * ageRisk * tenureRisk)
  );

  // Determine risk level
  let riskLevel: RiskLevel;
  if (finalScore >= 70) riskLevel = 'high';
  else if (finalScore >= 40) riskLevel = 'medium';
  else riskLevel = 'low';

  // Confidence based on data quality
  const dataPoints = verzuimHistory.length;
  const confidence = Math.min(95, 50 + dataPoints * 10);

  // Generate risk factors
  const factors: RiskFactor[] = [];

  if (bradfordFactor > 200) {
    factors.push({
      name: 'Hoge Bradford Factor',
      impact: 0.8,
      description: `Bradford Factor van ${bradfordFactor} duidt op frequent kort verzuim`,
    });
  }

  if (frequency > 3) {
    factors.push({
      name: 'Frequentie',
      impact: 0.6,
      description: `${frequency} verzuimgevallen in afgelopen periode`,
    });
  }

  if (seasonalRisk > 1) {
    factors.push({
      name: 'Seizoen',
      impact: 0.3,
      description: 'Wintermaanden hebben historisch hoger verzuim',
    });
  }

  if (ageRisk > 1) {
    factors.push({
      name: 'Leeftijd',
      impact: 0.4,
      description: 'Leeftijdsgroep met verhoogd risico',
    });
  }

  if (tenureRisk > 1) {
    factors.push({
      name: 'Dienstverband',
      impact: 0.3,
      description: 'Eerste jaar heeft statistisch hoger verzuim',
    });
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (riskLevel === 'high') {
    recommendations.push('Plan preventief verzuimgesprek binnen 2 weken');
    recommendations.push('Check werkdruk en arbeidsomstandigheden');
    if (bradfordFactor > 300) {
      recommendations.push('Overweeg mediation met leidinggevende');
    }
  }

  if (riskLevel === 'medium') {
    recommendations.push('Monitor verzuimpatroon komende maand');
    recommendations.push('Voer functioneringsgesprek uit');
  }

  if (frequency > 4) {
    recommendations.push('Analyseer oorzaken van frequent kort verzuim');
  }

  if (avgDuration > 7) {
    recommendations.push('Check of bedrijfsarts betrokken is');
  }

  return {
    employeeId: employeeData.id,
    employeeName: employeeData.name,
    riskScore: finalScore,
    riskLevel,
    confidence,
    factors,
    recommendations,
  };
}

/**
 * Voorspel verzuimtrend voor komende maanden
 */
export function forecastVerzuim(historicalData: VerzuimHistoryPoint[]): VerzuimHistoryPoint[] {
  if (historicalData.length < 3) return [];

  // Simple moving average forecast
  const last3Months = historicalData.slice(-3);
  const avgDays = last3Months.reduce((sum, d) => sum + d.days, 0) / 3;
  const avgFreq = last3Months.reduce((sum, d) => sum + d.frequency, 0) / 3;

  // Generate forecast for next 3 months
  const forecast: VerzuimHistoryPoint[] = [];
  const lastDate = new Date(historicalData[historicalData.length - 1].date);

  for (let i = 1; i <= 3; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);

    // Add some variance (±15%)
    const variance = 0.85 + Math.random() * 0.3;

    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      days: Math.round(avgDays * variance),
      frequency: Math.round(avgFreq * variance),
    });
  }

  return forecast;
}

/**
 * Bereken team capacity risk
 */
export function calculateTeamCapacityRisk(teamData: {
  totalFTE: number;
  currentAbsences: number;
  criticalRoles: number;
}): {
  riskLevel: RiskLevel;
  absenceRate: number;
  message: string;
} {
  const { totalFTE, currentAbsences, criticalRoles } = teamData;
  const absenceRate = (currentAbsences / totalFTE) * 100;

  let riskLevel: RiskLevel;
  let message: string;

  if (absenceRate >= 15) {
    riskLevel = 'high';
    message = 'Kritiek verzuimpercentage - direct actie vereist';
  } else if (absenceRate >= 10) {
    riskLevel = 'medium';
    message = 'Verhoogd verzuim - monitor situatie';
  } else {
    riskLevel = 'low';
    message = 'Verzuim binnen normale range';
  }

  // Adjust for critical roles
  if (criticalRoles > currentAbsences * 0.5) {
    if (riskLevel === 'low') riskLevel = 'medium';
    else if (riskLevel === 'medium') riskLevel = 'high';
    message += ' - Kritieke functies getroffen';
  }

  return {
    riskLevel,
    absenceRate: Math.round(absenceRate * 10) / 10,
    message,
  };
}
