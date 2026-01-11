export const runtime = 'edge'; // Критически важно для Cloudflare!

'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const createRoom = async () => {
    setLoading(true)
    // Генерируем случайный код из 4 цифр
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString()

    const { data, error } = await supabase
      .from('rooms')
      .insert([{ room_code: randomCode, status: 'lobby' }])
      .select()

    if (error) {
      console.error(error)
      alert('Ошибка при создании комнаты: ' + error.message)
    } else {
      setRoomCode(data[0].room_code)
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
      <h1 className="text-4xl font-bold mb-8 text-amber-500">🏰 Цитадели</h1>

      {!roomCode ? (
        <div className="space-y-4">
          <button
            onClick={createRoom}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-4 rounded-2xl font-bold transition-all transform active:scale-95 shadow-lg"
          >
            {loading ? 'Создание...' : 'Создать новую игру'}
          </button>
        </div>
      ) : (
        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
          <p className="text-slate-400 mb-2 uppercase tracking-widest text-sm">Код комнаты</p>
          <p className="text-6xl font-black text-amber-400 tracking-tighter">{roomCode}</p>
          <p className="mt-6 text-green-400 animate-pulse font-medium">Ожидание друзей (до 5 чел)...</p>
        </div>
      )}
    </main>
  )
}