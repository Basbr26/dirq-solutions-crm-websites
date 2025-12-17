/**
 * Custom Trigger Node for React Flow
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Calendar, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { TriggerNodeData } from '@/types/workflow';

interface TriggerNodeProps {
  data: TriggerNodeData;
  selected?: boolean;
}

const TriggerNode = memo(({ data, selected }: TriggerNodeProps) => {
  const getTriggerIcon = () => {
    switch (data.triggerType) {
      case 'manual':
        return <Play className="h-4 w-4" />;
      case 'schedule':
        return <Calendar className="h-4 w-4" />;
      case 'event':
        return <Zap className="h-4 w-4" />;
      default:
        return <Play className="h-4 w-4" />;
    }
  };

  return (
    <Card
      className={`
        min-w-[200px] p-3
        ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}
        bg-green-50 border-green-300 hover:shadow-lg transition-shadow
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-green-500 text-white rounded">
          {getTriggerIcon()}
        </div>
        <div>
          <div className="text-xs text-green-600 font-semibold uppercase">Trigger</div>
          <div className="font-medium text-sm">{data.label}</div>
        </div>
      </div>

      {data.event && (
        <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-white rounded">
          Event: {data.event}
        </div>
      )}

      {data.cron && (
        <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-white rounded font-mono">
          {data.cron}
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-3 !h-3"
      />
    </Card>
  );
});

TriggerNode.displayName = 'TriggerNode';

export default TriggerNode;
