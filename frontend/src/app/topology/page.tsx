'use client';

import React, { useState, useEffect } from 'react';
import NetworkGraph from '@/components/topology/NetworkGraph';
import { Search, Terminal, Expand } from 'lucide-react';
import { getDevices } from '@/lib/api';
import DeviceDetailsModal from '@/components/DeviceDetailsModal';
import DeviceIcon from '@/components/DeviceIcon';

export default function TopologyPage() {
    const [selectedDevice, setSelectedDevice] = useState<any>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    // Fetch device list for the inventory table
    useEffect(() => {
        getDevices()
            .then(data => setDevices(Array.isArray(data) ? data : [])) // Ensure array
            .catch(err => {
                console.error("Failed to fetch devices:", err);
                setDevices([]);
            });
    }, []);

    const handleDeviceSelect = (device: any) => {
        setSelectedDevice(device);
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6">

            {/* LEFT: Interactive Graph */}
            <div className="flex-grow lg:w-2/3 flex flex-col space-y-4 h-full">
                <div className="shrink-0">
                    <h2 className="text-2xl font-bold text-white">Network Map</h2>
                    <p className="text-gray-400 text-sm">Visualize connections and node relationships.</p>
                </div>

                <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                    <NetworkGraph onDeviceSelect={handleDeviceSelect} />
                </div>
            </div>

            {/* RIGHT: Device Inventory & Detail Panel */}
            <div className="lg:w-1/3 flex flex-col gap-6 h-full overflow-hidden">

                {/* 1. Detail Card (If selected) */}
                <div className={`
                glass-panel p-6 rounded-2xl border border-white/10 transition-all duration-300
                ${selectedDevice ? 'bg-blue-900/10 border-blue-500/30' : 'bg-transparent'}
          `}>
                    {selectedDevice ? (
                        <>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
                                    <DeviceIcon role={selectedDevice.role} vendor={selectedDevice.meta?.vendor} size={28} />
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="text-lg font-bold text-white truncate w-48" title={selectedDevice.hostname}>
                                        {selectedDevice.hostname || 'Unknown Device'}
                                    </h3>
                                    <p className="text-blue-400 font-mono text-sm">{selectedDevice.ip_address}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="p-3 bg-black/20 rounded-lg">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Role</span>
                                    <p className="text-xs text-gray-300 mt-1 capitalize">{selectedDevice.role || 'Unknown'}</p>
                                </div>
                                <div className="p-3 bg-black/20 rounded-lg">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Vendor</span>
                                    <p className="text-xs text-gray-300 mt-1 truncate" title={selectedDevice.meta?.vendor}>{selectedDevice.meta?.vendor || '-'}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setModalOpen(true)}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white font-medium flex items-center justify-center gap-2 transition"
                            >
                                <Expand size={14} /> View Full Diagnostics
                            </button>
                        </>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-center text-gray-500">
                            <Search size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Select a device from the map<br />to view detailed diagnostics.</p>
                        </div>
                    )}
                </div>

                {/* 2. Full Device List (Inventory) */}
                <div className="flex-1 glass-panel border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Terminal size={16} className="text-gray-400" /> Detected Assets
                        </h3>
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">
                            {devices.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                        {devices.map((device) => (
                            <div
                                key={device.id}
                                onClick={() => setSelectedDevice(device)}
                                className={`
                           p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between group
                           ${selectedDevice?.id === device.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'}
                        `}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`p-2 rounded-lg ${selectedDevice?.id === device.id ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>
                                        <DeviceIcon role={device.role} vendor={device.meta?.vendor} size={14} />
                                    </div>
                                    <div className="truncate flex-1">
                                        <p className="text-xs font-bold text-gray-200 truncate" title={device.hostname}>
                                            {device.hostname || 'Unknown'}
                                        </p>
                                        <p className="text-[10px] text-gray-500 font-mono">{device.ip_address}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-medium">
                                        On
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            <DeviceDetailsModal
                device={selectedDevice}
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
            />
        </div>
    );
}
