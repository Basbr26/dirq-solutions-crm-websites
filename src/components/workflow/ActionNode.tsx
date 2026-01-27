/**
 * Custom Action Node for React Flow
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Mail, 
  CheckSquare, 
  Database, 
  FileText, 
  Bell, 
  Webhook,
  Settings 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ActionNodeData } from '@/types/workflow';

interface ActionNodeProps {
  data: ActionNodeData;
  selected?: boolean;
}

const ActionNode = memo(({ data, selected }: ActionNodeProps) => {
  const getActionIcon = () => {
    switch (data.actionType) {
      case 'send_email':
        return <Mail className="h-4 w-4" />;
      case 'create_task':
      case 'create_tasks':
        return <CheckSquare className="h-4 w-4" />;
      case 'update_database':
        return <Database className="h-4 w-4" />;
      case 'generate_document':
        return <FileText className="h-4 w-4" />;
      case 'send_notification':
        return <Bell className="h-4 w-4" />;
      case 'call_webhook':
        return <Webhook className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-3 !h-3"
      />

      <Card
        className={`
          min-w-[200px] p-3
          ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}
          bg-blue-50 border-blue-300 hover:shadow-lg transition-shadow
        `}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-blue-500 text-white rounded">
            {getActionIcon()}
          </div>
          <div>
            <div className="text-xs text-blue-600 font-semibold uppercase">Action</div>
            <div className="font-medium text-sm">{data.label}</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-white rounded">
          {data.actionType.replace(/_/g, ' ')}
        </div>
      </Card>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-3 !h-3"
      />
    </>
  );
});

ActionNode.displayName = 'ActionNode';

export default ActionNode;
