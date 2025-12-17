/**
 * Node Configurator Component
 * Slide-out panel to configure node settings
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData, TriggerNodeData, ActionNodeData } from '@/types/workflow';

interface NodeConfiguratorProps {
  node: Node<WorkflowNodeData> | null;
  onClose: () => void;
  onSave: (node: Node<WorkflowNodeData>) => void;
}

export function NodeConfigurator({ node, onClose, onSave }: NodeConfiguratorProps) {
  const [editedNode, setEditedNode] = useState<Node<WorkflowNodeData> | null>(node);

  useEffect(() => {
    setEditedNode(node);
  }, [node]);

  if (!node || !editedNode) {
    return null;
  }

  const handleSave = () => {
    if (editedNode) {
      onSave(editedNode);
      onClose();
    }
  };

  const updateNodeData = (updates: Partial<WorkflowNodeData>) => {
    if (!editedNode) return;

    setEditedNode({
      ...editedNode,
      data: {
        ...editedNode.data,
        ...updates,
      },
    });
  };

  const updateConfig = (key: string, value: unknown) => {
    if (!editedNode) return;

    const data = editedNode.data as ActionNodeData;
    setEditedNode({
      ...editedNode,
      data: {
        ...data,
        config: {
          ...data.config,
          [key]: value,
        },
      },
    });
  };

  const renderTriggerConfig = () => {
    const data = editedNode.data as TriggerNodeData;

    return (
      <>
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={data.label}
            onChange={(e) => updateNodeData({ label: e.target.value })}
            placeholder="Enter trigger label"
          />
        </div>

        <div className="space-y-2">
          <Label>Trigger Type</Label>
          <Select
            value={data.triggerType}
            onValueChange={(value) => updateNodeData({ triggerType: value as never })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="schedule">Schedule</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data.triggerType === 'event' && (
          <div className="space-y-2">
            <Label>Event Name</Label>
            <Input
              value={data.event || ''}
              onChange={(e) => updateNodeData({ event: e.target.value })}
              placeholder="e.g., employee.status_hired"
            />
          </div>
        )}

        {data.triggerType === 'schedule' && (
          <div className="space-y-2">
            <Label>Cron Expression</Label>
            <Input
              value={data.cron || ''}
              onChange={(e) => updateNodeData({ cron: e.target.value })}
              placeholder="e.g., 0 9 * * 1 (Every Monday at 9 AM)"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Use cron format: minute hour day month weekday
            </p>
          </div>
        )}
      </>
    );
  };

  const renderActionConfig = () => {
    const data = editedNode.data as ActionNodeData;

    return (
      <>
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={data.label}
            onChange={(e) => updateNodeData({ label: e.target.value })}
            placeholder="Enter action label"
          />
        </div>

        <div className="space-y-2">
          <Label>Action Type</Label>
          <Select
            value={data.actionType}
            onValueChange={(value) => updateNodeData({ actionType: value as never })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="send_email">Send Email</SelectItem>
              <SelectItem value="create_task">Create Task</SelectItem>
              <SelectItem value="create_tasks">Create Multiple Tasks</SelectItem>
              <SelectItem value="update_database">Update Database</SelectItem>
              <SelectItem value="generate_document">Generate Document</SelectItem>
              <SelectItem value="send_notification">Send Notification</SelectItem>
              <SelectItem value="call_webhook">Call Webhook</SelectItem>
              <SelectItem value="trigger_workflow">Trigger Workflow</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action-specific configuration */}
        {data.actionType === 'send_email' && (
          <>
            <div className="space-y-2">
              <Label>To (Email or User ID)</Label>
              <Input
                value={(data.config.to as string) || ''}
                onChange={(e) => updateConfig('to', e.target.value)}
                placeholder="email@example.com or {{employee.email}}"
              />
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Input
                value={(data.config.template as string) || ''}
                onChange={(e) => updateConfig('template', e.target.value)}
                placeholder="welcome_employee"
              />
            </div>
          </>
        )}

        {data.actionType === 'create_task' && (
          <>
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input
                value={(data.config.title as string) || ''}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="Enter task title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={(data.config.description as string) || ''}
                onChange={(e) => updateConfig('description', e.target.value)}
                placeholder="Task description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Input
                value={(data.config.assignTo as string) || ''}
                onChange={(e) => updateConfig('assignTo', e.target.value)}
                placeholder="user_id or role:hr"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={(data.config.priority as string) || 'medium'}
                onValueChange={(value) => updateConfig('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {data.actionType === 'send_notification' && (
          <>
            <div className="space-y-2">
              <Label>To (User ID or Role)</Label>
              <Input
                value={(data.config.to as string) || ''}
                onChange={(e) => updateConfig('to', e.target.value)}
                placeholder="user_id or role:hr"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={(data.config.message as string) || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                placeholder="Notification message (can use {{variables}})"
                rows={3}
              />
            </div>
          </>
        )}

        {data.actionType === 'generate_document' && (
          <div className="space-y-2">
            <Label>Template</Label>
            <Input
              value={(data.config.template as string) || ''}
              onChange={(e) => updateConfig('template', e.target.value)}
              placeholder="contract_template"
            />
          </div>
        )}

        {data.actionType === 'call_webhook' && (
          <>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={(data.config.url as string) || ''}
                onChange={(e) => updateConfig('url', e.target.value)}
                placeholder="https://api.example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={(data.config.method as string) || 'POST'}
                onValueChange={(value) => updateConfig('method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </>
    );
  };

  const renderConditionConfig = () => {
    const data = editedNode.data as never;

    return (
      <>
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={(data as { label: string }).label}
            onChange={(e) => updateNodeData({ label: e.target.value })}
            placeholder="Enter condition label"
          />
        </div>

        <div className="space-y-2">
          <Label>Condition Expression</Label>
          <Textarea
            value={(data as { condition: string }).condition}
            onChange={(e) => updateNodeData({ condition: e.target.value })}
            placeholder="e.g., {{employee.age}} > 55"
            rows={3}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use {'{{'} variables {'}}'}  and JavaScript expressions
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>True Label</Label>
            <Input
              value={(data as { trueLabel?: string }).trueLabel || 'Yes'}
              onChange={(e) => updateNodeData({ trueLabel: e.target.value })}
              placeholder="Yes"
            />
          </div>
          <div className="space-y-2">
            <Label>False Label</Label>
            <Input
              value={(data as { falseLabel?: string }).falseLabel || 'No'}
              onChange={(e) => updateNodeData({ falseLabel: e.target.value })}
              placeholder="No"
            />
          </div>
        </div>
      </>
    );
  };

  const renderWaitConfig = () => {
    const data = editedNode.data as never;

    return (
      <>
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={(data as { label: string }).label}
            onChange={(e) => updateNodeData({ label: e.target.value })}
            placeholder="Enter wait label"
          />
        </div>

        <div className="space-y-2">
          <Label>Wait Type</Label>
          <Select
            value={(data as { waitType: string }).waitType}
            onValueChange={(value) => updateNodeData({ waitType: value as never })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="duration">Duration</SelectItem>
              <SelectItem value="until_date">Until Date</SelectItem>
              <SelectItem value="approval">Wait for Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(data as { waitType: string }).waitType === 'duration' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input
                type="number"
                value={(data as { config: { duration?: number } }).config?.duration || ''}
                onChange={(e) => updateConfig('duration', parseInt(e.target.value))}
                placeholder="5"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={(data as { config: { unit?: string } }).config?.unit || 'days'}
                onValueChange={(value) => updateConfig('unit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {(data as { waitType: string }).waitType === 'approval' && (
          <div className="space-y-2">
            <Label>Approver</Label>
            <Input
              value={(data as { config: { approver?: string } }).config?.approver || ''}
              onChange={(e) => updateConfig('approver', e.target.value)}
              placeholder="user_id or role:hr"
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l shadow-2xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Configure Node</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <Card className="p-4 bg-muted">
          <div className="text-sm font-medium mb-1">Node Type</div>
          <div className="text-sm text-muted-foreground capitalize">
            {node.type?.replace(/_/g, ' ')}
          </div>
        </Card>

        {node.type === 'trigger' && renderTriggerConfig()}
        {node.type === 'action' && renderActionConfig()}
        {node.type === 'condition' && renderConditionConfig()}
        {node.type === 'wait' && renderWaitConfig()}

        <div className="pt-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
