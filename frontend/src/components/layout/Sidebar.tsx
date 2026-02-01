'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Network, FileText, Bot, Settings, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: Network, label: 'Topology', href: '/topology' },
    { icon: Activity, label: 'Traffic Analysis', href: '/traffic' },
    { icon: FileText, label: 'Logs & Events', href: '/logs' },
    { icon: Bot, label: 'Sentinel AI', href: '/sentinel' },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="h-screen w-64 glass-panel border-r border-white/10 flex flex-col fixed left-0 top-0 z-50">
            {/* Branding */}
            <div className="p-6 flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Activity className="text-white h-5 w-5" />
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-wide text-white">NETGRAPH</h1>
                    <p className="text-xs text-emerald-400 font-mono tracking-wider">SENTINEL ONLINE</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer",
                                    isActive
                                        ? "bg-blue-600/20 text-white"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute left-0 w-1 h-6 bg-blue-500 rounded-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    />
                                )}
                                <item.icon className={cn("h-5 w-5", isActive ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300")} />
                                <span className="font-medium">{item.label}</span>

                                {isActive && (
                                    <div className="absolute inset-0 bg-blue-500/10 rounded-xl blur-sm -z-10" />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-white/5">
                <Link href="/settings">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Settings</span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
