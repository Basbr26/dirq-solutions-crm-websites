import { Card } from '@/components/ui/card'
import { StatusAvatar } from '@/components/ui/status-avatar'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Employee {
  id: string
  voornaam: string
  achternaam: string
  foto_url?: string
}

interface Absence {
  id: string
  employee?: Employee
}

interface Leave {
  id: string
  employee?: Employee
}

interface DayInfoCardProps {
  date: Date
  absences: Absence[]
  leaves: Leave[]
}

export const DayInfoCard = ({ date, absences, leaves }: DayInfoCardProps) => {
  const totalAway = absences.length + leaves.length
  
  if (totalAway === 0) {
    return (
      <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <div className="text-center">
          <div className="text-2xl mb-1">✅</div>
          <div className="font-medium">Volledig bezet</div>
          <div className="text-sm text-muted-foreground">
            Niemand afwezig op {format(date, 'd MMMM', { locale: nl })}
          </div>
        </div>
      </Card>
    )
  }
  
  return (
    <Card className="p-4">
      <h4 className="font-medium mb-3">
        Afwezig op {format(date, 'd MMMM', { locale: nl })}
      </h4>
      
      <div className="space-y-3">
        {/* Sick leaves */}
        {absences.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">Ziek ({absences.length})</div>
            {absences.map(absence => (
              <div key={absence.id} className="flex items-center gap-2 mb-2">
                <StatusAvatar
                  src={absence.employee?.foto_url}
                  fallback={`${absence.employee?.voornaam?.[0]}${absence.employee?.achternaam?.[0]}`}
                  status="sick"
                  size="sm"
                />
                <span className="text-sm">
                  {absence.employee?.voornaam} {absence.employee?.achternaam}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Leaves */}
        {leaves.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">Verlof ({leaves.length})</div>
            {leaves.map(leave => (
              <div key={leave.id} className="flex items-center gap-2 mb-2">
                <StatusAvatar
                  src={leave.employee?.foto_url}
                  fallback={`${leave.employee?.voornaam?.[0]}${leave.employee?.achternaam?.[0]}`}
                  status="leave"
                  size="sm"
                />
                <span className="text-sm">
                  {leave.employee?.voornaam} {leave.employee?.achternaam}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
