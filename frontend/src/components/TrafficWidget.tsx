'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, ArrowDown, ArrowUp } from 'lucide-react';
import { getTrafficStats } from '@/lib/api';

export default function TrafficWidget() {
    const [data, setData] = useState<{ time: string; download: number; upload: number }[]>([]);
    const [currentStats, setCurrentStats] = useState({ down: 0, up: 0, totalDown: 0, totalUp: 0 });

    useEffect(() => {
        const fetchData = async () => {
            const stats = await getTrafficStats();
            if (stats) {
                const now = new Date();
                const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

                setCurrentStats({
                    down: stats.download_speed_kbps,
                    up: stats.upload_speed_kbps,
                    totalDown: stats.total_recv_mb,
                    totalUp: stats.total_sent_mb
                });

                setData(prev => {
                    const newData = [...prev, {
                        time: timeStr,
                        download: stats.download_speed_kbps,
                        upload: stats.upload_speed_kbps
                    }];
                    return newData.slice(-20); // Keep last 20 points
                });
            }
        };

        const interval = setInterval(fetchData, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="glass-panel p-6 rounded-2xl border border-white/10 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Activity className="text-violet-400" size={18} /> Network Traffic
                </h3>
                <span className="px-2 py-1 text-[10px] bg-red-500/20 text-red-400 border border-red-500/20 rounded animate-pulse">LIVE</span>
            </div>

            <div className="flex gap-6 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <ArrowDown size={16} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Download</p>
                        <p className="text-lg font-bold text-white font-mono">{currentStats.down} <span className="text-xs text-gray-500">KB/s</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <ArrowUp size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Upload</p>
                        <p className="text-lg font-bold text-white font-mono">{currentStats.up} <span className="text-xs text-gray-500">KB/s</span></p>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="download" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDown)" />
                        <Area type="monotone" dataKey="upload" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorUp)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
