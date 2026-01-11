'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [room, setRoom] = useState<any>(null)

  // Подписка на изменения в реальном времени
  useEffect(() => {
    const channel = supabase.channel('room_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' },
        (payload) => setRoom(payload.new))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-8">🏰 Цитадели Online</h1>

      {!room ? (
        <button
          onClick={async () => {
            // Логика создания комнаты
            const { data } = await supabase.from('rooms').insert([{ room_code: '1234' }]).select()
            if (data) setRoom(data[0])
          }}
          className="bg-amber-600 hover:bg-amber-500 px-8 py-4 rounded-xl font-bold"
        >
          Создать игру
        </button>
      ) : (
        <div className="text-center">
          <p className="text-xl">Код комнаты: <span className="font-mono text-amber-400">{room.room_code}</span></p>
          <p className="mt-4">Статус: {room.status}</p>
          {/* Сюда добавим список игроков и саму игру */}
        </div>
      )}
    </div>
  )
}