import { createClient } from '@supabase/supabase-js';
import type { GameState } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hpunaeqhvhbgmudqsciu.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_G4KKKbl2CweqXKRWyBKM-Q_EOMXvpRq';

if (!import.meta.env.VITE_SUPABASE_URL && import.meta.env.PROD) {
    console.warn('VITE_SUPABASE_URL is not set. Using fallback.');
}

if (!import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.PROD) {
    console.warn('VITE_SUPABASE_ANON_KEY is not set. Using fallback.');
}

// Define database types
type Database = {
    public: {
        Tables: {
            games: {
                Row: {
                    id: number;
                    room_code: string;
                    state: GameState;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    room_code: string;
                    state: GameState;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    room_code?: string;
                    state?: GameState;
                    updated_at?: string;
                };
            };
        };
    };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);