import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarDays, AlertCircle, Clock, FileText, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickAction {
  icon: string;
  label: string;
  action: string;
  color: string;
  badgeCount?: number;
}

export function QuickActions() {
  const navigate = useNavigate();
  const { balance } = useLeaveBalance();
  const [quickLeaveDialog, setQuickLeaveDialog] = useState(false);
  const [sickLeaveConfirm, setSickLeaveConfirm] = useState(false);

  const quickActions: QuickAction[] = [
    {
      icon: '🏖️',
      label: 'Verlof',
      action: 'leave',
      color: 'bg-gradient-to-br from-teal-400 to-teal-600',
      badgeCount: balance?.availableDays,
    },
    {
      icon: '🤒',
      label: 'Ziek',
      action: 'sick',
      color: 'bg-gradient-to-br from-red-400 to-red-600',
    },
    {
      icon: '⏰',
      label: 'Uren',
      action: 'hours',
      color: 'bg-gradient-to-br from-orange-400 to-orange-600',
    },
    {
      icon: '📄',
      label: 'Docs',
      action: 'documents',
      color: 'bg-gradient-to-br from-blue-400 to-blue-600',
    },
    {
      icon: '💬',
      label: 'Chat',
      action: 'chat',
      color: 'bg-gradient-to-br from-purple-400 to-purple-600',
    },
  ];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'leave':
        setQuickLeaveDialog(true);
        break;
      case 'sick':
        setSickLeaveConfirm(true);
        break;
      case 'hours':
        navigate('/timesheet');
        break;
      case 'documents':
        navigate('/documents');
        break;
      case 'chat':
        navigate('/chatbot');
        break;
    }
  };

  return (
    <>
      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3 safe-area-inset-bottom">
        <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
          {quickActions.map((qa, index) => (
            <motion.button
              key={qa.action}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickAction(qa.action)}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-lg ${qa.color} text-white text-xs font-medium transition-all hover:shadow-md`}
            >
              <span className="text-xl">{qa.icon}</span>
              <span className="text-xs line-clamp-1">{qa.label}</span>

              {/* Badge */}
              {qa.badgeCount && qa.badgeCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {qa.badgeCount}
                </Badge>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Quick Leave Dialog */}
      <Dialog open={quickLeaveDialog} onOpenChange={setQuickLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verlof Aanvragen</DialogTitle>
            <DialogDescription>
              Snel verlof aanvragen met minimale stappen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Leave Balance Display */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Beschikbare verlofsdagen
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {balance?.availableDays || 0} dagen
              </p>
            </div>

            {/* Quick Options */}
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => {
                  navigate('/leave?quick=true');
                  setQuickLeaveDialog(false);
                }}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Nieuw Verlofverzoek
              </Button>
              <Button variant="outline" className="w-full">
                Mijn Verlofrequesten
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sick Leave Confirmation */}
      <Dialog open={sickLeaveConfirm} onOpenChange={setSickLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-red-500" />
              Ziekmelden
            </DialogTitle>
            <DialogDescription>
              Ben je vandaag ziek?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Je manager zal onmiddellijk een melding ontvangen.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSickLeaveConfirm(false)}
              >
                Annuleren
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => {
                  // Submit sick leave
                  setSickLeaveConfirm(false);
                  // Show success toast
                }}
              >
                Ja, Ziekmelden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
