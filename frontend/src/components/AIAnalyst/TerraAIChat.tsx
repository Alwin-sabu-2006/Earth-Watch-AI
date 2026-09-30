import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Globe,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  Volume2,
} from 'lucide-react';
import { api } from '../../services/api';
import { SpotInspectionData } from '../../types';

interface TerraMessage {
  id: string;
  role: 'user' | 'terra';
  text: string;
  sources?: string[];
  suggestions?: string[];
  timestamp: string;
}

interface TerraAIChatProps {
  spotData: SpotInspectionData;
  onClose: () => void;
}

const TERRA_INTRO_SUGGESTIONS = [
  'Give me a full summary of this place',
  'What are the disaster risks here?',
  "What's the weather like?",
  'What satellites are monitoring this area?',
];

function formatTerraText(text: string): React.ReactNode {
  // Bold **text** support
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    // Preserve line breaks
    return part.split('\n').map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  });
}

export const TerraAIChat: React.FC<TerraAIChatProps> = ({ spotData, onClose }) => {
  const [messages, setMessages] = useState<TerraMessage[]>([
    {
      id: 'terra-intro',
      role: 'terra',
      text: `🌍 Hello! I'm **TERRA** — your Terrestrial Earth Reasoning & Response Agent.\n\nI've scanned **${spotData.name || 'this location'}** at ${spotData.coordinate_label}. I have full access to the weather data, nearby hazard events, satellite overpasses, and geospatial intelligence for this spot.\n\nWhat would you like to know?`,
      suggestions: TERRA_INTRO_SUGGESTIONS,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || isLoading) return;

    const userMsg: TerraMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      const res = await api.askTerraChat(q, spotData, history);
      const terraMsg: TerraMessage = {
        id: `terra-${Date.now()}`,
        role: 'terra',
        text: res.reply,
        sources: res.sources,
        suggestions: res.suggestions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, terraMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `terra-err-${Date.now()}`,
          role: 'terra',
          text: 'I encountered an error processing your request. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div
      className="terra-chat-container"
      style={{
        position: 'absolute',
        bottom: '90px',
        right: '24px',
        width: '400px',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(6, 182, 212, 0.35)',
        boxShadow: '0 0 40px rgba(6, 182, 212, 0.15), 0 25px 50px rgba(0,0,0,0.6)',
        background: 'rgba(2, 8, 23, 0.97)',
        backdropFilter: 'blur(24px)',
        animation: 'terraSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes terraSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes terraPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(6, 182, 212, 0); }
        }
        @keyframes teraBlink {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
        .terra-dot { animation: teraBlink 1.4s infinite; }
        .terra-dot:nth-child(2) { animation-delay: 0.2s; }
        .terra-dot:nth-child(3) { animation-delay: 0.4s; }
        .terra-msg-in { animation: terraSlideIn 0.25s ease; }
        .terra-scroll::-webkit-scrollbar { width: 4px; }
        .terra-scroll::-webkit-scrollbar-track { background: transparent; }
        .terra-scroll::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.25); border-radius: 4px; }
        .terra-pill { transition: all 0.2s; }
        .terra-pill:hover { background: rgba(6,182,212,0.18); border-color: rgba(6,182,212,0.5); color: #67e8f9; transform: translateY(-1px); }
        .terra-send { transition: all 0.2s; }
        .terra-send:hover:not(:disabled) { box-shadow: 0 0 20px rgba(6,182,212,0.5); transform: scale(1.05); }
        .terra-avatar-ring { animation: terraPulse 2.5s infinite; }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(6,182,212,0.15)',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(15,23,42,0.95) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              className="terra-avatar-ring"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '2px solid rgba(6,182,212,0.7)',
                overflow: 'hidden',
                background: '#0c1a2e',
              }}
            >
              <img
                src="/terra_avatar.jpg"
                alt="TERRA AI"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  // Fallback to icon if image fails
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            {/* Online indicator */}
            <div
              style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #020817',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#fff', letterSpacing: '0.5px' }}>
                TERRA
              </span>
              <span style={{
                padding: '1px 8px',
                borderRadius: '99px',
                background: 'rgba(6,182,212,0.15)',
                border: '1px solid rgba(6,182,212,0.3)',
                fontSize: '9px',
                fontFamily: 'monospace',
                color: '#67e8f9',
                letterSpacing: '1px',
              }}>
                EARTH AI
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '1px' }}>
              {spotData.name || 'Spot'} · {spotData.coordinate_label}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Body (collapsible) ── */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div
            className="terra-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '380px',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="terra-msg-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: '6px',
                }}
              >
                {/* Sender label */}
                <div style={{ fontSize: '9px', fontFamily: 'monospace', color: msg.role === 'user' ? '#38bdf8' : '#22d3ee', letterSpacing: '1px', paddingLeft: msg.role === 'terra' ? '4px' : 0, paddingRight: msg.role === 'user' ? '4px' : 0 }}>
                  {msg.role === 'user' ? 'YOU' : 'TERRA'} · {msg.timestamp}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: '88%',
                    padding: '11px 14px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                      : 'rgba(255,255,255,0.04)',
                    border: msg.role === 'terra' ? '1px solid rgba(6,182,212,0.15)' : 'none',
                    fontSize: '12.5px',
                    lineHeight: '1.65',
                    color: msg.role === 'user' ? '#fff' : '#cbd5e1',
                  }}
                >
                  {formatTerraText(msg.text)}

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '9px', color: '#475569', fontFamily: 'monospace', marginBottom: '4px', letterSpacing: '0.5px' }}>
                        VERIFIED SOURCES
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {msg.sources.map((s, i) => (
                          <span key={i} style={{
                            padding: '2px 7px',
                            borderRadius: '99px',
                            background: 'rgba(6,182,212,0.08)',
                            border: '1px solid rgba(6,182,212,0.2)',
                            fontSize: '9px',
                            color: '#67e8f9',
                            fontFamily: 'monospace',
                          }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggestion pills */}
                {msg.role === 'terra' && msg.suggestions && msg.suggestions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxWidth: '88%' }}>
                    {msg.suggestions.map((sug, i) => (
                      <button
                        key={i}
                        className="terra-pill"
                        onClick={() => handleSend(sug)}
                        disabled={isLoading}
                        style={{
                          padding: '4px 11px',
                          borderRadius: '99px',
                          background: 'rgba(6,182,212,0.07)',
                          border: '1px solid rgba(6,182,212,0.25)',
                          fontSize: '10px',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  border: '1.5px solid rgba(6,182,212,0.4)',
                  overflow: 'hidden', flexShrink: 0,
                }}>
                  <img src="/terra_avatar.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{
                  padding: '10px 16px',
                  borderRadius: '4px 18px 18px 18px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(6,182,212,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  <span className="terra-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', display: 'inline-block' }} />
                  <span className="terra-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', display: 'inline-block' }} />
                  <span className="terra-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', display: 'inline-block' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(6,182,212,0.12)',
            background: 'rgba(6,182,212,0.03)',
          }}>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 14px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(6,182,212,0.2)',
              }}>
                <Globe size={13} color="#475569" style={{ flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask TERRA anything about this spot..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    minWidth: 0,
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="terra-send"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0891b2, #0369a1)',
                  border: 'none',
                  cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isLoading || !input.trim() ? 0.4 : 1,
                  flexShrink: 0,
                }}
              >
                {isLoading ? <Loader2 size={15} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} color="#fff" />}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '9px', color: '#334155', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
              TERRA · Terrestrial Environmental Reasoning & Response Agent
            </div>
          </div>
        </>
      )}
    </div>
  );
};
