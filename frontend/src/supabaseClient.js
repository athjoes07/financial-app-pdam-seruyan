import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dqlhnyrdeqceepawldet.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbGhueXJkZXFjZWVwYXdsZGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NDYyMTQsImV4cCI6MjEwMTEyMjIxNH0.rFEiaBc4K2-6Aksyd97yg4J89Im9I5Q7Wnwtug54eeE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
