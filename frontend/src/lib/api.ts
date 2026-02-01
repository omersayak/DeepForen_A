// Use relative /api path which is proxied by Next.js rewrites in next.config.ts
// This avoids port 8080 firewall issues on remote servers.
export const API_URL = typeof window !== 'undefined' ? '/api' : 'http://127.0.0.1:8080';

// Server-side fetching helper
export const INTERNAL_API_URL = 'http://127.0.0.1:8080';

export async function triggerScan(target: string = "192.168.1.0/24") {
    try {
        const res = await fetch(`${API_URL}/scan/active?target=${target}`, {
            method: 'POST',
        });
        if (!res.ok) throw new Error("Backend connection failed");
        return res.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

export async function getDevices() {
    try {
        const res = await fetch(`${API_URL}/devices`);
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("API Error:", error);
        return [];
    }
}

export async function askSentinel(query: string, provider: 'gemini' | 'openai' = 'gemini') {
    try {
        const res = await fetch(`${API_URL}/sentinel/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, provider }),
        });
        const data = await res.json();
        return data.answer;
    } catch (error) {
        console.error('Sentinel Error:', error);
        throw error;
    }
}

export async function getTrafficStats() {
    try {
        const res = await fetch(`${API_URL}/system/traffic`);
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Traffic API Error:", error);
        return null;
    }
}

export async function getSystemInfo() {
    try {
        const res = await fetch(`${API_URL}/system/info`);
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("System Info API Error:", error);
        return null;
    }
}

export async function getConnections() {
    try {
        const res = await fetch(`${API_URL}/system/connections`);
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Connection API Error:", error);
        return null;
    }
}

export async function checkVirusTotal(target: string) {
    try {
        const res = await fetch(`${API_URL}/threat/virustotal?target=${target}`);
        return await res.json();
    } catch (e) {
        console.error("VT Error:", e);
        return { error: "Failed to connect to Threat Intel" };
    }
}

export async function exportPcap(packets: any[]) {
    try {
        const res = await fetch(`${API_URL}/traffic/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(packets)
        });
        if (!res.ok) throw new Error("Export failed");

        // Trigger download
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `netgraph_capture_${new Date().toISOString()}.pcap`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return true;
    } catch (e) {
        console.error("Export Error:", e);
        return false;
    }
}

export async function importPcap(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/traffic/upload`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error("Import failed");
        return await res.json();
    } catch (e) {
        console.error("Import Error:", e);
        return null;
    }
}
