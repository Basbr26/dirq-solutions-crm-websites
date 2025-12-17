import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ApprovalQueueItem } from '@/lib/approvals/approvalQueue';

interface ApprovalCardProps {
  item: ApprovalQueueItem;
  onApprove: () => void;
  onDeny: () => void;
  onSkip: () => void;
  isDragging?: boolean;
  dragProgress?: number;
}

export default function ApprovalCard({
  item,
  onApprove,
  onDeny,
  onSkip,
  isDragging = false,
  dragProgress = 0,
}: ApprovalCardProps) {
  const priorityColor = useMemo(() => {
    switch (item.priority) {
      case 'high':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'normal':
        return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-900 border-green-300';
    }
  }, [item.priority]);

  const timeAgo = useMemo(() => {
    const now = new Date();
    const diffMs = now.getTime() - item.submittedDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays}d ago`;
  }, [item.submittedDate]);

  return (
    <motion.div
      className="w-full h-full bg-card rounded-2xl border-2 border-border shadow-2xl overflow-hidden flex flex-col relative"
      whileHover={{ boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)' }}
    >
      {/* Overlay feedback indicators */}
      <motion.div
        className="absolute inset-0 bg-green-500/20 pointer-events-none"
        style={{ opacity: Math.max(0, dragProgress - 0.5) * 2 }}
      />
      <motion.div
        className="absolute inset-0 bg-red-500/20 pointer-events-none"
        style={{ opacity: Math.max(0, -dragProgress + 0.5) * 2 }}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border p-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Request
          </h3>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${priorityColor}`}>
          {item.priority.toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Employee info */}
        <div className="flex items-center gap-4 mb-6">
          {item.employeeAvatar ? (
            <img
              src={item.employeeAvatar}
              alt={item.employeeName}
              className="w-16 h-16 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white text-xl font-bold">
              {item.employeeName.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold">{item.employeeName}</h2>
            <p className="text-sm text-muted-foreground">{item.title}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Details</p>
            <p className="text-base">{item.details}</p>
          </div>

          {/* Metadata */}
          {Object.entries(item.metadata).map(([key, value]) => (
            <div key={key} className="grid grid-cols-2 gap-2">
              <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="text-sm font-medium">{String(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 p-4 border-t border-border">
        <motion.button
          className="px-4 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          onClick={onSkip}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>⬇️</span>
          Skip
        </motion.button>

        <motion.button
          className="px-4 py-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          onClick={onDeny}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>❌</span>
          Deny
        </motion.button>

        <motion.button
          className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          onClick={onApprove}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>✅</span>
          Approve
        </motion.button>
      </div>

      {/* Drag indicator */}
      {isDragging && (
        <motion.div className="absolute top-4 right-4 text-lg" animate={{ scale: [1, 1.2, 1] }}>
          ✋
        </motion.div>
      )}
    </motion.div>
  );
}
