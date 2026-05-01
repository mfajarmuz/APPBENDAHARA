import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { Lock, LogIn, Eye, EyeOff } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function Login() {
  const login = useStore(s => s.login)
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    
    // Artificial delay for feedback
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const success = login(username, password)
    if (success) {
      navigate('/dashboard', { replace: true })
    } else {
      setError('Username atau password salah')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-600 mb-4 shadow-sm border border-indigo-100">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">BendaharaApp</h1>
          <p className="text-slate-500 text-sm mt-1">Sistem Pengelolaan Keuangan Internal</p>
        </div>

        <Card className="p-8 shadow-xl border-slate-200/60 ring-1 ring-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-4 py-3 rounded-xl animate-shake flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <Input
                label="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username"
                required
                autoFocus
                disabled={isSubmitting}
              />
              
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-md"
                  tabIndex="-1"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-sm font-bold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memeriksa...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={18} /> Masuk ke Aplikasi
                </span>
              )}
            </Button>
          </form>
        </Card>

        <p className="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
          UPTD BAPENDA KAB. TASIKMALAYA
        </p>
      </div>
    </div>
  )
}
