import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { createInitialState, ROLES } from './gameLogic';

declare global { interface Window { Telegram: any; } }

export default function App() {
  const [game, setGame] = useState<any>(null);
  const [roomCode] = useState("GLOBAL_BATTLE");
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user || { id: 1, first_name: "Игрок 1" };

  const updateDB = async (newState: any) => {
    await supabase.from('games').update({ state: newState }).eq('room_code', roomCode);
  };

  const joinOrCreate = async () => {
    const { data } = await supabase.from('games').select('*').eq('room_code', roomCode).single();
    if (!data) {
      const newState = createInitialState(user);
      await supabase.from('games').insert([{ room_code: roomCode, state: newState }]);
      setGame(newState);
    } else {
      const s = data.state;
      if (!s.players.find((p: any) => p.id === String(user.id)) && s.phase === "LOBBY") {
        s.players.push({
          id: String(user.id), name: user.first_name, gold: 2,
          hand: [s.deck.pop(), s.deck.pop(), s.deck.pop(), s.deck.pop()],
          districts: [], role: null, isHost: false
        });
        await updateDB(s);
      }
      setGame(s);
    }
  };

  const startGame = async () => {
    const s = { ...game };
    s.phase = "SELECTION";
    s.availableRoles = [...ROLES].sort(() => Math.random() - 0.5);
    s.log.push("Игра началась! Выбор ролей.");
    await updateDB(s);
  };

  const pickRole = async (roleName: string) => {
    const s = { ...game };
    const player = s.players[s.currentPickerIndex];
    player.role = roleName;
    s.availableRoles = s.availableRoles.filter((r: any) => r.name !== roleName);

    if (s.currentPickerIndex < s.players.length - 1) {
      s.currentPickerIndex++;
    } else {
      s.phase = "TURNS";
      s.currentRoleTurn = 1;
      s.log.push("Все выбрали роли. Начало ходов.");
    }
    await updateDB(s);
  };

  const buildDistrict = async (cardId: string) => {
    const s = { ...game };
    const player = s.players.find((p: any) => p.id === String(user.id));
    const cardIndex = player.hand.findIndex((c: any) => c.id === cardId);
    const card = player.hand[cardIndex];

    if (player.gold >= card.cost) {
      player.gold -= card.cost;
      player.districts.push(card);
      player.hand.splice(cardIndex, 1);
      s.log.push(`${player.name} построил ${card.name}`);
      await updateDB(s);
    }
  };

  const endTurn = async () => {
    const s = { ...game };
    if (s.currentRoleTurn < 8) {
      s.currentRoleTurn++;
    } else {
      s.phase = "SELECTION";
      s.currentPickerIndex = 0;
      s.players.forEach((p: any) => p.role = null);
      s.availableRoles = [...ROLES].sort(() => Math.random() - 0.5);
      s.log.push("Раунд завершен. Новый выбор ролей.");
    }
    await updateDB(s);
  };

  useEffect(() => {
    tg?.expand();
    joinOrCreate();
    const channel = supabase.channel('game-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games' },
        (p: any) => setGame(p.new.state)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!game) return <div className="p-10 text-white">Загрузка...</div>;

  const me = game.players.find((p: any) => p.id === String(user.id));
  const isMyPick = game.phase === "SELECTION" && game.players[game.currentPickerIndex]?.id === String(user.id);
  const myRole = ROLES.find(r => r.name === me?.role);
  const isMyTurn = game.phase === "TURNS" && myRole?.id === game.currentRoleTurn;

  return (
    <div className="h-screen bg-slate-900 text-white p-4 flex flex-col font-sans overflow-hidden">
      {/* Шапка */}
      <div className="flex justify-between border-b border-slate-700 pb-2 mb-4">
        <span className="text-yellow-500 font-bold">CITADELS</span>
        <span className="text-xs text-slate-400">Фаза: {game.phase}</span>
      </div>

      {/* Список игроков */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {game.players.map((p: any) => (
          <div key={p.id} className={`p-3 rounded-lg ${p.id === String(user.id) ? 'bg-slate-800 ring-1 ring-yellow-500' : 'bg-slate-800/50'}`}>
            <div className="flex justify-between">
              <span className="text-sm font-bold">{p.name} {p.role && `(${p.role})`}</span>
              <span className="text-yellow-400">💰{p.gold}</span>
            </div>
            <div className="flex gap-1 mt-1 overflow-x-auto">
              {p.districts.map((d: any, i: number) => (
                <div key={i} className={`w-4 h-6 rounded-sm bg-${d.color}-500 border border-white/20`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Игровое поле (управление) */}
      <div className="mt-4 bg-slate-800 p-4 rounded-t-3xl shadow-2xl border-t border-slate-600">
        {game.phase === "LOBBY" && me?.isHost && (
          <button onClick={startGame} className="w-full bg-green-600 py-4 rounded-xl font-bold">НАЧАТЬ ИГРУ</button>
        )}

        {isMyPick && (
          <div className="animate-bounce text-center text-yellow-500 mb-2 font-bold">ВАШ ОЧЕРЕДЬ ВЫБИРАТЬ РОЛЬ!</div>
        )}

        {game.phase === "SELECTION" && isMyPick && (
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
            {game.availableRoles.map((r: any) => (
              <button key={r.id} onClick={() => pickRole(r.name)} className="bg-slate-700 p-2 rounded text-xs hover:bg-slate-600">{r.name}</button>
            ))}
          </div>
        )}

        {game.phase === "TURNS" && (
          <div>
            <div className="text-center mb-2 text-blue-400">Ходит: {ROLES.find(r => r.id === game.currentRoleTurn)?.name}</div>
            {isMyTurn ? (
              <div className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {me.hand.map((c: any) => (
                    <button key={c.id} onClick={() => buildDistrict(c.id)} className={`flex-shrink-0 w-20 h-28 p-2 rounded border text-[10px] bg-${c.color}-900 border-${c.color}-400`}>
                      {c.name} <br /> 💰{c.cost}
                    </button>
                  ))}
                </div>
                <button onClick={endTurn} className="w-full bg-blue-600 py-3 rounded-xl font-bold italic">ЗАВЕРШИТЬ ХОД</button>
              </div>
            ) : (
              <div className="text-center text-slate-500 italic py-4">Ожидайте своего хода...</div>
            )}
          </div>
        )}

        <div className="mt-4 text-[10px] text-slate-500 h-8 overflow-hidden bg-black/20 p-1 rounded">
          {game.log.slice(-1)}
        </div>
      </div>
    </div>
  );
}