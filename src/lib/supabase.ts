import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rvwhrvetlzqgbosrusse.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2d2hydmV0bHpxZ2Jvc3J1c3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjE3MzIsImV4cCI6MjA3MDczNzczMn0.ZeEMn5WWv1LdtbTU93C8Haq1Pi3izLyw_Q0FGPoqd3s"

// Enable debug logging
localStorage.setItem('debug', 'true');

// Create the Supabase client with debug options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    // Log all Supabase requests and responses
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      console.log('Supabase request:', input);
      return fetch(input, init).then(response => {
        console.log('Supabase response:', response);
        return response;
      });
    }
  }
});

// Log Supabase client initialization
console.log('Supabase client initialized with URL:', supabaseUrl);
console.log('Supabase client options:', {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true
});
