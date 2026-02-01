'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Activity, Server, Zap, Play, Target, Wifi, Globe, Box, Search, Layers } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { triggerScan } from '@/lib/api';
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import TrafficWidget from '@/components/TrafficWidget';
import SystemInfoWidget from '@/components/SystemInfoWidget';

const mockChartData = [
  { name: '00:00', load: 20 },
  { name: '04:00', load: 15 },
  { name: '08:00', load: 60 },
  { name: '12:00', load: 85 },
  { name: '16:00', load: 70 },
  { name: '20:00', load: 45 },
  { name: '24:00', load: 30 },
];

export default function Home() {
  const [scanning, setScanning] = useState(false);
  const [targetIP, setTargetIP] = useState('192.168.1.0/24');
  const [scanStatus, setScanStatus] = useState('');

  const handleScan = async () => {
    setScanning(true);
    setScanStatus('Initializing ARP Sweep...');

    try {
      await triggerScan(targetIP);
      setScanStatus('Sending Probes...');
      setTimeout(() => setScanStatus('Deep Nmap Inspection...'), 2000);
      setTimeout(() => setScanStatus('Fingerprinting OS...'), 5000);
      setTimeout(() => setScanStatus('Finalizing Topology...'), 8000);
    } catch (e) {
      console.error(e);
      setScanStatus('Scan Failed!');
    }

    // Simulate scan duration visually
    setTimeout(() => {
      setScanning(false);
      setScanStatus('');
    }, 10000);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Top Section - Welcome & Quick Stats */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Observer Dashboard</h1>
          <p className="text-gray-400 mt-2">Next-Gen Network Reconnaissance</p>
        </div>

        {/* Status Indicators */}
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Sentinel Online</span>
          </div>
          <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
            <Wifi size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Gateway Active</span>
          </div>
        </div>
      </div>

      {/* 2. Main Scanner & Control Bar */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-violet-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 border border-white/10">

          {/* Animated Radar Icon */}
          <div className="relative w-20 h-20 flex items-center justify-center bg-black/40 rounded-full border border-white/10 shrink-0 shadow-inner">
            <div className={`absolute inset-0 border-2 border-blue-500/30 rounded-full ${scanning ? 'animate-ping' : ''}`} />
            <div className={`absolute inset-2 border border-blue-500/10 rounded-full ${scanning ? 'animate-pulse' : ''}`} />
            <Target className={`text-blue-400 ${scanning ? 'animate-spin' : ''}`} size={32} />
          </div>

          <div className="flex-1 w-full md:w-auto">
            <h3 className="text-xl font-bold text-white mb-1">Deep Network Discovery</h3>
            <p className="text-sm text-gray-400 mb-4">
              {scanning ? (
                <span className="text-blue-400 font-mono animate-pulse">&gt;&gt; {scanStatus}</span>
              ) : "Initiate a full spectrum scan to detect devices, OS types, and vulnerabilities."}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-black/40 px-3 py-2.5 rounded-lg border border-white/10 w-full md:w-80 focus-within:border-blue-500/50 transition-colors">
                <span className="text-gray-500 font-mono text-xs">TARGET:</span>
                <input
                  type="text"
                  value={targetIP}
                  onChange={(e) => setTargetIP(e.target.value)}
                  className="bg-transparent border-none text-white focus:ring-0 font-mono text-sm w-full outline-none"
                  placeholder="192.168.1.0/24"
                />
              </div>
              <button
                onClick={handleScan}
                disabled={scanning}
                className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {scanning ? <Activity className="animate-spin h-4 w-4" /> : <Play className="h-4 w-4" />}
                {scanning ? 'SCANNING...' : 'START DEEP SCAN'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Network Load Chart */}
        <div className="lg:col-span-2 h-[400px]">
          <TrafficWidget />
        </div>

        {/* Right Column: Quick Cards & System Info */}
        <div className="space-y-6">

          <div className="h-[200px]">
            <SystemInfoWidget />
          </div>

          <Link href="/topology">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                  <Layers size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Topology Map</h4>
                  <p className="text-sm text-gray-400">Visualize Assets</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition relative z-10">
                <span className="text-gray-400 group-hover:text-white">→</span>
              </div>
            </div>
          </Link>

          <Link href="/devices">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <Search size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Device Inventory</h4>
                  <p className="text-sm text-gray-400">Deep Inspection List</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition relative z-10">
                <span className="text-gray-400 group-hover:text-white">→</span>
              </div>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}
