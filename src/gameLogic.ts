import type { Role, District, GameState, TelegramUser } from './types';

export const ROLES: Role[] = [
    { id: 1, name: "Ассасин", color: "text-slate-400", power: "Убивает персонажа" },
    { id: 2, name: "Вор", color: "text-slate-400", power: "Крадет золото" },
    { id: 3, name: "Чародей", color: "text-purple-400", power: "Меняет карты" },
    { id: 4, name: "Король", color: "text-yellow-400", power: "Золото за желтые" },
    { id: 5, name: "Епископ", color: "text-blue-400", power: "Золото за синие" },
    { id: 6, name: "Купец", color: "text-green-400", power: "Золото за зеленые" },
    { id: 7, name: "Зодчий", color: "text-slate-300", power: "Строит 3 карты" },
    { id: 8, name: "Кондотьер", color: "text-red-400", power: "Золото за красные" }
];

export const DISTRICTS: District[] = [
    { id: 'd1', name: "Таверна", cost: 1, color: "green", type: "Торговый" },
    { id: 'd2', name: "Рынок", cost: 2, color: "green", type: "Торговый" },
    { id: 'd3', name: "Торговый пост", cost: 2, color: "green", type: "Торговый" },
    { id: 'd4', name: "Храм", cost: 1, color: "blue", type: "Религиозный" },
    { id: 'd5', name: "Церковь", cost: 2, color: "blue", type: "Религиозный" },
    { id: 'd6', name: "Крепость", cost: 3, color: "red", type: "Военный" },
    { id: 'd7', name: "Замок", cost: 4, color: "yellow", type: "Дворянский" },
    { id: 'd8', name: "Дворец", cost: 5, color: "yellow", type: "Дворянский" },
    { id: 'd9', name: "Гавань", cost: 4, color: "green", type: "Торговый" },
    { id: 'd10', name: "Ратуша", cost: 5, color: "green", type: "Торговый" },
    { id: 'd11', name: "Монастырь", cost: 3, color: "blue", type: "Религиозный" },
    { id: 'd12', name: "Собор", cost: 5, color: "blue", type: "Религиозный" },
    { id: 'd13', name: "Башня", cost: 2, color: "red", type: "Военный" },
    { id: 'd14', name: "Тюрьма", cost: 2, color: "red", type: "Военный" },
    { id: 'd15', name: "Казармы", cost: 3, color: "red", type: "Военный" },
    { id: 'd16', name: "Усадьба", cost: 3, color: "yellow", type: "Дворянский" },
    { id: 'd17', name: "Поместье", cost: 5, color: "purple", type: "Уникальный" },
    { id: 'd18', name: "Лаборатория", cost: 5, color: "purple", type: "Уникальный" },
];

export const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const createInitialState = (user: TelegramUser, roomCode: string): GameState => {
    const fullDeck = [...DISTRICTS, ...DISTRICTS, ...DISTRICTS];
    const deck = shuffleArray(fullDeck);
    const initialHand = [deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!];

    return {
        phase: "LOBBY",
        players: [{
            id: String(user.id),
            name: user.first_name,
            gold: 2,
            hand: initialHand,
            districts: [],
            role: null,
            isReady: false,
            isHost: true,
            turnActionTaken: false,
            districtsBuilt: 0,
            isKilled: false,
            isStolen: false
        }],
        crownPlayerId: null,
        availableRoles: [],
        currentPickerIndex: 0,
        currentRoleTurn: 0,
        deck: deck,
        log: ["Игра создана. Ожидание других игроков..."],
        killedRole: null,
        stolenRole: null,
        roomCode: roomCode,
        lobbyName: `${user.first_name}'s Lobby`,
        createdAt: new Date().toISOString()
    };
};

export const handleKingPower = (state: GameState, userId: string): GameState => {
    const s = { ...state };
    s.crownPlayerId = userId;
    s.log.push(`👑 Король забирает корону!`);
    return s;
};

export const handleMerchantBonus = (state: GameState, userId: string): GameState => {
    const s = { ...state };
    const p = s.players.find(p => p.id === userId);
    if (p) {
        p.gold += 1;
        s.log.push(`💰 Купец получает 1 бонусный золотой`);
    }
    return s;
};

export const handleNextRoleAdvance = (state: GameState): GameState => {
    const s = { ...state };
    let nextTurn = s.currentRoleTurn + 1;

    if (nextTurn > 8) {
        s.phase = "SELECTION";
        s.currentRoleTurn = 0;
        s.players.forEach(p => {
            p.role = null;
            p.turnActionTaken = false;
            p.districtsBuilt = 0;
            p.isKilled = false;
            p.isStolen = false;
        });
        s.killedRole = null;
        s.stolenRole = null;

        // Citadels role distribution:
        // 1. Shuffle all 8 roles
        const allRoles = shuffleArray([...ROLES]);
        // 2. Discard 1 role face-down (not available for selection)
        // This leaves 7 roles for the King to choose from
        s.availableRoles = allRoles.slice(1);

        // First picker is the one with the crown
        const crownIndex = s.players.findIndex(p => p.id === s.crownPlayerId);
        s.currentPickerIndex = crownIndex !== -1 ? crownIndex : 0;

        s.log.push("🔄 Раунд окончен. Король начинает выбор ролей!");
        return s;
    }

    s.currentRoleTurn = nextTurn;
    const roleName = ROLES.find(r => r.id === s.currentRoleTurn)?.name;
    const activePlayer = s.players.find(p => p.role === roleName);

    if (!activePlayer) {
        s.log.push(`📢 Роль ${roleName} не выбрана. Пропуск...`);
        return handleNextRoleAdvance(s);
    }

    if (activePlayer.isKilled) {
        s.log.push(`💀 Роль (${activePlayer.name}) была убита! Пропуск хода...`);
        return handleNextRoleAdvance(s);
    }

    if (activePlayer.isStolen) {
        const thief = s.players.find(p => p.role === "Вор");
        if (thief && activePlayer.gold > 0) {
            thief.gold += activePlayer.gold;
            s.log.push(`💸 Вор украл ${activePlayer.gold} золота у ${activePlayer.name}!`);
            activePlayer.gold = 0;
        }
    }

    if (roleName === "Король") {
        return handleKingPower(s, activePlayer.id);
    }
    if (roleName === "Купец") {
        return handleMerchantBonus(s, activePlayer.id);
    }

    s.log.push(`⚡️ Ход игрока ${activePlayer.name} (${roleName})`);
    return s;
};

export const isGameComplete = (state: GameState): boolean => {
    return state.players.some(p => p.districts.length >= 8);
};

export const getNextRoleTurn = (currentTurn: number): number => {
    return currentTurn >= 8 ? 1 : currentTurn + 1;
};