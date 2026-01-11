import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { createInitialState } from './gameLogic';

declare global { interface Window { Telegram: any; } }

export default function App() {
  const [game, setGame] = useState<any>(null);
  const [roomCode] = useState("ROOM_123"); // В идеале генерировать рандомно
  const tg = window.Telegram.WebApp;
  const user = tg.initDataUnsafe?.user || { id: 1, first_name: "Локальный игрок" };

  useEffect(() => {
    tg.ready();
    tg.expand();
    loadGame();

    // ПОДПИСКА НА ОБНОВЛЕНИЯ В РЕАЛЬНОМ ВРЕМЕНИ
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `room_code=eq.${roomCode}` },
        (payload) => setGame(payload.new.state)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadGame() {
    const { data } = await supabase.from('games').select('*').eq('room_code', roomCode).single();
    if (data) setGame(data.state);
  }

  async function joinOrCreate() {
    if (!game) {
      const newState = createInitialState(user);
      await supabase.from('games').insert([{ room_code: roomCode, state: newState }]);
      setGame(newState);
    } else {
      if (!game.players.find((p: any) => p.id === String(user.id))) {
        const newState = {
          ...game, players: [...game.players, {
            id: String(user.id), name: user.first_name, gold: 2, hand: [], districts: [], isHost: false
          }]
        };
        await updateDB(newState);
      }
    }
  }

  async function updateDB(newState: any) {
    await supabase.from('games').update({ state: newState }).eq('room_code', roomCode);
  }

  const handleTakeGold = async () => {
    const newState = { ...game };
    const player = newState.players.find((p: any) => p.id === String(user.id));
    player.gold += 2;
    newState.log.push(`${player.name} взял 2 золотых`);
    await updateDB(newState);
  };

  if (!game) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-6">
      <button onClick={joinOrCreate} className="bg-yellow-500 text-black font-bold py-4 px-8 rounded-2xl w-full">
        ВОЙТИ В ИГРУ
      </button>
    </div>
  );

  const me = game.players.find((p: any) => p.id === String(user.id));

  return (
    <div className="h-screen bg-slate-900 text-white p-4 flex flex-col">
      <div className="flex justify-between border-b border-slate-700 pb-2 mb-4">
        <span className="font-bold text-yellow-500 italic">CITADELS</span>
        <span>👥 {game.players.length}/8</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {game.players.map((p: any) => (
          <div key={p.id} className={`p-3 rounded-xl ${p.id === me?.id ? 'bg-slate-800 border-2 border-yellow-600' : 'bg-slate-800/50'}`}>
            <div className="flex justify-between mb-2">
              <span className="font-medium">{p.name}</span>
              <span className="text-yellow-400">💰 {p.gold}</span>
            </div>
            <div className="flex gap-1 h-8">
              {p.districts.map((d: any) => <div key={d.id} className="w-6 bg-blue-500 rounded" />)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-slate-800 p-4 rounded-2xl">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={handleTakeGold} className="bg-blue-600 py-3 rounded-xl font-bold italic">ВЗЯТЬ 💰</button>
          <button className="bg-green-600 py-3 rounded-xl font-bold italic">КАРТЫ 🎴</button>
        </div>
        <div className="text-xs text-slate-400 h-12 overflow-hidden italic leading-tight">
          {game.log.slice(-3).reverse().map((l: string, i: number) => <div key={i}>• {l}</div>)}
        </div>
      </div>
    </div>
  );
}