/**
 * Workflow Executions Dashboard
 * Monitor and view workflow execution logs
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { safeFrom } from '@/lib/supabaseTypeHelpers';
import { formatDistanceToNow } from 'date-fns';

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  started_at: string;
  completed_at?: string;
  error?: string;
  context: unknown;
  result?: unknown;
  workflow: {
    name: string;
  };
}

interface WorkflowLog {
  id: string;
  node_id: string;
  node_type: string;
  node_label: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at?: string;
  error?: string;
  output?: unknown;
}

export default function WorkflowExecutions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [showLogsDialog, setShowLogsDialog] = useState(false);

  // Load executions
  const loadExecutions = useCallback(async () => {
    setLoading(true);
    
    const { data, error } = await safeFrom(supabase, 'workflow_executions')
      .select(`
        *,
        workflow:workflows(name)
      `)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: 'Error loading executions',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setExecutions(data || []);
    setLoading(false);
  }, [toast]);

  // Load logs for execution
  const loadLogs = async (executionId: string) => {
    const { data, error } = await safeFrom(supabase, 'workflow_logs')
      .select('*')
      .eq('execution_id', executionId)
      .order('started_at', { ascending: true });

    if (error) {
      toast({
        title: 'Error loading logs',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setLogs(data || []);
  };

  // View execution details
  const handleViewDetails = async (execution: WorkflowExecution) => {
    setSelectedExecution(execution);
    await loadLogs(execution.id);
    setShowLogsDialog(true);
  };

  // Subscribe to real-time updates
  useEffect(() => {
    loadExecutions();

    const channel = supabase
      .channel('workflow_executions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_executions',
        },
        () => {
          loadExecutions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadExecutions]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Play className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'paused':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      paused: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getDuration = (startedAt: string, completedAt?: string) => {
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <AppLayout
      title="Workflow Executions"
      subtitle="Monitor workflow execution status and logs"
      actions={
        <Button size="sm" onClick={loadExecutions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      <div className="p-4 md:p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>
                    <div className="font-medium">{execution.workflow.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {execution.id.slice(0, 8)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      {getStatusBadge(execution.status)}
                    </div>
                    {execution.error && (
                      <div className="text-xs text-red-600 mt-1">
                        {execution.error}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(execution.started_at), {
                        addSuffix: true,
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(execution.started_at).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getDuration(execution.started_at, execution.completed_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(execution)}
                    >
                      View Logs
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {executions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No workflow executions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execution Logs</DialogTitle>
            <DialogDescription>
              {selectedExecution?.workflow.name} - {selectedExecution?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Execution Summary */}
            {selectedExecution && (
              <Card className="p-4 bg-muted">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedExecution.status)}
                      {selectedExecution.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Duration</div>
                    <div className="font-medium mt-1">
                      {getDuration(
                        selectedExecution.started_at,
                        selectedExecution.completed_at
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Started</div>
                    <div className="font-medium mt-1">
                      {new Date(selectedExecution.started_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Completed</div>
                    <div className="font-medium mt-1">
                      {selectedExecution.completed_at
                        ? new Date(selectedExecution.completed_at).toLocaleString()
                        : 'In progress'}
                    </div>
                  </div>
                </div>

                {selectedExecution.error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <div className="text-sm font-medium text-red-900">Error</div>
                    <div className="text-sm text-red-700 mt-1">
                      {selectedExecution.error}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Node Logs */}
            <div>
              <h4 className="font-semibold mb-3">Node Execution Timeline</h4>
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <Card key={log.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{log.node_label}</div>
                            <div className="text-xs text-muted-foreground">
                              {log.node_type} • {log.node_id.slice(0, 8)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            {getStatusBadge(log.status)}
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.started_at), {
                            addSuffix: true,
                          })}
                          {log.completed_at && (
                            <span className="ml-2">
                              • Duration: {getDuration(log.started_at, log.completed_at)}
                            </span>
                          )}
                        </div>

                        {log.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {log.error}
                          </div>
                        )}

                        {log.output && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View output
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.output, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
