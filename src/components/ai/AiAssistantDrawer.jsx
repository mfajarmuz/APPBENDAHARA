// src/components/ai/AiAssistantDrawer.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Send, Sparkles, X, RotateCcw, ArrowRight, Maximize2, Minimize2, GripVertical, Check } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { processAiQuery } from '@/lib/aiAssistant'

const DEFAULT_WELCOME_TEXT = `Halo! Saya **Asisten AI Bendahara**. Saya dapat membantu Anda menganalisis data keuangan secara akurat:

- **Audit Kesalahan Kode Rekening**: *"Audit apakah ada transaksi yang salah kode rekening?"*
- **Detail Transaksi Per Item**: *"Tampilkan rincian transaksi detail per item barang"*
- **Cari Pengeluaran Spesifik**: *"Check belanja BBM total berapa sampai dengan sekarang?"*
- **Pagu DPA & Sisa Anggaran**: *"Berapa sisa pagu Sub Kegiatan?"*
- **Status RAK Bulanan**: *"Cek status RAK akumulatif bulan ini"*
- **Saldo BKU & Dashboard**: *"Berapa saldo kas BKU saat ini?"*

*(Tips: Masukkan DeepSeek API Key pada Pengaturan untuk obrolan AI yang lebih luwes & cerdas)*`

const QUICK_CHIPS = [
  '🛡️ Audit Kesalahan Kode Rekening',
  '📋 Detail Transaksi Per Item',
  '📊 Pagu DPA & Sisa Anggaran',
  '💰 Saldo Kas BKU & Dashboard',
  '⛽ Rekap Belanja BBM',
  '📅 Status RAK Akumulatif'
]

export default function AiAssistantDrawer({ isOpen, open, onClose }) {
  const visible = isOpen ?? open
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
  const inputRef = useRef(null)

  // State untuk Resize / Perbesar & Perkecil Panel Chat
  const [drawerWidth, setDrawerWidth] = useState(540)
  const [sizeMode, setSizeMode] = useState('normal') // 'normal' (540px), 'wide' (900px), 'full' (100vw), 'custom'
  const [isDragging, setIsDragging] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (visible) {
      scrollToBottom()
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [messages, visible])

  // Drag handler untuk resizer di tepi kiri drawer
  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      const newW = window.innerWidth - e.clientX
      if (newW >= 340 && newW <= window.innerWidth - 20) {
        setDrawerWidth(newW)
        setSizeMode('custom')
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!visible) return null

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

  const toggleExpand = () => {
    if (sizeMode === 'normal') setSizeMode('wide')
    else if (sizeMode === 'wide') setSizeMode('full')
    else setSizeMode('normal')
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

  // Perhitungan lebar drawer dinamis
  let drawerStyle = {}
  if (sizeMode === 'full') {
    drawerStyle = { width: '100vw' }
  } else if (sizeMode === 'wide') {
    drawerStyle = { width: 'min(920px, 95vw)' }
  } else if (sizeMode === 'normal') {
    drawerStyle = { width: 'min(540px, 95vw)' }
  } else {
    drawerStyle = { width: `${drawerWidth}px` }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Dialog */}
      <div 
        style={drawerStyle}
        className="relative bg-white h-full shadow-2xl flex flex-col z-50 border-l border-slate-200 transition-all duration-200 animate-in slide-in-from-right select-text"
      >
        
        {/* Drag Resizer Edge (Geser Tepi Kiri untuk Mengatur Ukuran Lebar Panel) */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 bottom-0 -left-2 w-4 cursor-ew-resize flex items-center justify-center group z-50 hover:bg-indigo-500/20 transition-colors"
          title="Geser ke Kiri/Kanan untuk Mengatur Lebar Panel Chat"
        >
          <div className="w-1.5 h-14 bg-slate-300 group-hover:bg-indigo-600 rounded-full shadow-md transition-colors flex flex-col items-center justify-center gap-1">
            <span className="w-0.5 h-0.5 bg-white rounded-full" />
            <span className="w-0.5 h-0.5 bg-white rounded-full" />
            <span className="w-0.5 h-0.5 bg-white rounded-full" />
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white p-3.5 sm:p-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner relative shrink-0">
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
            {/* Mode Ukuran Preset Selector */}
            <div className="hidden sm:flex items-center bg-white/10 rounded-lg p-0.5 border border-white/10 mr-1 text-[10px]">
              <button
                onClick={() => setSizeMode('normal')}
                className={`px-2 py-0.5 rounded-md font-bold transition-all ${sizeMode === 'normal' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-indigo-200 hover:text-white'}`}
                title="Ukuran Normal (540px)"
              >
                Normal
              </button>
              <button
                onClick={() => setSizeMode('wide')}
                className={`px-2 py-0.5 rounded-md font-bold transition-all ${sizeMode === 'wide' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-indigo-200 hover:text-white'}`}
                title="Ukuran Lebar (900px)"
              >
                Lebar
              </button>
              <button
                onClick={() => setSizeMode('full')}
                className={`px-2 py-0.5 rounded-md font-bold transition-all ${sizeMode === 'full' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-indigo-200 hover:text-white'}`}
                title="Ukuran Layar Penuh (100%)"
              >
                Penuh
              </button>
            </div>

            {/* Tombol Maximize / Minimize Quick Toggle */}
            <button 
              onClick={toggleExpand}
              className="p-2 rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
              title={sizeMode === 'full' ? 'Perkecil Ukuran Panel' : 'Perbesar Ukuran Panel'}
            >
              {sizeMode === 'full' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
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
        <div className="bg-slate-50 border-b border-slate-100 p-2.5 overflow-x-auto whitespace-nowrap shrink-0 scrollbar-none">
          <div className="max-w-4xl mx-auto flex gap-2">
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
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          <div className="max-w-4xl mx-auto space-y-4">
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

                <div className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-3.5 shadow-xs ${
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
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0 relative z-20">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white focus-within:border-indigo-500 transition-all shadow-xs"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (inputText.trim() && !isTyping) {
                      handleSend()
                    }
                  }
                }}
                placeholder={isTyping ? "AI sedang menganalisis & mengetik jawaban..." : "Ketik pertanyaan keuangan Anda (Tekan Enter untuk mengirim)..."}
                className="flex-1 text-xs px-2 py-1.5 bg-transparent border-0 outline-none resize-none min-h-[36px] max-h-[120px] text-slate-800 placeholder:text-slate-400 font-medium"
                readOnly={isTyping}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg transition-all shadow-sm shrink-0 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed mb-0.5"
                title="Kirim Pesan"
              >
                <Send size={16} />
              </button>
            </form>
            <div className="mt-1.5 text-center flex items-center justify-between px-1">
              <span className="text-[9px] text-slate-400 font-medium">Verifikasi 100% data keuangan Zustand Store</span>
              <span className="text-[9px] text-slate-400 font-medium hidden sm:inline">Enter kirim • Shift+Enter baris baru</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
