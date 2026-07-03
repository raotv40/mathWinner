'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, Bot, User, Globe, ChevronDown, Sparkles } from 'lucide-react';
import { askAITutor } from '../../lib/api';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface AITutorProps {
  chapterId: string;
  initialQuery?: string;
  initialConcept?: string;
}

export default function AITutor({ chapterId, initialQuery = '', initialConcept = '' }: AITutorProps) {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Hi! I am your AI MathMentor. Ask me to explain concepts, show step-by-step solutions, or translate chapters into your mother tongue.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState('simple'); // 'simple', 'visual', 'step-by-step'
  const [language, setLanguage] = useState('English');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync initial query if triggered from video player "Pause & Ask"
  useEffect(() => {
    if (initialQuery) {
      handleSend(`Explain this section: "${initialQuery}" from concept "${initialConcept}"`);
    }
  }, [initialQuery, initialConcept]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: textToSend }]);
    if (!customText) setInputText('');
    
    setIsTyping(true);
    try {
      const res = await askAITutor(chapterId, textToSend, mode, language);
      setMessages(prev => [...prev, { sender: 'ai', text: res.answer }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I failed to connect. Running in offline fallback mode. Can you verify your network or try again?' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const presetAsk = (presetType: string) => {
    let query = '';
    if (presetType === 'simple') {
      query = 'Can you explain this math topic in very simple words with a real-life example?';
    } else if (presetType === 'visual') {
      query = 'Explain this concept visually. What shape, path, or graph does it represent?';
    } else if (presetType === 'steps') {
      query = 'Give me a step-by-step mathematical breakdown showing exactly why each step is needed.';
    } else if (presetType === 'example') {
      query = 'Generate another practice question with its complete formula list and answers.';
    }
    handleSend(query);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800 flex flex-col h-[520px] shadow-2xl">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Doubt Resolver</h3>
            <p className="text-[10px] text-slate-400">Ask in your mother tongue with RAG NCERT context</p>
          </div>
        </div>

        {/* Configurations */}
        <div className="flex items-center gap-2">
          {/* Language selection dropdown */}
          <div className="relative group">
            <button className="text-xs bg-slate-850 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:text-white transition">
              <Globe className="w-3.5 h-3.5 text-teal-400" /> {language} <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block bg-slate-950 border border-slate-800 rounded-xl py-1.5 w-32 shadow-2xl z-55">
              {['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Bengali'].map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className="w-full text-left text-xs px-3 py-2 text-slate-400 hover:bg-teal-500/10 hover:text-teal-300 transition"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          
          {/* Explanation Style select */}
          <div className="relative group">
            <button className="text-xs bg-slate-850 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:text-white transition">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" /> Mode: {mode} <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block bg-slate-950 border border-slate-800 rounded-xl py-1.5 w-36 shadow-2xl z-55">
              {[
                { id: 'simple', label: 'Explain Simply' },
                { id: 'visual', label: 'Explain Visually' },
                { id: 'step-by-step', label: 'Step-by-Step' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className="w-full text-left text-xs px-3 py-2 text-slate-400 hover:bg-teal-500/10 hover:text-teal-300 transition"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preset Tags */}
      <div className="flex gap-1.5 py-3 overflow-x-auto select-none shrink-0 scrollbar-none">
        <button onClick={() => presetAsk('simple')} className="text-[10px] font-bold bg-slate-800 hover:bg-slate-750 text-teal-300 px-2.5 py-1 rounded-lg border border-slate-700 transition shrink-0">
          Explain simply
        </button>
        <button onClick={() => presetAsk('visual')} className="text-[10px] font-bold bg-slate-800 hover:bg-slate-750 text-teal-300 px-2.5 py-1 rounded-lg border border-slate-700 transition shrink-0">
          Explain visually
        </button>
        <button onClick={() => presetAsk('steps')} className="text-[10px] font-bold bg-slate-800 hover:bg-slate-750 text-teal-300 px-2.5 py-1 rounded-lg border border-slate-700 transition shrink-0">
          Step-by-step
        </button>
        <button onClick={() => presetAsk('example')} className="text-[10px] font-bold bg-slate-800 hover:bg-slate-750 text-teal-300 px-2.5 py-1 rounded-lg border border-slate-700 transition shrink-0">
          Give example
        </button>
      </div>

      {/* Messages Listing */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
            )}
            <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs md:text-sm leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-teal-500 text-slate-950 font-medium rounded-tr-none'
                : 'bg-slate-950/60 border border-slate-850/80 text-slate-100 rounded-tl-none whitespace-pre-line'
            }`}>
              {msg.text}
            </div>
            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-850 border border-slate-850 flex items-center justify-center text-slate-400 shrink-0">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-850/80 text-slate-400 rounded-tl-none text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce delay-200" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="flex gap-2 border-t border-slate-800 pt-4 mt-2 shrink-0"
      >
        <input
          type="text"
          placeholder={`Ask anything in ${language}...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
        />
        <button
          type="submit"
          className="w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-teal-500/25 transition shrink-0"
        >
          <Send className="w-4 h-4 fill-slate-950" />
        </button>
      </form>
    </div>
  );
}
