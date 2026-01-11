// Telegram WebApp Types
export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
        user?: TelegramUser;
        query_id?: string;
        auth_date?: number;
        hash?: string;
    };
    colorScheme: 'light' | 'dark';
    themeParams: {
        bg_color?: string;
        text_color?: string;
        hint_color?: string;
        link_color?: string;
        button_color?: string;
        button_text_color?: string;
    };
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    ready: () => void;
    expand: () => void;
    close: () => void;
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
}

// Game Types
export interface District {
    id: string;
    name: string;
    cost: number;
    color: 'green' | 'blue' | 'red' | 'yellow' | 'purple';
    type: string;
}

export interface Role {
    id: number;
    name: string;
    color: string;
    power: string;
}

export interface Player {
    id: string;
    name: string;
    gold: number;
    hand: District[];
    districts: District[];
    role: string | null;
    isReady: boolean;
    isHost?: boolean;
}

export type GamePhase = 'LOBBY' | 'SELECTION' | 'TURNS' | 'ENDED';

export type AppView = 'LANDING' | 'LOBBY_LIST' | 'GAME';

export interface LobbyInfo {
    room_code: string;
    host_name: string;
    player_count: number;
    created_at: string;
}

export interface GameState {
    phase: GamePhase;
    players: Player[];
    crownPlayerId: string | null;
    availableRoles: Role[];
    currentPickerIndex: number;
    currentRoleTurn: number;
    deck: District[];
    log: string[];
    roomCode?: string;
    lobbyName?: string;
    createdAt?: string;
}

// Supabase Types
export interface GameRow {
    id?: number;
    room_code: string;
    state: GameState;
    created_at?: string;
    updated_at?: string;
}
