import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface LeaveBalance {
  leave_type: string;
  total_days: number;
  used_days: number;
  pending_days: number;
}

interface LeaveBalanceCardProps {
  balances: LeaveBalance[];
  getLeaveTypeLabel: (type: string) => string;
}

export function LeaveBalanceCard({ balances, getLeaveTypeLabel }: LeaveBalanceCardProps) {
  if (balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verlofsaldo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Geen verlofsaldo beschikbaar voor dit jaar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Verlofsaldo {new Date().getFullYear()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {balances.map((balance) => {
          const remaining = balance.total_days - balance.used_days - balance.pending_days;
          const usedPercentage = (balance.used_days / balance.total_days) * 100;
          const pendingPercentage = (balance.pending_days / balance.total_days) * 100;

          return (
            <div key={balance.leave_type} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{getLeaveTypeLabel(balance.leave_type)}</span>
                <span className="text-muted-foreground">
                  {remaining} van {balance.total_days} dagen beschikbaar
                </span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-primary rounded-full"
                  style={{ width: `${usedPercentage}%` }}
                />
                <div
                  className="absolute top-0 h-full bg-warning rounded-full"
                  style={{ left: `${usedPercentage}%`, width: `${pendingPercentage}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Opgenomen: {balance.used_days}
                </span>
                {balance.pending_days > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-warning" />
                    In behandeling: {balance.pending_days}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
