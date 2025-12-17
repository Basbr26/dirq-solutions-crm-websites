/**
 * Workflow Canvas Component
 * Visual workflow builder using React Flow
 */

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TriggerNode from './TriggerNode';
import ActionNode from './ActionNode';
import ConditionNode from './ConditionNode';
import WaitNode from './WaitNode';

import type { WorkflowNodeData } from '@/types/workflow';

interface WorkflowCanvasProps {
  initialNodes?: Node<WorkflowNodeData>[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node<WorkflowNodeData>[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeClick?: (node: Node<WorkflowNodeData>) => void;
  readOnly?: boolean;
}

export function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  readOnly = false,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  // Define custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      action: ActionNode,
      condition: ConditionNode,
      wait: WaitNode,
      notification: ActionNode, // Reuse ActionNode for notifications
    }),
    []
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));

      if (onEdgesChange) {
        const updatedEdges = addEdge(newEdge, edges);
        onEdgesChange(updatedEdges);
      }
    },
    [edges, onEdgesChange, setEdges]
  );

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: unknown) => {
      onNodesChangeInternal(changes as never);
      if (onNodesChange) {
        // Get updated nodes after changes
        setTimeout(() => {
          setNodes((currentNodes) => {
            onNodesChange(currentNodes);
            return currentNodes;
          });
        }, 0);
      }
    },
    [onNodesChange, onNodesChangeInternal, setNodes]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: unknown) => {
      onEdgesChangeInternal(changes as never);
      if (onEdgesChange) {
        setTimeout(() => {
          setEdges((currentEdges) => {
            onEdgesChange(currentEdges);
            return currentEdges;
          });
        }, 0);
      }
    },
    [onEdgesChange, onEdgesChangeInternal, setEdges]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      if (onNodeClick && !readOnly) {
        onNodeClick(node);
      }
    },
    [onNodeClick, readOnly]
  );

  return (
    <div className="h-full w-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        panOnDrag={!readOnly}
        zoomOnScroll={!readOnly}
        minZoom={0.5}
        maxZoom={1.5}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
        }}
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger':
                return '#22c55e';
              case 'action':
              case 'notification':
                return '#3b82f6';
              case 'condition':
                return '#eab308';
              case 'wait':
                return '#a855f7';
              default:
                return '#6b7280';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-white !border !border-gray-300"
        />
      </ReactFlow>
    </div>
  );
}
