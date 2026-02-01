'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Minimize2, Cpu, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { askSentinel } from '@/lib/api';

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
        { role: 'bot', text: 'Hello! I am Sentinel. Connected to your live topology via Dual-Core AI (Gemini & GPT-4). Ask me anything!' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini'); // Default to Gemini
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            // Pass the selected provider to the backend
            const response = await askSentinel(userMsg, provider);
            setMessages(prev => [...prev, { role: 'bot', text: response || "I couldn't process that." }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: "⚠️ Connection Error. Ensure backend is running." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 w-[380px] h-[600px] glass-panel border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden bg-[#0f172a]/95 backdrop-blur-xl"
                    >
                        {/* Header with Model Selector */}
                        <div className="p-4 border-b border-white/10 bg-blue-600/10 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                        <Bot size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">Sentinel AI</h3>
                                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            {provider === 'gemini' ? 'Google Gemini 1.5' : 'OpenAI GPT-4'} Connected
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                                    <Minimize2 size={18} />
                                </button>
                            </div>

                            {/* Model Switcher */}
                            <div className="bg-black/20 p-1 rounded-lg flex gap-1">
                                <button
                                    onClick={() => setProvider('gemini')}
                                    className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold py-1.5 rounded-md transition-all ${provider === 'gemini' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Sparkles size={12} /> Gemini
                                </button>
                                <button
                                    onClick={() => setProvider('openai')}
                                    className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold py-1.5 rounded-md transition-all ${provider === 'openai' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Cpu size={12} /> ChatGPT
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10" ref={scrollRef}>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'bot' ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-700 text-gray-300'}`}>
                                        {msg.role === 'bot' ? <Bot size={14} /> : <User size={14} />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm max-w-[85%] leading-relaxed ${msg.role === 'bot' ? 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-lg'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400">
                                        <Bot size={14} />
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl rounded-tl-none flex gap-1 items-center">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-white/10 bg-black/20">
                            <div className="flex gap-2">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder={`Ask ${provider === 'gemini' ? 'Gemini' : 'ChatGPT'}...`}
                                    className="flex-1 bg-transparent border-none text-sm text-white focus:ring-0 placeholder:text-gray-500"
                                />
                                <button onClick={handleSend} disabled={loading} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-500/20">
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center justify-center text-white hover:scale-105 transition active:scale-95 group relative border border-white/10"
            >
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0B0F19] animate-pulse" />
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
            </button>
        </div>
    );
}
