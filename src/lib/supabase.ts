/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from client-side environment variables (prefixed with VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set. ' +
    'Please set these variables in your .env or .env.local file to connect to your Supabase instance.'
  );
}

// Create a single, reusable Supabase client instance for the application
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
