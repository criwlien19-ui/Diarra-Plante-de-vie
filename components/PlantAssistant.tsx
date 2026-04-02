
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';
import { getPlantWisdom } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

// Casting motion to any to bypass environment-specific TypeScript prop errors
const M = motion as any;

const PlantAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: 'Salutations de l\'herboristerie Diarra. Comment puis-je vous guider vers le bien-être végétal aujourd\'hui ?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const response = await getPlantWisdom(messages, userMsg);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: 'Une perturbation empêche ma réponse. Veuillez réessayer.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto liquid-glass rounded-3xl overflow-hidden shadow-2xl relative">
      <div className="bg-white/5 p-6 flex items-center gap-3 border-b border-white/10">
        <div className="p-2 bg-lime-500/20 rounded-xl">
          <Sparkles className="text-lime-400" size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg">La Sagesse de Diarra</h3>
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Conseiller Botanique IA</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <M.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-zinc-700' : 'bg-lime-600'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-lime-900/40 border border-lime-500/20 rounded-tr-none' : 'bg-zinc-800/60 border border-white/5 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </M.div>
          ))}
          {isTyping && (
            <M.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-full bg-lime-600 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin" />
              </div>
              <div className="p-4 bg-zinc-800/60 border border-white/5 rounded-2xl rounded-tl-none italic text-zinc-500 text-sm">
                Diarra cherche dans ses archives...
              </div>
            </M.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-black/20 border-t border-white/10">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Interrogez les racines (ex: bienfaits du Ginseng)..."
            className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:border-lime-500/50 transition-colors text-sm"
          />
          <button
            onClick={handleSend}
            disabled={isTyping}
            className="absolute right-3 p-2 bg-lime-500 text-black rounded-xl hover:bg-lime-400 transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlantAssistant;
