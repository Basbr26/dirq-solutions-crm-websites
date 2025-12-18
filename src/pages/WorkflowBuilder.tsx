/**
 * Workflow Builder Page
 * Visual workflow automation builder
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ReactFlowProvider, Node, Edge, useReactFlow, addEdge, Connection } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play, Download, Upload, Layout, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { NodeConfigurator } from '@/components/workflow/NodeConfigurator';
import { WorkflowNodeData, WorkflowDefinition } from '@/types/workflow';
import { supabase } from '@/integrations/supabase/client';
import { safeFrom, safeRpc } from '@/lib/supabaseTypeHelpers';
import { WorkflowEngine } from '@/lib/workflows/engine';
import { WorkflowExecution } from '@/lib/workflows/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Node palette items
const nodeTypes = [
  { type: 'trigger', label: 'Trigger', icon: '▶️' },
  { type: 'action', label: 'Action', icon: '⚡' },
  { type: 'condition', label: 'Condition', icon: '🔀' },
  { type: 'wait', label: 'Wait', icon: '⏰' },
];

function WorkflowBuilderContent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description: string; definition: WorkflowDefinition; category: string }>>([]);
  const [showExecutions, setShowExecutions] = useState(false);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const dragRef = useRef<{ type: string; label: string } | null>(null);

  // Load templates
  const loadTemplates = useCallback(async () => {
    const { data, error } = await safeFrom(supabase, 'workflow_templates')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: 'Error loading templates',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setTemplates(data || []);
  }, [toast]);

  // Open templates dialog
  const handleOpenTemplates = useCallback(() => {
    loadTemplates();
    setShowTemplates(true);
  }, [loadTemplates]);

  // Load template
  const handleLoadTemplate = useCallback((template: { id: string; name: string; description: string; definition: WorkflowDefinition }) => {
    const definition = template.definition as WorkflowDefinition;
    setNodes(definition.nodes);
    setEdges(definition.edges);
    setWorkflowName(template.name);
    setWorkflowDescription(template.description);
    setShowTemplates(false);

    toast({
      title: 'Template loaded',
      description: `Loaded template: ${template.name}`,
    });
  }, [toast]);

  // Handle node drag start from palette
  const onDragStart = useCallback((event: React.DragEvent, nodeType: string, label: string) => {
    dragRef.current = { type: nodeType, label };
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle drop on canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!dragRef.current || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const { type, label } = dragRef.current;
      const newNode: Node<WorkflowNodeData> = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label,
          ...(type === 'trigger' && { triggerType: 'manual' }),
          ...(type === 'action' && { actionType: 'send_email', config: {} }),
          ...(type === 'condition' && { condition: '' }),
          ...(type === 'wait' && { waitType: 'duration', config: {} }),
        } as WorkflowNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
      dragRef.current = null;
    },
    [reactFlowInstance]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle node click
  const onNodeClick = useCallback((node: Node<WorkflowNodeData>) => {
    setSelectedNode(node);
  }, []);

  // Handle node save from configurator
  const handleSaveNode = useCallback((updatedNode: Node<WorkflowNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === updatedNode.id ? updatedNode : node))
    );
  }, []);

  // Handle connection
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    []
  );

  // Save workflow
  const handleSave = useCallback(async () => {
    if (!workflowName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a workflow name',
        variant: 'destructive',
      });
      return;
    }

    const definition: WorkflowDefinition = {
      nodes,
      edges,
      variables: {},
    };

    const workflowData = {
      name: workflowName,
      description: workflowDescription,
      definition,
      active: false,
    };

    if (workflowId) {
      // Update existing
      const { error } = await safeFrom(supabase, 'workflows')
        .update(workflowData)
        .eq('id', workflowId);

      if (error) {
        toast({
          title: 'Error saving workflow',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
    } else {
      // Create new
      const { data, error } = await safeFrom(supabase, 'workflows')
        .insert(workflowData)
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error creating workflow',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setWorkflowId(data.id);
    }

    toast({
      title: 'Workflow saved',
      description: 'Your workflow has been saved successfully',
    });
  }, [workflowName, workflowDescription, nodes, edges, workflowId, toast]);

  // Load executions
  const loadExecutions = useCallback(async () => {
    if (!workflowId) return;

    const { data, error } = await safeFrom(supabase, 'workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error loading executions:', error);
      return;
    }

    setExecutions(data || []);
  }, [workflowId]);

  // Auto-load executions when workflowId changes
  useEffect(() => {
    if (workflowId && showExecutions) {
      loadExecutions();
    }
  }, [workflowId, showExecutions, loadExecutions]);

  // Test workflow using new engine
  const handleTest = useCallback(async () => {
    if (!workflowId) {
      toast({
        title: 'Save first',
        description: 'Please save the workflow before testing',
        variant: 'destructive',
      });
      return;
    }

    setIsExecuting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Execute workflow with test data
      const result = await WorkflowEngine.executeWorkflow(workflowId, {
        trigger_data: {
          event: 'manual_test',
          triggered_at: new Date().toISOString(),
        },
        user_id: user?.id,
        metadata: {
          test: true,
          triggered_by: 'workflow_builder',
        },
      });

      // Reload executions to show new execution
      await loadExecutions();

      toast({
        title: result.success ? 'Workflow started successfully' : 'Workflow execution failed',
        description: result.success 
          ? `Execution ID: ${result.execution_id}` 
          : result.error || 'Unknown error',
        variant: result.success ? 'default' : 'destructive',
      });

      // Auto-show executions panel
      if (result.success) {
        setShowExecutions(true);
      }
    } catch (error) {
      console.error('Workflow test error:', error);
      toast({
        title: 'Error testing workflow',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
    }
  }, [workflowId, toast, loadExecutions]);

  // Resume waiting workflow
  const handleResumeExecution = useCallback(async (executionId: string) => {
    try {
      await WorkflowEngine.resumeWorkflow(executionId);
      
      toast({
        title: 'Workflow resumed',
        description: 'The workflow execution has been resumed',
      });

      await loadExecutions();
    } catch (error) {
      toast({
        title: 'Resume failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [toast, loadExecutions]);

  // View execution details
  const handleViewExecution = useCallback(async (executionId: string) => {
    const { data: logs, error } = await safeFrom(supabase, 'workflow_logs')
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at');

    if (error) {
      toast({
        title: 'Error loading logs',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Show logs in console for now (could create a modal later)
    console.log('Execution logs:', logs);
    
    toast({
      title: 'Logs loaded',
      description: `Found ${logs?.length || 0} log entries (check console)`,
    });
  }, [toast]);

  // Export workflow
  const handleExport = useCallback(() => {
    const definition: WorkflowDefinition = {
      nodes,
      edges,
      variables: {},
    };

    const exportData = {
      name: workflowName,
      description: workflowDescription,
      definition,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflowName.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Workflow exported',
      description: 'Downloaded as JSON file',
    });
  }, [workflowName, workflowDescription, nodes, edges, toast]);

  // Import workflow
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        setWorkflowName(data.name);
        setWorkflowDescription(data.description);
        setNodes(data.definition.nodes);
        setEdges(data.definition.edges);

        toast({
          title: 'Workflow imported',
          description: 'Successfully loaded workflow',
        });
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Invalid workflow file',
          variant: 'destructive',
        });
      }
    };
    input.click();
  }, [toast]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0"
            />
            <Input
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              placeholder="Add description..."
              className="text-sm text-muted-foreground border-none shadow-none focus-visible:ring-0 px-0"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenTemplates}>
            <Layout className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {workflowId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowExecutions(true);
                loadExecutions();
              }}
            >
              <History className="h-4 w-4 mr-2" />
              Executions
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTest}
            disabled={isExecuting || !workflowId}
          >
            <Play className="h-4 w-4 mr-2" />
            {isExecuting ? 'Running...' : 'Test'}
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Node Palette */}
        <div className="w-64 bg-white border-r p-4 overflow-y-auto">
          <Label className="text-sm font-semibold mb-3 block">Nodes</Label>
          <div className="space-y-2">
            {nodeTypes.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => onDragStart(e, item.type, item.label)}
                className="p-3 border rounded-lg cursor-move hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-xs font-semibold text-blue-900 mb-2">Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Drag nodes onto canvas</li>
              <li>• Click node to configure</li>
              <li>• Connect nodes with edges</li>
              <li>• Test before activating</li>
            </ul>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <WorkflowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={(changes) => {
              setNodes((nds) => {
                const updated = [...nds];
                changes.forEach((change) => {
                  if (change.type === 'remove') {
                    const index = updated.findIndex((n) => n.id === change.id);
                    if (index !== -1) updated.splice(index, 1);
                  } else if (change.type === 'position' && change.position) {
                    const node = updated.find((n) => n.id === change.id);
                    if (node) node.position = change.position;
                  }
                });
                return updated;
              });
            }}
            onEdgesChange={(changes) => {
              setEdges((eds) => {
                const updated = [...eds];
                changes.forEach((change) => {
                  if (change.type === 'remove') {
                    const index = updated.findIndex((e) => e.id === change.id);
                    if (index !== -1) updated.splice(index, 1);
                  }
                });
                return updated;
              });
            }}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
          />
        </div>
      </div>

      {/* Node Configurator */}
      {selectedNode && (
        <NodeConfigurator
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSave={handleSaveNode}
        />
      )}

      {/* Execution History Dialog */}
      <Dialog open={showExecutions} onOpenChange={setShowExecutions}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow Executions</DialogTitle>
            <DialogDescription>
              View execution history and status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {executions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No executions yet. Click "Test" to run this workflow.
              </div>
            ) : (
              executions.map((execution) => (
                <div
                  key={execution.id}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          execution.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : execution.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : execution.status === 'running'
                            ? 'bg-blue-100 text-blue-800'
                            : execution.status === 'waiting'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {execution.status}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(execution.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {execution.status === 'waiting' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResumeExecution(execution.id)}
                        >
                          Resume
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewExecution(execution.id)}
                      >
                        View Logs
                      </Button>
                    </div>
                  </div>

                  {execution.current_node_id && (
                    <div className="text-sm text-muted-foreground">
                      Current node: {execution.current_node_id}
                    </div>
                  )}

                  {execution.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      {execution.error}
                    </div>
                  )}

                  {execution.started_at && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Started: {new Date(execution.started_at).toLocaleString()}
                      {execution.completed_at &&
                        ` • Completed: ${new Date(execution.completed_at).toLocaleString()}`}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow Templates</DialogTitle>
            <DialogDescription>
              Choose a template to start with
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 mt-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => handleLoadTemplate(template)}
              >
                <h4 className="font-semibold">{template.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {template.description}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{template.category}</span>
                  <span>•</span>
                  <span>{template.definition.nodes.length} nodes</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent />
    </ReactFlowProvider>
  );
}
