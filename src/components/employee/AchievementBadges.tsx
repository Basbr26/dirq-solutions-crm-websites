import { useAchievements } from '@/hooks/useAchievements';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export function AchievementBadges() {
  const { achievements, points } = useAchievements();
  const [selectedBadge, setSelectedBadge] = useState(null);

  const groupedAchievements = achievements.reduce((acc, achievement) => {
    if (!acc[achievement.type]) {
      acc[achievement.type] = [];
    }
    acc[achievement.type].push(achievement);
    return acc;
  }, {} as Record<string, typeof achievements>);

  const shareToLinkedIn = (badge: { name: string; id: string }) => {
    const text = `🎉 Ik heb zojuist het "${badge.name}" badge verdiend! 🏆 #HR #Development`;
    const url = `https://www.linkedin.com/feed/?linkOrigin=LI_BADGE`;
    // In reality, would use LinkedIn Share API
    toast.success('Badge URL gekopieerd naar klembord');
  };

  const typeLabels: Record<string, string> = {
    tenure: '🕐 Dienstjubileum',
    performance: '🚀 Prestatie',
    social: '🤝 Samenwerking',
    learning: '📚 Leren',
  };

  const typeColors: Record<string, string> = {
    tenure: 'from-amber-400 to-amber-600',
    performance: 'from-pink-400 to-pink-600',
    social: 'from-green-400 to-green-600',
    learning: 'from-blue-400 to-blue-600',
  };

  return (
    <>
      <div className="space-y-6">
        {/* Points Header */}
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Totaal Punten</p>
              <p className="text-4xl font-bold mt-2">
                {points?.totalPoints || 0}
              </p>
              <p className="text-xs opacity-75 mt-1">
                {points?.totalEarned || 0} verdiend | {points?.totalRedeemed || 0} besteed
              </p>
            </div>
            <Trophy className="w-16 h-16 opacity-80" />
          </div>
        </Card>

        {/* Badges by Category */}
        {Object.entries(groupedAchievements).map(([type, badges]) => (
          <div key={type}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {typeLabels[type] || type}
              <span className="text-sm text-gray-500">({badges.length})</span>
            </h3>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {badges.map((badge) => (
                <motion.button
                  key={badge.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedBadge(badge)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg bg-gradient-to-b ${typeColors[type]} text-white shadow-lg hover:shadow-xl transition-shadow`}
                >
                  <span className="text-3xl">{badge.icon}</span>
                  <span className="text-xs font-medium text-center line-clamp-2">
                    {badge.name}
                  </span>
                  {badge.points > 0 && (
                    <span className="text-xs bg-black bg-opacity-30 px-2 py-1 rounded-full">
                      +{badge.points} pts
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        ))}

        {/* Empty State */}
        {achievements.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-4xl mb-4">🎯</p>
            <p className="text-gray-600 dark:text-gray-400">
              Geen badges nog. Voltooi trainingen, geef feedback, of bereik je doelen om badges te verdienen!
            </p>
          </Card>
        )}

        {/* Points History */}
        {points && points.recentHistory.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Recente Punten</h3>
            <div className="space-y-2">
              {points.recentHistory.map((entry, index) => (
                <Card key={index} className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{entry.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.action}
                    </p>
                  </div>
                  <p className="font-bold text-green-600 dark:text-green-400">
                    +{entry.points}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Badge Detail Dialog */}
      {selectedBadge && (
        <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Badge Details</DialogTitle>
              <DialogDescription>
                Deel je prestatie met je netwerk
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div
                className={`text-7xl p-6 bg-gradient-to-b ${
                  typeColors[selectedBadge.type]
                } rounded-full text-white shadow-xl`}
              >
                {selectedBadge.icon}
              </div>

              <div>
                <h3 className="text-2xl font-bold">{selectedBadge.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {typeLabels[selectedBadge.type]}
                </p>
                {selectedBadge.points > 0 && (
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                    +{selectedBadge.points} punten
                  </p>
                )}
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                Behaald:{' '}
                {selectedBadge.earnedDate.toLocaleDateString('nl-NL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>

              {/* Share Options */}
              <div className="w-full space-y-2">
                <Button
                  className="w-full"
                  onClick={() => shareToLinkedIn(selectedBadge)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share op LinkedIn
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Ik heb zojuist het "${selectedBadge.name}" badge verdiend! 🏆`
                    );
                    toast.success('Gekopieerd naar klembord');
                  }}
                >
                  Kopieer naar Klembord
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
