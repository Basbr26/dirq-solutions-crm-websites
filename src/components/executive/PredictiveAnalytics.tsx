import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Brain, Users } from 'lucide-react';
import type { VerzuimPrediction, RiskLevel } from '@/lib/analytics/verzuimPredictor';

interface PredictiveAnalyticsProps {
  predictions: VerzuimPrediction[];
  loading?: boolean;
}

const riskConfig: Record<RiskLevel, { label: string; variant: 'destructive' | 'default' | 'secondary'; color: string }> = {
  high: { label: 'Hoog Risico', variant: 'destructive', color: 'bg-red-500' },
  medium: { label: 'Gemiddeld Risico', variant: 'default', color: 'bg-yellow-500' },
  low: { label: 'Laag Risico', variant: 'secondary', color: 'bg-green-500' },
};

export function PredictiveAnalytics({ predictions, loading }: PredictiveAnalyticsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Predictive Analytics
          </CardTitle>
          <CardDescription>AI-gedreven verzuimrisicoanalyse</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by risk score
  const sortedPredictions = [...predictions].sort((a, b) => b.riskScore - a.riskScore);
  const highRiskCount = predictions.filter((p) => p.riskLevel === 'high').length;
  const mediumRiskCount = predictions.filter((p) => p.riskLevel === 'medium').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Predictive Analytics
            </CardTitle>
            <CardDescription>AI-gedreven verzuimrisicoanalyse</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {predictions.length} medewerkers
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm font-medium">Hoog Risico</span>
            </div>
            <p className="text-2xl font-bold">{highRiskCount}</p>
            {highRiskCount > 0 && (
              <p className="text-xs text-muted-foreground">Directe actie vereist</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium">Gemiddeld</span>
            </div>
            <p className="text-2xl font-bold">{mediumRiskCount}</p>
            <p className="text-xs text-muted-foreground">Monitor situatie</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Laag Risico</span>
            </div>
            <p className="text-2xl font-bold">
              {predictions.length - highRiskCount - mediumRiskCount}
            </p>
            <p className="text-xs text-muted-foreground">Stabiele situatie</p>
          </div>
        </div>

        {/* High Risk Predictions */}
        {sortedPredictions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Top Risico's</h3>
              {highRiskCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {highRiskCount} aandachtspunten
                </Badge>
              )}
            </div>

            {sortedPredictions.slice(0, 5).map((prediction) => (
              <Card key={prediction.employeeId} className="border-l-4" style={{
                borderLeftColor: riskConfig[prediction.riskLevel].color.replace('bg-', '#'),
              }}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{prediction.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        Confidence: {prediction.confidence}%
                      </p>
                    </div>
                    <Badge variant={riskConfig[prediction.riskLevel].variant}>
                      {riskConfig[prediction.riskLevel].label}
                    </Badge>
                  </div>

                  {/* Risk Score Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Risk Score</span>
                      <span className="font-medium">{prediction.riskScore}/100</span>
                    </div>
                    <Progress 
                      value={prediction.riskScore} 
                      className="h-2"
                    />
                  </div>

                  {/* Risk Factors */}
                  {prediction.factors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Risicofactoren:</p>
                      <div className="flex flex-wrap gap-1">
                        {prediction.factors.map((factor, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {factor.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {prediction.recommendations.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Aanbevelingen:
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {prediction.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Button for High Risk */}
                  {prediction.riskLevel === 'high' && (
                    <Button size="sm" className="w-full" variant="outline">
                      Plan Preventief Gesprek
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {predictions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Geen voorspellingen beschikbaar</p>
            <p className="text-xs mt-1">Meer historische data nodig voor analyse</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
