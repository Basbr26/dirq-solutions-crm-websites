import { useState, useRef, useCallback } from 'react';
import { useEmployeeFeed } from '@/hooks/useEmployeeFeed';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

export function PersonalFeed() {
  const { feed, isRefetching, refresh, markAsRead } = useEmployeeFeed();
  const [pullingDown, setPullingDown] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = useCallback(
    async (e: React.TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const deltaY = endY - touchStartY.current;

      // Pull down more than 100px
      if (deltaY > 100) {
        setPullingDown(true);
        await refresh();
        setPullingDown(false);
      }
    },
    [refresh]
  );

  // Sort by priority and date
  const prioritySortedFeed = [...feed].sort((a, b) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const priorityDiff =
      priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950';
      case 'normal':
        return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'low':
        return 'border-l-4 border-l-gray-500 bg-gray-50 dark:bg-gray-950';
      default:
        return '';
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto pb-20"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-Refresh Indicator */}
      {pullingDown && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center py-4"
        >
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </motion.div>
      )}

      {/* Feed Empty State */}
      {feed.length === 0 && !isRefetching && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Geen updates op dit moment. Check later terug!
          </p>
        </div>
      )}

      {/* Feed Items */}
      <div className="space-y-3 px-4 py-4">
        {prioritySortedFeed.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(
                item.priority
              )} ${!item.read ? 'ring-2 ring-blue-400' : ''}`}
              onClick={() => {
                if (!item.read) markAsRead(item.id);
                if (item.actionUrl) {
                  // Navigate to action
                  window.location.href = item.actionUrl;
                }
              }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="text-2xl flex-shrink-0 pt-1">
                  {item.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {item.subtitle}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(item.timestamp, {
                        addSuffix: true,
                        locale: nl,
                      })}
                    </span>
                    {item.priority === 'high' && (
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">
                        ⚠️ URGENTIE
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread Badge */}
                {!item.read && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Loading State */}
      {isRefetching && feed.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
