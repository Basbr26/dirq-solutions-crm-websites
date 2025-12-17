/**
 * Custom Wait Node for React Flow
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, Calendar, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { WaitNodeData } from '@/types/workflow';

interface WaitNodeProps {
  data: WaitNodeData;
  selected?: boolean;
}

const WaitNode = memo(({ data, selected }: WaitNodeProps) => {
  const getWaitIcon = () => {
    switch (data.waitType) {
      case 'duration':
        return <Clock className="h-4 w-4" />;
      case 'until_date':
        return <Calendar className="h-4 w-4" />;
      case 'approval':
        return <UserCheck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getWaitDescription = () => {
    if (data.waitType === 'duration' && data.config.duration) {
      return `${data.config.duration} ${data.config.unit || 'minutes'}`;
    }
    if (data.waitType === 'approval') {
      return `Wait for approval`;
    }
    return 'Wait...';
  };

  return (
    <>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !w-3 !h-3"
      />

      <Card
        className={`
          min-w-[200px] p-3
          ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}
          bg-purple-50 border-purple-300 hover:shadow-lg transition-shadow
        `}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-purple-500 text-white rounded">
            {getWaitIcon()}
          </div>
          <div>
            <div className="text-xs text-purple-600 font-semibold uppercase">Wait</div>
            <div className="font-medium text-sm">{data.label}</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-white rounded">
          {getWaitDescription()}
        </div>
      </Card>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !w-3 !h-3"
      />
    </>
  );
});

WaitNode.displayName = 'WaitNode';

export default WaitNode;
