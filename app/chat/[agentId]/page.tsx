'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import type { Agent, Memory } from '@/lib/supabase';
import { avatarUrl } from '@/lib/avatar';

type DelegationStatus = 'pending' | 'in_progress' | 'done' | 'error';

interface Delegation {
  agentId?:         string;
  agentName:        string;
  agentRole:        string;
  agentAvatar?:     string;
  task:             string;
  delegateMessage?: string;
  status?:          DelegationStatus;
}

type MessageRole = 'user' | 'assistant' | 'delegation';

interface Message {
  id:           string;
  role:         MessageRole;
  content:      string;
  timestamp:    string;
  delegation?:  Delegation; // pour role === 'delegation'
}

interface AttachedFile {
  name:      string;
  content:   string;
  type:      'text' | 'image';
  mimeType?: string;
  preview?:  string;
}

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|ts|tsx|js|jsx|py|sql|html|css|xml|yaml|yml|sh|env)$/i;

function DelegationRow({ delegation, fromAgent, targetAgent }: {
  delegation:  Delegation;
  fromAgent:   Agent;
  targetAgent: Agent | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = delegation.status ?? 'done';

  const cfg = {
    pending:     { border: 'border-slate-700/40',   bg: 'bg-slate-900/60',    dot: 'bg-slate-600',   ping: false,  label: 'En attente',    labelColor: 'text-slate-500' },
    in_progress: { border: 'border-amber-500/30',   bg: 'bg-amber-950/40',    dot: 'bg-amber-400',   ping: true,   label: 'En cours...',   labelColor: 'text-amber-400' },
    done:        { border: 'border-emerald-500/25', bg: 'bg-emerald-950/30',  dot: 'bg-emerald-400', ping: false,  label: 'Livré ✓',       labelColor: 'text-emerald-400' },
    error:       { border: 'border-red-500/25',     bg: 'bg-red-950/30',      dot: 'bg-red-400',     ping: false,  label: 'Erreur',        labelColor: 'text-red-400' },
  }[status];

  return (
    <div className={`flex gap-2.5 animate-slide-up`}>
      {/* Avatar de l'agent délégué */}
      <div className="relative shrink-0 mt-0.5">
        <div className={`w-8 h-8 rounded-full bg-[#1a2235] border ${cfg.border} overflow-hidden`}>
          <Image
            src={avatarUrl(delegation.agentName)}
            alt={delegation.agentName}
            width={32} height={32}
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>
        {cfg.ping && (
          <span className={`absolute inset-0 rounded-full ${cfg.dot} opacity-30 animate-ping`} />
        )}
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${cfg.dot} border-2 border-[#111827]`} />
      </div>

      {/* Carte */}
      <div className={`flex-1 rounded-2xl rounded-tl-sm border ${cfg.border} ${cfg.bg} overflow-hidden transition-all duration-500`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <span className="text-[11px] font-bold text-slate-300">
            {delegation.agentName}
          </span>
          <span className="text-slate-600 text-[10px]">·</span>
          <span className="text-[10px] text-slate-500">{delegation.agentRole}</span>
          <span className={`ml-auto text-[11px] font-semibold ${cfg.labelColor}`}>{cfg.label}</span>
        </div>

        {/* Brief */}
        <div className="px-3.5 pb-2 border-t border-white/4">
          <p className="text-[10px] text-slate-600 mt-2 mb-1 uppercase tracking-wider font-semibold">
            Brief de {fromAgent.name}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 italic">"{delegation.task}"</p>
        </div>

        {/* En cours */}
        {status === 'in_progress' && (
          <div className="px-3.5 pb-2.5 flex items-center gap-2">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span className="text-xs text-amber-400/60 italic">prépare le livrable...</span>
          </div>
        )}

        {/* Livrable terminé */}
        {status === 'done' && delegation.delegateMessage && (
          <div className="px-3.5 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-emerald-500/70 uppercase tracking-wider font-semibold">Livrable</span>
              <button onClick={() => setExpanded(v => !v)} className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                {expanded ? 'Réduire ↑' : 'Voir le détail ↓'}
              </button>
            </div>
            {expanded ? (
              <div className="prose-dark text-xs text-slate-400 leading-relaxed max-h-64 overflow-y-auto border border-white/5 rounded-lg p-2 bg-black/20">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{delegation.delegateMessage}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-xs text-slate-500 line-clamp-2">{delegation.delegateMessage.slice(0, 140)}…</p>
            )}
            {delegation.agentId && (
              <Link href={`/chat/${delegation.agentId}`} className="mt-2 inline-flex text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                Ouvrir le chat avec {delegation.agentName} →
              </Link>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="px-3.5 pb-2 text-xs text-red-400/60 italic">Impossible de contacter {delegation.agentName}</div>
        )}
      </div>
    </div>
  );
}

const SESSION_KEY = (agentId: string) => `deleg_session_${agentId}`;

interface DelegSession {
  messages: Message[];
  savedAt:  number;
}

export default function ChatPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const router = useRouter();

  const [agent, setAgent]             = useState<Agent | null>(null);
  const [agents, setAgents]           = useState<Agent[]>([]);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const messagesAreaRef  = useRef<HTMLDivElement>(null);
  const inputRef         = useRef<HTMLTextAreaElement>(null);
  const fileRef          = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Afficher le bouton "↓" quand on est à plus de 150px du bas
  const handleScroll = () => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 150);
  };

  useEffect(() => { scrollToBottom('instant'); }, []); // scroll instantané au chargement
  useEffect(() => {
    if (!showScrollBtn) scrollToBottom(); // auto-scroll seulement si déjà en bas
  }, [messages, showScrollBtn]);

  // ── Sauvegarde session localStorage quand les messages changent ──────────
  useEffect(() => {
    if (!agentId || messages.length === 0) return;
    const hasDelegation = messages.some(m => m.role === 'delegation');
    if (!hasDelegation) return; // ne sauvegarder que les sessions avec délégation
    const session: DelegSession = { messages, savedAt: Date.now() };
    try { localStorage.setItem(SESSION_KEY(agentId), JSON.stringify(session)); } catch {}
  }, [agentId, messages]);

  // ── Avertissement navigateur si process actif ────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!sending) return;
      e.preventDefault();
      e.returnValue = 'Marcus orchestre encore son équipe — si vous quittez, vous perdrez la session en cours.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sending]);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [agentRes, memRes] = await Promise.all([
      fetch(`/api/agents`),
      fetch(`/api/memories/${agentId}`),
    ]);

    // Charger les agents en premier (nécessaire pour restauration aussi)
    let allAgents: Agent[] = [];
    if (agentRes.ok) {
      allAgents = await agentRes.json();
      setAgents(allAgents);
      const found = allAgents.find(a => a.id === agentId);
      if (!found) { router.push('/dashboard'); return; }
      setAgent(found);
    }

    // ── Restaurer session de délégation si elle existe (< 30 min) ─────────
    try {
      const raw = localStorage.getItem(SESSION_KEY(agentId));
      if (raw) {
        const session: DelegSession = JSON.parse(raw);
        const age = Date.now() - session.savedAt;
        if (age < 30 * 60 * 1000 && session.messages.length > 0) {
          const restored = session.messages.map(m =>
            m.role === 'delegation' && m.delegation?.status === 'in_progress'
              ? { ...m, delegation: { ...m.delegation, status: 'error' as DelegationStatus } }
              : m,
          );
          setMessages(restored);
          setLoading(false);
          return;
        } else {
          localStorage.removeItem(SESSION_KEY(agentId));
        }
      }
    } catch {}

    if (memRes.ok) {
      const memories: Memory[] = await memRes.json();
      setMessages(
        memories
          .filter(m => !(m.role === 'user' && m.content.startsWith('Mon équipe vient de terminer')))
          .filter(m => !(m.role === 'user' && m.content.startsWith('me confie cette mission')))
          .filter(m => !(m.role === 'user' && m.content.includes('me délègue cette mission')))
          .map(m => ({
            id:        m.id,
            role:      m.role as MessageRole,
            content:   m.content,
            timestamp: m.created_at,
          })),
      );
    }

    setLoading(false);
  }, [agentId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isText  = TEXT_EXTENSIONS.test(file.name) || file.type.startsWith('text/');

    if (!isImage && !isText) {
      alert('Format non supporté. Utilisez : images, .txt, .md, .csv, .json, .ts, .js, .py, .sql...');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();

    if (isImage) {
      reader.readAsDataURL(file);
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64  = dataUrl.split(',')[1];
        setAttachedFile({
          name:     file.name,
          content:  base64,
          type:     'image',
          mimeType: file.type,
          preview:  dataUrl,
        });
      };
    } else {
      reader.readAsText(file);
      reader.onload = () => {
        setAttachedFile({
          name:    file.name,
          content: reader.result as string,
          type:    'text',
        });
      };
    }

    e.target.value = '';
  };

  const send = async () => {
    if ((!input.trim() && !attachedFile) || sending || !agent) return;

    let messageText = input.trim();

    // Injection du contenu texte dans le message
    if (attachedFile?.type === 'text') {
      const header = `[Fichier joint : ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\``;
      messageText = messageText ? `${header}\n\n${messageText}` : header;
    }

    if (!messageText && attachedFile?.type === 'image') {
      messageText = `[Image jointe : ${attachedFile.name}]`;
    }

    const userMsg: Message = {
      id:        `tmp-${Date.now()}`,
      role:      'user',
      content:   attachedFile?.type === 'text'
        ? (input.trim() ? `📎 ${attachedFile.name} — ${input.trim()}` : `📎 ${attachedFile.name}`)
        : (attachedFile?.type === 'image'
          ? (input.trim() ? `🖼️ ${attachedFile.name} — ${input.trim()}` : `🖼️ ${attachedFile.name}`)
          : messageText),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const fileToSend = attachedFile;
    setAttachedFile(null);
    setSending(true);

    try {
      // ── Étape 1 : réponse de l'agent + plan de délégation ──────────────
      const body: Record<string, unknown> = { agentId, message: messageText };
      if (fileToSend?.type === 'image') {
        body.imageData     = fileToSend.content;
        body.imageMimeType = fileToSend.mimeType;
      }

      const res  = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: `⚠️ Erreur : ${data.error ?? 'Réponse invalide'}`, timestamp: new Date().toISOString() }]);
        return;
      }

      const hasDelegations = data.delegations && data.delegations.length > 0;

      // ── Étape 1 : réponse initiale du manager ──────────────────────────
      setMessages(prev => [...prev, {
        id:        `assistant-${Date.now()}`,
        role:      'assistant' as MessageRole,
        content:   data.message,
        timestamp: new Date().toISOString(),
      }]);

      if (!hasDelegations) return;

      // ── Étape 2 : injecter chaque agent comme message "delegation" ──────
      const delegIds: Record<string, string> = {};
      const now = Date.now();
      (data.delegations as Delegation[]).forEach((d, i) => {
        const id = `deleg-${now}-${i}`;
        delegIds[d.agentName] = id;
        setMessages(prev => [...prev, {
          id,
          role:       'delegation' as MessageRole,
          content:    '',
          timestamp:  new Date().toISOString(),
          delegation: { ...d, status: 'pending' as DelegationStatus },
        }]);
      });

      // helper pour mettre à jour une carte de délégation
      const patchDeleg = (agentName: string, patch: Partial<Delegation>) => {
        const id = delegIds[agentName];
        setMessages(prev => prev.map(m =>
          m.id !== id ? m : { ...m, delegation: { ...m.delegation!, ...patch } },
        ));
      };

      // ── Étape 3 : brief des agents par paquets de 2 (évite timeout Netlify) ─
      const briefOne = async (d: Delegation, attempt = 1): Promise<{ agentName: string; agentRole: string; message: string } | null> => {
        try {
          const r = await fetch('/api/brief', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ fromAgentName: agent?.name, agentName: d.agentName, agentRole: d.agentRole, task: d.task }),
          });
          if (!r.ok && attempt < 2) {
            await new Promise(res => setTimeout(res, 2000));
            return briefOne(d, attempt + 1);
          }
          const result = await r.json();
          if (result.error) throw new Error(result.error);
          patchDeleg(d.agentName, { status: 'done', delegateMessage: result.message, agentId: result.agentId, agentAvatar: result.agentAvatar });
          return { agentName: result.agentName ?? d.agentName, agentRole: result.agentRole ?? d.agentRole, message: result.message };
        } catch {
          patchDeleg(d.agentName, { status: 'error' });
          return null;
        }
      };

      // Lancer par paquets de 2
      const delegList = data.delegations as Delegation[];
      const results: (ReturnType<typeof briefOne> extends Promise<infer T> ? T : never)[] = [];
      for (let i = 0; i < delegList.length; i += 2) {
        const batch = delegList.slice(i, i + 2);
        const batchResults = await Promise.all(batch.map(d => briefOne(d)));
        results.push(...batchResults);
      }

      // ── Étape 4 : synthèse du manager ──────────────────────────────────
      const validResults = results.filter(Boolean) as { agentName: string; agentRole: string; message: string }[];
      if (validResults.length === 0) return;

      const synthRes  = await fetch('/api/synthesize', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agentId, results: validResults }),
      });
      const synthData = await synthRes.json();

      setMessages(prev => [...prev, {
        id:        `synth-${Date.now()}`,
        role:      'assistant' as MessageRole,
        content:   synthData.message ?? '(Synthèse indisponible)',
        timestamp: new Date().toISOString(),
      }]);
      // Session terminée proprement → supprimer du localStorage
      try { localStorage.removeItem(SESSION_KEY(agentId)); } catch {}
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
    <div className="h-full flex flex-col relative">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 md:px-5 py-3 border-b border-[#1e2d4a] flex items-center gap-3 bg-[#080b12]/80 backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        {/* Avatar agent */}
        <div className="relative shrink-0">
          {sending && (
            <>
              <span className="absolute inset-0 rounded-xl animate-ping bg-violet-500/40" />
              <span className="absolute inset-0 rounded-xl animate-pulse bg-violet-500/15" />
            </>
          )}
          <div className={`w-10 h-10 rounded-xl bg-[#0a0d14] overflow-hidden transition-all duration-300 ${
            sending ? 'border-2 border-violet-500/60 shadow-lg shadow-violet-500/20' : 'border border-[#1e2d4a]'
          }`}>
            <Image src={avatarUrl(agent.name)} alt={agent.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
          </div>
          {sending ? (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-violet-500 border-2 border-[#0d1117] animate-pulse" />
          ) : (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0d1117]" />
          )}
        </div>

        {/* Nom + statut */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm truncate">{agent.name}</div>
          {sending ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-violet-400 font-medium animate-pulse">orchestre l'équipe</span>
              <span className="flex gap-0.5">
                {[0,150,300].map(d => (
                  <span key={d} className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            </div>
          ) : (
            <div className={`text-xs truncate ${deptColors[agent.department] ?? 'text-slate-400'}`}>
              {agent.role}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-600 shrink-0">
          {sending
            ? <span className="text-violet-400/70 font-medium">En cours...</span>
            : messages.length > 0 ? `${Math.ceil(messages.filter(m => m.role === 'user').length)} msg` : ''
          }
        </div>
      </div>

      {/* ── MESSAGES — min-h-0 crucial pour que flex-1 puisse scroller ──────── */}
      <div
        ref={messagesAreaRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto min-h-0 px-3 md:px-5 py-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden mb-3 border border-white/8 shadow-xl mx-auto">
              <Image src={avatarUrl(agent.name, 160)} alt={agent.name} width={80} height={80} className="w-full h-full object-cover" unoptimized />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Bonjour, je suis {agent.name}</h3>
            <p className="text-sm text-slate-400 max-w-xs">{agent.role} chez SURGIFLOW.</p>
            <p className="text-xs text-slate-600 mt-1">Joindre fichier ou image via 📎</p>
          </div>
        )}

        {messages.map(msg => {
          if (msg.role === 'delegation' && msg.delegation) {
            return (
              <DelegationRow
                key={msg.id}
                delegation={msg.delegation}
                fromAgent={agent!}
                targetAgent={agents.find(a => a.name.toLowerCase() === msg.delegation!.agentName.toLowerCase()) ?? null}
              />
            );
          }

          return (
            <div key={msg.id} className={`flex gap-2 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              {msg.role === 'user' ? (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-5">
                  D
                </div>
              ) : (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#1a2235] border border-[#1e2d4a] overflow-hidden shrink-0 mt-5">
                  <Image src={avatarUrl(agent.name)} alt={agent.name} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                </div>
              )}

              <div className={`${msg.role === 'assistant' ? 'w-[82%] md:w-[72%]' : 'max-w-[82%] md:max-w-[72%]'} flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} min-w-0`}>
                <p className={`text-[10px] md:text-[11px] font-semibold px-1 ${
                  msg.role === 'user' ? 'text-slate-500 text-right' : `${deptColors[agent.department] ?? 'text-slate-400'}`
                }`}>
                  {msg.role === 'user' ? 'Davy — CEO' : `${agent.name} — ${agent.role}`}
                </p>

                <div className={`rounded-2xl px-3 md:px-4 py-2.5 md:py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-[#1a2235] border border-[#1e2d4a] text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose-dark text-sm min-w-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <p className={`text-[10px] ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-600'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {msg.role === 'assistant' && msg.content.includes('```') && (
                      <button
                        onClick={() => {
                          const filename = `${agent.name.toLowerCase()}-livrable-${new Date(msg.timestamp).toISOString().slice(0,10)}.md`;
                          const blob = new Blob([`# Livrable — ${agent.name} (${agent.role})\n_${new Date(msg.timestamp).toLocaleString('fr-FR')}_\n\n---\n\n` + msg.content], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = filename; a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-300 transition-colors shrink-0"
                        title="Télécharger en .md"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        .md
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Indicateur de frappe */}
        {sending && (
          <div className="flex gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-[#1a2235] border border-[#1e2d4a] overflow-hidden shrink-0 mt-5">
              <Image src={avatarUrl(agent.name)} alt={agent.name} width={28} height={28} className="w-full h-full object-cover" unoptimized />
            </div>
            <div className="flex flex-col gap-1">
              <p className={`text-[10px] font-semibold px-1 ${deptColors[agent.department] ?? 'text-slate-400'}`}>
                {agent.name}
              </p>
              <div className="bg-[#1a2235] border border-[#1e2d4a] rounded-2xl rounded-tl-sm px-3 py-2.5">
                <div className="flex gap-2 items-center">
                  <div className="flex gap-1">
                    {[0,150,300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-600 italic">orchestre son équipe...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── BOUTON SCROLL TO BOTTOM ─────────────────────────────────────────── */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-4 z-20 w-9 h-9 rounded-full bg-[#1a2235] border border-[#2d4066] text-slate-300 hover:text-white hover:border-blue-500/50 hover:bg-[#1e2d4a] shadow-lg transition-all duration-200 flex items-center justify-center animate-fade-in"
          title="Aller en bas"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* ── INPUT — shrink-0 : ne bouge jamais, reste toujours en bas ──────── */}
      <div className="shrink-0 border-t border-[#1e2d4a] bg-[#080b12] px-3 md:px-5 pt-2 pb-3 md:py-4">
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 bg-[#1a2235] border border-[#1e2d4a] rounded-lg px-3 py-1.5">
            {attachedFile.type === 'image' && attachedFile.preview
              ? <img src={attachedFile.preview} alt={attachedFile.name} className="w-7 h-7 rounded object-cover" />
              : <span className="text-base">📄</span>
            }
            <span className="text-xs text-slate-300 flex-1 truncate">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="text-slate-500 hover:text-red-400 transition-colors text-xs ml-1">✕</button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.txt,.md,.csv,.json,.ts,.tsx,.js,.jsx,.py,.sql,.html,.css,.xml,.yaml,.yml,.sh"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            title="Joindre un fichier ou une image"
            className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[#1a2235] border border-[#1e2d4a] text-slate-400 flex items-center justify-center hover:border-blue-500/40 hover:text-blue-400 transition-colors disabled:opacity-50 shrink-0"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Écrire à ${agent.name}...`}
            className="flex-1 bg-[#1a2235] border border-[#1e2d4a] rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
            rows={1}
            style={{ minHeight: '42px', maxHeight: '120px' }}
            disabled={sending}
          />

          <button
            onClick={send}
            disabled={(!input.trim() && !attachedFile) || sending}
            className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
