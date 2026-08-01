const { createClient } = require('@supabase/supabase-js');

// Menggunakan kredensial dari environment variable (untuk produksi) atau langsung (untuk pengembangan lokal)
const supabaseUrl = process.env.SUPABASE_URL || 'https://dqlhnyrdeqceepawldet.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbGhueXJkZXFjZWVwYXdsZGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NDYyMTQsImV4cCI6MjEwMTEyMjIxNH0.rFEiaBc4K2-6Aksyd97yg4J89Im9I5Q7Wnwtug54eeE';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
