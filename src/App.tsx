import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { createInitialState, ROLES, isGameComplete, getNextRoleTurn, generateRoomCode } from './gameLogic';
import type { GameState, Player, TelegramWebApp, LobbyInfo, AppView } from './types';
import { Crown, Coins, CheckCircle2, Circle, Play, Send, Users, Plus, Search, X, LogOut } from 'lucide-react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [nameInputValue, setNameInputValue] = useState<string>("");
  const [showNameInput, setShowNameInput] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<AppView>('LANDING');
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([]);

  const tg = window.Telegram?.WebApp;
  const isTelegramUser = !!tg?.initDataUnsafe?.user;
  const user = tg?.initDataUnsafe?.user || { id: Math.floor(Math.random() * 1000000), first_name: playerName || "Игрок" };

  // Haptic feedback helper
  const haptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      tg?.HapticFeedback?.impactOccurred(type);
    } catch (e) {
      // Haptic not available
    }
  };

  const updateDB = async (newState: GameState) => {
    try {
      const { error } = await supabase
        .from('games')
        .upsert({ room_code: newState.roomCode || roomCode, state: newState }, { onConflict: 'room_code' });

      if (error) {
        console.error('Database update error:', error);
      }
    } catch (e) {
      console.error('Failed to update game state:', e);
    }
  };

  const createLobby = async () => {
    haptic('medium');
    const newRoomCode = generateRoomCode();
    const newState = createInitialState(user, newRoomCode);

    try {
      const { error } = await supabase
        .from('games')
        .insert({ room_code: newRoomCode, state: newState });

      if (error) {
        console.error('Error creating lobby:', error);
        return;
      }

      setRoomCode(newRoomCode);
      setGame(newState);
      setCurrentView('GAME');
    } catch (e) {
      console.error('Failed to create lobby:', e);
    }
  };

  const fetchLobbies = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('room_code, state')
        .eq('state->>phase', 'LOBBY');

      if (error) {
        console.error('Error fetching lobbies:', error);
        return;
      }

      if (data) {
        const lobbyList: LobbyInfo[] = data
          .map((row: any) => ({
            room_code: row.room_code,
            host_name: row.state.players[0]?.name || 'Unknown',
            player_count: row.state.players.length,
            created_at: row.state.createdAt || new Date().toISOString()
          }))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setLobbies(lobbyList);
      }
    } catch (e) {
      console.error('Failed to fetch lobbies:', e);
    }
  };

  const joinLobby = async (lobbyRoomCode: string) => {
    haptic('medium');
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', lobbyRoomCode)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching game:', error);
        return;
      }

      if (!data) {
        alert('Лобби не найдено');
        return;
      }

      const s = data.state as GameState;

      if (s.phase !== 'LOBBY') {
        alert('Эта игра уже началась!');
        return;
      }

      if (!s.players.find((p: Player) => p.id === String(user.id))) {
        s.players.push({
          id: String(user.id),
          name: user.first_name,
          gold: 2,
          isReady: false,
          hand: [s.deck.pop()!, s.deck.pop()!, s.deck.pop()!, s.deck.pop()!],
          districts: [],
          role: null
        });
        s.log.push(`${user.first_name} присоединился к игре`);
        await updateDB(s);
      }

      setRoomCode(lobbyRoomCode);
      setGame(s);
      setCurrentView('GAME');
    } catch (e) {
      console.error('Failed to join lobby:', e);
    }
  };

  const exitToLanding = () => {
    haptic('light');
    if (game && game.phase !== 'LOBBY') {
      if (!confirm('Вы уверены, что хотите выйти из игры?')) {
        return;
      }
    }
    setGame(null);
    setRoomCode("");
    setCurrentView('LANDING');
  };

  const toggleReady = async () => {
    if (!game) return;
    haptic('light');

    const s = { ...game };
    const player = s.players.find((p: Player) => p.id === String(user.id));
    if (!player) return;

    player.isReady = !player.isReady;
    s.log.push(player.isReady ? `${player.name} готов!` : `${player.name} не готов`);
    await updateDB(s);
  };

  const startGame = async () => {
    if (!game) return;
    if (game.players.length < 2) {
      alert('Нужно минимум 2 игрока для начала игры');
      return;
    }

    const allReady = game.players.every((p: Player) => p.isReady);
    if (!allReady) {
      alert('Все игроки должны быть готовы');
      return;
    }

    haptic('heavy');
    const s = { ...game };
    s.phase = "SELECTION";
    s.crownPlayerId = s.players[Math.floor(Math.random() * s.players.length)].id;
    s.currentPickerIndex = s.players.findIndex((p: Player) => p.id === s.crownPlayerId);
    s.availableRoles = [...ROLES].sort(() => Math.random() - 0.5);
    s.log.push("🎮 Игра началась! Выбор ролей...");
    await updateDB(s);
  };

  const pickRole = async (roleId: number) => {
    if (!game) return;
    haptic('medium');

    const s = { ...game };
    const me = s.players.find((p: Player) => p.id === String(user.id));
    if (!me) return;

    const role = s.availableRoles.find(r => r.id === roleId);
    if (!role) return;

    me.role = role.name;
    s.availableRoles = s.availableRoles.filter(r => r.id !== roleId);
    s.log.push(`${me.name} выбрал роль`);

    // Move to next picker
    s.currentPickerIndex++;

    // If all players picked roles, start turns
    if (s.currentPickerIndex >= s.players.length) {
      s.phase = "TURNS";
      s.currentRoleTurn = 1;
      s.log.push("⚔️ Роли выбраны! Начинаются ходы...");
    }

    await updateDB(s);
  };

  const buildDistrict = async (districtId: string) => {
    if (!game) return;
    haptic('medium');

    const s = { ...game };
    const me = s.players.find((p: Player) => p.id === String(user.id));
    if (!me) return;

    const card = me.hand.find(c => c.id === districtId);
    if (!card) return;

    // Check if player has enough gold
    if (me.gold < card.cost) {
      alert(`Недостаточно золота! Нужно ${card.cost}, у вас ${me.gold}`);
      return;
    }

    // Check if district already built
    if (me.districts.find(d => d.id === districtId)) {
      alert('Этот район уже построен!');
      return;
    }

    // Build the district
    me.gold -= card.cost;
    me.districts.push(card);
    me.hand = me.hand.filter(c => c.id !== districtId);
    s.log.push(`${me.name} построил ${card.name} за ${card.cost} золота`);

    // Check if game is complete
    if (isGameComplete(s)) {
      s.phase = "ENDED";
      s.log.push(`🎉 ${me.name} победил! Игра окончена!`);
    }

    await updateDB(s);
  };

  const endTurn = async () => {
    if (!game) return;
    haptic('light');

    const s = { ...game };
    const me = s.players.find((p: Player) => p.id === String(user.id));
    if (!me) return;

    // Give gold for ending turn
    me.gold += 2;

    // Draw a card if deck not empty
    if (s.deck.length > 0) {
      me.hand.push(s.deck.pop()!);
    }

    s.log.push(`${me.name} (${me.role}) завершил ход (+2 золота)`);

    // Move to next role turn
    s.currentRoleTurn = getNextRoleTurn(s.currentRoleTurn);

    // If all roles finished, start new round
    if (s.currentRoleTurn === 1) {
      s.phase = "SELECTION";
      s.players.forEach(p => p.role = null);
      s.availableRoles = [...ROLES].sort(() => Math.random() - 0.5);
      s.currentPickerIndex = s.players.findIndex((p: Player) => p.id === s.crownPlayerId);
      s.log.push("🔄 Новый раунд! Выбор ролей...");
    }

    await updateDB(s);
  };

  useEffect(() => {
    tg?.ready();
    tg?.expand();

    // Check if browser user needs to enter name
    if (!isTelegramUser && !playerName) {
      setShowNameInput(true);
      return;
    }

    // Auto-fetch lobbies when viewing lobby list
    if (currentView === 'LOBBY_LIST') {
      fetchLobbies();

      // Subscribe to real-time updates for lobbies
      const channel = supabase
        .channel('lobby-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'games'
        }, () => {
          fetchLobbies();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    // Subscribe to game updates only when in game view
    if (currentView === 'GAME' && roomCode) {
      const channel = supabase
        .channel(`game-${roomCode}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `room_code=eq.${roomCode}`
        }, (payload: any) => {
          setGame(payload.new.state);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [playerName, currentView, roomCode]);

  // Name input modal for browser users
  if (showNameInput && !isTelegramUser) {
    const handleSubmitName = () => {
      const trimmedName = nameInputValue.trim();
      if (trimmedName.length >= 2 && trimmedName.length <= 15) {
        setPlayerName(trimmedName);
        setShowNameInput(false);
      } else {
        alert('Имя должно быть от 2 до 15 символов');
      }
    };

    return (
      <div className="h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <div className="text-center space-y-4">
            <Crown className="w-20 h-20 text-brand-gold mx-auto drop-shadow-glow-yellow animate-pulse-slow" />
            <h1 className="font-black text-3xl text-gradient-gold tracking-tight">CITADELS</h1>
            <p className="text-slate-400 text-sm">Добро пожаловать в игру!</p>
          </div>

          <div className="card-active p-6 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-brand-gold uppercase tracking-widest mb-2 block">
                Введите ваше имя
              </span>
              <input
                type="text"
                value={nameInputValue}
                onChange={(e) => setNameInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitName()}
                placeholder="Ваше имя..."
                maxLength={15}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/20 transition-all"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-2">От 2 до 15 символов</p>
            </label>

            <button
              onClick={handleSubmitName}
              className="btn-primary w-full"
              disabled={nameInputValue.trim().length < 2}
            >
              <Play className="w-5 h-5 inline-block mr-2 fill-current" />
              Войти в игру
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Landing Screen
  if (currentView === 'LANDING') {
    return (
      <div className="min-h-screen bg-brand-dark text-slate-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <Crown className="w-24 h-24 text-brand-gold mx-auto drop-shadow-glow-yellow animate-pulse-slow" />
            <h1 className="font-black text-4xl text-gradient-gold tracking-tight">CITADELS</h1>
            <p className="text-slate-400 text-sm">Выберите действие</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={createLobby}
              className="btn-primary group"
            >
              <Plus className="w-6 h-6 inline-block mr-2" />
              Создать лобби
            </button>

            <button
              onClick={() => {
                haptic('light');
                setCurrentView('LOBBY_LIST');
              }}
              className="btn-secondary group"
            >
              <Search className="w-6 h-6 inline-block mr-2" />
              Найти лобби
            </button>
          </div>

          <div className="text-center text-xs text-slate-600">
            <p>Игрок: {user.first_name}</p>
          </div>
        </div>
      </div>
    );
  }

  // Lobby List Screen
  if (currentView === 'LOBBY_LIST') {
    return (
      <div className="min-h-screen bg-brand-dark text-slate-200 flex flex-col">
        {/* Header */}
        <div className="glass-strong p-4 border-b border-brand-gold/20 flex justify-between items-center shadow-2xl safe-top sticky top-0 z-50 backdrop-blur-md">
          <button
            onClick={() => {
              haptic('light');
              setCurrentView('LANDING');
            }}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-all touch-feedback"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-2">
            <Search className="text-brand-gold w-5 h-5" />
            <span className="font-black tracking-tighter text-xl text-gradient-gold">Доступные лобби</span>
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Lobby List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {lobbies.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Users className="w-16 h-16 text-slate-600 mx-auto" />
              <p className="text-slate-500 text-sm">Нет доступных лобби</p>
              <button
                onClick={createLobby}
                className="btn-primary max-w-xs mx-auto"
              >
                <Plus className="w-5 h-5 inline-block mr-2" />
                Создать лобби
              </button>
            </div>
          ) : (
            lobbies.map((lobby, idx) => (
              <button
                key={lobby.room_code}
                onClick={() => joinLobby(lobby.room_code)}
                className="w-full card hover:card-active p-4 text-left transition-all touch-feedback animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-4 h-4 text-brand-gold" />
                      <span className="font-bold text-white">{lobby.host_name}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Код: {lobby.room_code}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-300">{lobby.player_count}</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600">
                  Создано: {new Date(lobby.created_at).toLocaleTimeString('ru-RU')}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Game View
  if (!game) {
    return (
      <div className="h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center space-y-4 animate-pulse">
          <Crown className="w-16 h-16 text-brand-gold mx-auto drop-shadow-glow-yellow" />
          <p className="text-brand-gold font-bold text-xl">Загрузка Цитаделей...</p>
        </div>
      </div>
    );
  }

  const me = game.players.find((p: Player) => p.id === String(user.id));
  const isMyPick = game.phase === "SELECTION" && game.players[game.currentPickerIndex]?.id === String(user.id);
  const isMyTurn = game.phase === "TURNS" && me?.role && ROLES.find(r => r.name === me.role)?.id === game.currentRoleTurn;
  const isHost = game.players[0]?.id === String(user.id);
  const allReady = game.players.every((p: Player) => p.isReady);
  const canStartGame = isHost && allReady && game.phase === "LOBBY" && game.players.length >= 2;

  return (
    <div className="min-h-screen bg-brand-dark text-slate-200 flex flex-col font-sans">
      {/* Header */}
      <div className="glass-strong p-4 border-b border-brand-gold/20 flex justify-between items-center shadow-2xl safe-top sticky top-0 z-50 backdrop-blur-md">
        <button
          onClick={exitToLanding}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-all touch-feedback"
          title="Выход"
        >
          <LogOut className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex items-center gap-2">
          <Crown className="text-brand-gold w-5 h-5 drop-shadow-glow-yellow animate-pulse-slow" />
          <span className="font-black tracking-tighter text-xl text-gradient-gold">CITADELS</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-300">{game.players.length}</span>
          </div>
          <div className="text-[10px] px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold font-bold uppercase tracking-widest">
            {game.phase === "LOBBY" ? "Лобби" : game.phase === "SELECTION" ? "Выбор ролей" : game.phase === "TURNS" ? "Ходы" : "Завершено"}
          </div>
        </div>
      </div>

      {/* Room Code Display (only in lobby) */}
      {game.phase === "LOBBY" && (
        <div className="bg-slate-800/30 border-b border-slate-700/50 p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Код комнаты</p>
          <p className="text-lg font-mono font-black text-brand-gold tracking-widest">{game.roomCode}</p>
        </div>
      )}

      {/* Players List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {game.players.map((p: Player, idx: number) => (
          <div
            key={p.id}
            className={`relative p-4 rounded-2xl border transition-all duration-500 animate-fade-in ${p.id === String(user.id)
              ? 'card-active'
              : 'card'
              }`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                {p.id === game.crownPlayerId && (
                  <Crown className="w-4 h-4 text-brand-gold drop-shadow-glow-yellow" />
                )}
                <span className={`font-bold ${p.id === String(user.id) ? 'text-white' : 'text-slate-400'}`}>
                  {p.name}
                  {idx === 0 && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold">ХОСТ</span>}
                </span>
                {game.phase === "LOBBY" && (
                  p.isReady ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 animate-scale-in" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600" />
                  )
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center text-brand-gold font-bold drop-shadow-md">
                  <Coins className="w-4 h-4 mr-1" /> {p.gold}
                </div>
              </div>
            </div>

            {/* Districts bar */}
            <div className="flex gap-1.5 h-8 items-end">
              {p.districts.length === 0 && (
                <div className="text-[10px] text-slate-600 italic">Нет построек</div>
              )}
              {p.districts.map((d, i: number) => (
                <div
                  key={i}
                  className={`w-3 rounded-t-sm shadow-md transition-all hover:scale-110 district-${d.color}`}
                  style={{ height: `${20 + i * 4}px` }}
                  title={`${d.name} (${d.cost} золота)`}
                />
              ))}
            </div>

            {p.role && (
              <div className="absolute -bottom-2 right-4 px-3 py-1 bg-gradient-to-r from-brand-gold to-brand-gold-dark text-[10px] font-black rounded-full text-black uppercase shadow-lg">
                {p.role}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Panel */}
      <div className="glass-strong p-6 border-t border-slate-700 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] safe-bottom">
        {/* Lobby - Ready Button */}
        {game.phase === "LOBBY" && (
          <div className="space-y-3">
            <button
              onClick={toggleReady}
              className={me?.isReady ? 'btn-secondary' : 'btn-primary'}
            >
              {me?.isReady ? 'Ожидание других...' : 'Готов к игре'}
              {!me?.isReady && <Play className="w-5 h-5 inline-block ml-2 fill-current" />}
            </button>

            {/* Start Game Button - Only for Host */}
            {canStartGame && (
              <button
                onClick={startGame}
                className="btn-primary animate-pulse-slow"
              >
                <Send className="w-5 h-5 inline-block mr-2" />
                Запустить игру
              </button>
            )}

            {isHost && !allReady && game.players.length >= 2 && (
              <p className="text-center text-xs text-slate-500 italic">
                Ожидание готовности всех игроков...
              </p>
            )}
          </div>
        )}

        {/* Selection Phase - Pick Role */}
        {isMyPick && (
          <div className="space-y-4 animate-slide-up">
            <h3 className="text-center text-brand-gold font-black text-sm uppercase tracking-widest animate-pulse">
              Выберите свою роль
            </h3>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {game.availableRoles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => pickRole(r.id)}
                  className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl text-left hover:border-brand-gold transition-all group touch-feedback"
                >
                  <div className={`text-xs font-bold uppercase ${r.color}`}>{r.name}</div>
                  <div className="text-[9px] text-slate-500 leading-tight group-hover:text-slate-300 transition-colors">
                    {r.power}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Turns Phase - Build Districts */}
        {isMyTurn && me && (
          <div className="space-y-4 animate-slide-up">
            <h3 className="text-center text-brand-gold font-black text-sm uppercase tracking-widest">
              Ваш ход - {me.role}
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 px-1 custom-scrollbar">
              {me.hand.map((c) => (
                <button
                  key={c.id}
                  onClick={() => buildDistrict(c.id)}
                  disabled={me.gold < c.cost}
                  className={`flex-shrink-0 w-24 h-36 rounded-xl p-2 border-2 flex flex-col justify-between items-start transition-all touch-feedback ${me.gold >= c.cost
                    ? 'bg-slate-800 border-slate-700 hover:border-brand-gold hover:shadow-glow-yellow'
                    : 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'
                    }`}
                >
                  <div className={`text-[10px] font-black uppercase text-${c.color}-400`}>
                    {c.type}
                  </div>
                  <div className="text-xs font-bold leading-tight">{c.name}</div>
                  <div className="w-full flex justify-end font-black text-brand-gold text-sm">
                    💰{c.cost}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={endTurn}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl font-black text-sm tracking-widest flex items-center justify-center gap-2 shadow-lg transform active:scale-95 transition-all"
            >
              Завершить ход <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Game Log */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-slate-500 font-medium italic opacity-70 animate-fade-in">
            {game.log[game.log.length - 1]}
          </p>
        </div>
      </div>
    </div>
  );
}