import {
    Monitor, Smartphone, Router, Printer, Camera, Server, Box
} from 'lucide-react';

interface DeviceIconProps {
    role?: string;
    vendor?: string;
    size?: number;
    className?: string;
}

export default function DeviceIcon({ role, vendor, size = 20, className = "" }: DeviceIconProps) {
    const r = (role || '').toLowerCase();
    const v = (vendor || '').toLowerCase();
    const text = r + v;

    if (text.includes('router') || text.includes('gateway') || text.includes('openwrt')) return <Router size={size} className={className} />;
    if (text.includes('mobile') || text.includes('iphone') || text.includes('android')) return <Smartphone size={size} className={className} />;
    if (text.includes('camera') || text.includes('hikvision') || text.includes('dahua')) return <Camera size={size} className={className} />;
    if (text.includes('printer') || text.includes('epson') || text.includes('hp')) return <Printer size={size} className={className} />;
    if (text.includes('workstation') || text.includes('windows') || text.includes('laptop') || text.includes('pc')) return <Monitor size={size} className={className} />;
    if (text.includes('server') || text.includes('linux') || text.includes('ubuntu')) return <Server size={size} className={className} />;

    return <Box size={size} className={className} />;
}
