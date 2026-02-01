'use client';

import { useEffect, useState } from 'react';
import { getDevices } from '@/lib/api';
import {
    Table, Search, Monitor, Smartphone, Router, Printer,
    Camera, Server, Box, Terminal, RefreshCw, Eye
} from 'lucide-react';
import DeviceDetailsModal from '@/components/DeviceDetailsModal';

export default function DevicesPage() {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [term, setTerm] = useState('');
    const [selectedDevice, setSelectedDevice] = useState<any>(null);

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const data = await getDevices();
            setDevices(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
        const interval = setInterval(fetchDevices, 5000);
        return () => clearInterval(interval);
    }, []);

    const filtered = devices.filter(d =>
        (d.hostname || '').toLowerCase().includes(term.toLowerCase()) ||
        d.ip_address.includes(term) ||
        (d.meta?.vendor || '').toLowerCase().includes(term.toLowerCase())
    );

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white">Device Inventory</h1>
                    <p className="text-gray-400">Comprehensive list of all discovered network assets.</p>
                </div>
                <button
                    onClick={fetchDevices}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition flex items-center gap-2 text-sm font-medium"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Scanning...' : 'Refresh Data'}
                </button>
            </div>

            {/* Toolbar */}
            <div className="glass-panel p-4 rounded-xl border border-white/5 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by IP, Hostname, or Vendor..."
                        value={term}
                        onChange={e => setTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-gray-600 focus:ring-1 focus:ring-blue-500 text-sm outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl border border-white/10 overflow-hidden flex-1 relative flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-white/5 text-gray-200 font-bold uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-4">Type</th>
                                <th className="p-4">Hostname</th>
                                <th className="p-4">IP Address</th>
                                <th className="p-4">MAC Address</th>
                                <th className="p-4">Vendor</th>
                                <th className="p-4">OS / Role</th>
                                <th className="p-4">Open Ports</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map((device) => (
                                <tr
                                    key={device.id}
                                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                                    onClick={() => setSelectedDevice(device)}
                                >
                                    <td className="p-4">
                                        <div className="p-2 bg-white/5 rounded-lg w-fit text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition shadow shadow-black/50">
                                            {getIcon(device.role, device.meta?.vendor)}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-white max-w-[200px] truncate" title={device.hostname}>
                                        {device.hostname || 'Unknown'}
                                    </td>
                                    <td className="p-4 font-mono text-gray-300">{device.ip_address}</td>
                                    <td className="p-4 font-mono text-xs">{device.mac_address}</td>
                                    <td className="p-4">
                                        {device.meta?.vendor ? (
                                            <span className="px-2 py-1 rounded bg-black/40 text-xs font-medium border border-white/10">
                                                {device.meta.vendor}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-white">{device.role || 'Device'}</span>
                                            <span className="text-xs text-gray-500">{device.os_type}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {device.meta?.ports?.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {device.meta.ports.slice(0, 2).map((p: string) => (
                                                    <span key={p} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded border border-emerald-500/10">
                                                        {p.split(' ')[0]}
                                                    </span>
                                                ))}
                                                {device.meta.ports.length > 2 && (
                                                    <span className="text-[10px] text-gray-500">+{device.meta.ports.length - 2}</span>
                                                )}
                                            </div>
                                        ) : <span className="text-xs text-gray-600 italic">None</span>}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="p-2 hover:bg-white/10 rounded-full text-blue-400 opacity-0 group-hover:opacity-100 transition">
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                            <Search size={32} />
                        </div>
                        <p>No devices found matching your search. Try running a Deep Scan.</p>
                    </div>
                )}
            </div>

            <DeviceDetailsModal
                device={selectedDevice}
                isOpen={!!selectedDevice}
                onClose={() => setSelectedDevice(null)}
            />
        </div>
    );
}

function getIcon(role: string, vendor: string = "") {
    const r = (role || '').toLowerCase();
    const v = (vendor || '').toLowerCase();
    const text = r + v;

    if (text.includes('router') || text.includes('gateway') || text.includes('openwrt')) return <Router size={20} />;
    if (text.includes('mobile') || text.includes('iphone') || text.includes('android')) return <Smartphone size={20} />;
    if (text.includes('camera') || text.includes('hikvision') || text.includes('dahua')) return <Camera size={20} />;
    if (text.includes('printer') || text.includes('epson') || text.includes('hp')) return <Printer size={20} />;
    if (text.includes('workstation') || text.includes('windows') || text.includes('laptop')) return <Monitor size={20} />;
    if (text.includes('server') || text.includes('linux') || text.includes('ubuntu')) return <Server size={20} />;

    return <Box size={20} />;
}
