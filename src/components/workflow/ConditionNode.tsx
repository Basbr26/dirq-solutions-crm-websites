/**
 * Custom Condition Node for React Flow
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ConditionNodeData } from '@/types/workflow';

interface ConditionNodeProps {
  data: ConditionNodeData;
  selected?: boolean;
}

const ConditionNode = memo(({ data, selected }: ConditionNodeProps) => {
  return (
    <>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-yellow-500 !w-3 !h-3"
      />

      <Card
        className={`
          min-w-[200px] p-3
          ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}
          bg-yellow-50 border-yellow-300 hover:shadow-lg transition-shadow
        `}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-yellow-500 text-white rounded">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs text-yellow-600 font-semibold uppercase">Condition</div>
            <div className="font-medium text-sm">{data.label}</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-white rounded font-mono">
          {data.condition}
        </div>

        {/* Output handles for True/False branches */}
        <div className="flex justify-between mt-4">
          <div className="text-xs text-green-600 font-semibold">
            {data.trueLabel || 'True'}
          </div>
          <div className="text-xs text-red-600 font-semibold">
            {data.falseLabel || 'False'}
          </div>
        </div>
      </Card>

      {/* True output (left) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%' }}
        className="!bg-green-500 !w-3 !h-3"
      />

      {/* False output (right) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%' }}
        className="!bg-red-500 !w-3 !h-3"
      />
    </>
  );
});

ConditionNode.displayName = 'ConditionNode';

export default ConditionNode;
