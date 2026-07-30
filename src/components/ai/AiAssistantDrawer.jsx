// src/components/ai/AiAssistantDrawer.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Send, X, RotateCcw, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { processAiQuery } from '@/lib/aiAssistant'
import Button from '@/components/ui/Button'

const QUICK_CHIPS = [
  '📊 Cek Sisa Pagu DPA',
  '📅 Status RAK Bulan Ini',
  '📝 Ringkasan BKU',
  '⚡ Simulasi Belanja 15 Juta',
  '📑 Buat Ringkasan Eksekutif'
]

const DEFAULT_WELCOME_TEXT = `Halo! Saya **Asisten AI Bendahara**. Saya dapat membantu Anda menganalisis data keuangan secara akurat:

- **Pagu DPA & Sisa Anggaran**: *"Berapa sisa pagu Sub Kegiatan?"*
- **Status RAK Bulanan**: *"Cek status RAK akumulatif bulan ini"*
- **Saldo BKU**: *"Berapa saldo kas BKU saat ini?"*
- **Simulasi Belanja**: *"Apakah sisa pagu cukup untuk belanja 20 juta?"*
- **Laporan Eksekutif**: *"Buatkan ringkasan eksekutif penyerapan anggaran"*

Pilih salah satu pertanyaan di atas atau ketik langsung di kolom obrolan!`

export default function AiAssistantDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const storeState = useStore()
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: DEFAULT_WELCOME_TEXT,
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (open) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [open, messages])

  if (!open) return null

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText
    if (!text.trim()) return

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    if (!textToSend) setInputText('')
    setIsTyping(true)

    try {
      const response = await processAiQuery(text, storeState, messages)
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.text || '',
        action: response.action,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Maaf, terjadi kesalahan: ${err.message}`,
        timestamp: new Date()
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleReset = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: DEFAULT_WELCOME_TEXT,
        timestamp: new Date()
      }
    ])
  }

  const renderFormattedText = (text) => {
    if (!text || typeof text !== 'string') {
      return <p className="text-xs text-slate-700 leading-relaxed">{String(text || '')}</p>
    }
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-black text-indigo-700 mt-2 mb-1 border-b border-indigo-100 pb-1">{line.replace('### ', '')}</h3>
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx} className="text-xs font-bold text-slate-800 mt-2 mb-1">{line.replace('#### ', '')}</h4>
      }
      if (line.startsWith('- ')) {
        return <li key={idx} className="text-xs text-slate-700 ml-3 list-disc my-0.5">{parseBold(line.replace('- ', ''))}</li>
      }
      if (line.match(/^\d+\./)) {
        return <p key={idx} className="text-xs font-bold text-slate-800 mt-1.5 mb-0.5">{parseBold(line)}</p>
      }
      if (line.startsWith('   - ')) {
        return <p key={idx} className="text-[11px] text-slate-600 ml-4 font-mono leading-relaxed">{parseBold(line.replace('   - ', ''))}</p>
      }
      if (!line.trim()) return <div key={idx} className="h-1.5" />
      return <p key={idx} className="text-xs text-slate-700 leading-relaxed my-0.5">{parseBold(line)}</p>
    })
  }

  function parseBold(str) {
    const parts = str.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  const hasApiKey = !!storeState?.settings?.deepseek_api_key?.trim()

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Dialog */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-50 border-l border-slate-200 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white p-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner relative">
              <Bot size={22} className={hasApiKey ? "text-emerald-400" : "text-amber-400"} />
              <span className={`w-2.5 h-2.5 rounded-full absolute -top-0.5 -right-0.5 border-2 border-indigo-900 ${
                hasApiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm tracking-wide">Asisten AI Bendahara</h2>
                {hasApiKey ? (
                  <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded uppercase">DeepSeek AI</span>
                ) : (
                  <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded uppercase">Mode Offline</span>
                )}
              </div>
              <p className="text-[10px] text-indigo-200 flex items-center gap-1 font-medium mt-0.5">
                <Sparkles size={10} className="text-amber-300" /> {hasApiKey ? 'LangChain Agent + DeepSeek LLM Active' : 'Pencarian Data Determinis Lokal'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleReset}
              className="p-2 rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
              title="Bersihkan Percakapan"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
              title="Tutup AI Drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Offline Notice Banner jika API Key Belum Diisi */}
        {!hasApiKey && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-3.5 py-2 flex items-center justify-between text-xs text-amber-800 shrink-0">
            <span className="text-[10px] font-bold">⚠️ Mode Offline (Belum terhubung DeepSeek API)</span>
            <button
              onClick={() => {
                navigate('/settings')
                onClose()
              }}
              className="text-[10px] font-black text-indigo-700 underline hover:text-indigo-900 bg-white px-2 py-0.5 rounded border border-amber-300 shadow-2xs"
            >
              ⚙️ Hubungkan DeepSeek API
            </button>
          </div>
        )}

        {/* Quick Chips Bar */}
        <div className="bg-slate-50 border-b border-slate-100 p-2.5 overflow-x-auto whitespace-nowrap shrink-0 scrollbar-none flex gap-2">
          {QUICK_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="text-[10px] font-bold bg-white text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-full transition-all shadow-2xs shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <Bot size={16} />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs border ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white border-indigo-600 rounded-tr-none'
                  : 'bg-white text-slate-800 border-slate-200/80 rounded-tl-none space-y-2'
              }`}>
                {msg.sender === 'user' ? (
                  <p className="text-xs font-semibold">{msg.text}</p>
                ) : (
                  <div>
                    {renderFormattedText(msg.text)}

                    {msg.action && (
                      <div className="pt-2 mt-2 border-t border-slate-100 flex justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          size="xs"
                          onClick={() => {
                            navigate(msg.action.path)
                            onClose()
                          }}
                          className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
                        >
                          <span>{msg.action.label}</span>
                          <ArrowRight size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <span className={`text-[8px] font-mono block mt-1 text-right ${
                  msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 items-center text-slate-400 text-xs font-bold bg-white p-3 rounded-2xl border border-slate-200 w-fit">
              <Bot size={16} className="text-indigo-600 animate-spin" />
              <span>Memproses kalkulasi data keuangan...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar Footer */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Tanyakan sisa pagu, RAK, BKU, atau simulasi belanja..."
              className="flex-1 text-xs font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
            />
            <Button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center shrink-0 shadow-md disabled:opacity-50"
            >
              <Send size={14} />
            </Button>
          </form>
          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold px-1 mt-2">
            <span className="flex items-center gap-1">
              <ShieldCheck size={10} className="text-emerald-500" /> Bebas Halusinasi — 100% Data Zustand Store
            </span>
            <span>Tekan Enter ↵</span>
          </div>
        </div>

      </div>
    </div>
  )
}
