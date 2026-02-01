import { Position, MarkerType } from 'reactflow';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Direction: TB (Top to Bottom) or LR (Left to Right)
export const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({
        rankdir: direction,
        ranksep: 180,  // Increased vertical spacing
        nodesep: 150   // Increased horizontal spacing
    });

    nodes.forEach((node) => {
        // Width/Height logic triggers dagre to spacing them out correctly
        dagreGraph.setNode(node.id, { width: 180, height: 100 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        // Shift slightly to center
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        // We can add random offset to make it look less robotic if needed, but Dagre is clean.
        node.position = {
            x: nodeWithPosition.x - 90, // center offset
            y: nodeWithPosition.y - 50,
        };

        return node;
    });

    return { nodes: layoutedNodes, edges };
};
