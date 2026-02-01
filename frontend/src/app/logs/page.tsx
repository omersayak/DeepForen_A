'use client';

import React from 'react';
import { FileText, Filter, Download } from 'lucide-react';

const mockLogs = [
    { id: 1, time: '2023-10-27 10:42:01', device: 'Auth Server', severity: 'INFO', message: 'User logs_admin login successful from 192.168.1.105' },
    { id: 2, time: '2023-10-27 10:45:12', device: 'Gateway Router', severity: 'WARN', message: 'High latency detected on WAN interface (1200ms)' },
    { id: 3, time: '2023-10-27 10:48:00', device: 'Database', severity: 'ERROR', message: 'Connection refused from unknown IP 10.0.0.55' },
    { id: 4, time: '2023-10-27 10:50:22', device: 'Workstation A', severity: 'CRITICAL', message: 'Malware signature detected: Trojan.Win32.Generic' },
    { id: 5, time: '2023-10-27 10:55:05', device: 'Auth Server', severity: 'INFO', message: 'Scheduled backup completed successfully' },
];

export default function LogsPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Security Logs</h2>
                    <p className="text-gray-400 text-sm">Real-time system events and security alerts.</p>
                </div>

                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors flex items-center gap-2">
                        <Filter size={16} /> Filter
                    </button>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-gray-200 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Device</th>
                            <th className="px-6 py-4">Severity</th>
                            <th className="px-6 py-4">Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {mockLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                                <td className="px-6 py-4 font-mono text-gray-500 group-hover:text-gray-300">{log.time}</td>
                                <td className="px-6 py-4 text-blue-400 font-medium">{log.device}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${log.severity === 'INFO' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            log.severity === 'WARN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                log.severity === 'ERROR' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                    'bg-red-600/20 text-red-500 border border-red-500/20 animate-pulse'
                                        }`}>
                                        {log.severity}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-300">{log.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
