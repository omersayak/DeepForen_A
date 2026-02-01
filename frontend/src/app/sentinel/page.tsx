'use client';

import React, { useState } from 'react';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import { askSentinel } from '@/lib/api';

export default function SentinelPage() {
    const [messages, setMessages] = useState([
        { role: 'system', content: 'Hello Administrator. I am Sentinel. I am connected to your live network database. How can I assist you?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: input }]);
        setLoading(true);

        try {
            const response = await askSentinel(input);

            setMessages(prev => [...prev, {
                role: 'system',
                content: response.answer || "I processed that, but had no specific output."
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'system',
                content: "Error connecting to AI Backend. Please check logs."
            }]);
        } finally {
            setLoading(false);
            setInput('');
        }
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-6">
            <div className="flex-none">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-violet-500" />
                    Sentinel AI Assistant
                </h2>
                <p className="text-gray-400 text-sm">Ask natural language questions about your network infrastructure.</p>
            </div>

            <div className="flex-1 glass-panel rounded-2xl border border-white/10 flex flex-col overflow-hidden">
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-violet-600'
                                }`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>

                            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-blue-600/20 text-blue-100 rounded-tr-none border border-blue-500/20'
                                    : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/10'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && <div className="text-gray-500 text-xs text-center animate-pulse">Sentinel is thinking...</div>}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white/5 border-t border-white/5">
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask Sentinel (e.g., 'Do you see any suspicious devices?')..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-gray-200 focus:outline-none focus:border-violet-500/50 transition-colors"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
