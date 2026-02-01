'use client';

import {
    X, Server, Shield, Activity, Calendar, Hash,
    Cpu, Globe, Terminal, Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeviceDetailsModalProps {
    device: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function DeviceDetailsModal({ device, isOpen, onClose }: DeviceDetailsModalProps) {
    if (!isOpen || !device) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-b border-white/5 flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Box className="text-blue-400" size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{device.hostname || 'Unknown Device'}</h2>
                                <div className="flex gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20">
                                        ONLINE
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20 uppercase">
                                        {device.role || 'Unspecified'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
                            <X className="text-gray-400" size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto space-y-8">

                        {/* 1. Identity Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <InfoCard icon={<Globe size={18} />} label="IP Address" value={device.ip_address} />
                            <InfoCard icon={<Hash size={18} />} label="MAC Address" value={device.mac_address} mono />
                            <InfoCard icon={<Shield size={18} />} label="Vendor" value={device.meta?.vendor || 'Unknown'} />
                            <InfoCard icon={<Cpu size={18} />} label="OS / Kernel" value={device.os_type || 'Detection Failed'} />
                            <InfoCard icon={<Calendar size={18} />} label="Last Seen" value={new Date(device.last_seen || Date.now()).toLocaleTimeString()} />
                            <InfoCard icon={<Activity size={18} />} label="Risk Score" value={device.risk_score ? `${device.risk_score}/10` : 'Safe'} color="text-emerald-400" />
                        </div>

                        {/* 2. Open Ports / Services */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Terminal size={14} /> Open Ports & Services
                            </h3>
                            {device.meta?.ports && device.meta.ports.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {device.meta.ports.map((port: string, i: number) => (
                                        <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-1 hover:border-blue-500/30 transition">
                                            <span className="text-xs text-gray-500">{port.split('/')[1] || 'TCP'}</span>
                                            <span className="text-lg font-mono font-bold text-white">{port.split('/')[0]}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 bg-white/5 rounded-lg border border-dashed border-white/10 text-center text-gray-500 text-sm">
                                    No open ports detected or firewall active.
                                </div>
                            )}
                        </div>

                        {/* 3. Raw Metadata */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Raw Metadata</h3>
                            <pre className="bg-black/40 p-4 rounded-lg border border-white/5 text-xs text-gray-400 font-mono overflow-x-auto">
                                {JSON.stringify(device.meta, null, 2)}
                            </pre>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition">
                            Close
                        </button>
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition">
                            Run Deep Scan
                        </button>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function InfoCard({ icon, label, value, mono = false, color = 'text-gray-200' }: any) {
    return (
        <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                {icon} {label}
            </div>
            <div className={`font-medium ${mono ? 'font-mono text-xs' : 'text-sm'} ${color} truncate`} title={value}>
                {value}
            </div>
        </div>
    );
}
