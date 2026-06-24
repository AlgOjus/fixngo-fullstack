import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qwmganjahyeoyzchxubt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bWdhbmphaHllb3l6Y2h4dWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTg5NzgsImV4cCI6MjA5Nzg5NDk3OH0.dqughgLhPvwFwAal5IxLUbxla8pOK1fERI-n80mKtXk";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not set. ' +
    'Please set these variables in your .env.local file to connect to your Supabase instance.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);