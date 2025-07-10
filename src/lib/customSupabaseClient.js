import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lbtyxnbyetsvngsxczkt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidHl4bmJ5ZXRzdm5nc3hjemt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NzkwOTMsImV4cCI6MjA2NDU1NTA5M30.5x5oYFyZbUxNAgPgbP4F3HeKemi8RBfv-3OKkDpeTz4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);