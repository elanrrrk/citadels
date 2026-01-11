import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { createInitialState, ROLES } from './gameLogic';
import { Crown, Coins, LayoutDashboard, CheckCircle2, Circle, Play, Send } from 'lucide-react';

declare global { interface Window { Telegram: any; } }

export default function App() {
  const [game, setGame] = useState<any>(null);
  const [roomCode] = useState("GLOBAL_ROOM");
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user || { id: 1, first_name: "Gamer" };

  const updateDB = async (newState: any) => {
    await supabase.from('games').update({ state: newState }).eq('room_code', roomCode);
  };

  const joinOrCreate = async () => {
    const { data } = await supabase.from('games').select('*').eq('room_code', roomCode).maybeSingle();
    if (!data) {
      const newState = createInitialState(user);
      await supabase.from('games').insert([{ room_code: roomCode, state: newState }]);
      setGame(newState);
    } else {
      const s = data.state;
      if (!s.players.find((p: any) => p.id === String(user.id)) && s.phase === "LOBBY") {
        s.players.push({
          id: String(user.id), name: user.first_name, gold: 2, isReady: false,
          hand: [s.deck.pop(), s.deck.pop()], districts: [], role: null
        });
        await updateDB(s);
      }
      setGame(s);
    }
  };

  const toggleReady = async () => {
    const s = { ...game };
    const player = s.players.find((p: any) => p.id === String(user.id));
    player.isReady = !player.isReady;

    const allReady = s.players.length >= 2 && s.players.every((p: any) => p.isReady);
    if (allReady) {
      s.phase = "SELECTION";
      s.crownPlayerId = s.players[Math.floor(Math.random() * s.players.length)].id;
      s.currentPickerIndex = s.players.findIndex((p: any) => p.id === s.crownPlayerId);
      s.availableRoles = [...ROLES].sort(() => Math.random() - 0.5);
      s.log.push("Все готовы! Корона вручена случайно.");
    }
    await updateDB(s);
  };

  // ... (pickRole, buildDistrict, endTurn - как в предыдущем коде, но с обновлением s.log)

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    joinOrCreate();
    const channel = supabase.channel('citadels').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games' }, (p: any) => setGame(p.new.state)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!game) return <div className="h-screen bg-[#0f172a] flex items-center justify-center text-yellow-500 animate-pulse font-bold">ЗАГРУЗКА ЦИТАДЕЛЕЙ...</div>;

  const me = game.players.find((p: any) => p.id === String(user.id));
  const isMyPick = game.phase === "SELECTION" && game.players[game.currentPickerIndex]?.id === String(user.id);
  const isMyTurn = game.phase === "TURNS" && ROLES.find(r => r.name === me?.role)?.id === game.currentRoleTurn;

  return (
    <div className="h-screen bg-[#0f172a] text-slate-200 flex flex-col font-sans selection:bg-yellow-500/30">
      {/* Header */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-yellow-900/30 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-2">
          <Crown className="text-yellow-500 w-5 h-5 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
          <span className="font-black tracking-tighter text-xl bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">CITADELS</span>
        </div>
        <div className="text-[10px] px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-bold uppercase tracking-widest">
          {game.phase}
        </div>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {game.players.map((p: any) => (
          <div key={p.id} className={`relative p-4 rounded-2xl border transition-all duration-500 ${p.id === String(user.id) ? 'bg-slate-800/80 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : 'bg-slate-800/30 border-slate-700/50'}`}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                {p.id === game.crownPlayerId && <Crown className="w-4 h-4 text-yellow-500" />}
                <span className={`font-bold ${p.id === String(user.id) ? 'text-white' : 'text-slate-400'}`}>{p.name}</span>
                {game.phase === "LOBBY" && (
                  p.isReady ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center text-yellow-500 font-bold drop-shadow-md">
                  <Coins className="w-4 h-4 mr-1" /> {p.gold}
                </div>
              </div>
            </div>
            {/* Districts bar */}
            <div className="flex gap-1.5 h-8 items-end">
              {p.districts.length === 0 && <div className="text-[10px] text-slate-600 italic">Нет построек</div>}
              {p.districts.map((d: any, i: number) => (
                <div key={i} className={`w-3 h-full rounded-t-sm shadow-sm transition-all bg-${d.color}-500`} title={d.name} />
              ))}
            </div>
            {p.role && <div className="absolute -bottom-2 right-4 px-2 py-0.5 bg-yellow-600 text-[10px] font-black rounded text-black uppercase">{p.role}</div>}
          </div>
        ))}
      </div>

      {/* Action Panel */}
      <div className="p-6 bg-slate-900 border-t border-slate-800 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {game.phase === "LOBBY" && (
          <button onClick={toggleReady} className={`w-full py-4 rounded-2xl font-black text-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 ${me?.isReady ? 'bg-slate-700 text-slate-400' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-600/20'}`}>
            {me?.isReady ? 'ОЖИДАНИЕ ДРУГИХ...' : 'ГОТОВ К ИГРЕ'}
            {!me?.isReady && <Play className="w-5 h-5 fill-current" />}
          </button>
        )}

        {isMyPick && (
          <div className="space-y-4">
            <h3 className="text-center text-yellow-500 font-black text-sm uppercase tracking-widest animate-pulse">Выберите свою роль</h3>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
              {game.availableRoles.map((r: any) => (
                <button key={r.id} onClick={() => {/* pickRole logic */ }} className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-left hover:border-yellow-500 transition-all group">
                  <div className={`text-xs font-bold uppercase ${r.color}`}>{r.name}</div>
                  <div className="text-[9px] text-slate-500 leading-tight group-hover:text-slate-300">{r.power}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isMyTurn && (
          <div className="space-y-4">
            <div className="flex gap-3 overflow-x-auto pb-2 px-1">
              {me.hand.map((c: any) => (
                <button key={c.id} className="flex-shrink-0 w-24 h-36 bg-slate-800 border-2 border-slate-700 rounded-xl p-2 flex flex-col justify-between items-start hover:border-yellow-500 transition-all">
                  <div className={`text-[10px] font-black uppercase text-${c.color}-400`}>{c.type}</div>
                  <div className="text-xs font-bold leading-tight">{c.name}</div>
                  <div className="w-full flex justify-end font-black text-yellow-500 text-sm">💰{c.cost}</div>
                </button>
              ))}
            </div>
            <button onClick={() => {/* endTurn */ }} className="w-full py-4 bg-blue-600 rounded-2xl font-black text-sm tracking-widest flex items-center justify-center gap-2">
              ЗАВЕРШИТЬ ХОД <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Game Log */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-slate-500 font-medium italic opacity-70">
            {game.log[game.log.length - 1]}
          </p>
        </div>
      </div>
    </div>
  );
}