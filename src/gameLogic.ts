export const ROLES = [
    { id: 1, name: "Ассасин", color: "text-slate-400", power: "Убивает персонажа" },
    { id: 2, name: "Вор", color: "text-slate-400", power: "Крадет золото" },
    { id: 3, name: "Чародей", color: "text-purple-400", power: "Меняет карты" },
    { id: 4, name: "Король", color: "text-yellow-400", power: "Золото за желтые" },
    { id: 5, name: "Епископ", color: "text-blue-400", power: "Золото за синие" },
    { id: 6, name: "Купец", color: "text-green-400", power: "Золото за зеленые" },
    { id: 7, name: "Зодчий", color: "text-slate-300", power: "Строит 3 карты" },
    { id: 8, name: "Кондотьер", color: "text-red-400", power: "Золото за красные" }
];

export const DISTRICTS = [
    { id: 'd1', name: "Таверна", cost: 1, color: "green", type: "Торговый" },
    { id: 'd2', name: "Рынок", cost: 2, color: "green", type: "Торговый" },
    { id: 'd4', name: "Храм", cost: 1, color: "blue", type: "Религиозный" },
    { id: 'd6', name: "Крепость", cost: 3, color: "red", type: "Военный" },
    { id: 'd7', name: "Замок", cost: 4, color: "yellow", type: "Дворянский" },
    { id: 'd11', name: "Ратуша", cost: 5, color: "green", type: "Торговый" },
    { id: 'd12', name: "Монастырь", cost: 3, color: "blue", type: "Религиозный" },
];

export const createInitialState = (user: any) => {
    const deck = [...DISTRICTS, ...DISTRICTS, ...DISTRICTS].sort(() => Math.random() - 0.5);
    return {
        phase: "LOBBY",
        players: [{
            id: String(user.id),
            name: user.first_name,
            gold: 2,
            hand: [deck.pop(), deck.pop(), deck.pop(), deck.pop()],
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
        log: ["Ожидание готовности игроков..."]
    };
};