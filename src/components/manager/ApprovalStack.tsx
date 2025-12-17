import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import ApprovalCard from './ApprovalCard';
import { ApprovalQueueItem } from '@/lib/approvals/approvalQueue';

interface ApprovalStackProps {
  items: ApprovalQueueItem[];
  onApprove: (item: ApprovalQueueItem, reason?: string) => void;
  onDeny: (item: ApprovalQueueItem, reason: string) => void;
  onUndo?: () => void;
  isLoading?: boolean;
}

export default function ApprovalStack({
  items,
  onApprove,
  onDeny,
  onUndo,
  isLoading = false,
}: ApprovalStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitX, setExitX] = useState(0);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [denyReason, setDenyReason] = useState('');

  const currentItem = items[currentIndex];
  const remainingItems = items.length - currentIndex;

  const { handlers, dragOffset, isDragging } = useSwipeGesture({
    onSwipeLeft: handleReject,
    onSwipeRight: handleApprove,
    onSwipeDown: handleSkip,
  });

  function handleApprove() {
    if (currentItem) {
      setExitX(1000);
      setTimeout(() => {
        onApprove(currentItem);
        setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1));
        setExitX(0);
      }, 300);
    }
  }

  function handleReject() {
    setShowDenyDialog(true);
  }

  function handleDeny() {
    if (currentItem) {
      setExitX(-1000);
      setTimeout(() => {
        onDeny(currentItem, denyReason);
        setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1));
        setExitX(0);
        setDenyReason('');
        setShowDenyDialog(false);
      }, 300);
    }
  }

  function handleSkip() {
    setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (remainingItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-4xl mb-4">✨</div>
        <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
        <p className="text-muted-foreground">No more approvals to review</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      {/* Stack background cards */}
      <AnimatePresence>
        {items.slice(currentIndex + 1, currentIndex + 3).map((item, idx) => (
          <motion.div
            key={item.id + '_stack_' + idx}
            className="absolute inset-4 bg-card rounded-xl border shadow-lg"
            initial={{ scale: 0.9 + idx * 0.02, y: idx * 8 }}
            animate={{ scale: 0.9 + idx * 0.02, y: idx * 8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              zIndex: -idx,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Current card */}
      {currentItem && (
        <motion.div
          {...handlers}
          key={currentItem.id}
          className="absolute inset-4 cursor-grab active:cursor-grabbing"
          style={{
            zIndex: 10,
          }}
          initial={{ scale: 1, x: 0, rotate: 0 }}
          animate={{
            x: isDragging ? dragOffset.x : exitX,
            rotate: isDragging ? dragOffset.x * 0.1 : exitX !== 0 ? (exitX > 0 ? 10 : -10) : 0,
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <ApprovalCard
            item={currentItem}
            onApprove={handleApprove}
            onDeny={handleReject}
            onSkip={handleSkip}
            isDragging={isDragging}
            dragProgress={Math.abs(dragOffset.x) / 200}
          />
        </motion.div>
      )}

      {/* Deny reason dialog */}
      {showDenyDialog && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowDenyDialog(false)}
        >
          <motion.div
            className="bg-card rounded-lg p-6 w-96 shadow-lg"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Reason for rejection</h3>
            <textarea
              className="w-full border rounded-lg p-3 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
              placeholder="Enter reason (optional)"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted"
                onClick={() => setShowDenyDialog(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
                onClick={handleDeny}
              >
                Deny
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Hint text */}
      <div className="absolute bottom-4 left-4 right-4 text-center text-sm text-muted-foreground">
        <p>👈 Swipe left to deny | Swipe right to approve | ⬇️ Swipe down to skip</p>
        <p className="mt-2 text-xs">
          {remainingItems} remaining • {currentIndex + 1} of {items.length}
        </p>
      </div>
    </div>
  );
}
