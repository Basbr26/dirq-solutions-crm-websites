import { useTranslation } from 'react-i18next';
import { Interaction } from '../hooks/useInteractions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  Presentation,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  User,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { InteractionDetailDialog } from './InteractionDetailDialog';

interface InteractionCardProps {
  interaction: Interaction;
}

const getTypeConfig = (type: string, t: any) => {
  const configs = {
    call: { icon: Phone, label: t('interactions.types.call'), color: 'bg-blue-500' },
    email: { icon: Mail, label: t('interactions.types.email'), color: 'bg-purple-500' },
    meeting: { icon: Calendar, label: t('interactions.types.meeting'), color: 'bg-green-500' },
    note: { icon: FileText, label: t('interactions.types.note'), color: 'bg-gray-500' },
    task: { icon: CheckSquare, label: t('interactions.types.task'), color: 'bg-orange-500' },
    demo: { icon: Presentation, label: t('interactions.types.demo'), color: 'bg-pink-500' },
  };
  return configs[type as keyof typeof configs] || configs.note;
};

const getTaskStatusConfig = (status: string, t: any) => {
  const configs = {
    pending: { label: t('interactions.taskStatus.pending'), color: 'bg-yellow-500' },
    completed: { label: t('interactions.taskStatus.completed'), color: 'bg-green-500' },
    cancelled: { label: t('interactions.taskStatus.cancelled'), color: 'bg-gray-500' },
  };
  return configs[status as keyof typeof configs];
};

export function InteractionCard({ interaction }: InteractionCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showDetail, setShowDetail] = useState(false);
  const config = getTypeConfig(interaction.type, t);
  const Icon = config.icon;

  const handleCompanyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (interaction.company_id) {
      navigate(`/companies/${interaction.company_id}`);
    }
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (interaction.contact_id) {
      navigate(`/contacts/${interaction.contact_id}`);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowDetail(true)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className={`${config.color} p-2 rounded-lg text-white`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base line-clamp-1">
                    {interaction.subject}
                  </h3>
                  {interaction.direction && (
                    <Badge variant="outline" className="gap-1">
                      {interaction.direction === 'inbound' ? (
                        <>
                          <ArrowDownLeft className="h-3 w-3" />
                          {t('interactions.inbound')}
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-3 w-3" />
                          {t('interactions.outbound')}
                        </>
                      )}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(interaction.created_at), {
                      addSuffix: true,
                      locale: nl,
                    })}
                  </span>
                  {interaction.duration_minutes && (
                    <span>{interaction.duration_minutes} {t('common.minutes')}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary">{config.label}</Badge>
              {interaction.is_task && interaction.task_status && (
                <Badge
                  className={`${getTaskStatusConfig(interaction.task_status, t).color} text-white`}
                >
                  {getTaskStatusConfig(interaction.task_status, t).label}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {interaction.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {interaction.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {interaction.company && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 gap-2"
                  onClick={handleCompanyClick}
                >
                  <Building2 className="h-3 w-3" />
                  <span className="text-xs">{interaction.company.name}</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}

              {interaction.contact && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 gap-2"
                  onClick={handleContactClick}
                >
                  <User className="h-3 w-3" />
                  <span className="text-xs">
                    {interaction.contact.first_name} {interaction.contact.last_name}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>

            {interaction.user && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {interaction.user?.voornaam} {interaction.user?.achternaam}
              </div>
            )}
          </div>

          {interaction.tags && interaction.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {interaction.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InteractionDetailDialog
        interaction={interaction}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </>
  );
}
