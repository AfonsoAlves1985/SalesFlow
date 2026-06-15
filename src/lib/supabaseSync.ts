import { supabase } from './supabase';
import { Product, Comanda } from '../types';

/**
 * Checks if Supabase client is active and properly initialized in the project environment.
 */
export function isSupabaseConfigured(): boolean {
  return !!supabase;
}

/**
 * Migration helper to export local memory states into Supabase PostgreSQL.
 * Handles bulk upserts with full batching and standard error tracing.
 */
export async function pushDataToSupabase(data: {
  products: Product[];
  comandas: Comanda[];
  notifications: any[];
  categories: string[];
  unidades: string[];
}): Promise<{ success: boolean; logs: string[] }> {
  if (!supabase) {
    return { success: false, logs: ['Supabase não configurado no ambiente.'] };
  }

  const logs: string[] = [];
  
  try {
    logs.push('Iniciando exportação em massa...');

    // 1. Export Categories
    if (data.categories.length > 0) {
      logs.push(`Processando ${data.categories.length} categorias...`);
      const payloadCats = data.categories.map(name => ({ name }));
      const { error: catErr } = await supabase.from('categories').upsert(payloadCats, { onConflict: 'name' });
      if (catErr) throw new Error(`Erro categorias: ${catErr.message}`);
      logs.push('✅ Categorias sincronizadas com sucesso!');
    }

    // 2. Export Unidades
    if (data.unidades.length > 0) {
      logs.push(`Processando ${data.unidades.length} unidades organizacionais...`);
      const payloadUnits = data.unidades.map(name => ({ name }));
      const { error: unitErr } = await supabase.from('unidades').upsert(payloadUnits, { onConflict: 'name' });
      if (unitErr) throw new Error(`Erro unidades: ${unitErr.message}`);
      logs.push('✅ Unidades operacionais sincronizadas com sucesso!');
    }

    // 3. Export Products
    if (data.products.length > 0) {
      logs.push(`Processando ${data.products.length} itens no cardápio/catálogo...`);
      const payloadProducts = data.products.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        category: p.category
      }));
      const { error: prodErr } = await supabase.from('products').upsert(payloadProducts);
      if (prodErr) throw new Error(`Erro produtos: ${prodErr.message}`);
      logs.push('✅ Catálogo de produtos sincronizado!');
    }

    // 4. Export Comandas
    if (data.comandas.length > 0) {
      logs.push(`Sincronizando ${data.comandas.length} comandas ativas e históricas...`);
      const payloadComandas = data.comandas.map(c => ({
        id: c.id,
        client_name: c.clientName,
        client_type: c.clientType,
        client_email: c.clientEmail || null,
        client_phone: c.clientPhone || null,
        course_or_training: c.courseOrTraining,
        month: c.month,
        status: c.status,
        created_at: c.createdAt,
        closed_at: c.closedAt || null,
        units: c.unit || null,
        closure_reminder_active: !!c.closureReminderActive,
        items: c.items // JSON representation stored in PostgreSQL jsonb
      }));
      const { error: comErr } = await supabase.from('comandas').upsert(payloadComandas);
      if (comErr) throw new Error(`Erro comandas: ${comErr.message}`);
      logs.push('✅ Registro de comandas e consumo sincronizado!');
    }

    // 5. Export Notifications
    if (data.notifications.length > 0) {
      logs.push(`Exportando ${data.notifications.length} logs de disparo históricos...`);
      const payloadNotifs = data.notifications.map(n => ({
        id: n.id,
        timestamp: n.timestamp,
        recipient: n.recipient,
        course: n.course,
        contact: n.contact,
        type: n.type,
        message: n.message,
        status: n.status,
        sender: n.sender || null
      }));
      const { error: notiErr } = await supabase.from('notifications').upsert(payloadNotifs);
      if (notiErr) throw new Error(`Erro notificações: ${notiErr.message}`);
      logs.push('✅ Logs de notificação WhatsApp sincronizados!');
    }

    logs.push('🎉 Banco de dados Supabase totalmente preenchido e alinhado!');
    return { success: true, logs };

  } catch (err: any) {
    logs.push(`❌ Falha na migração: ${err.message}`);
    return { success: false, logs };
  }
}

/**
 * Subscribes to Supabase Realtime Channels to synchronize changes across terminals on demand.
 */
export function subscribeToSupabaseRealtime(
  onUpdate: (payload: any) => void
): { unsubscribe: () => void } | null {
  if (!supabase) return null;

  const channel = supabase.channel('app-state-version')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state_version' },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel).catch(err => console.error(err));
    }
  };
}

/**
 * Fetch and assemble entire application state directly from cloud tables.
 */
export async function pullStateFromSupabase(): Promise<{
  success: boolean;
  state?: {
    products: Product[];
    comandas: Comanda[];
    notifications: any[];
    categories: string[];
    unidades: string[];
  };
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: 'Supabase não habilitado no ambiente.' };
  }

  try {
    // 1. Fetch Categories
    const { data: qCats, error: catErr } = await supabase.from('categories').select('name').order('name');
    if (catErr) throw catErr;

    // 2. Fetch Unidades
    const { data: qUnits, error: unitErr } = await supabase.from('unidades').select('name').order('name');
    if (unitErr) throw unitErr;

    // 3. Fetch Products
    const { data: qProds, error: prodErr } = await supabase.from('products').select('*').order('name');
    if (prodErr) throw prodErr;

    // 4. Fetch Comandas
    const { data: qComs, error: comErr } = await supabase.from('comandas').select('*').order('created_at', { ascending: false });
    if (comErr) throw comErr;

    // 5. Fetch Notifications
    const { data: qNotifs, error: notiErr } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(200);
    if (notiErr) throw notiErr;

    // Format types properly for React client state
    const categories = qCats ? qCats.map(c => c.name) : [];
    const unidades = qUnits ? qUnits.map(u => u.name) : [];
    
    const products: Product[] = (qProds || []).map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      category: p.category
    }));

    const comandas: Comanda[] = (qComs || []).map(c => ({
      id: c.id,
      clientName: c.client_name,
      clientType: c.client_type,
      clientEmail: c.client_email || undefined,
      clientPhone: c.client_phone || undefined,
      courseOrTraining: c.course_or_training,
      month: c.month,
      status: c.status,
      createdAt: c.created_at,
      closedAt: c.closed_at || undefined,
      unit: c.units || undefined,
      closureReminderActive: !!c.closure_reminder_active,
      items: (c.items as any[]) || []
    }));

    const notifications: any[] = (qNotifs || []).map(n => ({
      id: n.id,
      timestamp: n.timestamp,
      recipient: n.recipient,
      course: n.course,
      contact: n.contact,
      type: n.type,
      message: n.message,
      status: n.status,
      sender: n.sender || undefined
    }));

    return {
      success: true,
      state: {
        categories,
        unidades,
        products,
        comandas,
        notifications
      }
    };
  } catch (err: any) {
    console.error('Falha ao baixar dados do Supabase:', err);
    return { success: false, error: err.message || 'Falha de requisição SQL.' };
  }
}
