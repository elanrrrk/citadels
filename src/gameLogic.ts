export const INITIAL_DECK = [
    { id: 1, name: "Таверна", cost: 1, color: "green" },
    { id: 2, name: "Рынок", cost: 2, color: "green" },
    { id: 3, name: "Ратуша", cost: 5, color: "green" },
    { id: 4, name: "Храм", cost: 1, color: "blue" },
    { id: 5, name: "Монастырь", cost: 3, color: "blue" },
    { id: 6, name: "Крепость", cost: 3, color: "red" },
    { id: 7, name: "Замок", cost: 4, color: "yellow" },
];

export const createInitialState = (firstPlayer: any) => ({
    phase: "LOBBY",
    players: [{
        id: String(firstPlayer.id),
        name: firstPlayer.first_name,
        gold: 2,
        hand: [],
        districts: [],
        isHost: true
    }],
    current_turn: 0,
    deck: [...INITIAL_DECK].sort(() => Math.random() - 0.5),
    log: ["Комната создана"]
});