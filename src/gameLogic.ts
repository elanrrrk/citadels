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

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Create initial game state
 */
export const createInitialState = (user: TelegramUser): GameState => {
    // Create deck with 3 copies of each district
    const fullDeck = [...DISTRICTS, ...DISTRICTS, ...DISTRICTS];
    const deck = shuffleArray(fullDeck);

    // Give first player 4 cards
    const initialHand = [
        deck.pop()!,
        deck.pop()!,
        deck.pop()!,
        deck.pop()!
    ];

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
            isHost: true
        }],
        crownPlayerId: null,
        availableRoles: [],
        currentPickerIndex: 0,
        currentRoleTurn: 0,
        deck: deck,
        log: ["Игра создана. Ожидание других игроков..."]
    };
};

/**
 * Check if game is complete (any player has 8 districts)
 */
export const isGameComplete = (state: GameState): boolean => {
    return state.players.some(p => p.districts.length >= 8);
};

/**
 * Get next role turn
 */
export const getNextRoleTurn = (currentTurn: number): number => {
    return currentTurn >= 8 ? 1 : currentTurn + 1;
};