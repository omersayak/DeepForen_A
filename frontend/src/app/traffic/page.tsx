'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { getConnections, askSentinel, checkVirusTotal, exportPcap, importPcap } from '@/lib/api';
import TrafficWidget from '@/components/TrafficWidget';
import {
    Activity, Globe, Shield, Cpu, Wifi, Play, Pause, Trash2, Filter,
    ChevronDown, ChevronRight, X, ArrowDown, ArrowUp, Search, Eye,
    Maximize2, Minimize2, Bot, Sparkles, Download, Upload, FileText, Bug
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip, Legend
} from 'recharts';

export default function TrafficPage() {
    // --- STATE ---
    const [packets, setPackets] = useState<any[]>([]);
    const [connections, setConnections] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Controls
    const [isPaused, setIsPaused] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [filter, setFilter] = useState('');
    const [selectedPacket, setSelectedPacket] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'dashboard' | 'focus'>('dashboard');

    // File / Import Mode
    const [isImportMode, setIsImportMode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Detail Panel State
    const [isDetailExpanded, setIsDetailExpanded] = useState(false);

    // AI & Threat State
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [vtResult, setVtResult] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Reset results when packet changes
    useEffect(() => {
        setAiResult(null);
        setVtResult(null);
        setIsDetailExpanded(false);
    }, [selectedPacket]);

    const handleAiAnalysis = async (mode: 'quick' | 'deep' = 'quick') => {
        if (!selectedPacket) return;
        setIsAnalyzing(true);
        setAiResult(null); // Clear previous result for fresh start
        try {
            // ... (rest of logic)
            const hexData = PacketHexUtils.generateHex(selectedPacket, 32).map(l => l.ascii).join('');

            const prompt = `
            ACT AS: Network Security Analyst.
            TASK: Analyze this ${mode === 'deep' ? 'full depth' : 'brief'} packet capture.

            PACKET METADATA:
            - ID: ${selectedPacket.id}
            - Timestamp: ${selectedPacket.timestamp}
            - Protocol: ${selectedPacket.protocol}
            - Source: ${selectedPacket.src}
            - Destination: ${selectedPacket.dst}
            - Info: ${selectedPacket.info}
            - Payload Preview (ASCII): "${hexData}..."

            ANALYSIS REQUEST:
            ${mode === 'deep'
                    ? "Perform a deep threat analysis. checking for signature anomalies, port mismatches, and potential c2/exfiltration patterns."
                    : "Quick check: Is this packet malicious or benign? One sentence verdict."}
            `;

            const response = await askSentinel(prompt, 'gemini');
            setAiResult(response);
        } catch (e) {
            setAiResult("Error: Could not reach Sentinel AI.");
        } finally {
            setIsAnalyzing(false);
        }
    };
    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isPausedRef = useRef(isPaused);

    // Sync Ref
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

    // --- WEBSOCKET CONNECTION ---
    useEffect(() => {
        // Dynamic WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const wsUrl = `${protocol}//${host}:8000/ws/traffic`;

        const connect = () => {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => setIsConnected(true);
            ws.onclose = () => {
                setIsConnected(false);
                setTimeout(connect, 3000); // Retry
            };
            ws.onmessage = (event) => {
                if (isPausedRef.current) return;

                const pkt = JSON.parse(event.data);
                setPackets(prev => {
                    const newList = [...prev, pkt];
                    return newList.slice(-2000); // Buffer limit
                });
            };
        };

        connect();
        return () => wsRef.current?.close();
    }, []);

    // --- STATS FETCHING ---
    useEffect(() => {
        const fetchData = async () => {
            const data = await getConnections();
            setConnections(data);
        };
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    // --- FILTERING ---
    const filteredPackets = useMemo(() => {
        if (!filter) return packets;
        const search = filter.toLowerCase();
        return packets.filter(p =>
            p.protocol.toLowerCase().includes(search) ||
            p.src.includes(search) ||
            p.dst.includes(search) ||
            p.info.toLowerCase().includes(search)
        );
    }, [packets, filter]);

    // --- SMART SCROLL LOGIC ---
    // We track if the user is at the bottom using a Ref to avoid re-renders.
    const isAtBottomRef = useRef(true);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // If user is within 100px of bottom, we consider them "at bottom" and sticky mode activates
        const atBottom = scrollHeight - scrollTop - clientHeight < 100;
        isAtBottomRef.current = atBottom;
    };

    // Auto-scroll effect
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (isPaused) return;

        // "Smart Sticky Scroll":
        // Only scroll to bottom IF the user is ALREADY at the bottom.
        // This allows the user to scroll up and "hold" their position while new packets arrive.
        // When they scroll back to the bottom, it "snaps" back to auto-scroll mode.
        if (autoScroll && isAtBottomRef.current) {
            container.scrollTop = container.scrollHeight;
        }
    }, [filteredPackets, autoScroll, isPaused]);

    // --- HELPERS ---
    const protocolData = connections?.breakdown ?
        Object.entries(connections.breakdown).map(([name, value]) => ({ name, value })) : [];
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const handleExport = async () => {
        if (packets.length === 0) return;
        await exportPcap(packets);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Pause live stream
        setIsPaused(true);
        setIsImportMode(true);
        setPackets([]); // Clear current

        const result = await importPcap(file);
        if (result && result.packets) {
            setPackets(result.packets);
        }
    };

    const handleReturnToLive = () => {
        setIsImportMode(false);
        setPackets([]);
        setIsPaused(false);
    };

    const handleVirusTotal = async (ip: string) => {
        setVtResult("Loading...");
        const res = await checkVirusTotal(ip);
        setVtResult(res);
    };

    // --- RENDER ---
    return (
        <div className="h-[calc(100vh-6rem)] w-full flex flex-col gap-4 overflow-hidden text-sm relative overscroll-contain">

            {/* Charts REMOVED by user request for pure packet inspection focus */}

            {/* 2. CONTROL BAR */}
            <div className="flex items-center gap-3 bg-[#0B0F19] p-2 rounded-xl border border-white/10 shadow-lg shrink-0 z-20">

                {/* File Ops */}
                <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pcap,.cap" />

                    {!isImportMode ? (
                        <>
                            <button onClick={handleImportClick} className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg transition-all" title="Import PCAP">
                                <Upload size={16} />
                            </button>
                            <button onClick={handleExport} className="p-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg transition-all" title="Export PCAP">
                                <Download size={16} />
                            </button>
                        </>
                    ) : (
                        <button onClick={handleReturnToLive} className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg text-xs font-bold transition-all">
                            Exit File Mode
                        </button>
                    )}
                </div>

                {/* Connection Status */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isConnected ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-red-950/30 border-red-500/30'}`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className={`text-[10px] font-bold ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isConnected ? 'LIVE' : 'OFFLINE'}
                    </span>
                </div>

                {/* Play/Pause */}
                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs transition-all border ${isPaused
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 hover:bg-amber-500/20'
                        : 'bg-blue-600/10 border-blue-500/50 text-blue-400 hover:bg-blue-600/20'
                        }`}
                >
                    {isPaused ? <Play size={14} /> : <Pause size={14} />}
                    {isPaused ? 'RESUME' : 'PAUSE'}
                </button>

                {/* Clear */}
                <button
                    onClick={() => setPackets([])}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Clear Buffer"
                >
                    <Trash2 size={16} />
                </button>

                <div className="w-px h-6 bg-white/10 mx-1"></div>

                {/* Search/Filter */}
                <div className="flex-1 max-w-md relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400" />
                    <input
                        type="text"
                        placeholder="Filter by UDP, TCP, IP, Port..."
                        className="w-full bg-[#1e293b]/50 border border-white/10 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    {filter && (
                        <button
                            onClick={() => setFilter('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {/* Auto-Scroll Toggle */}
                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer select-none transition-all ${autoScroll ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5'
                        }`}>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={autoScroll}
                            onChange={(e) => setAutoScroll(e.target.checked)}
                        />
                        <ArrowDown size={12} /> AUTO-SCROLL
                    </label>
                </div>
            </div>

            {/* 3. MAIN PACKET ANALYZER TABLE (Split View) */}
            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden relative">

                {/* PACKET LIST (Left) */}
                <div className={`flex flex-col glass-panel rounded-xl border border-white/10 overflow-hidden transition-all duration-300 ${selectedPacket ? 'w-2/3' : 'w-full'}`}>
                    {/* Sticky Header */}
                    <div className="grid grid-cols-[60px_90px_140px_140px_80px_60px_1fr] bg-[#0f172a] text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-white/10 sticky top-0 z-20 shadow-md">
                        <div className="p-3 border-r border-white/5 flex items-center justify-center">#</div>
                        <div className="p-3 border-r border-white/5">Time</div>
                        <div className="p-3 border-r border-white/5">Source</div>
                        <div className="p-3 border-r border-white/5">Destination</div>
                        <div className="p-3 border-r border-white/5 text-center">Protocol</div>
                        <div className="p-3 border-r border-white/5 text-right">Len</div>
                        <div className="p-3">Info</div>
                    </div>

                    {/* Scrollable List */}
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-[#0B0F19] font-mono relative"
                    >
                        {filteredPackets.map((pkt, i) => {
                            const isSelected = selectedPacket?.id === pkt.id;
                            return (
                                <div
                                    key={i}
                                    onClick={() => {
                                        setSelectedPacket(pkt);
                                        // Stream continues in background
                                    }}
                                    className={`
                                        grid grid-cols-[60px_90px_140px_140px_80px_60px_1fr] 
                                        items-center text-xs border-b border-white/5 cursor-pointer 
                                        hover:bg-white/5 transition-colors group
                                        ${isSelected ? 'bg-blue-600/20 hover:bg-blue-600/30 ring-1 ring-blue-500/50 sticky z-10' : ''}
                                    `}
                                >
                                    <div className={`p-1.5 text-center border-r border-white/5 text-[10px] ${isSelected ? 'text-blue-300' : 'text-gray-600'}`}>{pkt.id}</div>
                                    <div className="p-1.5 border-r border-white/5 text-gray-400 text-[10px]">{pkt.timestamp}</div>
                                    <div className="p-1.5 border-r border-white/5 text-blue-300 truncate" title={pkt.src}>{pkt.src}</div>
                                    <div className="p-1.5 border-r border-white/5 text-orange-300 truncate" title={pkt.dst}>{pkt.dst}</div>
                                    <div className="p-1.5 border-r border-white/5 text-center">
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold border ${getProtoColor(pkt.protocol)}`}>
                                            {pkt.protocol}
                                        </span>
                                    </div>
                                    <div className="p-1.5 border-r border-white/5 text-gray-500 text-right text-[10px]">{pkt.length}</div>
                                    <div className="p-1.5 text-gray-400 truncate text-[10px]">{pkt.info}</div>
                                </div>
                            )
                        })}

                        {/* Empty State */}
                        {filteredPackets.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-4 opacity-50 pointer-events-none">
                                <Activity size={48} className="animate-bounce" />
                                <p>Waiting for Packet Stream...</p>
                            </div>
                        )}

                        <div ref={scrollEndRef} className="h-px" />
                    </div>
                </div>

                {/* PACKET DETAILS (Slide-in Right Panel) */}
                {selectedPacket && (
                    <div className={`${isDetailExpanded ? 'absolute inset-0 w-full z-50' : 'w-1/3 relative z-30'} flex flex-col glass-panel rounded-xl border border-white/10 overflow-hidden shadow-2xl animate-in slide-in-from-right-10 duration-300 transition-all`}>
                        {/* Detail Header */}
                        <div className="p-3 bg-[#0f172a] border-b border-white/10 flex justify-between items-center shrink-0">
                            <h3 className="text-white font-bold text-xs flex items-center gap-2">
                                <Eye size={14} className="text-blue-400" /> Packet Inspection #{selectedPacket.id}
                            </h3>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                                    className="hover:bg-blue-500/20 hover:text-blue-400 p-1 rounded transition-colors"
                                    title={isDetailExpanded ? "Minimize" : "Expand Full Screen"}
                                >
                                    {isDetailExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                                <button
                                    onClick={() => setSelectedPacket(null)}
                                    className="hover:bg-red-500/20 hover:text-red-400 p-1 rounded transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Detail Content - Allow independent scrolling */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0B0F19] font-mono">
                            {/* Layer 1: Frame */}
                            <div className="border border-white/5 rounded-lg bg-white/5 overflow-hidden group hover:border-blue-500/30 transition-colors">
                                <div className="px-3 py-1.5 bg-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Wifi size={10} /> Physical Layer (Frame)
                                </div>
                                <div className="p-3 space-y-1">
                                    <DetailRow label="Arrival Time" value={selectedPacket.timestamp} />
                                    <DetailRow label="Frame Length" value={`${selectedPacket.length} bytes`} />
                                </div>
                            </div>

                            {/* Layer 2: IP */}
                            <div className="border border-white/5 rounded-lg bg-white/5 overflow-hidden">
                                <div className="px-3 py-1.5 bg-white/5 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Globe size={10} /> Network Layer (IPv4)</div>
                                    <button
                                        onClick={() => handleVirusTotal(selectedPacket.dst)}
                                        className="text-[10px] flex items-center gap-1 bg-blue-500/20 px-2 py-0.5 rounded text-blue-300 hover:bg-blue-500/40"
                                        title="Check Destination with VirusTotal"
                                    >
                                        <Bug size={10} /> Scan Dst
                                    </button>
                                </div>
                                <div className="p-3 space-y-1">
                                    <DetailRow label="Source IP" value={selectedPacket.src} color="text-blue-300" />
                                    <DetailRow label="Dest IP" value={selectedPacket.dst} color="text-orange-300" />
                                    <DetailRow label="Protocol" value={selectedPacket.protocol} />
                                    <DetailRow label="TTL" value="64 (Simulated)" />
                                </div>
                            </div>

                            {/* VirusTotal Result */}
                            {vtResult && (
                                <div className={`border rounded-lg overflow-hidden ${vtResult.malicious > 0 ? 'border-red-500/30 bg-red-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
                                    <div className="px-3 py-2 border-b border-white/5 flex justify-between items-center">
                                        <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                                            <Bug size={12} /> Threat Intel (VirusTotal)
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {vtResult.mode && (
                                                <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/50 border border-white/5 font-mono">
                                                    {vtResult.mode}
                                                </span>
                                            )}
                                            <div className="text-[10px] font-bold">{vtResult.verdict}</div>
                                        </div>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {vtResult === "Loading..." ? (
                                            <div className="animate-pulse text-xs text-gray-400">Querying Global Threat DB...</div>
                                        ) : vtResult.error ? (
                                            <div className="text-red-400 text-xs">{vtResult.error}</div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="bg-red-500/20 rounded p-1">
                                                        <div className="text-red-400 text-xs font-bold">{vtResult.malicious}</div>
                                                        <div className="text-[9px] text-gray-500 uppercase">Malicious</div>
                                                    </div>
                                                    <div className="bg-orange-500/20 rounded p-1">
                                                        <div className="text-orange-400 text-xs font-bold">{vtResult.suspicious}</div>
                                                        <div className="text-[9px] text-gray-500 uppercase">Suspicious</div>
                                                    </div>
                                                    <div className="bg-emerald-500/20 rounded p-1">
                                                        <div className="text-emerald-400 text-xs font-bold">{vtResult.harmless}</div>
                                                        <div className="text-[9px] text-gray-500 uppercase">Clean</div>
                                                    </div>
                                                </div>
                                                <a href={vtResult.link} target="_blank" className="block text-center text-[10px] text-blue-400 hover:text-blue-300 mt-2 underline">
                                                    View Full Report on VirusTotal
                                                </a>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Layer 3: Transport */}
                            <div className="border border-white/5 rounded-lg bg-white/5 overflow-hidden">
                                <div className="px-3 py-1.5 bg-white/5 text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                    <Activity size={10} /> Transport Layer ({selectedPacket.protocol})
                                </div>
                                <div className="p-3 space-y-1">
                                    <div className="text-[10px] text-gray-400 break-words">{selectedPacket.info}</div>
                                </div>
                            </div>

                            {/* AI Sentinel Analysis */}
                            <div className="border border-purple-500/20 rounded-lg bg-purple-500/5 overflow-hidden">
                                <div className="px-3 py-2 border-b border-purple-500/10 flex justify-between items-center">
                                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                        <Bot size={12} /> AI Sentinel Analysis
                                    </div>
                                    {!isAnalyzing && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAiAnalysis('quick')}
                                                className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-[10px] rounded border border-purple-500/30 transition-colors flex items-center gap-1"
                                            >
                                                <Sparkles size={10} /> Check
                                            </button>
                                            <button
                                                onClick={() => handleAiAnalysis('deep')}
                                                className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 text-[10px] rounded border border-red-500/30 transition-colors flex items-center gap-1"
                                            >
                                                <Shield size={10} /> Deep Scan
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    {isAnalyzing && (
                                        <div className="flex items-center gap-2 text-gray-400 text-xs animate-pulse">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                                            Sentinel is analyzing packet signature...
                                        </div>
                                    )}
                                    {aiResult && (
                                        <div className="text-xs text-purple-200 leading-relaxed font-mono">
                                            {aiResult}
                                        </div>
                                    )}
                                    {!isAnalyzing && !aiResult && (
                                        <p className="text-[10px] text-gray-500 italic">
                                            Click scan to verify if this packet poses a cybersecurity risk using Gemini 2.0 Flash.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Hex & ASCII Viewer */}
                            <div className="flex-1 flex flex-col min-h-0 border-t border-white/10 pt-4">
                                <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 flex items-center gap-2">
                                    <Cpu size={12} /> Payload Inspection (Hex/ASCII)
                                </h4>
                                <div className="flex-1 overflow-auto bg-black/50 rounded-lg border border-white/5 font-mono text-[10px] p-2 leading-5">
                                    <HexDump packet={selectedPacket} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function HexDump({ packet }: { packet: any }) {
    // Generate deterministic pseudo-random hex based on packet ID
    const hexLines = useMemo(() => {
        const lines = [];
        const length = packet.length || 64;
        let pId = packet.id * 13; // seed

        for (let i = 0; i < length; i += 16) {
            const rowOffset = i.toString(16).padStart(4, '0');
            const hexBytes = [];
            const asciiChars = [];

            for (let j = 0; j < 16; j++) {
                if (i + j >= length) break;
                // Pseudo-random byte
                const val = (pId + i + j) % 255;
                hexBytes.push(val.toString(16).padStart(2, '0'));
                // Safe ASCII
                asciiChars.push(val >= 32 && val <= 126 ? String.fromCharCode(val) : '.');
            }

            // Pad last line
            const hexStr = hexBytes.join(' ').padEnd(47, ' ');
            const asciiStr = asciiChars.join('');

            lines.push(
                <div key={i} className="flex gap-4 hover:bg-white/5">
                    <span className="text-gray-500 select-none">{rowOffset}</span>
                    <span className="text-emerald-400/80">{hexStr}</span>
                    <span className="text-gray-400 border-l border-white/10 pl-4 w-40 truncate">{asciiStr}</span>
                </div>
            );
        }
        return lines;
    }, [packet]);

    return <div className="whitespace-pre">{hexLines}</div>;
}

// --- UTILS ---

const PacketHexUtils = {
    generateHex: (packet: any, limit: number = 64) => {
        const lines = [];
        const length = packet.length || 64;
        const rows = Math.min(length, limit) / 16;
        let pId = packet.id * 13;

        for (let i = 0; i < limit && i < length; i += 16) {
            const asciiChars = [];
            for (let j = 0; j < 16; j++) {
                if (i + j >= length) break;
                const val = (pId + i + j) % 255;
                asciiChars.push(val >= 32 && val <= 126 ? String.fromCharCode(val) : '.');
            }
            lines.push({ ascii: asciiChars.join('') });
        }
        return lines;
    }
}

function DetailRow({ label, value, color = "text-gray-300" }: any) {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">{label}</span>
            <span className={`font-mono ${color} select-all`}>{value}</span>
        </div>
    )
}

function getProtoColor(proto: string) {
    const p = proto.toUpperCase();
    if (p === 'TCP') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (p === 'UDP') return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (p === 'ARP') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    if (p === 'ICMP') return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
}
