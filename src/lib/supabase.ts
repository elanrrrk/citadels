import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hpunaeqhvhbgmudqsciu.supabase.co';
const supabaseKey = 'sb_publishable_G4KKKbl2CweqXKRWyBKM-Q_EOMXvpRq';

export const supabase = createClient(supabaseUrl, supabaseKey);