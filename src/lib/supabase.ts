import { createClient } from '@supabase/supabase-js';

// Access Supabase config securely using Vite's environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Initialize client if credentials are provided, or keep safe null placeholder
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

// Helper to check connection status
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { 
      success: false, 
      error: 'Supabase credentials are missing. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.' 
    };
  }

  try {
    // Attempt rapid lightweight query to verify schemas and authorization
    const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
    
    if (error) {
      // Check if it's a schema warning or connection error
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return { 
          success: false, 
          error: `Conectado ao Supabase, mas a tabela 'products' não foi criada ainda. Rodar o script 'supabase-schema.sql'. [Erro: ${error.message}]` 
        };
      }
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha de rede ao conectar com Supabase.' };
  }
}
