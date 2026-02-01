'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    useReactFlow,
    Panel,
    ReactFlowProvider,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Server, Laptop, Router, Smartphone,
    Activity, Box, Printer, Camera, Cpu, Shield,
    Search, ZoomIn, ZoomOut, Maximize, RefreshCcw, Layers, Map as MapIcon, HelpCircle
} from 'lucide-react';
import { getDevices } from '@/lib/api';
import { getLayoutedElements } from '@/lib/layout';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
import { Handle, Position } from 'reactflow';

// --- Smart Icon Mapping ---
const getIconForRole = (role: string, vendor: string = '') => {
    const r = role?.toLowerCase() || 'unknown';
    const v = vendor?.toLowerCase() || '';

    if (r === 'router' || r === 'gateway') return Router;
    if (r === 'mobile' || r === 'phone' || r === 'ios' || r === 'android') return Smartphone;
    if (r === 'workstation' || r === 'desktop' || r === 'laptop' || r === 'windows') return Laptop;
    if (r === 'printer') return Printer;
    if (r === 'camera') return Camera;
    if (r === 'iot' || v.includes('raspberry') || v.includes('arduino') || v.includes('espressif')) return Cpu;
    if (r === 'server' || r === 'linux') return Server;

    // Fallback based on vendor
    if (v.includes('apple')) return Smartphone;
    if (v.includes('intel')) return Laptop;
    if (v.includes('hp') || v.includes('epson')) return Printer;
    if (v.includes('hikvision') || v.includes('dahua')) return Camera;

    return Box; // Default
};

// --- Custom Node Component ---
function CustomNode({ data, selected }: { data: any, selected: boolean }) {
    const Icon = data.icon || Box;
    const isRouter = data.role === 'router';
    const isCamera = data.role === 'camera';

    // Highlight logic from search
    const isDimmed = data.isDimmed;

    // Dynamic color based on role
    let ringColor = 'from-blue-500 to-indigo-600';
    let glowColor = 'shadow-blue-500/20';

    if (isRouter) {
        ringColor = 'from-emerald-400 to-cyan-500';
        glowColor = 'shadow-emerald-500/30';
    }
    if (data.role === 'scanner') {
        ringColor = 'from-blue-500 to-cyan-400';
        glowColor = 'shadow-blue-500/50';
    }
    if (isCamera) {
        ringColor = 'from-red-500 to-orange-500';
        glowColor = 'shadow-red-500/30';
    }
    if (data.role === 'mobile') ringColor = 'from-pink-500 to-rose-400';

    return (
        <div className={`relative group transition-all duration-300 ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100'} ${selected ? 'scale-110 z-50' : 'hover:scale-105'}`}>
            <Handle type="target" position={Position.Top} className="!opacity-0" />
            <Handle type="source" position={Position.Bottom} className="!opacity-0" />

            {/* Router/Scanner Pulse Effect */}
            {(isRouter || data.role === 'scanner') && (
                <div className={`absolute -inset-6 rounded-full blur-2xl animate-pulse ${data.role === 'scanner' ? 'bg-blue-500/20' : 'bg-emerald-500/10'}`} />
            )}

            {/* Selection Ring */}
            <div className={`
                absolute -inset-[3px] rounded-2xl bg-gradient-to-tr ${ringColor} 
                transition-opacity duration-300 
                ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}
            `} />

            {/* Main Card Body */}
            <div className={`
                relative flex flex-col gap-2 p-3
                bg-[#0B0F19] border 
                ${selected ? 'border-transparent' : 'border-white/10'}
                rounded-xl shadow-2xl min-w-[180px]
                antialiased
            `}>
                <div className="flex items-center gap-3">
                    {/* Icon Box */}
                    <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                        ${isRouter ? 'bg-gradient-to-br from-emerald-600 to-emerald-400 text-white shadow-lg' :
                            isCamera ? 'bg-gradient-to-br from-red-600 to-orange-500 text-white shadow-lg' :
                                'bg-white/5 text-gray-300 border border-white/5'}
                        ${glowColor}
                    `}>
                        <Icon size={isRouter ? 20 : 18} />
                    </div>

                    <div className="flex flex-col overflow-hidden w-full">
                        <span className={`text-xs font-bold tracking-wide truncate ${selected ? 'text-white' : 'text-gray-200'}`} title={data.hostname}>
                            {data.hostname && data.hostname !== 'Unknown' ? data.hostname : 'Device'}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">
                            {data.ip}
                        </span>
                    </div>
                </div>

                {/* Footer Tags */}
                <div className="flex items-center gap-2 mt-1 pt-2 border-t border-white/5">
                    {data.meta?.vendor && (
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-500 truncate max-w-[80px]">
                            {data.meta.vendor.split(' ')[0]}
                        </span>
                    )}
                    <div className="ml-auto flex gap-1">
                        {data.role !== 'device' && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/10 text-gray-300 uppercase">
                                {data.role}
                            </span>
                        )}
                        {/* Status Dot */}
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>
                </div>
            </div>
        </div>
    );
}

const nodeTypes = {
    custom: CustomNode,
};

// --- Main Graph Content ---
function NetworkGraphContent({ onDeviceSelect }: { onDeviceSelect: (device: any) => void }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView, zoomIn, zoomOut } = useReactFlow();
    const [searchTerm, setSearchTerm] = useState('');
    const [showLegend, setShowLegend] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const refreshTopology = useCallback(async () => {
        try {
            const devices = await getDevices();
            if (!devices || devices.length === 0) return;

            // Sort devices to ensure consistent layout (Router first)
            devices.sort((a: any, b: any) => {
                if (a.role === 'router') return -1;
                if (b.role === 'router') return 1;
                return 0;
            });

            const newNodes: Node[] = devices.map((d: any) => {
                const vendor = d.meta?.vendor || '';
                const Icon = getIconForRole(d.role, vendor);

                // Check search match
                const match = searchTerm === '' ||
                    (d.hostname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    d.ip_address.includes(searchTerm) ||
                    (d.meta?.vendor || '').toLowerCase().includes(searchTerm.toLowerCase());

                return {
                    id: d.id.toString(),
                    type: 'custom',
                    position: { x: 0, y: 0 },
                    data: {
                        ...d,
                        // Map database fields to node data expected by CustomNode
                        ip: d.ip_address,
                        icon: Icon,
                        isDimmed: !match && searchTerm !== ''
                    }
                };
            });

            // --- Logical Subnet Topology ---
            // The goal is to show the structure of the TARGET network (Gateway-centric).

            // 1. Identify the Gateway (The Anchor)
            let centerNode = newNodes.find(n =>
                n.data.role === 'router' ||
                n.data.role === 'gateway' ||
                n.data.ip?.endsWith('.1') ||
                n.data.ip?.endsWith('.254')
            );

            // 2. If no clear Gateway is found, create a Virtual "Subnet" Node
            if (!centerNode && newNodes.length > 0) {
                const sampleIp = newNodes[0].data.ip; // e.g., 192.168.1.50
                const subnetParts = sampleIp.split('.');
                subnetParts.pop(); // Remove last octet
                const subnetLabel = `${subnetParts.join('.')}.x Network`;

                centerNode = {
                    id: 'virtual-subnet-hub',
                    type: 'custom',
                    position: { x: 0, y: 0 },
                    data: {
                        hostname: subnetLabel,
                        ip: 'Infrastructure',
                        role: 'gateway',
                        icon: Router,
                        isDimmed: false
                    }
                };
                // Add this virtual node to the list
                newNodes.push(centerNode);
            }

            // 3. Create Edges
            // Logic: Connect everything to the Center Node (Router/Subnet)

            // Critical Fix: If no Center Node found, just show the devices floating (or connect to sentinel)
            // But ReactFlow needs nodes to render.

            const newEdges: Edge[] = [];

            if (centerNode) {
                newNodes.forEach(node => {
                    if (node.id !== centerNode?.id) {
                        newEdges.push({
                            id: `e-${centerNode.id}-${node.id}`,
                            source: centerNode.id,
                            target: node.id,
                            animated: true,
                            style: { stroke: '#64748b', strokeWidth: 1.5, opacity: 0.4 },
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
                        });
                    }
                });
            } else if (newNodes.length > 0) {
                // Fallback: This path should rarely hit given step 2, but just in case:
                // Add Sentinel fallback
                const sentinelNode: Node = {
                    id: 'sentinel-fallback',
                    type: 'custom',
                    position: { x: 0, y: 0 },
                    data: { hostname: 'SENTINEL (Fallback)', ip: 'Localhost', role: 'scanner', icon: Shield }
                };
                newNodes.push(sentinelNode);

                newNodes.forEach(node => {
                    if (node.id !== 'sentinel-fallback') {
                        newEdges.push({
                            id: `e-sentinel-${node.id}`,
                            source: 'sentinel-fallback',
                            target: node.id,
                            animated: true,
                            style: { stroke: '#3b82f6', strokeWidth: 2, opacity: 0.5 }
                        });
                    }
                });
            }

            // Apply auto layout
            const layouted = getLayoutedElements(newNodes, newEdges, 'TB'); // Top-Bottom layout
            setNodes(layouted.nodes);
            setEdges(layouted.edges);
            setLastUpdated(new Date());

            // Check if we have any nodes to zoom to
            if (newNodes.length > 0) {
                setTimeout(() => window.requestAnimationFrame(() => fitView({ padding: 0.2 })), 50);
            }

        } catch (error) {
            console.error("Failed to fetch topology:", error);
        }
    }, [searchTerm, fitView]); // Re-run if search changes to update "dimmed" state

    // Initial Load & Search Effect
    useEffect(() => {
        refreshTopology();
    }, [refreshTopology]);

    // Fullscreen Logic
    const graphRef = React.useRef<HTMLDivElement>(null);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            graphRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div ref={graphRef} className="w-full h-full relative bg-[#0B0F19] overflow-hidden group">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[#0B0F19]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]" />
                <div className="absolute inset-0 bg-radial-gradient from-blue-900/10 via-transparent to-transparent pointer-events-none" />
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => onDeviceSelect(node.data)}
                nodeTypes={nodeTypes}
                minZoom={0.2}
                maxZoom={3}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#1e293b" gap={20} size={1} className="opacity-20" />

                {/* --- Custom Control Panels --- */}

                {/* 1. Search Bar (Top Left) */}
                <Panel position="top-left" className="m-4">
                    <div className="flex items-center gap-2 bg-[#1e293b]/90 backdrop-blur border border-white/10 rounded-lg p-1.5 shadow-xl transition-all focus-within:border-blue-500/50">
                        <Search size={16} className="text-gray-400 ml-2" />
                        <input
                            type="text"
                            placeholder="Find device..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none text-xs text-white placeholder:text-gray-500 focus:ring-0 w-40 md:w-56 outline-none"
                        />
                    </div>
                </Panel>

                {/* 2. Main Toolbar (Bottom Center) */}
                <Panel position="bottom-center" className="m-6 pb-4">
                    <div className="flex items-center gap-1 bg-[#1e293b] border border-white/20 rounded-full p-2 shadow-2xl ring-1 ring-black/50">
                        <button onClick={() => zoomOut()} className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition" title="Zoom Out">
                            <ZoomOut size={18} />
                        </button>
                        <button onClick={() => fitView({ padding: 0.2 })} className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition" title="Fit to Screen">
                            <MapIcon size={18} />
                        </button>
                        <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition" title="Fullscreen">
                            <Maximize size={18} />
                        </button>
                        <button onClick={() => zoomIn()} className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition" title="Zoom In">
                            <ZoomIn size={18} />
                        </button>
                        <div className="w-px h-6 bg-white/10 mx-1" />
                        <button onClick={refreshTopology} className="p-2 hover:bg-blue-600 hover:text-white rounded-full text-blue-400 transition" title="Refresh Layout">
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                </Panel>

                {/* 3. Info & Legend (Top Right) */}
                <Panel position="top-right" className="m-4 flex flex-col items-end gap-2">
                    <div className="text-[10px] text-gray-500 font-mono" suppressHydrationWarning>
                        Updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                    <button
                        onClick={() => setShowLegend(!showLegend)}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-lg
                            ${showLegend ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#1e293b]/90 border-white/10 text-gray-300 hover:bg-white/10'}
                        `}
                    >
                        <HelpCircle size={14} /> LEGEND
                    </button>

                    <AnimatePresence>
                        {showLegend && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-[#1e293b]/95 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl w-40"
                            >
                                <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Node Types</h4>
                                <div className="space-y-1.5">
                                    <LegendItem icon={Router} color="text-emerald-400" label="Router/Gateway" />
                                    <LegendItem icon={Camera} color="text-red-400" label="Camera (Hikvision)" />
                                    <LegendItem icon={Server} color="text-indigo-400" label="Server/Linux" />
                                    <LegendItem icon={Laptop} color="text-blue-400" label="Workstation" />
                                    <LegendItem icon={Smartphone} color="text-pink-400" label="Mobile" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Panel>
            </ReactFlow>
        </div>
    );
}

function LegendItem({ icon: Icon, color, label }: any) {
    return (
        <div className="flex items-center gap-2">
            <Icon size={12} className={color} />
            <span className="text-[10px] text-gray-300">{label}</span>
        </div>
    )
}

// Wrapper for Provider
export default function NetworkGraph({ onDeviceSelect }: { onDeviceSelect?: (device: any) => void }) {
    return (
        <ReactFlowProvider>
            <NetworkGraphContent onDeviceSelect={onDeviceSelect || (() => { })} />
        </ReactFlowProvider>
    );
}
