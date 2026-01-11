export const ROLES = [
    { id: 1, name: "Ассасин", power: "Убить кого-то" },
    { id: 2, name: "Вор", power: "Ограбить кого-то" },
    { id: 3, name: "Чародей", power: "Обмен картами" },
    { id: 4, name: "Король", power: "Дает золото за желтые кварталы" },
    { id: 5, name: "Епископ", power: "Дает золото за синие кварталы" },
    { id: 6, name: "Купец", power: "Дает золото за зеленые кварталы" },
    { id: 7, name: "Зодчий", power: "Строит до 3-х кварталов" },
    { id: 8, name: "Кондотьер", power: "Дает золото за красные кварталы" }
];

export const DISTRICTS = [
    { id: 'd1', name: "Таверна", cost: 1, color: "green" },
    { id: 'd2', name: "Рынок", cost: 2, color: "green" },
    { id: 'd3', name: "Ратуша", cost: 5, color: "green" },
    { id: 'd4', name: "Храм", cost: 1, color: "blue" },
    { id: 'd5', name: "Собор", cost: 5, color: "blue" },
    { id: 'd6', name: "Крепость", cost: 3, color: "red" },
    { id: 'd7', name: "Замок", cost: 4, color: "yellow" },
    { id: 'd8', name: "Дворец", cost: 5, color: "yellow" },
    { id: 'd9', name: "Кузница", cost: 3, color: "red" },
    { id: 'd10', name: "Тюрьма", cost: 2, color: "red" },
];

export const createInitialState = (firstPlayer: any) => {
    const deck = [...DISTRICTS, ...DISTRICTS, ...DISTRICTS].sort(() => Math.random() - 0.5);

    return {
        phase: "LOBBY", // LOBBY, SELECTION, TURNS, END
        players: [{
            id: String(firstPlayer.id),
            name: firstPlayer.first_name,
            gold: 2,
            hand: [deck.pop(), deck.pop(), deck.pop(), deck.pop()],
            districts: [],
            role: null,
            isHost: true
        }],
        availableRoles: [],
        currentPickerIndex: 0,
        currentRoleTurn: 1,
        deck: deck,
        log: ["Игра создана. Ожидание игроков."]
    };
};