'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Agent, Memory } from '@/lib/supabase';

interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: string;
}

export default function ChatPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const router = useRouter();

  const [agent, setAgent]       = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [agentRes, memRes] = await Promise.all([
      fetch(`/api/agents`),
      fetch(`/api/memories/${agentId}`),
    ]);

    if (agentRes.ok) {
      const agents: Agent[] = await agentRes.json();
      const found = agents.find(a => a.id === agentId);
      if (!found) { router.push('/dashboard'); return; }
      setAgent(found);
    }

    if (memRes.ok) {
      const memories: Memory[] = await memRes.json();
      setMessages(memories.map(m => ({
        id:        m.id,
        role:      m.role,
        content:   m.content,
        timestamp: m.created_at,
      })));
    }

    setLoading(false);
  }, [agentId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const send = async () => {
    if (!input.trim() || sending || !agent) return;

    const userMsg: Message = {
      id:        `tmp-${Date.now()}`,
      role:      'user',
      content:   input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agentId, message: userMsg.content }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: Message = {
          id:        `tmp-assistant-${Date.now()}`,
          role:      'assistant',
          content:   data.message,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) return null;

  const deptColors: Record<string, string> = {
    'Tech':        'text-blue-400',
    'Finance':     'text-green-400',
    'Marketing':   'text-purple-400',
    'Design':      'text-pink-400',
    'Opérations':  'text-orange-400',
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1e2d4a] flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-white transition-colors text-sm"
        >
          ← Retour
        </Link>

        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-[#0a0d14] border border-[#1e2d4a] flex items-center justify-center text-xl">
              {agent.avatar}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#111827]" />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{agent.name}</div>
            <div className={`text-xs ${deptColors[agent.department] ?? 'text-slate-400'}`}>
              {agent.role} · {agent.department}
            </div>
          </div>
        </div>

        <div className="ml-auto text-xs text-slate-500">
          {messages.length > 0 ? `${Math.ceil(messages.length / 2)} échanges` : 'Nouvelle conversation'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">{agent.avatar}</div>
            <h3 className="text-lg font-medium text-white mb-2">
              Bonjour, je suis {agent.name}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {agent.role} chez SURGIFLOW. Comment puis-je vous aider ?
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold'
                : 'bg-[#1a2235] border border-[#1e2d4a]'
            }`}>
              {msg.role === 'user' ? 'D' : agent.avatar}
            </div>

            {/* Bubble */}
            <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-[#1a2235] border border-[#1e2d4a] text-slate-200 rounded-tl-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose-dark text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-500'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Indicateur de frappe */}
        {sending && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-[#1a2235] border border-[#1e2d4a] flex items-center justify-center text-sm shrink-0">
              {agent.avatar}
            </div>
            <div className="bg-[#1a2235] border border-[#1e2d4a] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#1e2d4a]">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Écrire à ${agent.name}... (Entrée pour envoyer, Shift+Entrée pour la ligne)`}
            className="flex-1 bg-[#1a2235] border border-[#1e2d4a] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50 transition-colors max-h-32"
            rows={1}
            style={{ minHeight: '46px' }}
            disabled={sending}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
