'use client';

import { useState, useEffect } from 'react';
import { Shield, Monitor, Globe, Network } from 'lucide-react';
import { getSystemInfo } from '@/lib/api';

export default function SystemInfoWidget() {
    const [info, setInfo] = useState<any>(null);

    useEffect(() => {
        getSystemInfo().then(setInfo);
    }, []);

    return (
        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

            <div>
                <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                    <Monitor className="text-indigo-400" size={18} /> System Identity
                </h3>

                <div className="space-y-4">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Local IP Address</p>
                        <div className="flex items-center gap-2">
                            <Globe size={14} className="text-emerald-400" />
                            <span className="text-2xl font-bold text-white tracking-wider font-mono">
                                {info?.ip || "Loading..."}
                            </span>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-gray-400 mb-1">Active Interface</p>
                        <div className="flex items-center gap-2">
                            <Network size={14} className="text-blue-400" />
                            <span className="text-sm font-medium text-gray-300 font-mono">
                                {info?.interface?.interface || "Unknown"}
                            </span>
                            {info?.interface?.speed > 0 && (
                                <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-gray-500">
                                    {info.interface.speed}Mbps
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 opacity-60">
                    <Shield size={12} className="text-gray-400" />
                    <span className="text-[10px] text-gray-500">Protected by Sentinel Engine</span>
                </div>
            </div>
        </div>
    );
}
