// src/components/ai/AiAssistantDrawer.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Send, Sparkles, X, RotateCcw, ArrowRight } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { processAiQuery } from '@/lib/aiAssistant'

const DEFAULT_WELCOME_TEXT = `Halo! Saya **Asisten AI Bendahara**. Saya dapat membantu Anda menganalisis data keuangan secara akurat:

- **Cari Pengeluaran Spesifik**: *"Check belanja BBM total berapa sampai dengan sekarang?"*
- **Pagu DPA & Sisa Anggaran**: *"Berapa sisa pagu Sub Kegiatan?"*
- **Status RAK Bulanan**: *"Cek status RAK akumulatif bulan ini"*
- **Saldo BKU**: *"Berapa saldo kas BKU saat ini?"*
- **Simulasi Belanja**: *"Apakah sisa pagu cukup untuk belanja 20 juta?"*
- **Laporan Eksekutif**: *"Buatkan ringkasan eksekutif penyerapan anggaran"*

*(Tips: Masukkan DeepSeek API Key pada Pengaturan untuk obrolan AI yang lebih luwes & cerdas)*`

const QUICK_CHIPS = [
  '📊 Pagu DPA & Sisa Anggaran',
  '💰 Saldo Kas BKU & Dashboard',
  '⛽ Rekap Belanja BBM',
  '📝 Belanja ATK Total Berapa?',
  '📅 Status RAK Akumulatif',
  '📄 Ringkasan Eksekutif Pimpinan'
]

export default function AiAssistantDrawer({ isOpen, onClose }) {
  const storeState = useStore()
  const navigate = useNavigate()
  
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: DEFAULT_WELCOME_TEXT,
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages, isOpen])

  if (!isOpen) return null

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

  /**
   * Parser Format Markdown Rich Text dengan Dukungan Tabel HTML / Tailwind
   */
  const renderFormattedText = (text) => {
    if (!text || typeof text !== 'string') {
      return <p className="text-xs text-slate-700 leading-relaxed">{String(text || '')}</p>
    }

    const lines = text.split('\n')
    const elements = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      // Deteksi Awal Baris Tabel Markdown (Mengandung karakter '|')
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines = []
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim())
          i++
        }

        if (tableLines.length >= 2) {
          const headerRow = tableLines[0]
            .split('|')
            .slice(1, -1)
            .map(cell => cell.trim())

          // Baris data (Abaikan baris pembatas |---|)
          const bodyRows = tableLines.slice(1).filter(r => !r.match(/^\|[\s\-:\t]+\|/))

          elements.push(
            <div key={`table-${i}`} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    {headerRow.map((col, cIdx) => (
                      <th key={cIdx} className="px-2.5 py-2 border-b border-indigo-700 whitespace-nowrap">
                        {parseBold(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {bodyRows.map((rStr, rIdx) => {
                    const cells = rStr.split('|').slice(1, -1).map(c => c.trim())
                    return (
                      <tr key={rIdx} className="even:bg-slate-50/60 hover:bg-indigo-50/50 transition-colors">
                        {cells.map((cell, cIdx) => (
                          <td key={cIdx} className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap">
                            {parseBold(cell)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
          continue
        }
      }

      // Baris Non-Tabel Biasa
      if (line.startsWith('### ')) {
        elements.push(<h3 key={i} className="text-sm font-black text-indigo-700 mt-2.5 mb-1 border-b border-indigo-100 pb-1">{line.replace('### ', '')}</h3>)
      } else if (line.startsWith('#### ')) {
        elements.push(<h4 key={i} className="text-xs font-bold text-slate-800 mt-2 mb-1">{line.replace('#### ', '')}</h4>)
      } else if (line.startsWith('- ')) {
        elements.push(<li key={i} className="text-xs text-slate-700 ml-3 list-disc my-0.5">{parseBold(line.replace('- ', ''))}</li>)
      } else if (line.match(/^\d+\./)) {
        elements.push(<p key={i} className="text-xs font-bold text-slate-800 mt-1.5 mb-0.5">{parseBold(line)}</p>)
      } else if (line.startsWith('   - ')) {
        elements.push(<p key={i} className="text-[11px] text-slate-600 ml-4 font-mono leading-relaxed">{parseBold(line.replace('   - ', ''))}</p>)
      } else if (!line.trim()) {
        elements.push(<div key={i} className="h-1.5" />)
      } else {
        elements.push(<p key={i} className="text-xs text-slate-700 leading-relaxed my-0.5">{parseBold(line)}</p>)
      }

      i++
    }

    return elements
  }

  function parseBold(str) {
    if (!str) return ''
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
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot size={18} />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-xs font-medium text-xs'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
              }`}>
                {msg.sender === 'user' ? (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div className="space-y-1">
                    {renderFormattedText(msg.text)}

                    {msg.action && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">Aksi Direkomendasikan:</span>
                        <button
                          onClick={() => {
                            if (msg.action.path) navigate(msg.action.path)
                            onClose()
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition-colors border border-indigo-200 shadow-2xs"
                        >
                          <span>{msg.action.label || 'Buka Halaman'}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <span className={`text-[9px] block mt-1.5 text-right font-medium ${
                  msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 text-xs font-bold">
                  U
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={18} />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
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
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pertanyaan keuangan Anda..."
              className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition-colors shadow-sm shrink-0 flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
          <div className="mt-1.5 text-center">
            <span className="text-[9px] text-slate-400 font-medium">Verifikasi 100% data keuangan Zustand Store</span>
          </div>
        </div>

      </div>
    </div>
  )
}
