import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { createInitialState } from './gameLogic';

declare global { interface Window { Telegram: any; } }

export default function App() {
  const [game, setGame] = useState<any>(null);
  const [roomCode] = useState("ROOM_123");

  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user || { id: 1, first_name: "Локальный игрок" };

  // Функция загрузки игры
  const loadGame = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('room_code', roomCode)
      .single();
    if (data) setGame(data.state);
  };

  // Функция обновления базы данных
  const updateDB = async (newState: any) => {
    await supabase
      .from('games')
      .update({ state: newState })
      .eq('room_code', roomCode);
  };

  // Логика входа или создания комнаты
  const joinOrCreate = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (!data) {
      const newState = createInitialState(user);
      await supabase.from('games').insert([{ room_code: roomCode, state: newState }]);
      setGame(newState);
    } else {
      const currentState = data.state;
      if (!currentState.players.find((p: any) => p.id === String(user.id))) {
        const newState = {
          ...currentState,
          players: [...currentState.players, {
            id: String(user.id),
            name: user.first_name,
            gold: 2,
            hand: [],
            districts: [],
            isHost: false
          }]
        };
        await updateDB(newState);
        setGame(newState);
      } else {
        setGame(currentState);
      }
    }
  };

  const handleTakeGold = async () => {
    if (!game) return;
    const newState = JSON.parse(JSON.stringify(game)); // Глубокое копирование
    const player = newState.players.find((p: any) => p.id === String(user.id));
    if (player) {
      player.gold += 2;
      newState.log.push(`${player.name} взял 2 золотых`);
      await updateDB(newState);
    }
  };

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
    joinOrCreate();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `room_code=eq.${roomCode}` },
        (payload: any) => {
          if (payload.new && payload.new.state) {
            setGame(payload.new.state);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  if (!game) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">CITADELS</h1>
        <p className="animate-pulse">Загрузка комнаты...</p>
      </div>
    </div>
  );

  const me = game.players.find((p: any) => p.id === String(user.id));

  return (
    <div className="h-screen bg-slate-900 text-white p-4 flex flex-col font-sans overflow-hidden">
      <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-4">
        <span className="font-bold text-yellow-500 italic text-xl">CITADELS</span>
        <span className="bg-slate-800 px-3 py-1 rounded-full text-sm">👥 {game.players.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {game.players.map((p: any) => (
          <div key={p.id} className={`p-3 rounded-xl transition-all ${p.id === me?.id ? 'bg-slate-800 border border-yellow-600 shadow-lg shadow-yellow-900/20' : 'bg-slate-800/40 border border-slate-700'}`}>
            <div className="flex justify-between items-center">
              <span className={`font-medium ${p.id === me?.id ? 'text-yellow-400' : 'text-slate-200'}`}>
                {p.name} {p.id === me?.id && " (Вы)"}
              </span>
              <span className="bg-yellow-900/30 text-yellow-500 px-2 py-0.5 rounded text-sm font-bold">
                💰 {p.gold}
              </span>
            </div>
            <div className="flex gap-1 mt-2 h-6">
              {p.districts.length === 0 && <span className="text-[10px] text-slate-500 italic">Нет кварталов</span>}
              {p.districts.map((d: any, idx: number) => (
                <div key={idx} className="w-4 bg-blue-500 rounded-sm shadow-sm" title={d.name} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-slate-800 p-4 rounded-2xl shadow-2xl border-t border-slate-700">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={handleTakeGold} className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 active:scale-95 transition-all py-3 rounded-xl font-bold text-black shadow-lg">
            ВЗЯТЬ 💰
          </button>
          <button className="bg-gradient-to-r from-blue-600 to-blue-700 opacity-50 py-3 rounded-xl font-bold cursor-not-allowed">
            КАРТЫ 🎴
          </button>
        </div>
        <div className="bg-black/20 p-2 rounded-lg">
          <div className="text-[10px] uppercase text-slate-500 mb-1 font-bold">Журнал событий</div>
          <div className="text-xs text-slate-300 h-10 overflow-hidden italic leading-tight">
            {game.log.slice(-2).reverse().map((l: string, i: number) => (
              <div key={i} className="truncate">• {l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}