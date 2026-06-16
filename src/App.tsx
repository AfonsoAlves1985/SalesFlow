import React, { useState, useEffect, useRef } from 'react';
import { Product, Comanda, ClientType, ThemeType, OrderedItem, CashierShift, CashierCashMovement, UserSession, SystemUser, StockMovement, AuditLogEntry, AuditEntityType, Receivable, USER_ROLE_LABELS, UserRole, Company, Workspace, Space, DEFAULT_COMPANY, DEFAULT_WORKSPACE, DEFAULT_SPACE, DEFAULT_SCOPE, ScopeFields } from './types';
import { INITIAL_PRODUCTS, INITIAL_COMANDAS, MONTHS } from './initialData';
import { 
  Plus, 
  Search, 
  Layers, 
  Package, 
  Sparkles, 
  Layout, 
  Smartphone, 
  Building2, 
  SlidersHorizontal,
  ChevronRight,
  Info,
  GraduationCap,
  Users,
  Shield,
  Clock,
  Printer,
  X,
  CreditCard,
  UtensilsCrossed,
  CheckCircle2,
  Check,
  Undo,
  LogIn,
  LogOut,
  DollarSign,
  Mail,
  MessageSquare,
  Bell,
  FileText,
  Lock,
  History,
  AlertTriangle,
  Send,
  Trash2,
  TrendingUp,
  Key,
  MapPin,
  Camera
} from 'lucide-react';

// Subcomponents import
import StockManagement from './components/StockManagement';
import ComandaList from './components/ComandaList';
import ComandaPOSView from './components/ComandaPOSView';
import ComandaDetailView from './components/ComandaDetailView';
import ClientMobileView from './components/ClientMobileView';
import AccessManagement from './components/AccessManagement';
import InviteActivation from './components/InviteActivation';
import UnitManagementModal from './components/UnitManagementModal';
import FluxoDashboard from './components/FluxoDashboard';
import DirectPOSView from './components/DirectPOSView';
import ScopeManagement from './components/ScopeManagement';

import { testSupabaseConnection } from './lib/supabase';
import { isSupabaseConfigured, pushDataToSupabase, pullStateFromSupabase, subscribeToSupabaseRealtime } from './lib/supabaseSync';

type AdminSubTab = 'comandas' | 'estoque' | 'fluxo' | 'caixa_notificacoes' | 'acessos' | 'auditoria' | 'pdv' | 'frentes';

const ROLE_TAB_ACCESS: Record<UserRole, AdminSubTab[]> = {
  admin: ['comandas', 'pdv', 'caixa_notificacoes', 'estoque', 'fluxo', 'acessos', 'auditoria', 'frentes'],
  manager: ['comandas', 'pdv', 'caixa_notificacoes', 'estoque', 'fluxo', 'auditoria'],
  finance: ['comandas', 'caixa_notificacoes', 'fluxo'],
  stock: ['estoque'],
  cashier: ['comandas', 'pdv', 'caixa_notificacoes']
};

const getUserRoleLabel = (role?: UserRole) => role ? (USER_ROLE_LABELS[role] || role) : '';
const withDefaultScope = <T extends ScopeFields>(item: T): T => ({ ...DEFAULT_SCOPE, ...item });
const isInScope = (item: ScopeFields, scope: Required<ScopeFields>) => (
  (item.companyId || DEFAULT_SCOPE.companyId) === scope.companyId &&
  (item.workspaceId || DEFAULT_SCOPE.workspaceId) === scope.workspaceId &&
  (item.spaceId || DEFAULT_SCOPE.spaceId) === scope.spaceId
);
const getScopeKey = (scope: ScopeFields) => `${scope.companyId || DEFAULT_SCOPE.companyId}:${scope.workspaceId || DEFAULT_SCOPE.workspaceId}:${scope.spaceId || DEFAULT_SCOPE.spaceId}`;
const DEFAULT_CATEGORIES = ['Bebidas', 'Alimentos', 'Papelaria', 'Vestuário', 'Acessórios'];
const DEFAULT_UNIDADES = ['Sede Principal', 'Filial Norte', 'Filial Sul'];

export default function App() {
  const initialComandaParam = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('comanda')
    : null;
  const initialCompanyParam = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('company')
    : null;
  const initialWorkspaceParam = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('workspace')
    : null;
  const initialSpaceParam = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('space')
    : null;

  // Brand Logo selection state
  const [brandLogoOption, setBrandLogoOption] = useState<'quantum' | 'shield' | 'infinite'>(() => {
    return (localStorage.getItem('salesflow_brand_logo_v5') as any) || 'infinite';
  });

  const renderBrandLogo = (option: 'quantum' | 'shield' | 'infinite') => {
    switch (option) {
      case 'quantum':
        return (
          <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-[#1876D2] to-[#E5C079] rounded-xl shadow-lg shadow-amber-500/10 transition-all duration-300 transform hover:scale-105 active:scale-95">
            <Sparkles className="w-5.5 h-5.5 text-zinc-950 stroke-[2.5] animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 bg-indigo-500 border border-slate-900 rounded-full animate-ping" />
          </div>
        );
      case 'shield':
        return (
          <div className="relative w-10 h-10 flex items-center justify-center bg-slate-900 border border-amber-500/30 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95">
            <Shield className="w-5.5 h-5.5 text-frz-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-black font-mono text-amber-100">$</span>
            </div>
          </div>
        );
      case 'infinite':
      default:
        return (
          <div className="relative w-10 h-10 flex items-center justify-center bg-[#09090B] border border-slate-700 rounded-xl overflow-hidden shadow-inner transition-all duration-300 transform hover:rotate-6 active:scale-95">
            <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-indigo-600/20 rounded-full blur-xs" />
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>
        );
    }
  };

  // Theme and viewing state
  const [theme, setTheme] = useState<ThemeType>('gold-dark');
  const [viewMode, setViewMode] = useState<'both' | 'admin' | 'client'>(initialComandaParam ? 'client' : 'admin');

  useEffect(() => {
    const resolved = theme === 'gold-dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('frz-theme', resolved);
  }, [theme]);
  const [isClientOnlyMode, setIsClientOnlyMode] = useState(!!initialComandaParam);
  
  // Data State loading from localStorage with Initial Failback
  const [products, setProducts] = useState<Product[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [categoriesByScope, setCategoriesByScope] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('salesflow_categories_by_scope');
    if (saved) try { return JSON.parse(saved); } catch {}
    const old = localStorage.getItem('salesflow_categories');
    if (old) {
      try {
        const parsed = JSON.parse(old);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.removeItem('salesflow_categories');
          const k = getScopeKey(DEFAULT_SCOPE);
          return { [k]: parsed };
        }
      } catch {}
    }
    const k = getScopeKey(DEFAULT_SCOPE);
    return { [k]: DEFAULT_CATEGORIES };
  });
  const [unidadesByScope, setUnidadesByScope] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('salesflow_unidades_by_scope');
    if (saved) try { return JSON.parse(saved); } catch {}
    const old = localStorage.getItem('salesflow_unidades');
    if (old) {
      try {
        const parsed = JSON.parse(old);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.removeItem('salesflow_unidades');
          const k = getScopeKey(DEFAULT_SCOPE);
          return { [k]: parsed };
        }
      } catch {}
    }
    const k = getScopeKey(DEFAULT_SCOPE);
    return { [k]: DEFAULT_UNIDADES };
  });
  const [companies, setCompanies] = useState<Company[]>([DEFAULT_COMPANY]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([DEFAULT_WORKSPACE]);
  const [spaces, setSpaces] = useState<Space[]>([DEFAULT_SPACE]);
  const [activeCompanyId, setActiveCompanyId] = useState(() => initialCompanyParam || localStorage.getItem('salesflow_active_company_id') || DEFAULT_SCOPE.companyId);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => initialWorkspaceParam || localStorage.getItem('salesflow_active_workspace_id') || DEFAULT_SCOPE.workspaceId);
  const [activeSpaceId, setActiveSpaceId] = useState(() => initialSpaceParam || localStorage.getItem('salesflow_active_space_id') || DEFAULT_SCOPE.spaceId);
  const activeScope = { companyId: activeCompanyId, workspaceId: activeWorkspaceId, spaceId: activeSpaceId };
  const scopeKey = getScopeKey(activeScope);
  const scopedCategories = categoriesByScope[scopeKey] || DEFAULT_CATEGORIES;
  const scopedUnidades = unidadesByScope[scopeKey] || DEFAULT_UNIDADES;
  const activeCompany = companies.find(company => company.id === activeCompanyId) || DEFAULT_COMPANY;
  const activeWorkspace = workspaces.find(workspace => workspace.id === activeWorkspaceId) || DEFAULT_WORKSPACE;
  const activeSpace = spaces.find(space => space.id === activeSpaceId) || DEFAULT_SPACE;
  
  // Operating Unit cashier state
  const [operatingUnit, setOperatingUnit] = useState<string>(() => {
    const saved = localStorage.getItem('salesflow_operating_unit');
    return saved || 'Sede Principal';
  });

  // WhatsApp sender number configured for system automatic notifications
  const [systemWhatsNumber, setSystemWhatsNumber] = useState<string>(() => {
    const saved = localStorage.getItem('salesflow_system_whats_number');
    return saved || '+55 (11) 99999-9999';
  });

  // WhatsApp QR Code Web Connection Status ('disconnected' | 'connecting' | 'connected')
  const [whatsConnectionStatus, setWhatsConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>(() => {
    const saved = localStorage.getItem('salesflow_whats_status');
    return (saved as 'disconnected' | 'connecting' | 'connected') || 'disconnected';
  });

  // WhatsApp current connection methodology chosen by user ('qrcode' | 'manual')
  const [whatsConnectionMethod, setWhatsConnectionMethod] = useState<'qrcode' | 'manual'>('qrcode');

  // Supabase Real-time Cloud states
  const [supabaseLogMessages, setSupabaseLogMessages] = useState<string[]>([]);
  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(false);
  const [supabaseConnectionStatus, setSupabaseConnectionStatus] = useState<'unchecked' | 'connected' | 'error'>('unchecked');
  const [supabaseErrorDetails, setSupabaseErrorDetails] = useState<string>('');

  // Active states
  const [selectedComandaId, setSelectedComandaId] = useState<string | null>(null);
  const [clientActiveComandaId, setClientActiveComandaId] = useState<string | null>(initialComandaParam);
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<AdminSubTab>('comandas');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // System Users List for Access Management
  const [users, setUsers] = useState<SystemUser[]>(() => {
    const saved = localStorage.getItem('salesflow_users_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((user: SystemUser) => ({
            ...user,
            companyId: user.companyId || DEFAULT_SCOPE.companyId,
            workspaceIds: user.workspaceIds?.length ? user.workspaceIds : [DEFAULT_SCOPE.workspaceId],
            spaceIds: user.spaceIds?.length ? user.spaceIds : [DEFAULT_SCOPE.spaceId]
          }));
        }
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: 'u-superadmin',
        username: 'admin',
        name: 'Afonso Alves (Superadmin)',
        email: 'admin@salesflow.com',
        role: 'admin',
        status: 'active',
        password: '123',
        companyId: DEFAULT_SCOPE.companyId,
        workspaceIds: [DEFAULT_SCOPE.workspaceId],
        spaceIds: [DEFAULT_SCOPE.spaceId],
        createdAt: new Date().toISOString()
      },
      {
        id: 'u-caixa',
        username: 'caixa',
        name: 'Caixa Inicial',
        email: 'caixa@salesflow.com',
        role: 'cashier',
        status: 'active',
        password: '123',
        companyId: DEFAULT_SCOPE.companyId,
        workspaceIds: [DEFAULT_SCOPE.workspaceId],
        spaceIds: [DEFAULT_SCOPE.spaceId],
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Track active invite processing
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);

  // User Session Management
  const [session, setSession] = useState<UserSession | null>(null);
  const hasTabAccess = (tab: AdminSubTab) => {
    if (!session) return false;
    return ROLE_TAB_ACCESS[session.role]?.includes(tab) || false;
  };

  useEffect(() => {
    if (!session) return;
    if (hasTabAccess(activeAdminSubTab)) return;

    setActiveAdminSubTab(ROLE_TAB_ACCESS[session.role]?.[0] || 'comandas');
    setSelectedComandaId(null);
  }, [session?.role, activeAdminSubTab]);
  
  // Cashier Shifts Management (abertura e fechamento de caixa)
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<CashierShift[]>([]);
  
  // Notification logs & Toast state (Configure um sistema de notificação automatizado)
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [activeToasts, setActiveToasts] = useState<Array<{ id: string; title: string; description: string; type: 'email' | 'sms' }>>([]);
  const [auditEntityFilter, setAuditEntityFilter] = useState<'all' | AuditEntityType>('all');
  const [auditDateFilter, setAuditDateFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Modal creation state for Admin
  const [isNewComandaModalOpen, setIsNewComandaModalOpen] = useState(false);
  const [isManageUnitsModalOpen, setIsManageUnitsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientType, setNewClientType] = useState<ClientType>('Aluno');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCourse, setNewClientCourse] = useState('');
  const [newClientMonth, setNewClientMonth] = useState('Junho');
  const [newClientUnit, setNewClientUnit] = useState('');

  // Input states for login flow
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [userForPasswordChange, setUserForPasswordChange] = useState<SystemUser | null>(null);
  const [firstAccessNewPassword, setFirstAccessNewPassword] = useState('');
  const [firstAccessNewPasswordConfirm, setFirstAccessNewPasswordConfirm] = useState('');
  const [firstAccessError, setFirstAccessError] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileError, setProfileError] = useState('');

  // Drawer Opening/Closing input states
  const [isShiftOpenModalOpen, setIsShiftOpenModalOpen] = useState(false);
  const [isShiftCloseModalOpen, setIsShiftCloseModalOpen] = useState(false);
  const [openInitialBalance, setOpenInitialBalance] = useState<number>(150);
  const [openNotes, setOpenNotes] = useState('');
  const [closeActualCash, setCloseActualCash] = useState<number>(150);
  const [closeNotes, setCloseNotes] = useState('');
  const [cashMovementType, setCashMovementType] = useState<'suprimento' | 'sangria'>('suprimento');
  const [cashMovementAmount, setCashMovementAmount] = useState('');
  const [cashMovementReason, setCashMovementReason] = useState('');

  // References to keep polling state comparison stable preventing keyboard layout/input refocus drops
  const productsRef = useRef<Product[]>(products);
  const comandasRef = useRef<Comanda[]>(comandas);
  const notificationsRef = useRef<any[]>(notifications);
  const stockMovementsRef = useRef<StockMovement[]>(stockMovements);
  const auditLogsRef = useRef<AuditLogEntry[]>(auditLogs);
  const receivablesRef = useRef<Receivable[]>(receivables);
  const categoriesRef = useRef<string[]>(scopedCategories);
  const unidadesRef = useRef<string[]>(scopedUnidades);
  const comandaSyncGuardRef = useRef(false);
  const comandaCooldownUntilRef = useRef(0);
  const comandaVersionRef = useRef(0);
  const stateMetaVersionRef = useRef('');
  const requestedProductImagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    productsRef.current = products;
    comandasRef.current = comandas;
    notificationsRef.current = notifications;
    stockMovementsRef.current = stockMovements;
    auditLogsRef.current = auditLogs;
    receivablesRef.current = receivables;
    categoriesRef.current = scopedCategories;
    unidadesRef.current = scopedUnidades;
  }, [products, comandas, notifications, stockMovements, auditLogs, receivables, categoriesByScope, unidadesByScope, activeScope]);

  useEffect(() => {
    if (!isInitialized || products.length === 0) return;
    const missingImageIds = products
      .filter(product => !product.image && !requestedProductImagesRef.current.has(product.id))
      .map(product => product.id);
    if (missingImageIds.length === 0) return;

    missingImageIds.forEach(id => requestedProductImagesRef.current.add(id));
    fetch('/api/products/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: missingImageIds })
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.images || typeof data.images !== 'object') return;
        setProducts(prev => {
          let changed = false;
          const hydrated = prev.map(product => {
            const image = data.images[product.id];
            if (!product.image && image) {
              changed = true;
              return { ...product, image };
            }
            return product;
          });
          if (changed) {
            productsRef.current = hydrated;
            localStorage.setItem('salesflow_products_v2', JSON.stringify(hydrated));
          }
          return changed ? hydrated : prev;
        });
      })
      .catch(() => {});
  }, [isInitialized, products]);

  const isGeneratedModelComanda = (c: any) => {
    const name = String(c?.clientName || '').trim();
    const course = String(c?.courseOrTraining || '').trim();
    return name === 'Cliente QR Especial'
      || name.startsWith('Cliente Smartphone ')
      || course === 'Área do Aluno Elite'
      || course === 'Treinamento de Auto-Atendimento'
      || (name === 'Venda Balcão' && course === 'PDV');
  };

  const sanitizeComandas = (list: any[]) => list.filter(c => !isGeneratedModelComanda(c));

  const isRemoteComandaOlder = (remote: Comanda, local: Comanda) => {
    const remoteUpdated = new Date(remote.updatedAt || remote.closedAt || remote.createdAt || 0).getTime();
    const localUpdated = new Date(local.updatedAt || local.closedAt || local.createdAt || 0).getTime();
    if (remoteUpdated && localUpdated && remoteUpdated < localUpdated) return true;
    if ((remote.items?.length || 0) < (local.items?.length || 0)) return true;
    if (local.status === 'Pago' && remote.status !== 'Pago') return true;
    if (local.closedAt && (!remote.closedAt || remote.closedAt < local.closedAt)) return true;
    return false;
  };

  const isRemoteComandaNewer = (remote: Comanda, local: Comanda) => {
    const remoteUpdated = new Date(remote.updatedAt || remote.closedAt || remote.createdAt || 0).getTime();
    const localUpdated = new Date(local.updatedAt || local.closedAt || local.createdAt || 0).getTime();
    if (remoteUpdated && localUpdated && remoteUpdated > localUpdated) return true;
    if ((remote.items?.length || 0) > (local.items?.length || 0)) return true;
    if (remote.status === 'Pago' && local.status !== 'Pago') return true;
    if (remote.closedAt && (!local.closedAt || remote.closedAt > local.closedAt)) return true;
    return false;
  };

  const mergeComandasFromRemote = (remoteComandas: Comanda[], localComandas: Comanda[]) => {
    return remoteComandas.map(remote => {
      const local = localComandas.find(c => c.id === remote.id);
      if (!local) return remote;
      return isRemoteComandaOlder(remote, local) ? local : remote;
    });
  };

  const mergeProductsFromRemote = (remoteProducts: Product[], localProducts: Product[]) => {
    return remoteProducts.map(remote => {
      const local = localProducts.find(p => p.id === remote.id);
      return !remote.image && local?.image ? { ...remote, image: local.image } : remote;
    });
  };

  const mergeAuditLogs = (incomingLogs: AuditLogEntry[], localLogs: AuditLogEntry[]) => {
    const byId = new Map<string, AuditLogEntry>();
    [...incomingLogs, ...localLogs].forEach(log => {
      if (log?.id) byId.set(log.id, log);
    });
    return Array.from(byId.values())
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 500);
  };

  const getComandaTotalValue = (comanda: Comanda) => {
    return (comanda.items || []).reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  };

  const getReceivableStatus = (amount: number, paidAmount: number): Receivable['status'] => {
    if (paidAmount <= 0) return 'Pendente';
    if (paidAmount >= amount) return 'Pago';
    return 'Parcial';
  };

  const mergeReceivables = (incomingReceivables: Receivable[], localReceivables: Receivable[]) => {
    const byId = new Map<string, Receivable>();
    localReceivables.forEach(receivable => {
      if (receivable?.id) byId.set(receivable.id, receivable);
    });
    incomingReceivables.forEach(receivable => {
      if (!receivable?.id) return;
      const current = byId.get(receivable.id);
      const incomingTs = new Date(receivable.updatedAt || receivable.paidAt || receivable.canceledAt || receivable.createdAt || 0).getTime();
      const currentTs = current ? new Date(current.updatedAt || current.paidAt || current.canceledAt || current.createdAt || 0).getTime() : 0;
      if (!current || incomingTs >= currentTs) byId.set(receivable.id, receivable);
    });
    return Array.from(byId.values())
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  };

  const syncReceivablesFromComandas = (updatedComandas: Comanda[], baseReceivables = receivablesRef.current) => {
    const now = new Date().toISOString();
    const comandaIds = new Set(updatedComandas.map(comanda => comanda.id));
    const nextReceivables = [...baseReceivables];

    updatedComandas.forEach(comanda => {
      const amount = getComandaTotalValue(comanda);
      const index = nextReceivables.findIndex(receivable => receivable.comandaId === comanda.id);
      const existing = index >= 0 ? nextReceivables[index] : undefined;
      if (amount <= 0 && !existing) return;

      const isPaidComanda = comanda.status === 'Pago';
      const paidAmount = existing?.status === 'Cancelado'
        ? Number(existing.paidAmount || 0)
        : isPaidComanda
        ? amount
        : Math.min(Number(existing?.paidAmount || 0), amount);
      const status = existing?.status === 'Cancelado'
        ? 'Cancelado'
        : isPaidComanda
        ? 'Pago'
        : getReceivableStatus(amount, paidAmount);

      const next: Receivable = {
        ...withDefaultScope(comanda),
        id: existing?.id || `REC-${comanda.id}`,
        comandaId: comanda.id,
        clientName: comanda.clientName,
        clientType: comanda.clientType,
        courseOrTraining: comanda.courseOrTraining,
        unit: comanda.unit,
        month: comanda.month,
        amount,
        paidAmount,
        status,
        createdAt: existing?.createdAt || comanda.createdAt || now,
        updatedAt: now,
        paidAt: status === 'Pago' ? (existing?.paidAt || comanda.closedAt || now) : existing?.paidAt,
        canceledAt: existing?.status === 'Cancelado' ? existing.canceledAt : undefined,
        paymentMethod: existing?.paymentMethod,
        notes: existing?.notes
      };

      if (existing) nextReceivables[index] = next;
      else nextReceivables.unshift(next);
    });

    return nextReceivables.map(receivable => {
      if (comandaIds.has(receivable.comandaId) || receivable.status === 'Cancelado') return receivable;
      return {
        ...receivable,
        status: 'Cancelado' as const,
        updatedAt: now,
        canceledAt: receivable.canceledAt || now,
        notes: receivable.notes || 'Comanda excluída/cancelada.'
      };
    });
  };

  const applyRemoteState = (data: any) => {
    if (!data) return;
    if (data.__meta?.version) {
      stateMetaVersionRef.current = data.__meta.version;
    }

    // Sync comandas from server.
    // Guard: skip while a local POST is in flight.
    // Cooldown: skip for 3s after a local save to avoid stale data from other instances.
    // Version: read the latest comanda version from localStorage (written by any tab) and
    //   set cooldown if a newer version exists (cross-tab awareness).
    // Stale detection: if remote has FEWER items than local, it's old data → skip.
    const latestVersion = parseInt(localStorage.getItem('salesflow_comanda_version') || '0');
    if (latestVersion > comandaVersionRef.current) {
      comandaVersionRef.current = latestVersion;
      comandaCooldownUntilRef.current = Date.now() + 3000;
    }
    const canApplyRemoteState = !comandaSyncGuardRef.current && Date.now() >= comandaCooldownUntilRef.current;
    if (canApplyRemoteState) {
      const remoteComandas = Array.isArray(data.comandas) ? sanitizeComandas(data.comandas).map(withDefaultScope) : null;
      if (remoteComandas && JSON.stringify(remoteComandas) !== JSON.stringify(comandasRef.current)) {
        const mergedComandas = mergeComandasFromRemote(remoteComandas as Comanda[], comandasRef.current);
        if (JSON.stringify(mergedComandas) !== JSON.stringify(comandasRef.current)) {
          setComandas(mergedComandas);
          localStorage.setItem('salesflow_tickets_v2', JSON.stringify(mergedComandas));
        }
      }

      if (Array.isArray(data.products)) {
        const mergedProducts = mergeProductsFromRemote(data.products.map(withDefaultScope), productsRef.current);
        if (JSON.stringify(mergedProducts) !== JSON.stringify(productsRef.current)) {
          setProducts(mergedProducts);
          localStorage.setItem('salesflow_products_v2', JSON.stringify(mergedProducts));
        }
      }

      if (Array.isArray(data.stockMovements) && JSON.stringify(data.stockMovements) !== JSON.stringify(stockMovementsRef.current)) {
        setStockMovements(data.stockMovements.map(withDefaultScope));
      }

      if (Array.isArray(data.categories) && JSON.stringify(data.categories) !== JSON.stringify(categoriesRef.current)) {
        setCategoriesByScope(prev => ({ ...prev, [scopeKey]: data.categories }));
      }

      if (Array.isArray(data.unidades) && JSON.stringify(data.unidades) !== JSON.stringify(unidadesRef.current)) {
        setUnidadesByScope(prev => ({ ...prev, [scopeKey]: data.unidades }));
      }

      if (Array.isArray(data.notifications) && JSON.stringify(data.notifications) !== JSON.stringify(notificationsRef.current)) {
        setNotifications(data.notifications);
        localStorage.setItem('salesflow_notifications', JSON.stringify(data.notifications));
      }

      if (Array.isArray(data.auditLogs) && JSON.stringify(data.auditLogs) !== JSON.stringify(auditLogsRef.current)) {
        const mergedAuditLogs = mergeAuditLogs(data.auditLogs, auditLogsRef.current);
        setAuditLogs(mergedAuditLogs);
        localStorage.setItem('salesflow_audit_logs', JSON.stringify(mergedAuditLogs));
      }

      if (Array.isArray(data.receivables) && JSON.stringify(data.receivables) !== JSON.stringify(receivablesRef.current)) {
        const mergedReceivables = syncReceivablesFromComandas(comandasRef.current, mergeReceivables(data.receivables.map(withDefaultScope), receivablesRef.current));
        setReceivables(mergedReceivables);
        localStorage.setItem('salesflow_receivables', JSON.stringify(mergedReceivables));
      }
    }

    if (data.whatsStatus) {
      setWhatsConnectionStatus(data.whatsStatus);
      localStorage.setItem('salesflow_whats_status', data.whatsStatus);
    }
    if (data.whatsNumber) {
      setSystemWhatsNumber(data.whatsNumber);
      localStorage.setItem('salesflow_system_whats_number', data.whatsNumber);
    }
  };

  // Check Supabase connection when mounting
  useEffect(() => {
    if (isSupabaseConfigured()) {
      testSupabaseConnection().then(res => {
        if (res.success) {
          setSupabaseConnectionStatus('connected');
        } else {
          setSupabaseConnectionStatus('error');
          setSupabaseErrorDetails(res.error || 'Erro desconhecido');
        }
      });
    }
  }, []);

  // Load state on mount from both server database and localStorage
  useEffect(() => {
    const cachedProducts = localStorage.getItem('salesflow_products_v2');
    const cachedComandas = localStorage.getItem('salesflow_tickets_v2');
    const cachedClientActiveId = localStorage.getItem('salesflow_client_active_id_v2');
    const cachedSession = localStorage.getItem('salesflow_session');
    const cachedActiveShift = localStorage.getItem('salesflow_active_shift');
    const cachedShiftHistory = localStorage.getItem('salesflow_shift_history');
    const cachedNotifications = localStorage.getItem('salesflow_notifications');
    const cachedAuditLogs = localStorage.getItem('salesflow_audit_logs');
    const cachedReceivables = localStorage.getItem('salesflow_receivables');
    const cachedCategoriesByScope = localStorage.getItem('salesflow_categories_by_scope');
    const cachedUnidadesByScope = localStorage.getItem('salesflow_unidades_by_scope');
    const cachedCompanies = localStorage.getItem('salesflow_companies');
    const cachedWorkspaces = localStorage.getItem('salesflow_workspaces');
    const cachedSpaces = localStorage.getItem('salesflow_spaces');

    if (cachedCompanies) {
      try {
        const parsed = JSON.parse(cachedCompanies);
        if (Array.isArray(parsed) && parsed.length > 0) setCompanies(parsed);
      } catch (e) {}
    }
    if (cachedWorkspaces) {
      try {
        const parsed = JSON.parse(cachedWorkspaces);
        if (Array.isArray(parsed) && parsed.length > 0) setWorkspaces(parsed);
      } catch (e) {}
    }
    if (cachedSpaces) {
      try {
        const parsed = JSON.parse(cachedSpaces);
        if (Array.isArray(parsed) && parsed.length > 0) setSpaces(parsed);
      } catch (e) {}
    }

    let loadedProducts = INITIAL_PRODUCTS.map(withDefaultScope);
    if (cachedProducts) {
      try {
        const parsed = JSON.parse(cachedProducts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedProducts = parsed.map(withDefaultScope);
        }
      } catch (e) {
        console.warn("Error parsing cached products, resorting to fallback:", e);
      }
    }
    setProducts(loadedProducts);

    let loadedComandas = INITIAL_COMANDAS.map(withDefaultScope);
    if (cachedComandas) {
      try {
        const parsed = JSON.parse(cachedComandas);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedComandas = sanitizeComandas(parsed).map(withDefaultScope);
          localStorage.setItem('salesflow_tickets_v2', JSON.stringify(loadedComandas));
        }
      } catch (e) {
        console.warn("Error parsing cached comandas, resorting to fallback:", e);
      }
    }
    setComandas(loadedComandas);

    let loadedCategories: string[] | undefined;
    if (cachedCategoriesByScope) {
      try {
        const parsed = JSON.parse(cachedCategoriesByScope);
        if (typeof parsed === 'object' && parsed !== null) {
          setCategoriesByScope(parsed);
          const k = getScopeKey(activeScope);
          loadedCategories = parsed[k];
        }
      } catch (e) {}
    }
    if (!loadedCategories) loadedCategories = DEFAULT_CATEGORIES;

    let loadedUnidades: string[] | undefined;
    if (cachedUnidadesByScope) {
      try {
        const parsed = JSON.parse(cachedUnidadesByScope);
        if (typeof parsed === 'object' && parsed !== null) {
          setUnidadesByScope(parsed);
          const k = getScopeKey(activeScope);
          loadedUnidades = parsed[k];
        }
      } catch (e) {}
    }
    if (!loadedUnidades) loadedUnidades = DEFAULT_UNIDADES;

    if (cachedSession) {
      try {
        setSession(JSON.parse(cachedSession));
      } catch (e) {}
    }
    if (cachedActiveShift) {
      try {
        setActiveShift(withDefaultScope(JSON.parse(cachedActiveShift)));
      } catch (e) {}
    }
    if (cachedShiftHistory) {
      try {
        const parsed = JSON.parse(cachedShiftHistory);
        if (Array.isArray(parsed)) {
          setShiftHistory(parsed.map(withDefaultScope));
        }
      } catch (e) {}
    }
    if (cachedNotifications) {
      try {
        const parsed = JSON.parse(cachedNotifications);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      } catch (e) {}
    }
    if (cachedAuditLogs) {
      try {
        const parsed = JSON.parse(cachedAuditLogs);
        if (Array.isArray(parsed)) {
          setAuditLogs(parsed.slice(0, 500));
        }
      } catch (e) {}
    }
    let loadedReceivables: Receivable[] = [];
    if (cachedReceivables) {
      try {
        const parsed = JSON.parse(cachedReceivables);
        if (Array.isArray(parsed)) {
          loadedReceivables = parsed.map(withDefaultScope);
          setReceivables(loadedReceivables);
        }
      } catch (e) {}
    }

    // Connect to Express back-office initial database state
    fetch('/api/state?light=1')
      .then(res => res.json())
      .then(data => {
        if (data.__meta?.version) {
          stateMetaVersionRef.current = data.__meta.version;
        }
        let needsSyncToServer = false;

        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0 && !cachedCategoriesByScope) {
          const key = getScopeKey(activeScope);
          setCategoriesByScope(prev => ({ ...prev, [key]: data.categories }));
          loadedCategories = data.categories;
        }

        if (data.unidades && Array.isArray(data.unidades) && data.unidades.length > 0 && !cachedUnidadesByScope) {
          const key = getScopeKey(activeScope);
          setUnidadesByScope(prev => ({ ...prev, [key]: data.unidades }));
          loadedUnidades = data.unidades;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const comandaParam = urlParams.get('comanda');
        const localDataVersion = localStorage.getItem('salesflow_comanda_version');
        if (localDataVersion) {
          comandaVersionRef.current = parseInt(localDataVersion) || 0;
        }
        const hasLocalData = loadedComandas.length > 0 || loadedProducts.length > 0;

        // If we have a local version, trust localStorage entirely (Vercel instance isolation may return stale server data)
        if (localDataVersion && hasLocalData) {
          // Keep local products & comandas, don't overwrite with server (which may be from different instance)
          // Server was explicitly cleared — trust server for comandas
              const serverComandas = data.comandas && Array.isArray(data.comandas) ? sanitizeComandas(data.comandas).map(withDefaultScope) : [];
          if (serverComandas.length === 0 && loadedComandas.length > 0) {
            setComandas([]);
            localStorage.setItem('salesflow_tickets_v2', '[]');
            localStorage.removeItem('salesflow_comanda_version');
            loadedComandas = [];
            needsSyncToServer = false;
          } else {
            needsSyncToServer = true;
            // Still check stale detection for comandas
            const serverLooksStale = serverComandas.some((rc: Comanda) => {
              const lc = loadedComandas.find(c => c.id === rc.id);
              return lc && isRemoteComandaOlder(rc, lc);
            });
            const serverHasNewerItems = serverComandas.some((rc: Comanda) => {
              const lc = loadedComandas.find(c => c.id === rc.id);
              return lc && isRemoteComandaNewer(rc, lc);
            });
            const serverHasRequestedComanda = !!comandaParam
              && serverComandas.some((c: Comanda) => c.id === comandaParam)
              && !loadedComandas.some(c => c.id === comandaParam);
            if (serverHasNewerItems || serverHasRequestedComanda || (serverComandas.length > 0 && !loadedComandas.length)) {
              setComandas(serverComandas);
              localStorage.setItem('salesflow_tickets_v2', JSON.stringify(serverComandas));
              loadedComandas = serverComandas;
              if (Array.isArray(data.products) && data.products.length > 0) {
                const mergedProducts = mergeProductsFromRemote(data.products.map(withDefaultScope), loadedProducts);
                setProducts(mergedProducts);
                localStorage.setItem('salesflow_products_v2', JSON.stringify(mergedProducts));
                loadedProducts = mergedProducts;
              }
              if (Array.isArray(data.notifications)) {
                setNotifications(data.notifications);
                localStorage.setItem('salesflow_notifications', JSON.stringify(data.notifications));
              }
              if (Array.isArray(data.stockMovements)) {
                setStockMovements(data.stockMovements.map(withDefaultScope));
              }
              if (Array.isArray(data.auditLogs)) {
                const mergedAuditLogs = mergeAuditLogs(data.auditLogs, auditLogsRef.current);
                setAuditLogs(mergedAuditLogs);
                localStorage.setItem('salesflow_audit_logs', JSON.stringify(mergedAuditLogs));
              }
              if (Array.isArray(data.receivables)) {
                const mergedReceivables = syncReceivablesFromComandas(serverComandas, mergeReceivables(data.receivables.map(withDefaultScope), loadedReceivables));
                setReceivables(mergedReceivables);
                localStorage.setItem('salesflow_receivables', JSON.stringify(mergedReceivables));
                loadedReceivables = mergedReceivables;
              }
              needsSyncToServer = false;
            } else if (serverLooksStale) {
              needsSyncToServer = true;
            }
          }
        } else {
          // No local version — trust server for products
          if (data.products && Array.isArray(data.products) && data.products.length > 0) {
            const mergedProducts = mergeProductsFromRemote(data.products.map(withDefaultScope), loadedProducts);
            setProducts(mergedProducts);
            localStorage.setItem('salesflow_products_v2', JSON.stringify(mergedProducts));
            loadedProducts = mergedProducts;
          } else if (loadedProducts.length > 0) {
            needsSyncToServer = true;
          }

          // Server comandas
            const serverComandas = data.comandas && Array.isArray(data.comandas) ? sanitizeComandas(data.comandas).map(withDefaultScope) : [];
          if (serverComandas.length > 0) {
            setComandas(serverComandas);
            localStorage.setItem('salesflow_tickets_v2', JSON.stringify(serverComandas));
            loadedComandas = serverComandas;
          } else if (loadedComandas.length > 0) {
            needsSyncToServer = true;
          }
        }

        if (needsSyncToServer) {
          console.log("Pushing local client state to restore server database...");
          fetch('/api/state/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              products: loadedProducts, 
              comandas: loadedComandas, 
              categories: loadedCategories,
              unidades: loadedUnidades,
              scopeKey: getScopeKey(activeScope),
              notifications: data.notifications || [],
              auditLogs: auditLogsRef.current,
              receivables: loadedReceivables
            })
          }).catch(err => console.error("Restore push failed:", err));
        }

        if (!localDataVersion || !hasLocalData) {
          // Only use server notifications/stock when no local version
          if (data.notifications && Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
            localStorage.setItem('salesflow_notifications', JSON.stringify(data.notifications));
          }

          if (data.stockMovements && Array.isArray(data.stockMovements)) {
            const cleaned = data.stockMovements.filter(
              (m: StockMovement) => m.id !== 'MOV-1781139463153-464' && m.id !== 'MOV-1781139402298-296'
            );
            setStockMovements(cleaned.map(withDefaultScope));
          }

          if (data.auditLogs && Array.isArray(data.auditLogs)) {
            const mergedAuditLogs = mergeAuditLogs(data.auditLogs, auditLogsRef.current);
            setAuditLogs(mergedAuditLogs);
            localStorage.setItem('salesflow_audit_logs', JSON.stringify(mergedAuditLogs));
          }

          if (data.receivables && Array.isArray(data.receivables)) {
              const mergedReceivables = syncReceivablesFromComandas(loadedComandas, mergeReceivables(data.receivables.map(withDefaultScope), loadedReceivables));
            setReceivables(mergedReceivables);
            localStorage.setItem('salesflow_receivables', JSON.stringify(mergedReceivables));
            loadedReceivables = mergedReceivables;
          } else {
            const syncedReceivables = syncReceivablesFromComandas(loadedComandas, loadedReceivables);
            if (syncedReceivables.length > 0) {
              setReceivables(syncedReceivables);
              localStorage.setItem('salesflow_receivables', JSON.stringify(syncedReceivables));
              loadedReceivables = syncedReceivables;
            }
          }
        }

        if (data.whatsStatus) {
          setWhatsConnectionStatus(data.whatsStatus);
          localStorage.setItem('salesflow_whats_status', data.whatsStatus);
        }

        if (data.whatsNumber) {
          setSystemWhatsNumber(data.whatsNumber);
          localStorage.setItem('salesflow_system_whats_number', data.whatsNumber);
        }

        const reconciledReceivables = syncReceivablesFromComandas(loadedComandas, loadedReceivables);
        if (JSON.stringify(reconciledReceivables) !== JSON.stringify(loadedReceivables)) {
          setReceivables(reconciledReceivables);
          receivablesRef.current = reconciledReceivables;
          localStorage.setItem('salesflow_receivables', JSON.stringify(reconciledReceivables));
          fetch('/api/receivables/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reconciledReceivables)
          }).catch(() => {});
        }

        if (comandaParam) {
          const comandaExists = loadedComandas.find(c => c.id === comandaParam);
          setClientActiveComandaId(comandaParam);
          if (comandaExists) {
            localStorage.setItem('salesflow_client_active_id_v2', comandaParam);
          } else {
            localStorage.removeItem('salesflow_client_active_id_v2');
          }
          setViewMode('client');
          setIsClientOnlyMode(true);
        } else {
          if (cachedClientActiveId && loadedComandas.some(c => c.id === cachedClientActiveId)) {
            setClientActiveComandaId(cachedClientActiveId);
          } else if (loadedComandas.length > 0) {
            // Auto-select first active or first comanda
            const firstActive = loadedComandas.find(c => c.status === 'Pendente') || loadedComandas[0];
            setClientActiveComandaId(firstActive.id);
            localStorage.setItem('salesflow_client_active_id_v2', firstActive.id);
          } else {
            setClientActiveComandaId(null);
          }
        }
        setIsInitialized(true);
      })
      .catch(err => {
        console.warn("Express local sync offline. Running on client-local fallback state:", err);
        setIsInitialized(true);
      });
  }, []);

  // Polling fallback only for environments without Supabase Realtime.
  useEffect(() => {
    if (!isInitialized) return;
    if (isSupabaseConfigured()) return;

    const intervalMs = 15000;

    const interval = setInterval(async () => {
      try {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        const metaRes = await fetch('/api/state/meta');
        if (!metaRes.ok) return;
        const meta = await metaRes.json();
        if (!meta?.version) return;
        if (!stateMetaVersionRef.current) {
          stateMetaVersionRef.current = meta.version;
          return;
        }
        if (stateMetaVersionRef.current === meta.version) return;
        const stateRes = await fetch('/api/state?light=1');
        if (!stateRes.ok) return;
        applyRemoteState(await stateRes.json());
      } catch {}
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isInitialized]);

  // Supabase Realtime subscription for cross-instance sync
  useEffect(() => {
    if (!isInitialized) return;
    if (!isSupabaseConfigured()) return;

    let debounce: NodeJS.Timeout | null = null;

    const sub = subscribeToSupabaseRealtime(() => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(async () => {
        try {
          const res = await fetch('/api/state?light=1');
          if (!res.ok) return;
          applyRemoteState(await res.json());
        } catch (err) {
          console.warn('[Supabase Realtime] refresh failed:', err);
        }
      }, 400);
    });

    return () => {
      if (debounce) clearTimeout(debounce);
      if (sub) sub.unsubscribe();
    };
  }, [isInitialized]);

  // Sync back into localStorage and server on state updates
  const saveProductsToStorage = (updatedProducts: Product[]) => {
    const now = new Date().toISOString();
    const versionedProducts = updatedProducts.map(product => {
      const previous = productsRef.current.find(p => p.id === product.id);
      return previous && JSON.stringify({ ...previous, updatedAt: undefined }) === JSON.stringify({ ...product, updatedAt: undefined })
        ? product
        : { ...product, updatedAt: now };
    });
    setProducts(versionedProducts);
    const version = Date.now();
    localStorage.setItem('salesflow_products_v2', JSON.stringify(versionedProducts));
    localStorage.setItem('salesflow_comanda_version', version.toString());
    comandaVersionRef.current = version;

    comandaSyncGuardRef.current = true;
    comandaCooldownUntilRef.current = Date.now() + 3000;
    fetch('/api/products/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(versionedProducts)
    }).finally(() => {
      comandaSyncGuardRef.current = false;
    }).catch(() => {});
  };

  const saveReceivablesToStorage = (updatedReceivables: Receivable[]) => {
    const cleanReceivables = updatedReceivables.map(receivable => ({
      ...receivable,
      amount: Number(receivable.amount || 0),
      paidAmount: Number(receivable.paidAmount || 0)
    }));
    setReceivables(cleanReceivables);
    receivablesRef.current = cleanReceivables;
    const version = Date.now();
    localStorage.setItem('salesflow_receivables', JSON.stringify(cleanReceivables));
    localStorage.setItem('salesflow_comanda_version', version.toString());
    comandaVersionRef.current = version;

    fetch('/api/receivables/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanReceivables)
    }).catch(() => {});
  };

  const saveComandasToStorage = (updatedComandas: Comanda[]) => {
    const now = new Date().toISOString();
    const cleanComandas = sanitizeComandas(updatedComandas).map((comanda: Comanda) => {
      const previous = comandasRef.current.find(c => c.id === comanda.id);
      return previous && JSON.stringify({ ...previous, updatedAt: undefined }) === JSON.stringify({ ...comanda, updatedAt: undefined })
        ? comanda
        : { ...comanda, updatedAt: now };
    }) as Comanda[];
    setComandas(cleanComandas);
    saveReceivablesToStorage(syncReceivablesFromComandas(cleanComandas));
    const version = Date.now();
    localStorage.setItem('salesflow_tickets_v2', JSON.stringify(cleanComandas));
    localStorage.setItem('salesflow_comanda_version', version.toString());
    comandaVersionRef.current = version;

    // Prevent polling from overwriting while this POST is in flight
    comandaSyncGuardRef.current = true;
    comandaCooldownUntilRef.current = Date.now() + 3000;
    fetch('/api/comandas/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanComandas)
    }).finally(() => {
      comandaSyncGuardRef.current = false;
    }).catch(() => {});
  };

  const handleSaveCategories = (updatedCategories: string[], updatedProducts?: Product[]) => {
    const changedProducts = updatedProducts
      ? updatedProducts.filter(product => {
        const previous = productsRef.current.find(p => p.id === product.id);
        return previous && previous.category !== product.category;
      }).length
      : 0;
    setCategoriesByScope(prev => ({ ...prev, [scopeKey]: updatedCategories }));
    const version = Date.now();
    localStorage.setItem('salesflow_comanda_version', version.toString());
    comandaVersionRef.current = version;
    
    let currentProds = products;
    if (updatedProducts) {
      const now = new Date().toISOString();
      const scopedProductIds = new Set(updatedProducts.map(product => product.id));
      const versionedScopedProducts = updatedProducts.map(product => {
        const previous = productsRef.current.find(p => p.id === product.id);
        return previous && JSON.stringify({ ...previous, updatedAt: undefined }) === JSON.stringify({ ...product, updatedAt: undefined })
          ? product
          : { ...activeScope, ...product, updatedAt: now };
      });
      currentProds = [
        ...productsRef.current.filter(product => !isInScope(product, activeScope) || !scopedProductIds.has(product.id)),
        ...versionedScopedProducts
      ];
      setProducts(currentProds);
      localStorage.setItem('salesflow_products_v2', JSON.stringify(currentProds));
    }

    comandaSyncGuardRef.current = true;
    comandaCooldownUntilRef.current = Date.now() + 3000;
    fetch('/api/state/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        products: currentProds, 
        comandas: comandasRef.current, 
        notifications: notificationsRef.current, 
        categories: updatedCategories,
        scopeKey,
        receivables: receivablesRef.current,
        auditLogs: auditLogsRef.current
      })
    }).finally(() => {
      comandaSyncGuardRef.current = false;
    }).catch(() => {});
    recordAuditLog({
      action: 'editou',
      entityType: 'categoria',
      entityLabel: 'Categorias de produtos',
      summary: `Atualizou categorias (${updatedCategories.length})${changedProducts ? ` e recategorizou ${changedProducts} produto(s)` : ''}.`,
      details: { totalCategorias: updatedCategories.length, produtosAlterados: changedProducts }
    });
  };

  const handleSaveUnidades = (updatedUnidades: string[], updatedComandas?: Comanda[]) => {
    const changedComandas = updatedComandas
      ? updatedComandas.filter(comanda => {
        const previous = comandasRef.current.find(c => c.id === comanda.id);
        return previous && previous.unit !== comanda.unit;
      }).length
      : 0;
    setUnidadesByScope(prev => ({ ...prev, [scopeKey]: updatedUnidades }));
    const version = Date.now();
    localStorage.setItem('salesflow_comanda_version', version.toString());
    comandaVersionRef.current = version;
    
    let currentComas = comandas;
    if (updatedComandas) {
      currentComas = sanitizeComandas(updatedComandas) as Comanda[];
      setComandas(currentComas);
      localStorage.setItem('salesflow_tickets_v2', JSON.stringify(currentComas));
    }

    comandaSyncGuardRef.current = true;
    comandaCooldownUntilRef.current = Date.now() + 3000;
    fetch('/api/state/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        products: productsRef.current, 
        comandas: currentComas, 
        notifications: notificationsRef.current, 
        categories: categoriesRef.current,
        unidades: updatedUnidades,
        scopeKey,
        receivables: receivablesRef.current,
        auditLogs: auditLogsRef.current
      })
    }).finally(() => {
      comandaSyncGuardRef.current = false;
    }).catch(() => {});
    recordAuditLog({
      action: 'editou',
      entityType: 'unidade',
      entityLabel: 'Unidades de atendimento',
      summary: `Atualizou unidades (${updatedUnidades.length})${changedComandas ? ` e moveu ${changedComandas} comanda(s)` : ''}.`,
      details: { totalUnidades: updatedUnidades.length, comandasAlteradas: changedComandas }
    });
  };

  const recordAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'actorId' | 'actorName' | 'actorLogin' | 'actorRole'>) => {
    const actorName = session?.username || 'Sistema';
    const auditEntry: AuditLogEntry = {
      ...activeScope,
      ...entry,
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorId: session?.id,
      actorName,
      actorLogin: session?.loginName,
      actorRole: session?.role
    };

    setAuditLogs(prev => {
      const updated = mergeAuditLogs([auditEntry], prev);
      auditLogsRef.current = updated;
      localStorage.setItem('salesflow_audit_logs', JSON.stringify(updated));
      localStorage.setItem('salesflow_comanda_version', Date.now().toString());
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditEntry)
      }).catch(() => {});
      return updated;
    });
  };

  const handleUpdateReceivable = (receivable: Receivable) => {
    const now = new Date().toISOString();
    const normalized: Receivable = {
      ...receivable,
      amount: Number(receivable.amount || 0),
      paidAmount: receivable.status === 'Cancelado'
        ? Math.min(Number(receivable.paidAmount || 0), Number(receivable.amount || 0))
        : Math.min(Math.max(Number(receivable.paidAmount || 0), 0), Number(receivable.amount || 0)),
      status: receivable.status === 'Cancelado'
        ? 'Cancelado'
        : getReceivableStatus(Number(receivable.amount || 0), Number(receivable.paidAmount || 0)),
      updatedAt: now,
      paidAt: receivable.status !== 'Cancelado' && Number(receivable.paidAmount || 0) >= Number(receivable.amount || 0)
        ? (receivable.paidAt || now)
        : receivable.paidAt,
      canceledAt: receivable.status === 'Cancelado' ? (receivable.canceledAt || now) : undefined
    };
    saveReceivablesToStorage(mergeReceivables([normalized], receivablesRef.current));
    recordAuditLog({
      action: normalized.status === 'Cancelado' ? 'excluiu' : 'editou',
      entityType: 'comanda',
      entityId: normalized.comandaId,
      entityLabel: normalized.clientName,
      summary: `Atualizou recebível da comanda ${normalized.comandaId}: ${normalized.status} (${normalized.paidAmount.toFixed(2)} de ${normalized.amount.toFixed(2)}).`,
      details: {
        recebivel: normalized.id,
        statusFinanceiro: normalized.status,
        valorTotal: normalized.amount,
        valorBaixado: normalized.paidAmount,
        curso: normalized.courseOrTraining,
        unidade: normalized.unit,
        observacao: normalized.notes
      }
    });
  };

  // Persist user list changes securely in localStorage
  useEffect(() => {
    localStorage.setItem('salesflow_users_v2', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('salesflow_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('salesflow_workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    localStorage.setItem('salesflow_spaces', JSON.stringify(spaces));
  }, [spaces]);

  useEffect(() => {
    localStorage.setItem('salesflow_categories_by_scope', JSON.stringify(categoriesByScope));
  }, [categoriesByScope]);

  useEffect(() => {
    localStorage.setItem('salesflow_unidades_by_scope', JSON.stringify(unidadesByScope));
  }, [unidadesByScope]);

  useEffect(() => {
    localStorage.setItem('salesflow_active_company_id', activeCompanyId);
    localStorage.setItem('salesflow_active_workspace_id', activeWorkspaceId);
    localStorage.setItem('salesflow_active_space_id', activeSpaceId);
    setSelectedComandaId(null);
  }, [activeCompanyId, activeWorkspaceId, activeSpaceId]);

  // Synchronize operating unit with the units catalog list
  useEffect(() => {
    if (scopedUnidades.length > 0 && !scopedUnidades.includes(operatingUnit)) {
      setOperatingUnit(scopedUnidades[0]);
      localStorage.setItem('salesflow_operating_unit', scopedUnidades[0]);
    }
  }, [scopedUnidades, operatingUnit]);

  // Set default client unit when create comanda modal is opened using the operating unit
  useEffect(() => {
    if (isNewComandaModalOpen && scopedUnidades.length > 0) {
      setNewClientUnit(operatingUnit || scopedUnidades[0]);
    }
  }, [isNewComandaModalOpen, scopedUnidades, operatingUnit]);

  // Simulate WhatsApp web scan connection auto-completion after 4.5 seconds of showing QR code
  useEffect(() => {
    let timer: any;
    if (whatsConnectionStatus === 'connecting') {
      timer = setTimeout(() => {
        // Automatically trigger force connect on the server to pair and assign a number if done via QR
        fetch('/api/whatsapp/force-connect', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            if (data.whatsStatus === 'connected') {
              setWhatsConnectionStatus('connected');
              localStorage.setItem('salesflow_whats_status', 'connected');
              if (data.whatsNumber) {
                setSystemWhatsNumber(data.whatsNumber);
                localStorage.setItem('salesflow_system_whats_number', data.whatsNumber);
              }
              
            }
          })
          .catch(err => console.error("Error auto-connecting server session:", err));
      }, 4500);
    }
    return () => clearTimeout(timer);
  }, [whatsConnectionStatus]);

  // Intercept and parse invitation links at startup
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteParam = urlParams.get('invite');
    if (inviteParam) {
      const exists = users.some(u => u.status === 'invited' && u.invitationCode === inviteParam);
      if (exists) {
        setActiveInviteCode(inviteParam);
      } else {
        alert("Aviso: Convite inválido, vencido ou já ativado por outro colaborador.");
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [users]);

  // Real-time listener for multiple browser tabs synchronizing automatically via standard local storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === 'salesflow_products_v2' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setProducts(parsed.map(withDefaultScope));
        }
        if (e.key === 'salesflow_users_v2' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setUsers(parsed);
        }
        if (e.key === 'salesflow_tickets_v2' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setComandas(parsed.map(withDefaultScope));
            const ver = localStorage.getItem('salesflow_comanda_version');
            if (ver) {
              const pv = parseInt(ver);
              if (pv > comandaVersionRef.current) {
                comandaVersionRef.current = pv;
                comandaCooldownUntilRef.current = Date.now() + 3000;
              }
            }
          }
        }
        if (e.key === 'salesflow_client_active_id_v2' && e.newValue) {
          setClientActiveComandaId(e.newValue);
        }
        if (e.key === 'salesflow_session') {
          setSession(e.newValue ? JSON.parse(e.newValue) : null);
        }
        if (e.key === 'salesflow_active_shift') {
          setActiveShift(e.newValue ? withDefaultScope(JSON.parse(e.newValue)) : null);
        }
        if (e.key === 'salesflow_shift_history' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setShiftHistory(parsed.map(withDefaultScope));
        }
        if (e.key === 'salesflow_notifications' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setNotifications(parsed);
        }
      } catch (err) {
        console.error("Error parsing synchronizing storage data from sister tab:", err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const scopedProducts = products.filter(product => isInScope(product, activeScope));
  const scopedComandas = comandas.filter(comanda => isInScope(comanda, activeScope));
  const scopedStockMovements = stockMovements.filter(movement => isInScope(movement, activeScope));
  const scopedReceivables = receivables.filter(receivable => isInScope(receivable, activeScope));
  const scopedAuditLogs = auditLogs.filter(log => isInScope(log, activeScope));
  const scopedShiftHistory = shiftHistory.filter(shift => isInScope(shift, activeScope));
  const scopedActiveShift = activeShift && isInScope(activeShift, activeScope) ? activeShift : null;
  const setScopedProducts: React.Dispatch<React.SetStateAction<Product[]>> = (value) => {
    setProducts(prev => {
      const previousScoped = prev.filter(product => isInScope(product, activeScope));
      const nextScoped = typeof value === 'function'
        ? (value as (current: Product[]) => Product[])(previousScoped)
        : value;
      const scopedIds = new Set(nextScoped.map(product => product.id));
      return [
        ...prev.filter(product => !isInScope(product, activeScope) || !scopedIds.has(product.id)),
        ...nextScoped.map(product => ({ ...activeScope, ...product }))
      ];
    });
  };
  const setScopedStockMovements: React.Dispatch<React.SetStateAction<StockMovement[]>> = (value) => {
    setStockMovements(prev => {
      const previousScoped = prev.filter(movement => isInScope(movement, activeScope));
      const nextScoped = typeof value === 'function'
        ? (value as (current: StockMovement[]) => StockMovement[])(previousScoped)
        : value;
      const scopedIds = new Set(nextScoped.map(movement => movement.id));
      return [
        ...prev.filter(movement => !isInScope(movement, activeScope) || !scopedIds.has(movement.id)),
        ...nextScoped.map(movement => ({ ...activeScope, ...movement }))
      ];
    });
  };

  // Active comanda reference
  const selectedComanda = scopedComandas.find(c => c.id === selectedComandaId) || null;

  // --- BUSINESS LOGIC COMMANDS ---

  // 1. Manage Stock (CRUD)
  const handleSaveProduct = (updatedProduct: Product) => {
    updatedProduct = { ...activeScope, ...updatedProduct };
    const currentProducts = productsRef.current;
    const exists = currentProducts.some(p => p.id === updatedProduct.id);
    const old = currentProducts.find(p => p.id === updatedProduct.id);
    let newProducts: Product[] = [];
    if (exists) {
      newProducts = currentProducts.map(p => p.id === updatedProduct.id ? updatedProduct : p);
      if (old && old.stock !== updatedProduct.stock) {
        const diff = updatedProduct.stock - old.stock;
        const movType = diff > 0 ? 'entrada' : 'saida';
        recordStockMovement({
          id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: updatedProduct.id,
          productName: updatedProduct.name,
          productCode: updatedProduct.code,
          type: movType,
          quantity: Math.abs(diff),
          price: updatedProduct.price,
          totalValue: updatedProduct.price * Math.abs(diff),
          reference: 'Ajuste manual de estoque',
          timestamp: new Date().toISOString()
        });
        recordStockNotification(movType === 'entrada' ? 'entrada' : 'saida', updatedProduct.name, Math.abs(diff), 'Ajuste manual de estoque');
      }
    } else {
      newProducts = [...currentProducts, updatedProduct];
      recordStockMovement({
        id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: updatedProduct.id,
        productName: updatedProduct.name,
        productCode: updatedProduct.code,
        type: 'entrada',
        quantity: updatedProduct.stock,
        price: updatedProduct.price,
        totalValue: updatedProduct.price * updatedProduct.stock,
        reference: 'Cadastro inicial',
        timestamp: new Date().toISOString()
      });
      recordStockNotification('entrada', updatedProduct.name, updatedProduct.stock, 'Cadastro inicial');
    }
    saveProductsToStorage(newProducts);
    recordAuditLog({
      action: exists ? 'editou' : 'criou',
      entityType: 'produto',
      entityId: updatedProduct.id,
      entityLabel: updatedProduct.name,
      summary: exists ? `Editou produto ${updatedProduct.name}.` : `Cadastrou produto ${updatedProduct.name}.`,
      details: {
        codigo: updatedProduct.code,
        categoria: updatedProduct.category,
        estoqueAnterior: old?.stock,
        estoqueNovo: updatedProduct.stock,
        estoqueMinimo: updatedProduct.minStock,
        fornecedor: updatedProduct.supplier,
        custoAnterior: old?.costPrice,
        custoNovo: updatedProduct.costPrice,
        precoAnterior: old?.price,
        precoNovo: updatedProduct.price
      }
    });
  };

  const handleDeleteProduct = (productId: string) => {
    const product = productsRef.current.find(p => p.id === productId);
    const newProducts = productsRef.current.filter(p => p.id !== productId);
    saveProductsToStorage(newProducts);
    if (product) {
      recordAuditLog({
        action: 'excluiu',
        entityType: 'produto',
        entityId: product.id,
        entityLabel: product.name,
        summary: `Excluiu produto ${product.name}.`,
        details: { codigo: product.code, estoque: product.stock, estoqueMinimo: product.minStock, fornecedor: product.supplier, custo: product.costPrice, preco: product.price }
      });
    }
  };

  // 2. Add product/item to comanda (reduces inventory stock!)
  const handleAddProductToComanda = (comandaId: string, productId: string, quantity: number, signature?: string) => {
    const currentProducts = productsRef.current;
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;

    if (product.stock < quantity) {
      alert('Estoque insuficiente para este produto.');
      return;
    }

    // Decrement from inventory database
    const updatedProducts = currentProducts.map(p => {
      if (p.id === productId) {
        return { ...p, stock: p.stock - quantity };
      }
      return p;
    });
    saveProductsToStorage(updatedProducts);

    // Append item to ticket
    const newItem: OrderedItem = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      price: product.price,
      quantity,
      timestamp: new Date().toISOString(),
      signature,
      signedAt: signature ? new Date().toISOString() : undefined
    };

    const currentComandas = comandasRef.current;
    const updatedComandas = currentComandas.map(c => {
      if (c.id === comandaId) {
        return { ...c, items: [...c.items, newItem] };
      }
      return c;
    });

    saveComandasToStorage(updatedComandas);
    recordStockMovement({
      id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      type: 'saida',
      quantity,
      price: product.price,
      totalValue: product.price * quantity,
      reference: `Comanda ${comandaId}`,
      timestamp: new Date().toISOString()
    });
    recordStockNotification('saida', product.name, quantity, `Comanda ${comandaId}`);
    const addedComanda = updatedComandas.find(c => c.id === comandaId);
    recordAuditLog({
      action: 'editou',
      entityType: 'comanda',
      entityId: comandaId,
      entityLabel: addedComanda?.clientName || comandaId,
      summary: `Adicionou ${quantity}x ${product.name} na comanda ${comandaId}.`,
      details: { produto: product.name, codigo: product.code, quantidade: quantity, valorUnitario: product.price }
    });
    if (addedComanda?.clientPhone) dispatchComandaUpdateWhatsApp(addedComanda, 'update');
  };

  // 3. Remove item from comanda (restores stock!)
  const handleRemoveItemFromComanda = (comandaId: string, itemId: string) => {
    const currentComandas = comandasRef.current;
    const targetComanda = currentComandas.find(c => c.id === comandaId);
    if (!targetComanda) return;

    const targetItem = targetComanda.items.find(i => i.id === itemId);
    if (!targetItem) return;

    // Restore product stock first
    const currentProducts = productsRef.current;
    const updatedProducts = currentProducts.map(p => {
      if (p.id === targetItem.productId) {
        return { ...p, stock: p.stock + targetItem.quantity };
      }
      return p;
    });
    saveProductsToStorage(updatedProducts);

    // Strip item from list
    const updatedComandas = currentComandas.map(c => {
      if (c.id === comandaId) {
        return {
          ...c,
          items: c.items.filter(item => item.id !== itemId)
        };
      }
      return c;
    });
    saveComandasToStorage(updatedComandas);
    recordStockMovement({
      id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: targetItem.productId,
      productName: targetItem.productName,
      productCode: targetItem.productCode,
      type: 'entrada',
      quantity: targetItem.quantity,
      price: targetItem.price,
      totalValue: targetItem.price * targetItem.quantity,
      reference: `Estorno Comanda ${comandaId}`,
      timestamp: new Date().toISOString()
    });
    recordStockNotification('entrada', targetItem.productName, targetItem.quantity, `Estorno Comanda ${comandaId}`);
    const removedFrom = updatedComandas.find(c => c.id === comandaId);
    recordAuditLog({
      action: 'editou',
      entityType: 'comanda',
      entityId: comandaId,
      entityLabel: removedFrom?.clientName || comandaId,
      summary: `Removeu ${targetItem.quantity}x ${targetItem.productName} da comanda ${comandaId}.`,
      details: { produto: targetItem.productName, codigo: targetItem.productCode, quantidade: targetItem.quantity, valorUnitario: targetItem.price }
    });
    if (removedFrom?.clientPhone) dispatchComandaUpdateWhatsApp(removedFrom, 'update');
  };

  // 4. Update item quantity in comanda (re-evaluates stock differences)
  const handleUpdateItemQuantity = (comandaId: string, itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;

    const currentComandas = comandasRef.current;
    const targetComanda = currentComandas.find(c => c.id === comandaId);
    if (!targetComanda) return;

    const targetItem = targetComanda.items.find(i => i.id === itemId);
    if (!targetItem) return;

    const stockDifference = newQuantity - targetItem.quantity;
    const currentProducts = productsRef.current;
    const associatedProduct = currentProducts.find(p => p.id === targetItem.productId);

    if (associatedProduct && associatedProduct.stock < stockDifference) {
      alert(`Erro: Estoque insuficiente. Restam apenas ${associatedProduct.stock} unidades de ${associatedProduct.name}.`);
      return;
    }

    // Adjust product inventory
    if (associatedProduct) {
      const updatedProducts = currentProducts.map(p => {
        if (p.id === associatedProduct.id) {
          return { ...p, stock: p.stock - stockDifference };
        }
        return p;
      });
      saveProductsToStorage(updatedProducts);
    }

    // Apply change inside comanda
    const updatedComandas = currentComandas.map(c => {
      if (c.id === comandaId) {
        return {
          ...c,
          items: c.items.map(item => {
            if (item.id === itemId) {
              return { ...item, quantity: newQuantity };
            }
            return item;
          })
        };
      }
      return c;
    });
    saveComandasToStorage(updatedComandas);
    if (stockDifference !== 0) {
      const movType = stockDifference > 0 ? 'saida' as const : 'entrada' as const;
      recordStockMovement({
        id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: targetItem.productId,
        productName: targetItem.productName,
        productCode: targetItem.productCode,
        type: movType,
        quantity: Math.abs(stockDifference),
        price: targetItem.price,
        totalValue: targetItem.price * Math.abs(stockDifference),
        reference: `Ajuste qnt Comanda ${comandaId}`,
        timestamp: new Date().toISOString()
      });
      recordStockNotification(movType, targetItem.productName, Math.abs(stockDifference), `Ajuste qnt Comanda ${comandaId}`);
    }
    const quantityUpdated = updatedComandas.find(c => c.id === comandaId);
    recordAuditLog({
      action: 'editou',
      entityType: 'comanda',
      entityId: comandaId,
      entityLabel: quantityUpdated?.clientName || comandaId,
      summary: `Alterou quantidade de ${targetItem.productName} na comanda ${comandaId}: ${targetItem.quantity} -> ${newQuantity}.`,
      details: { produto: targetItem.productName, quantidadeAnterior: targetItem.quantity, quantidadeNova: newQuantity }
    });
    if (quantityUpdated?.clientPhone) dispatchComandaUpdateWhatsApp(quantityUpdated, 'update');
  };

  // helper to trigger simulated notifications (Configure um sistema de notificação automatizado)
  const triggerNotification = (comanda: Comanda, newStatus: string) => {
    if (!comanda) return;
    const clientName = comanda.clientName || 'Cliente';
    const email = comanda.clientEmail || `${clientName.toString().toLowerCase().replace(/\s+/g, '')}@exemplo.com`;
    const phone = comanda.clientPhone || '(11) 98765-4321';
    const course = comanda.courseOrTraining || 'Geral';

    const emailSubject = `Atualização de Pedido: ${clientName} | SalesFlow`;
    const messageEmail = `Olá ${clientName},\n\nO status do seu pedido para o treinamento "${course}" no sistema SalesFlow mudou de status para: ${newStatus.toUpperCase()}.\n\nE-mail de envio: ${email}\n\nAgradecemos a sua preferência!\n\nSalesFlow Automated System`;
    const messageSms = `SalesFlow: Olá ${clientName}, o status do seu pedido do curso "${course}" foi alterado para ${newStatus.toUpperCase()}! SMS enviado para ${phone}.`;
    
    const comandaLiveUrl = getComandaAccessUrl(comanda);
    const statusEmoji = newStatus === 'Pago' ? '✅ PAGO E ENCERRADO' : `⏳ ${newStatus.toUpperCase()}`;
    const messageWhatsApp = `*SalesFlow* 🛎️\nOlá, *${clientName}*!\nAtualização de comanda (*${comanda.id}*):\n• Status: *${statusEmoji}*\n• Unidade: *${comanda.unit || 'Sede Principal'}*\n\nAcompanhe seu consumo e assine digitalmente: \n${comandaLiveUrl}\n\n_Mensagem automática enviada via sistema WhatsApp SalesFlow do número: ${systemWhatsNumber}_`;

    const newNotifEmail = {
      ...withDefaultScope(comanda),
      id: `NOT-E-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      recipient: clientName,
      course: course,
      contact: email,
      type: 'Email',
      message: messageEmail,
      status: 'Sucesso'
    };

    const newNotifSms = {
      ...withDefaultScope(comanda),
      id: `NOT-S-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      recipient: clientName,
      course: course,
      contact: phone,
      type: 'SMS',
      message: messageSms,
      status: 'Sucesso'
    };

    const isWhatsConnectedState = whatsConnectionStatus === 'connected';

    const newNotifWhatsApp = {
      id: `NOT-W-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      recipient: clientName,
      course: course,
      contact: phone,
      type: 'WhatsApp',
      message: isWhatsConnectedState 
        ? messageWhatsApp 
        : `[ENVIO BLOQUEADO - WHATSAPP DESCONECTADO] ⚠️\nPara habilitar disparos automáticos, conecte o número ${systemWhatsNumber} por QR code no painel administrativo do caixa.\n\n----\n${messageWhatsApp}`,
      status: isWhatsConnectedState ? 'Sucesso' : 'Falha',
      sender: isWhatsConnectedState ? systemWhatsNumber : 'N/A (Desconectado)'
    };

    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const updatedNotifs = [newNotifEmail, newNotifSms, ...safeNotifications];
    setNotifications(updatedNotifs);
    localStorage.setItem('salesflow_notifications', JSON.stringify(updatedNotifs));
    const version = Date.now();
    localStorage.setItem('salesflow_comanda_version', version.toString());
    comandaVersionRef.current = version;

    // Post notification dispatches to Express server
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNotifEmail)
    }).catch(() => {});
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNotifSms)
    }).catch(() => {});
    if (isWhatsConnectedState) {
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotifWhatsApp)
      }).catch(() => {});
    }

    // Toast notifications
    const toastEmailId = `toast-email-${Date.now()}`;
    const toastSmsId = `toast-sms-${Date.now()}`;
    setActiveToasts(prev => [
      ...prev,
      {
        id: toastEmailId,
        title: `✉️ E-mail Automático Enviado`,
        description: `Destinatário: ${comanda.clientName} (${email}) | Status: ${newStatus}`,
        type: 'email'
      },
      {
        id: toastSmsId,
        title: `📱 SMS Automático Enviado`,
        description: `Contato: ${phone} | Status: ${newStatus}`,
        type: 'sms'
      }
    ]);

    // Slide out after 6 seconds
    setTimeout(() => {
      setActiveToasts(current => current.filter(t => t.id !== toastEmailId && t.id !== toastSmsId));
    }, 6000);
  };

  const getComandaAccessUrl = (comanda: Comanda) => {
    const params = new URLSearchParams({
      company: comanda.companyId || DEFAULT_SCOPE.companyId,
      workspace: comanda.workspaceId || DEFAULT_SCOPE.workspaceId,
      space: comanda.spaceId || DEFAULT_SCOPE.spaceId,
      comanda: comanda.id
    });
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const getComandaAccessMessage = (comanda: Comanda) => {
    const accessUrl = getComandaAccessUrl(comanda);
    return `*SalesFlow - Acesso à Comanda*\n\nOlá, *${comanda.clientName || 'Cliente'}*!\n\nSua comanda digital foi aberta com sucesso.\n\n*Código:* ${comanda.id}\n*Unidade:* ${comanda.unit || 'Sede Principal'}\n*Referência:* ${comanda.courseOrTraining || 'Atendimento'}\n*Status:* ${comanda.status}\n\nAcesse pelo link abaixo para acompanhar seu consumo, conferir itens lançados e assinar digitalmente seus pedidos:\n${accessUrl}\n\nApresente esta comanda no caixa para fechamento e pagamento.`;
  };

  const getManualWhatsAppUrl = (phone: string, message: string) => {
    let cleanPhone = String(phone || '').replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    return cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  const dispatchComandaAccessWhatsApp = async (comanda: Comanda) => {
    const message = getComandaAccessMessage(comanda);
    const accessUrl = getComandaAccessUrl(comanda);
    try {
      const res = await fetch('/api/whatsapp/send-comanda-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comanda, message, accessUrl })
      });
      await res.json().catch(() => ({}));
    } catch (err) {
      console.error('Falha ao disparar link da comanda:', err);
    }
  };

  const dispatchComandaUpdateWhatsApp = async (comanda: Comanda, updateType: 'update' | 'close' | 'reminder' = 'update') => {
    if (!comanda.clientPhone) return;
    const accessUrl = getComandaAccessUrl(comanda);
    try {
      await fetch('/api/whatsapp/send-comanda-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comanda, updateType, accessUrl })
      });
    } catch (err) {
      console.error('Falha ao notificar atualização da comanda:', err);
    }
  };

  // --- AUTHENTICATION SYSTEMS (Login para Caixa / Admin) ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const user = loginUsername.trim().toLowerCase();
    const pass = loginPassword;

    // Direct authentications on user array
    const foundUser = users.find(u => 
      u.status === 'active' && 
      (u.username.toLowerCase() === user || u.email.toLowerCase() === user)
    );

    if (foundUser && foundUser.password === pass) {
      if (foundUser.needsPasswordChange) {
        setUserForPasswordChange(foundUser);
        setFirstAccessNewPassword('');
        setFirstAccessNewPasswordConfirm('');
        setFirstAccessError('');
        return;
      }

      const newSession: UserSession = { 
        id: foundUser.id,
        username: foundUser.name, 
        loginName: foundUser.username,
        role: foundUser.role,
        email: foundUser.email,
        avatar: foundUser.avatar,
        companyId: foundUser.companyId || DEFAULT_SCOPE.companyId,
        workspaceIds: foundUser.workspaceIds?.length ? foundUser.workspaceIds : [DEFAULT_SCOPE.workspaceId],
        spaceIds: foundUser.spaceIds?.length ? foundUser.spaceIds : [DEFAULT_SCOPE.spaceId]
      };
      setActiveCompanyId(newSession.companyId || DEFAULT_SCOPE.companyId);
      setActiveWorkspaceId(newSession.workspaceIds?.[0] || DEFAULT_SCOPE.workspaceId);
      setActiveSpaceId(newSession.spaceIds?.[0] || DEFAULT_SCOPE.spaceId);
      setSession(newSession);
      localStorage.setItem('salesflow_session', JSON.stringify(newSession));
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Credenciais inválidas! Use as credenciais ativas do seu colaborador ou "admin" / "123".');
    }
  };

  const handleSaveFirstAccessPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setFirstAccessError('');

    if (firstAccessNewPassword.length < 3) {
      setFirstAccessError('A nova senha definitiva precisa ter pelo menos 3 caracteres.');
      return;
    }

    if (firstAccessNewPassword === userForPasswordChange?.password) {
      setFirstAccessError('A nova senha definitiva deve ser diferente da senha temporária anterior.');
      return;
    }

    if (firstAccessNewPassword !== firstAccessNewPasswordConfirm) {
      setFirstAccessError('As senhas definitivas digitadas não coincidem.');
      return;
    }

    if (!userForPasswordChange) return;

    // Save user with new password and needsPasswordChange = false
    setUsers(curr => curr.map(u => {
      if (u.id === userForPasswordChange.id) {
        return {
          ...u,
          password: firstAccessNewPassword,
          needsPasswordChange: false
        };
      }
      return u;
    }));
    recordAuditLog({
      action: 'editou',
      entityType: 'usuario',
      entityId: userForPasswordChange.id,
      entityLabel: userForPasswordChange.name,
      summary: `Usuário ${userForPasswordChange.name} definiu senha definitiva no primeiro acesso.`,
      details: { login: userForPasswordChange.username }
    });

    // Log the user in
    const updatedUser = {
      ...userForPasswordChange,
      password: firstAccessNewPassword,
      needsPasswordChange: false
    };

    const newSession: UserSession = { 
      id: updatedUser.id,
      username: updatedUser.name, 
      loginName: updatedUser.username,
      role: updatedUser.role,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      companyId: updatedUser.companyId || DEFAULT_SCOPE.companyId,
      workspaceIds: updatedUser.workspaceIds?.length ? updatedUser.workspaceIds : [DEFAULT_SCOPE.workspaceId],
      spaceIds: updatedUser.spaceIds?.length ? updatedUser.spaceIds : [DEFAULT_SCOPE.spaceId]
    };
    setActiveCompanyId(newSession.companyId || DEFAULT_SCOPE.companyId);
    setActiveWorkspaceId(newSession.workspaceIds?.[0] || DEFAULT_SCOPE.workspaceId);
    setActiveSpaceId(newSession.spaceIds?.[0] || DEFAULT_SCOPE.spaceId);
    
    setSession(newSession);
    localStorage.setItem('salesflow_session', JSON.stringify(newSession));
    
    // Clear states
    setUserForPasswordChange(null);
    setLoginUsername('');
    setLoginPassword('');
    setFirstAccessNewPassword('');
    setFirstAccessNewPasswordConfirm('');

    alert(`Sucesso! Sua nova senha definitiva foi registrada com sucesso. Bem-vindo à equipe do SalesFlow, @${updatedUser.username}!`);
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('salesflow_session');
  };

  const openProfileModal = () => {
    if (!session) return;
    setProfileName(session.username || '');
    setProfileEmail(session.email || '');
    setProfileAvatar(session.avatar || '');
    setProfileError('');
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setProfileName('');
    setProfileEmail('');
    setProfileAvatar('');
    setProfileError('');
  };

  const handleProfileAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 160;
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        setProfileAvatar(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const cleanName = profileName.trim();
    const cleanEmail = profileEmail.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      setProfileError('Informe nome e e-mail para salvar o perfil.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setProfileError('Informe um e-mail válido.');
      return;
    }

    const updatedSession: UserSession = {
      ...session,
      username: cleanName,
      email: cleanEmail,
      avatar: profileAvatar || undefined
    };

    setUsers(curr => curr.map(user => {
      const isCurrentUser = user.id === session.id || user.username === session.loginName;
      return isCurrentUser
        ? { ...user, name: cleanName, email: cleanEmail, avatar: profileAvatar || undefined }
        : user;
    }));
    setSession(updatedSession);
    localStorage.setItem('salesflow_session', JSON.stringify(updatedSession));
    recordAuditLog({
      action: 'editou',
      entityType: 'usuario',
      entityId: session.id,
      entityLabel: cleanName,
      summary: `Atualizou perfil do usuário ${cleanName}.`,
      details: { email: cleanEmail }
    });
    closeProfileModal();
  };

  const handleSaveUser = (user: SystemUser) => {
    user = {
      ...user,
      companyId: user.companyId || activeScope.companyId,
      workspaceIds: user.workspaceIds?.length ? user.workspaceIds : [activeScope.workspaceId],
      spaceIds: user.spaceIds?.length ? user.spaceIds : [activeScope.spaceId]
    };
    const existsBefore = users.some(u => u.id === user.id);
    setUsers(curr => {
      const exists = curr.some(u => u.id === user.id);
      if (exists) {
        return curr.map(u => u.id === user.id ? user : u);
      } else {
        return [...curr, user];
      }
    });
    recordAuditLog({
      action: existsBefore ? 'editou' : 'criou',
      entityType: 'usuario',
      entityId: user.id,
      entityLabel: user.name,
      summary: existsBefore ? `Editou usuário ${user.name}.` : `Criou convite/usuário ${user.name}.`,
      details: { login: user.username, email: user.email, perfil: user.role, status: user.status }
    });

    // Create a beautiful SMS/Email log for invitation
    if (user.status === 'invited' && user.invitationCode) {
      const email = user.email;
      const inviteUrl = `${window.location.origin}?invite=${user.invitationCode}&temp_pass=${encodeURIComponent(user.password || '')}`;

      const newNotif = {
        id: `NOT-USR-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        recipient: user.name,
        type: 'Invited',
        channel: 'EMAIL',
        subject: `Convite de Acesso Criado | SalesFlow`,
        body: `Olá ${user.name},\n\nVocê acaba de ser convidado para operar o sistema SalesFlow com o cargo de: ${getUserRoleLabel(user.role)}.\n\nSua senha temporária de primeiro acesso é: "${user.password || '123'}"\n\nUtilize este link de ativação seguro para cadastrar sua senha definitiva: ${inviteUrl}\n\nSalesFlow Security Team`
      };

      setNotifications(prev => [newNotif, ...prev]);

      // Toast notifications
      const toastId = `toast-invite-${Date.now()}`;
      setActiveToasts(prev => [
        ...prev,
        {
          id: toastId,
          title: `✉️ Convite Enviado para ${user.name}`,
          description: `Cargo: ${getUserRoleLabel(user.role)} | Enviado para: ${email}`,
          type: 'email'
        }
      ]);

      setTimeout(() => {
        setActiveToasts(current => current.filter(t => t.id !== toastId));
      }, 6000);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === 'u-superadmin') {
      alert("Acesso root protegido. Impossível deletar o Superadmin original.");
      return;
    }
    setUsers(curr => curr.filter(u => u.id !== userId));
    const deletedUser = users.find(u => u.id === userId);
    if (deletedUser) {
      recordAuditLog({
        action: 'excluiu',
        entityType: 'usuario',
        entityId: deletedUser.id,
        entityLabel: deletedUser.name,
        summary: `Excluiu usuário ${deletedUser.name}.`,
        details: { login: deletedUser.username, email: deletedUser.email, perfil: deletedUser.role }
      });
    }
    if (session?.id === userId) {
      handleLogout();
    }
  };

  const handleActivateUserInvite = (id: string, name: string, username: string, pass: string) => {
    setUsers(curr => curr.map(u => {
      if (u.id === id) {
        return {
          ...u,
          name,
          username,
          password: pass,
          status: 'active',
          needsPasswordChange: false,
          invitationCode: undefined
        };
      }
      return u;
    }));
    recordAuditLog({
      action: 'ativou',
      entityType: 'usuario',
      entityId: id,
      entityLabel: name,
      summary: `Ativou convite do usuário ${name}.`,
      details: { login: username }
    });

    // Toast notifications for successful intake
    const toastId = `toast-activated-${Date.now()}`;
    setActiveToasts(prev => [
      ...prev,
      {
        id: toastId,
        title: `🎉 Conta Ativada com Sucesso!`,
        description: `Olá ${name}, sua credencial @${username} já está ativa. Faça login para assumir o sistema.`,
        type: 'email'
      }
    ]);
    setTimeout(() => {
      setActiveToasts(current => current.filter(t => t.id !== toastId));
    }, 6000);

    // Redirect
    setActiveInviteCode(null);
    setLoginUsername(username);
    // Rewrites query parameter to clean URL cleanly
    window.history.replaceState(null, '', window.location.pathname);
    alert(`Sucesso! Seu usuário @${username} foi ativado. Digite sua senha correspondente na tela de login.`);
  };

  const handleFactoryReset = async () => {
    if (!window.confirm("Atenção: Isso irá zerar COMPLETAMENTE o seu estoque, comandas, turnos de caixa e logs do sistema para testes reais limpos. Deseja continuar?")) {
      return;
    }
    try {
      localStorage.removeItem('salesflow_products_v2');
      localStorage.removeItem('salesflow_tickets_v2');
      localStorage.removeItem('salesflow_notifications');
      localStorage.removeItem('salesflow_client_active_id_v2');
      localStorage.removeItem('salesflow_active_shift');
      localStorage.removeItem('salesflow_shift_history');
      localStorage.removeItem('salesflow_receivables');
      
      // Clear users cache too
      localStorage.removeItem('salesflow_users_v2');
      setUsers([
        {
          id: 'u-superadmin',
          username: 'admin',
          name: 'Afonso Alves (Superadmin)',
          email: 'admin@salesflow.com',
          role: 'admin',
          status: 'active',
          password: '123',
          createdAt: new Date().toISOString()
        },
        {
          id: 'u-caixa',
          username: 'caixa',
          name: 'Caixa Inicial',
          email: 'caixa@salesflow.com',
          role: 'cashier',
          status: 'active',
          password: '123',
          createdAt: new Date().toISOString()
        }
      ]);

      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        setProducts([]);
        setComandas([]);
        setNotifications([]);
        setReceivables([]);
        setActiveShift(null);
        setShiftHistory([]);
        setClientActiveComandaId(null);
        setSelectedComandaId(null);
      } else {
        setProducts([]);
        setComandas([]);
        setNotifications([]);
        setReceivables([]);
        setActiveShift(null);
        setShiftHistory([]);
        setClientActiveComandaId(null);
        setSelectedComandaId(null);
      }
      recordAuditLog({
        action: 'resetou',
        entityType: 'sistema',
        entityLabel: 'Sistema',
        summary: 'Executou reset geral de produtos, comandas, turnos e notificações.',
        details: { produtos: productsRef.current.length, comandas: comandasRef.current.length }
      });
      alert("Sucesso: Módulo zerado para uso imediato! Comece cadastrando um item de estoque no botão 'Estoque & Produtos'.");
    } catch (err) {
      setProducts([]);
      setComandas([]);
      setNotifications([]);
      setReceivables([]);
      setActiveShift(null);
      setShiftHistory([]);
      setClientActiveComandaId(null);
      setSelectedComandaId(null);
      recordAuditLog({
        action: 'resetou',
        entityType: 'sistema',
        entityLabel: 'Sistema',
        summary: 'Limpou cache local após falha/indisponibilidade do reset remoto.',
        details: { produtos: productsRef.current.length, comandas: comandasRef.current.length }
      });
      alert("Sucesso: Cache de dados limpo com sucesso!");
    }
  };

  // --- CASH REGISTER SHIFT ACTIONS (Abertura e Fechamento de Caixa) ---
  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const newShift: CashierShift = {
      ...activeScope,
      id: `SHF-${Math.floor(1000 + Math.random() * 9000)}`,
      openedAt: new Date().toISOString(),
      openedBy: session?.username || 'Usuário',
      initialBalance: Number(openInitialBalance),
      notes: openNotes,
      isActive: true
    };
    setActiveShift(newShift);
    localStorage.setItem('salesflow_active_shift', JSON.stringify(newShift));
    recordAuditLog({
      action: 'abriu',
      entityType: 'caixa',
      entityId: newShift.id,
      entityLabel: `Turno ${newShift.id}`,
      summary: `Abriu turno de caixa com saldo inicial de R$ ${Number(newShift.initialBalance || 0).toFixed(2)}.`,
      details: { saldoInicial: newShift.initialBalance, operador: newShift.openedBy }
    });
    setIsShiftOpenModalOpen(false);
    setOpenNotes('');
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const shiftRevenue = getShiftRevenue(activeShift);
    const cashAdjustment = getShiftCashAdjustment(activeShift);
    const expectedBalance = getExpectedShiftBalance(activeShift);

    const closedShift: CashierShift = {
      ...activeShift,
      closedAt: new Date().toISOString(),
      closedBy: session?.username || 'Usuário',
      finalBalance: expectedBalance,
      actualCashInHand: Number(closeActualCash),
      notes: closeNotes,
      isActive: false
    };

    const updatedHistory = [closedShift, ...shiftHistory];
    setShiftHistory(updatedHistory);
    localStorage.setItem('salesflow_shift_history', JSON.stringify(updatedHistory));

    setActiveShift(null);
    localStorage.removeItem('salesflow_active_shift');
    recordAuditLog({
      action: 'fechou',
      entityType: 'caixa',
      entityId: closedShift.id,
      entityLabel: `Turno ${closedShift.id}`,
      summary: `Fechou turno de caixa. Esperado R$ ${Number(expectedBalance || 0).toFixed(2)}, contado R$ ${Number(closeActualCash || 0).toFixed(2)}.`,
      details: {
        saldoInicial: closedShift.initialBalance,
        faturamento: shiftRevenue,
        ajustesCaixa: cashAdjustment,
        esperado: expectedBalance,
        contado: Number(closeActualCash),
        divergencia: Number(closeActualCash) - expectedBalance
      }
    });
    setIsShiftCloseModalOpen(false);
    setCloseNotes('');
    setCloseActualCash(0);
  };

  const getShiftRevenue = (shift: CashierShift) => {
    return comandas
      .filter(c => isInScope(c, shift as Required<ScopeFields>))
      .filter(c => c.status === 'Pago' && c.closedAt && c.closedAt >= shift.openedAt && (!shift.closedAt || c.closedAt <= shift.closedAt))
      .reduce((val, c) => {
        const comandaValue = c.items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
        return val + comandaValue;
      }, 0);
  };

  const getShiftCashAdjustment = (shift: CashierShift) => {
    return (shift.cashMovements || []).reduce((sum, movement) => {
      const amount = Number(movement.amount || 0);
      return movement.type === 'suprimento' ? sum + amount : sum - amount;
    }, 0);
  };

  const getExpectedShiftBalance = (shift: CashierShift) => {
    return Number(shift.initialBalance || 0) + Number(getShiftRevenue(shift) || 0) + Number(getShiftCashAdjustment(shift) || 0);
  };

  const handleRegisterCashMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    const amount = Number(cashMovementAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Informe um valor válido para a movimentação de caixa.');
      return;
    }

    const movement: CashierCashMovement = {
      id: `CSH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: cashMovementType,
      amount,
      reason: cashMovementReason.trim() || (cashMovementType === 'suprimento' ? 'Suprimento de caixa' : 'Sangria de caixa'),
      createdAt: new Date().toISOString(),
      createdBy: session?.username || 'Usuário'
    };
    const updatedShift = {
      ...activeShift,
      cashMovements: [movement, ...(activeShift.cashMovements || [])]
    };
    setActiveShift(updatedShift);
    localStorage.setItem('salesflow_active_shift', JSON.stringify(updatedShift));
    setCashMovementAmount('');
    setCashMovementReason('');
    recordAuditLog({
      action: 'editou',
      entityType: 'caixa',
      entityId: activeShift.id,
      entityLabel: `Turno ${activeShift.id}`,
      summary: `${cashMovementType === 'suprimento' ? 'Registrou suprimento' : 'Registrou sangria'} de caixa no valor de R$ ${amount.toFixed(2)}.`,
      details: { tipo: cashMovementType, valor: amount, motivo: movement.reason, operador: movement.createdBy }
    });
  };

  const recordStockMovement = (movement: StockMovement) => {
    const scopedMovement = { ...activeScope, ...movement };
    setStockMovements(prev => [scopedMovement, ...prev].slice(0, 1000));
    const version = Date.now();
    localStorage.setItem('salesflow_comanda_version', version.toString());
    comandaVersionRef.current = version;
    fetch('/api/stock-movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scopedMovement)
    }).catch(() => {});
  };

  const recordStockNotification = (type: 'entrada' | 'saida' | 'ajuste', productName: string, quantity: number, reference: string) => {
    const user = session?.loginName || session?.username || 'Sistema';
    const typeLabel = type === 'entrada' ? 'ENTRADA' : type === 'saida' ? 'SAÍDA' : 'AJUSTE';
    const notif = {
      ...activeScope,
      id: `NOT-STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      recipient: user,
      course: type === 'saida' ? 'Venda' : 'Estoque',
      contact: `${quantity}x ${productName}`,
      type: type === 'saida' ? 'Venda' : 'Sistema',
      message: `[${typeLabel}] ${quantity}x ${productName} — ${reference}`,
      status: 'Sucesso',
      sender: user
    };
    setNotifications(prev => {
      const updated = [notif, ...prev].slice(0, 200);
      localStorage.setItem('salesflow_notifications', JSON.stringify(updated));
      const version = Date.now();
      localStorage.setItem('salesflow_comanda_version', version.toString());
      comandaVersionRef.current = version;
      return updated;
    });
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif)
    }).catch(() => {});
  };

  // 5. Close comanda (Mark as Paid and store finished timestamp)
  const handleCloseComanda = (comandaId: string) => {
    let closedComanda: Comanda | undefined;
    const updatedComandas = comandas.map(c => {
      if (c.id === comandaId) {
        // Also remove reminder whenever the ticket is paid/settled
        closedComanda = { ...c, status: 'Pago' as const, closedAt: new Date().toISOString(), closureReminderActive: false };
        return closedComanda;
      }
      return c;
    });
    saveComandasToStorage(updatedComandas);
    if (closedComanda) {
      const total = closedComanda.items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
      recordAuditLog({
        action: 'fechou',
        entityType: 'comanda',
        entityId: closedComanda.id,
        entityLabel: closedComanda.clientName,
        summary: `Fechou comanda ${closedComanda.id} de ${closedComanda.clientName} no valor de R$ ${total.toFixed(2)}.`,
        details: { total, itens: closedComanda.items.length, curso: closedComanda.courseOrTraining, unidade: closedComanda.unit }
      });
      triggerNotification(closedComanda, 'Pago');
      if (closedComanda.clientPhone) dispatchComandaUpdateWhatsApp(closedComanda, 'close');
    }
  };

  const handleToggleClosureReminder = (comandaId: string) => {
    const target = comandas.find(c => c.id === comandaId);
    const wasActive = !!target?.closureReminderActive;
    const updatedComandas = comandas.map(c => {
      if (c.id === comandaId) {
        return { ...c, closureReminderActive: !wasActive };
      }
      return c;
    });
    saveComandasToStorage(updatedComandas);
    recordAuditLog({
      action: 'editou',
      entityType: 'comanda',
      entityId: comandaId,
      entityLabel: target?.clientName || comandaId,
      summary: `${wasActive ? 'Desativou' : 'Ativou'} lembrete de fechamento da comanda ${comandaId}.`,
      details: { lembreteAtivo: !wasActive }
    });
    if (!wasActive && target?.clientPhone) {
      dispatchComandaUpdateWhatsApp(target, 'reminder');
    }
  };

  // 6. Delete a comanda entirely (cancels, restoring inventory of all active unsaved products in it!)
  const handleDeleteComanda = (comandaId: string) => {
    const targetComanda = comandas.find(c => c.id === comandaId);
    if (!targetComanda) return;

    // Restore stock for all non-paid comanda items
    if (targetComanda.status === 'Pendente') {
      let tempProducts = [...productsRef.current];
      targetComanda.items.forEach(item => {
        const prod = productsRef.current.find(p => p.id === item.productId);
        tempProducts = tempProducts.map(p => {
          if (p.id === item.productId) {
            return { ...p, stock: p.stock + item.quantity };
          }
          return p;
        });
        if (prod) {
          recordStockMovement({
            id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            productId: prod.id,
            productName: prod.name,
            productCode: prod.code,
            type: 'entrada',
            quantity: item.quantity,
            price: prod.price,
            totalValue: prod.price * item.quantity,
            reference: `Cancelamento Comanda ${comandaId}`,
            timestamp: new Date().toISOString()
          });
          recordStockNotification('entrada', prod.name, item.quantity, `Cancelamento Comanda ${comandaId}`);
        }
      });
      saveProductsToStorage(tempProducts);
    }

    const updatedComandas = comandas.filter(c => c.id !== comandaId);
    saveComandasToStorage(updatedComandas);
    recordAuditLog({
      action: 'excluiu',
      entityType: 'comanda',
      entityId: targetComanda.id,
      entityLabel: targetComanda.clientName,
      summary: `Excluiu comanda ${targetComanda.id} de ${targetComanda.clientName}.`,
      details: { status: targetComanda.status, itens: targetComanda.items.length, curso: targetComanda.courseOrTraining, unidade: targetComanda.unit }
    });

    if (selectedComandaId === comandaId) {
      setSelectedComandaId(null);
    }
  };

  // 7. Dynamic registration / opening tab from QR Code Simulator
  const handleRegisterNewComanda = (meta: { name: string; type: ClientType; course: string; month: string; email?: string; phone?: string; unit?: string }) => {
    const generatedId = `COM-${Math.floor(1000 + Math.random() * 9000)}`;
    const newComanda: Comanda = {
      ...activeScope,
      id: generatedId,
      clientName: meta.name || 'Cliente Balcão',
      clientType: meta.type || 'Aluno',
      clientEmail: meta.email || '',
      clientPhone: meta.phone || '',
      courseOrTraining: meta.course || 'Sem Curso',
      month: meta.month || 'Junho',
      status: 'Pendente',
      createdAt: new Date().toISOString(),
      items: [],
      unit: meta.unit || (scopedUnidades && scopedUnidades[0]) || 'Sede Principal'
    };

    const safeComandas = Array.isArray(comandas) ? comandas : [];
    const updatedComandas = [newComanda, ...safeComandas];
    saveComandasToStorage(updatedComandas);
    recordAuditLog({
      action: 'criou',
      entityType: 'comanda',
      entityId: newComanda.id,
      entityLabel: newComanda.clientName,
      summary: `Criou comanda ${newComanda.id} para ${newComanda.clientName}.`,
      details: { tipo: newComanda.clientType, curso: newComanda.courseOrTraining, mes: newComanda.month, unidade: newComanda.unit }
    });

    // Store visitor's pointer session
    setClientActiveComandaId(generatedId);
    try {
      localStorage.setItem('salesflow_client_active_id_v2', generatedId);
    } catch (e) {}

    // Alert or select
    setSelectedComandaId(generatedId); // highlights on POS too instantly!

    // Send comanda access link through WhatsApp dispatch.
    try {
      dispatchComandaAccessWhatsApp(newComanda);
    } catch (e) {
      console.error("Error dispatching comanda access link:", e);
    }

    return generatedId;
  };

  // 8. Sign an existing consumption item in the list
  const handleSignExistingComandaItem = (comandaId: string, itemId: string, signature: string) => {
    const updatedComandas = comandas.map(c => {
      if (c.id === comandaId) {
        return {
          ...c,
          items: c.items.map(item => {
            if (item.id === itemId) {
              const signedItem = { ...item, signature, signedAt: new Date().toISOString() };
              return signedItem;
            }
            return item;
          })
        };
      }
      return c;
    });
    saveComandasToStorage(updatedComandas);
    const signedComanda = updatedComandas.find(c => c.id === comandaId);
    const signedItem = signedComanda?.items.find(item => item.id === itemId);
    recordAuditLog({
      action: 'assinou',
      entityType: 'comanda',
      entityId: comandaId,
      entityLabel: signedComanda?.clientName || comandaId,
      summary: `Registrou assinatura de recebimento em ${signedItem?.productName || 'item'} na comanda ${comandaId}.`,
      details: { item: signedItem?.productName, itemId }
    });
    
    // Auto-trigger notification for signed status update "Pedido Assinado / Pronto"
    const currentTicket = comandas.find(c => c.id === comandaId);
    if (currentTicket) {
      triggerNotification(currentTicket, 'Assinado Digitalmente');
      if (currentTicket.clientPhone) dispatchComandaUpdateWhatsApp(currentTicket, 'update');
    }
  };

  // Disconnect simulated client pointer to clear layout
  const handleDisconnectClient = () => {
    setClientActiveComandaId(null);
    localStorage.removeItem('salesflow_client_active_id_v2');
  };

  const handleUpdateOperatingUnit = (unit: string) => {
    setOperatingUnit(unit);
    localStorage.setItem('salesflow_operating_unit', unit);
    recordAuditLog({
      action: 'editou',
      entityType: 'unidade',
      entityLabel: unit,
      summary: `Alterou unidade operacional do caixa para ${unit}.`,
      details: { unidade: unit }
    });
    
    // Automatically preset the creation unit to sync with operational unit
    setNewClientUnit(unit);

    // Prompt Toast confirmation
    const toastId = `toast-unit-${Date.now()}`;
    setActiveToasts(prev => [
      ...prev,
      {
        id: toastId,
        title: "🏢 Unidade de Atendimento",
        description: `Ambiente do caixa reconfigurado para operates na "${unit}".`,
        type: 'email'
      }
    ]);
    setTimeout(() => {
      setActiveToasts(current => current.filter(t => t.id !== toastId));
    }, 4500);
  };

  // Create a new comanda manually from administrative screen back-office
  const handleAdminCreateComandaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientCourse.trim()) {
      alert(newClientType === 'Colaborador' ? 'Por favor, digite o nome e o departamento.' : 'Por favor, digite o nome e o curso do cliente.');
      return;
    }

    const id = handleRegisterNewComanda({
      name: newClientName,
      type: newClientType,
      course: newClientCourse,
      month: newClientMonth,
      email: newClientEmail,
      phone: newClientPhone,
      unit: newClientUnit || scopedUnidades[0] || 'Sede Principal'
    });

    setIsNewComandaModalOpen(false);
    setNewClientName('');
    setNewClientCourse('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientUnit('');

    // Pre-select newly created tab for rapid editing
    setSelectedComandaId(id);
  };

  // --- THEME TAILWIND CONSTANTS RE-EVALUATION ---
  const getThemeClasses = () => {
    switch (theme) {
      case 'gold-dark':
        return {
          bg: 'theme-frz-dark bg-[#09090B]',
          headerBg: 'bg-[#121214] border-white/5',
          textColor: 'text-slate-200',
          brandColor: 'bg-frz-primary hover:bg-frz-primary-hover text-white',
          accentBorder: 'border-white/5',
          primaryText: 'text-white',
        };
      case 'emerald':
        return {
          bg: 'bg-[#F2F4F3]',
          headerBg: 'bg-emerald-900 border-emerald-950',
          textColor: 'text-emerald-950',
          brandColor: 'bg-emerald-600 hover:bg-emerald-700',
          accentBorder: 'border-emerald-200',
          primaryText: 'text-emerald-900',
        };
      case 'midnight':
        return {
          bg: 'bg-[#0F172A]',
          headerBg: 'bg-slate-950 border-slate-900',
          textColor: 'text-slate-100',
          brandColor: 'bg-indigo-600 hover:bg-indigo-500',
          accentBorder: 'border-slate-800',
          primaryText: 'text-white',
        };
      case 'slate':
      default:
        return {
          bg: 'bg-slate-100/60',
          headerBg: 'bg-[#1E293B] border-[#0F172A]',
          textColor: 'text-slate-900',
          brandColor: 'bg-[#4F46E5] hover:bg-[#4338CA]',
          accentBorder: 'border-slate-200',
          primaryText: 'text-slate-900',
        };
    }
  };

  const themeStyle = getThemeClasses();
  const visibleNotifications = notifications.filter(notif => notif?.type !== 'WhatsApp');
  const auditEntityLabels: Record<AuditEntityType, string> = {
    comanda: 'Comanda',
    produto: 'Produto',
    estoque: 'Estoque',
    caixa: 'Caixa',
    usuario: 'Usuário',
    unidade: 'Unidade',
    categoria: 'Categoria',
    pdv: 'PDV',
    sistema: 'Sistema'
  };
  const filteredAuditLogs = scopedAuditLogs.filter(log => {
    if (auditEntityFilter !== 'all' && log.entityType !== auditEntityFilter) return false;
    if (auditDateFilter && !String(log.timestamp || '').startsWith(auditDateFilter)) return false;
    const query = auditSearch.trim().toLowerCase();
    if (!query) return true;
    return [log.actorName, log.actorLogin, log.entityLabel, log.entityId, log.summary, log.action, log.entityType]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(query));
  });

  // Render Activation Invitation Screen if code is active
  if (activeInviteCode) {
    const invitedUser = users.find(u => u.status === 'invited' && u.invitationCode === activeInviteCode);
    if (invitedUser) {
      return (
        <InviteActivation
          invitedUser={invitedUser}
          onActivate={handleActivateUserInvite}
          onCancel={() => {
            setActiveInviteCode(null);
            window.history.replaceState(null, '', window.location.pathname);
          }}
        />
      );
    }
  }

  if (isClientOnlyMode) {
    return (
      <div id="app-root" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-0 md:p-4 select-none">
        
        {/* SalesFlow Live Automatic Email/SMS Toast Despatches */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {activeToasts.map(toast => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-slate-900/95 text-white border border-slate-800 rounded-2xl p-3.5 shadow-2xl flex gap-3.5 items-start animate-slideIn"
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${toast.type === 'email' ? 'bg-amber-500/20 text-amber-400' : 'bg-frz-primary/20 text-frz-primary'}`}>
                {toast.type === 'email' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-black block tracking-wide text-slate-200">{toast.title}</span>
                <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{toast.description}</p>
                <div className="text-[9px] text-frz-primary font-bold tracking-widest uppercase mt-2 select-none">● Envio Automatizado Efetuado</div>
              </div>
            </div>
          ))}
        </div>

        {/* Outer view wrapping just the client card but seamlessly styled */}
        <div className="w-full max-w-[390px] min-h-screen md:min-h-[640px] flex items-center justify-center">
          <ClientMobileView
            comandas={scopedComandas}
            products={scopedProducts}
            activeComandaId={clientActiveComandaId}
            isSyncing={!isInitialized}
            onAddProductFromClient={handleAddProductToComanda}
            onSignExistingItem={handleSignExistingComandaItem}
            onDisconnectClient={handleDisconnectClient}
          />
        </div>
      </div>
    );
  }

  return (
    <div id="app-root" className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${themeStyle.bg}`}>
      
      {/* SalesFlow Live Automatic Email/SMS Toast Despatches */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {activeToasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900/95 text-white border border-slate-800 rounded-2xl p-3.5 shadow-2xl flex gap-3.5 items-start animate-slideIn"
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${toast.type === 'email' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
              {toast.type === 'email' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black block tracking-wide text-slate-200">{toast.title}</span>
              <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{toast.description}</p>
              <div className="text-[9px] text-frz-primary font-bold tracking-widest uppercase mt-2 select-none">● Envio Automatizado Efetuado</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. DYNAMIC LAYOUT AREA */}
      <main className="flex-1 max-w-full w-full mx-auto p-3 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* LEFT COLUMN: ESTAÇÃO PRINCIPAL / ADMIN POS (Renders if mode is BOTH or ADMIN) */}
        {(viewMode === 'both' || viewMode === 'admin') && (
          <div className={`${viewMode === 'both' && activeAdminSubTab !== 'pdv' ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-4`}>
            
            {session === null ? (
              userForPasswordChange ? (
                /* PASSWORD RESET ON FIRST LOGIN OVERLAY/FORM */
                <div id="first-access-password-change" className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full mx-auto my-12 shadow-2xl space-y-6 animate-slideIn text-left">
                  <div className="text-center">
                    <div className="relative w-14 h-14 bg-frz-primary/10 border border-frz-primary/20 text-frz-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Key className="w-7 h-7 text-frz-primary" />
                    </div>
                    <h2 className="text-xl font-extrabold text-white font-sans">Cadastrar Senha Definitiva</h2>
                    <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed font-semibold">
                      Olá, <strong className="text-white font-black">{userForPasswordChange.name}</strong> (@{userForPasswordChange.username}). Seu acesso inicial com senha temporária foi validado. Por segurança, altere sua senha para uma senha definitiva pessoal.
                    </p>
                  </div>

                  <form onSubmit={handleSaveFirstAccessPassword} className="space-y-4">
                    {firstAccessError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold text-center">
                        {firstAccessError}
                      </div>
                    )}

                    <div>
                      <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Status da Credencial</span>
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-pulse" />
                        Senha Temporária Validada com Sucesso
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Sua Nova Senha Definitiva</label>
                      <input
                        type="password"
                        required
                        value={firstAccessNewPassword}
                        onChange={(e) => setFirstAccessNewPassword(e.target.value)}
                        placeholder="Mínimo de 3 caracteres"
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-frz-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Confirmar Nova Senha Definitiva</label>
                      <input
                        type="password"
                        required
                        value={firstAccessNewPasswordConfirm}
                        onChange={(e) => setFirstAccessNewPasswordConfirm(e.target.value)}
                        placeholder="Repita a nova senha definitiva"
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-frz-primary"
                      />
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setUserForPasswordChange(null)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Cancelar
                        </button>
                          <button
                          type="submit"
                        className="flex-1 py-3 bg-frz-primary hover:bg-frz-primary-hover text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
                      >
                        Ativar & Entrar
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* GATED LOGIN SCREEN for administrative/cashier operations */
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full mx-auto my-12 shadow-2xl space-y-6">
                <div className="text-center">
                  <div className="flex justify-center mb-4 transform scale-110 drop-shadow-md">
                    {renderBrandLogo(brandLogoOption)}
                  </div>
                  <h2 className="text-xl font-extrabold text-white font-sans">SalesFlow POS</h2>
                  <p className="text-xs text-slate-400 mt-1">Acesso ao caixa, estoque e relatórios de comanda.</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {loginError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold text-center">
                      {loginError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Usuário do Caixa ou E-mail</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: admin ou caixa"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-frz-primary font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Senha de Acesso</label>
                    <input
                      type="password"
                      required
                      placeholder="Senha numérica"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-frz-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-frz-primary hover:bg-frz-primary-hover text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow"
                  >
                    <LogIn className="w-4 h-4" />
                    Entrar no Sistema
                  </button>
                </form>

                <div className="border-t border-slate-800/85 pt-4 text-center">
                  <span className="text-[10px] text-slate-500 block">Credenciais Padrão do Sistema:</span>
                  <div className="mt-1.5 text-[10px] text-slate-400 font-mono space-y-1">
                    <p>Caixa: <strong className="text-amber-500">caixa</strong> / senha: <strong className="text-amber-500">123</strong></p>
                    <p>Admin: <strong className="text-amber-500">admin</strong> / senha: <strong className="text-amber-500">123</strong></p>
                  </div>
                </div>
              </div>
            )
          ) : (
              /* ACTIVE POS WORKSPACE */
              <>
                {/* Active Session strip - displaying roles, cashier status, shift triggers */}
                <div className="bg-slate-800/45 p-3 rounded-2xl border border-slate-700/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-slate-300">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        {session.username}
                        <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-black uppercase">{getUserRoleLabel(session.role)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Sessão Comercial Autenticada</p>
                    </div>
                  </div>

                  {/* Cashier Operating Branch Select Option */}
                  <div className="flex items-center gap-2.5 bg-slate-900/60 hover:bg-slate-900/85 border border-slate-700/40 p-2.5 px-3.5 rounded-2xl transition duration-150 shadow-inner w-full sm:w-auto">
                    <MapPin className="w-3.5 h-3.5 text-frz-primary shrink-0" />
                    <div className="text-left">
                      <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest leading-none mb-0.5">Unidade Ativa do Caixa</span>
                      <select
                        id="cashier-operating-unit-select"
                        value={operatingUnit}
                        onChange={(e) => handleUpdateOperatingUnit(e.target.value)}
                        className="bg-transparent border-none text-xs font-black text-frz-primary focus:outline-none cursor-pointer pr-5 font-mono select-none"
                        style={{ colorScheme: 'dark' }}
                      >
                        {scopedUnidades.map(u => (
                          <option key={u} value={u} className="bg-slate-900 text-white font-sans font-bold">{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/60 border border-slate-700/40 p-2.5 rounded-2xl shadow-inner w-full xl:w-auto">
                    <div className="text-left min-w-[130px]">
                      <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest leading-none mb-1">Empresa</span>
                      <select
                        value={activeCompanyId}
                        onChange={(e) => {
                          const companyId = e.target.value;
                          const nextWorkspace = workspaces.find(workspace => workspace.companyId === companyId) || DEFAULT_WORKSPACE;
                          const nextSpace = spaces.find(space => space.companyId === companyId && space.workspaceId === nextWorkspace.id) || DEFAULT_SPACE;
                          setActiveCompanyId(companyId);
                          setActiveWorkspaceId(nextWorkspace.id);
                          setActiveSpaceId(nextSpace.id);
                        }}
                        className="w-full bg-transparent border-none text-xs font-black text-frz-primary focus:outline-none cursor-pointer font-mono"
                        style={{ colorScheme: 'dark' }}
                      >
                        {companies.filter(company => company.status === 'active').map(company => (
                          <option key={company.id} value={company.id} className="bg-slate-900 text-white font-sans font-bold">{company.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-left min-w-[130px]">
                      <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest leading-none mb-1">Workspace</span>
                      <select
                        value={activeWorkspaceId}
                        onChange={(e) => {
                          const workspaceId = e.target.value;
                          const nextSpace = spaces.find(space => space.companyId === activeCompanyId && space.workspaceId === workspaceId) || DEFAULT_SPACE;
                          setActiveWorkspaceId(workspaceId);
                          setActiveSpaceId(nextSpace.id);
                        }}
                        className="w-full bg-transparent border-none text-xs font-black text-frz-primary focus:outline-none cursor-pointer font-mono"
                        style={{ colorScheme: 'dark' }}
                      >
                        {workspaces.filter(workspace => workspace.companyId === activeCompanyId && workspace.status === 'active').map(workspace => (
                          <option key={workspace.id} value={workspace.id} className="bg-slate-900 text-white font-sans font-bold">{workspace.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-left min-w-[130px]">
                      <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest leading-none mb-1">Frente de Venda</span>
                      <select
                        value={activeSpaceId}
                        onChange={(e) => setActiveSpaceId(e.target.value)}
                        className="w-full bg-transparent border-none text-xs font-black text-frz-primary focus:outline-none cursor-pointer font-mono"
                        style={{ colorScheme: 'dark' }}
                      >
                        {spaces.filter(space => space.companyId === activeCompanyId && space.workspaceId === activeWorkspaceId && space.status === 'active').map(space => (
                          <option key={space.id} value={space.id} className="bg-slate-900 text-white font-sans font-bold">{space.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {scopedActiveShift ? (
                      <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Caixa Aberto ({scopedActiveShift.id})
                        </span>
                        <button
                          onClick={() => {
                            setCloseActualCash(getExpectedShiftBalance(scopedActiveShift));
                            setIsShiftCloseModalOpen(true);
                          }}
                          className="bg-frz-primary hover:bg-frz-primary-hover text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition shrink-0 cursor-pointer shadow-sm"
                        >
                          Fechar Caixa
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
                        <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" />
                          Caixa Fechado
                        </span>
                        <button
                          onClick={() => {
                            setOpenInitialBalance(150);
                            setIsShiftOpenModalOpen(true);
                          }}
                          className="bg-frz-primary hover:bg-frz-primary-hover text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition shrink-0 shadow-sm cursor-pointer"
                        >
                          Abrir Caixa
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/30 shrink-0">
                      <button
                        onClick={() => setViewMode('both')}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'both' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        title="Mostrar tela de caixa e celular do cliente juntas"
                      >
                        <Layout className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('admin')}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'admin' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        title="Apenas tela principal do Caixa/Administrador"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('client')}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'client' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        title="Apenas celular do cliente via QR Code"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>

                {/* Sidebar + Content Layout */}
                <div className="flex flex-col xl:flex-row gap-3 items-stretch">
                  {/* Sidebar */}
                  <aside className={`bg-[#111827] border border-slate-800/80 rounded-2xl shadow-frz-card shrink-0 overflow-hidden text-white flex flex-col xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] transition-all duration-300 ${sidebarCollapsed ? 'w-[68px]' : 'w-full xl:w-[232px]'}`}>
                    {/* Header - click to toggle collapse */}
                    <button
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="p-3.5 border-b border-slate-800/80 flex items-center gap-3 w-full hover:bg-white/5 transition cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-frz-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Layout className="w-5 h-5" />
                      </div>
                      {!sidebarCollapsed && (
                        <div className="min-w-0 text-left">
                          <div className="text-[13px] font-black tracking-tight truncate">SalesFlow POS</div>
                          <div className="text-[10px] text-slate-400 font-semibold truncate">Grupo FRZ</div>
                        </div>
                      )}
                    </button>

                    <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
                      {(hasTabAccess('comandas') || hasTabAccess('pdv') || hasTabAccess('caixa_notificacoes')) && (
                      <div className="space-y-1">
                        {!sidebarCollapsed && <span className="px-2.5 text-[10px] font-black uppercase tracking-widest text-blue-300/80">Operação</span>}
                        {hasTabAccess('comandas') && (
                        <button
                          onClick={() => {
                            setActiveAdminSubTab('comandas');
                            setSelectedComandaId(null);
                            if (sidebarCollapsed) setSidebarCollapsed(false);
                          }}
                          className={`w-full flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            activeAdminSubTab === 'comandas'
                              ? 'bg-frz-primary/15 text-white'
                              : 'text-slate-100 hover:bg-white/5 hover:text-white'
                          }`}
                          title={sidebarCollapsed ? 'Comandas' : undefined}
                        >
                          <span className={`${sidebarCollapsed ? 'mx-auto' : ''} w-8 h-8 rounded-full bg-frz-primary/15 text-frz-primary flex items-center justify-center shrink-0`}>
                            <Layers className="w-4 h-4" />
                          </span>
                          {!sidebarCollapsed && (
                            <span className="text-left min-w-0">
                              <span className="block truncate">Comandas</span>
                              <span className="block text-[9px] text-slate-400 font-semibold">{scopedComandas.filter(c => c.status === 'Pendente').length} ativas</span>
                            </span>
                          )}
                        </button>
                        )}
                        {hasTabAccess('pdv') && (
                        <button
                          onClick={() => {
                            setActiveAdminSubTab('pdv');
                            setSelectedComandaId(null);
                            if (sidebarCollapsed) setSidebarCollapsed(false);
                          }}
                          className={`w-full flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            !sidebarCollapsed ? '' : ''
                          } text-slate-100 hover:bg-white/5 hover:text-white`}
                          title={sidebarCollapsed ? 'PDV' : undefined}
                        >
                          <span className={`${sidebarCollapsed ? 'mx-auto' : ''} w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0`}>
                            <CreditCard className="w-4 h-4" />
                          </span>
                          {!sidebarCollapsed && (
                            <span className="text-left min-w-0">
                              <span className="block truncate">PDV</span>
                              <span className="block text-[9px] text-slate-400 font-semibold">Nova Venda</span>
                            </span>
                          )}
                        </button>
                        )}
                        {hasTabAccess('caixa_notificacoes') && (
                        <button
                          onClick={() => {
                            setActiveAdminSubTab('caixa_notificacoes');
                            if (sidebarCollapsed) setSidebarCollapsed(false);
                          }}
                          className={`w-full flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            activeAdminSubTab === 'caixa_notificacoes'
                              ? 'bg-frz-primary/15 text-white'
                              : 'text-slate-100 hover:bg-white/5 hover:text-white'
                          }`}
                          title={sidebarCollapsed ? 'Caixa' : undefined}
                        >
                          <span className={`${sidebarCollapsed ? 'mx-auto' : ''} w-8 h-8 rounded-full bg-frz-primary/15 text-frz-primary flex items-center justify-center shrink-0`}>
                            <DollarSign className="w-4 h-4" />
                          </span>
                          {!sidebarCollapsed && (
                            <span className="text-left min-w-0">
                              <span className="block truncate">Caixa</span>
                              <span className="block text-[9px] text-slate-400 font-semibold">Notificações</span>
                            </span>
                          )}
                        </button>
                        )}
                      </div>
                      )}

                      {(hasTabAccess('estoque') || hasTabAccess('fluxo')) && (
                      <div className="space-y-1">
                        {!sidebarCollapsed && <span className="px-2.5 text-[10px] font-black uppercase tracking-widest text-blue-300/80">Compras</span>}
                        {hasTabAccess('estoque') && (
                        <button
                          onClick={() => {
                            setActiveAdminSubTab('estoque');
                            if (sidebarCollapsed) setSidebarCollapsed(false);
                          }}
                          className={`w-full flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            activeAdminSubTab === 'estoque'
                              ? 'bg-frz-primary/15 text-white'
                              : 'text-slate-100 hover:bg-white/5 hover:text-white'
                          }`}
                          title={sidebarCollapsed ? 'Estoque' : undefined}
                        >
                          <span className={`${sidebarCollapsed ? 'mx-auto' : ''} w-8 h-8 rounded-full bg-frz-primary/15 text-frz-primary flex items-center justify-center shrink-0`}>
                            <Package className="w-4 h-4" />
                          </span>
                          {!sidebarCollapsed && (
                            <span className="text-left min-w-0">
                              <span className="block truncate">Estoque e Produtos</span>
                              <span className="block text-[9px] text-slate-400 font-semibold">{scopedProducts.length} produtos</span>
                            </span>
                          )}
                        </button>
                        )}
                        {hasTabAccess('fluxo') && (
                        <button
                          onClick={() => {
                            setActiveAdminSubTab('fluxo');
                            if (sidebarCollapsed) setSidebarCollapsed(false);
                          }}
                          className={`w-full flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            activeAdminSubTab === 'fluxo'
                              ? 'bg-frz-primary/15 text-white'
                              : 'text-slate-100 hover:bg-white/5 hover:text-white'
                          }`}
                          title={sidebarCollapsed ? 'Fluxo' : undefined}
                        >
                          <span className={`${sidebarCollapsed ? 'mx-auto' : ''} w-8 h-8 rounded-full bg-frz-primary/15 text-frz-primary flex items-center justify-center shrink-0`}>
                            <TrendingUp className="w-4 h-4" />
                          </span>
                          {!sidebarCollapsed && (
                            <span className="text-left min-w-0">
                              <span className="block truncate">Fluxo de Vendas</span>
                              <span className="block text-[9px] text-slate-400 font-semibold">Vendas/Estoque</span>
                            </span>
                          )}
                        </button>
                        )}
                      </div>
                      )}

                      {(hasTabAccess('acessos') || hasTabAccess('auditoria')) && (
                        <div className="space-y-1">
                          {!sidebarCollapsed && <span className="px-2.5 text-[10px] font-black uppercase tracking-widest text-blue-300/80">Administração</span>}
                          {hasTabAccess('acessos') && (
                          <button
                            onClick={() => {
                              setActiveAdminSubTab('acessos');
                              if (sidebarCollapsed) setSidebarCollapsed(false);
                            }}
                            className={`w-full flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                              activeAdminSubTab === 'acessos'
                                ? 'bg-frz-primary/15 text-white'
                                : 'text-slate-100 hover:bg-white/5 hover:text-white'
                            }`}
                            title={sidebarCollapsed ? 'Acessos' : undefined}
                          >
                            <span className={`${sidebarCollapsed ? 'mx-auto' : ''} w-8 h-8 rounded-full bg-frz-primary/15 text-frz-primary flex items-center justify-center shrink-0`}>
                              <Users className="w-4 h-4" />
                            </span>
                            {!sidebarCollapsed && (
                              <span className="text-left min-w-0">
                                <span className="block truncate">Controle de Acessos</span>
                                <span className="block text-[9px] text-slate-400 font-semibold">{users.length} usuários</span>
                              </span>
                            )}
                          </button>
                          )}
                          {hasTabAccess('auditoria') && (
                          <button
                            onClick={() => {
                              setActiveAdminSubTab('auditoria');
                              if (sidebarCollapsed) setSidebarCollapsed(false);
                            }}
                            className={`w-full flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                              activeAdminSubTab === 'auditoria'
                                ? 'bg-frz-primary/15 text-white'
                                : 'text-slate-100 hover:bg-white/5 hover:text-white'
                            }`}
                            title={sidebarCollapsed ? 'Auditoria' : undefined}
                          >
                            <span className={`${sidebarCollapsed ? 'mx-auto' : ''} w-8 h-8 rounded-full bg-frz-primary/15 text-frz-primary flex items-center justify-center shrink-0`}>
                              <History className="w-4 h-4" />
                            </span>
                            {!sidebarCollapsed && (
                              <span className="text-left min-w-0">
                                <span className="block truncate">Auditoria</span>
                                <span className="block text-[9px] text-slate-400 font-semibold">{scopedAuditLogs.length} registros</span>
                              </span>
                            )}
                          </button>
                          )}
                          {hasTabAccess('frentes') && (
                          <button
                            onClick={() => {
                              setActiveAdminSubTab('frentes');
                              if (sidebarCollapsed) setSidebarCollapsed(false);
                            }}
                            className={`w-full flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                              activeAdminSubTab === 'frentes'
                                ? 'bg-frz-primary/15 text-white'
                                : 'text-slate-100 hover:bg-white/5 hover:text-white'
                            }`}
                            title={sidebarCollapsed ? 'Estrutura' : undefined}
                          >
                            <span className={`${sidebarCollapsed ? 'mx-auto' : ''} w-8 h-8 rounded-full bg-frz-primary/15 text-frz-primary flex items-center justify-center shrink-0`}>
                              <Building2 className="w-4 h-4" />
                            </span>
                            {!sidebarCollapsed && (
                              <span className="text-left min-w-0">
                                <span className="block truncate">Estrutura</span>
                                <span className="block text-[9px] text-slate-400 font-semibold">{companies.length} empresas</span>
                              </span>
                            )}
                          </button>
                          )}
                        </div>
                      )}
                    </nav>

                    <div className="border-t border-slate-800/80 p-3 space-y-3">
                      {!sidebarCollapsed && (
                        <button
                          onClick={() => setTheme(theme === 'gold-dark' ? 'slate' : 'gold-dark')}
                          className="w-full flex items-center gap-2 text-[10px] font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                          {theme === 'gold-dark' ? 'Tema claro' : 'Tema escuro'}
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openProfileModal}
                          className={`${sidebarCollapsed ? 'mx-auto justify-center' : 'flex-1'} min-w-0 flex items-center gap-3 rounded-xl hover:bg-white/5 transition cursor-pointer text-left`}
                          title="Editar perfil"
                        >
                          <div className="w-9 h-9 rounded-full bg-frz-primary text-white flex items-center justify-center text-sm font-black shrink-0 overflow-hidden">
                            {session.avatar ? (
                              <img src={session.avatar} alt={session.username} className="w-full h-full object-cover" />
                            ) : (
                              session.username?.charAt(0).toUpperCase() || 'A'
                            )}
                          </div>
                          {!sidebarCollapsed && (
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black truncate">{session.username}</div>
                              <div className="text-[10px] text-slate-400 truncate">{session.email || session.loginName}</div>
                            </div>
                          )}
                        </button>
                        <button
                          onClick={handleLogout}
                          className={`${sidebarCollapsed ? 'mx-auto w-9 px-0' : 'px-2.5'} h-9 rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-slate-700/70 hover:border-rose-800 text-slate-300 hover:text-rose-200 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0`}
                          title="Sair do sistema sem fechar o caixa"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {!sidebarCollapsed && <span className="text-[10px] font-black uppercase">Sair</span>}
                        </button>
                      </div>
                    </div>
                  </aside>

                  {/* Content area */}
                  <div className="flex-1 min-w-0">

                {/* Warning message if they haven't opened the cashier register yet */}
                {!scopedActiveShift && activeAdminSubTab !== 'caixa_notificacoes' && activeAdminSubTab !== 'acessos' && activeAdminSubTab !== 'auditoria' && activeAdminSubTab !== 'pdv' && activeAdminSubTab !== 'frentes' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-2xl text-xs flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                    <div className="flex gap-2 items-start">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                      <div>
                        <strong>Turno de Caixa Fechado!</strong>
                        <p className="mt-0.5 opacity-90">Abra o caixa informando o saldo de abertura antes de efetuar recebimentos e faturamentos de comandas.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsShiftOpenModalOpen(true)}
                      className="bg-frz-primary hover:bg-frz-primary-hover text-white px-3.5 py-1.5 rounded-xl font-bold font-mono text-[10px] uppercase cursor-pointer transition shrink-0"
                    >
                      Abertura de Caixa 🔑
                    </button>
                  </div>
                )}

                {/* Sub-Tab rendering logic */}
                {!hasTabAccess(activeAdminSubTab) ? (
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8 text-center animate-fadeIn">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900">Acesso Restrito</h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      Seu perfil não possui permissão para este módulo.
                    </p>
                  </div>
                ) : activeAdminSubTab === 'pdv' ? (
                  <DirectPOSView
                    products={scopedProducts}
                    operatingUnit={operatingUnit}
                    setStockMovements={setScopedStockMovements}
                    setProducts={setScopedProducts}
                    stockMovements={scopedStockMovements}
                    onStockNotification={recordStockNotification}
                    onAudit={(event) => {
                      recordAuditLog({
                        action: event.action,
                        entityType: 'pdv',
                        entityId: event.saleNumber,
                        entityLabel: `Venda PDV ${event.saleNumber}`,
                        summary: event.action === 'criou'
                          ? `Finalizou venda PDV ${event.saleNumber} para ${event.customerName} no valor de R$ ${event.total.toFixed(2)}.`
                          : `Estornou venda PDV ${event.saleNumber} no valor de R$ ${event.total.toFixed(2)}.`,
                        details: { cliente: event.customerName, total: event.total, itens: event.itemCount }
                      });
                    }}
                    verifyRefundLogin={(login, password) => {
                      const user = users.find(u =>
                        u.username.toLowerCase() === login.toLowerCase() &&
                        u.password === password &&
                        u.role === 'admin' &&
                        u.status === 'active'
                      );
                      return !!user;
                    }}
                  />
                ) : activeAdminSubTab === 'estoque' ? (
                  <StockManagement
                    products={scopedProducts}
                    onSaveProduct={handleSaveProduct}
                    onDeleteProduct={handleDeleteProduct}
                    categories={scopedCategories}
                    onSaveCategories={handleSaveCategories}
                  />
                ) : activeAdminSubTab === 'fluxo' ? (
                  <FluxoDashboard
                    products={scopedProducts}
                    comandas={scopedComandas}
                    receivables={scopedReceivables}
                    onUpdateReceivable={handleUpdateReceivable}
                    stockMovements={scopedStockMovements}
                    setStockMovements={setScopedStockMovements}
                    activeShift={scopedActiveShift}
                    shiftHistory={scopedShiftHistory}
                  />
                ) : activeAdminSubTab === 'acessos' ? (
                  <AccessManagement
                    users={users}
                    onSaveUser={handleSaveUser}
                    onDeleteUser={handleDeleteUser}
                    currentUserSessionId={session?.id}
                    onSimulateInvite={(code) => {
                      setActiveInviteCode(code);
                    }}
                    onResetSystem={() => {
                      const emptyProducts: Product[] = [];
                      const emptyComandas: Comanda[] = [];
                      const emptyNotifications: any[] = [];
                      const emptyStockMovements: StockMovement[] = [];
                      const emptyReceivables: Receivable[] = [];
                      saveProductsToStorage(emptyProducts);
                      saveComandasToStorage(emptyComandas);
                      setNotifications(emptyNotifications);
                      setStockMovements(emptyStockMovements);
                      setReceivables(emptyReceivables);
                      localStorage.setItem('salesflow_products', JSON.stringify(emptyProducts));
                      localStorage.setItem('salesflow_comandas', JSON.stringify(emptyComandas));
                      localStorage.setItem('salesflow_notifications', JSON.stringify(emptyNotifications));
                      localStorage.setItem('salesflow_stockMovements', JSON.stringify(emptyStockMovements));
                      localStorage.setItem('salesflow_receivables', JSON.stringify(emptyReceivables));
                      recordAuditLog({
                        action: 'resetou',
                        entityType: 'sistema',
                        entityLabel: 'Sistema',
                        summary: 'Executou reset pela tela de controle de acessos.',
                        details: { origem: 'controle_acessos' }
                      });
                      alert('Sistema zerado com sucesso! Produtos, comandas, estoque e notificações foram removidos.');
                    }}
                  />
                ) : activeAdminSubTab === 'auditoria' ? (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Auditoria Operacional</span>
                          <h3 className="text-lg font-black text-slate-900 mt-1">Histórico de Ações Críticas</h3>
                          <p className="text-xs text-slate-500 mt-1">Registro local de alterações em comandas, estoque, caixa, usuários e sistema.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo</label>
                            <select
                              value={auditEntityFilter}
                              onChange={(e) => setAuditEntityFilter(e.target.value as 'all' | AuditEntityType)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-frz-primary/20"
                            >
                              <option value="all">Todos</option>
                              {Object.entries(auditEntityLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Data</label>
                            <input
                              type="date"
                              value={auditDateFilter}
                              onChange={(e) => setAuditDateFilter(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-frz-primary/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Busca</label>
                            <input
                              type="text"
                              value={auditSearch}
                              onChange={(e) => setAuditSearch(e.target.value)}
                              placeholder="Usuário, item, ação..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-frz-primary/20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                        <span className="text-xs font-black text-slate-800">{filteredAuditLogs.length} registro(s)</span>
                        {(auditEntityFilter !== 'all' || auditDateFilter || auditSearch) && (
                          <button
                            onClick={() => {
                              setAuditEntityFilter('all');
                              setAuditDateFilter('');
                              setAuditSearch('');
                            }}
                            className="text-[10px] font-black text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            Limpar filtros
                          </button>
                        )}
                      </div>
                      <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100">
                        {filteredAuditLogs.length === 0 ? (
                          <div className="text-center py-12 text-slate-500">
                            <History className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm font-black text-slate-700">Nenhum registro de auditoria encontrado.</p>
                            <p className="text-xs mt-1">As próximas ações críticas aparecerão aqui automaticamente.</p>
                          </div>
                        ) : (
                          filteredAuditLogs.map(log => (
                            <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-3 hover:bg-slate-50/80 transition">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-full">{auditEntityLabels[log.entityType]}</span>
                                  <span className="text-[10px] font-black uppercase tracking-wider bg-frz-primary/10 text-frz-primary px-2 py-0.5 rounded-full">{log.action}</span>
                                  {log.entityId && <span className="text-[10px] font-mono font-bold text-slate-500">{log.entityId}</span>}
                                </div>
                                <p className="text-sm font-extrabold text-slate-900 mt-2">{log.summary}</p>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 font-bold">
                                  <span>Usuário: {log.actorName}{log.actorLogin ? ` (@${log.actorLogin})` : ''}</span>
                                  <span>Alvo: {log.entityLabel}</span>
                                  {log.actorRole && <span>Perfil: {getUserRoleLabel(log.actorRole)}</span>}
                                </div>
                              </div>
                              <div className="md:text-right shrink-0">
                                <span className="text-[10px] font-black text-slate-700 block">{new Date(log.timestamp || Date.now()).toLocaleDateString('pt-BR')}</span>
                                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{new Date(log.timestamp || Date.now()).toLocaleTimeString('pt-BR')}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : activeAdminSubTab === 'frentes' ? (
                  <ScopeManagement
                    companies={companies}
                    workspaces={workspaces}
                    spaces={spaces}
                    setCompanies={setCompanies}
                    setWorkspaces={setWorkspaces}
                    setSpaces={setSpaces}
                    activeCompanyId={activeCompanyId}
                    activeWorkspaceId={activeWorkspaceId}
                    activeSpaceId={activeSpaceId}
                  />
                ) : activeAdminSubTab === 'caixa_notificacoes' ? (
                  /* GORGEOUS COMMERCIAL REPORTING / SYSTEM PANEL */
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Active Shift dashboard */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Status do Turno Atual</span>
                          {scopedActiveShift ? (
                            <div className="mt-4 space-y-4">
                              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div>
                                  <span className="text-[9px] text-slate-400 uppercase">Operador Responsável</span>
                                  <div className="text-xs font-black text-slate-700 mt-0.5">{scopedActiveShift.openedBy}</div>
                                </div>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full">ABERTO</span>
                              </div>

                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                <div className="bg-slate-50/50 p-2 text-center rounded-xl border border-slate-100">
                                  <span className="text-[9px] text-slate-400 block font-semibold">Abertura</span>
                                  <span className="text-xs font-black text-slate-700">R$ {Number(scopedActiveShift.initialBalance || 0).toFixed(2)}</span>
                                </div>
                                <div className="bg-slate-50/50 p-2 text-center rounded-xl border border-slate-100">
                                  <span className="text-[9px] text-slate-400 block font-semibold">Vendas Caixa</span>
                                  <span className="text-xs font-black text-emerald-600 font-mono">+R$ {Number(getShiftRevenue(scopedActiveShift) || 0).toFixed(2)}</span>
                                </div>
                                <div className="bg-slate-50/50 p-2 text-center rounded-xl border border-slate-100">
                                  <span className="text-[9px] text-slate-400 block font-semibold">Ajustes</span>
                                  <span className={`text-xs font-black font-mono ${getShiftCashAdjustment(scopedActiveShift) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                    {getShiftCashAdjustment(scopedActiveShift) >= 0 ? '+' : ''}R$ {getShiftCashAdjustment(scopedActiveShift).toFixed(2)}
                                  </span>
                                </div>
                                <div className="bg-frz-primary/10 p-2 text-center rounded-xl border border-slate-100">
                                  <span className="text-[9px] text-slate-400 block font-semibold">Estimado</span>
                                  <span className="text-xs font-black text-frz-primary font-mono">R$ {getExpectedShiftBalance(scopedActiveShift).toFixed(2)}</span>
                                </div>
                              </div>

                              <form onSubmit={handleRegisterCashMovement} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Sangria / Suprimento</span>
                                  <span className="text-[9px] font-bold text-slate-400">{scopedActiveShift.cashMovements?.length || 0} movimento(s)</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-[130px_110px_1fr_auto] gap-2">
                                  <select
                                    value={cashMovementType}
                                    onChange={(e) => setCashMovementType(e.target.value as 'suprimento' | 'sangria')}
                                    className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 focus:outline-none focus:border-frz-primary"
                                  >
                                    <option value="suprimento">Suprimento (+)</option>
                                    <option value="sangria">Sangria (-)</option>
                                  </select>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={cashMovementAmount}
                                    onChange={(e) => setCashMovementAmount(e.target.value)}
                                    placeholder="Valor"
                                    className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-frz-primary"
                                  />
                                  <input
                                    type="text"
                                    value={cashMovementReason}
                                    onChange={(e) => setCashMovementReason(e.target.value)}
                                    placeholder="Motivo/observação"
                                    className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-frz-primary"
                                  />
                                  <button
                                    type="submit"
                                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black rounded-lg transition cursor-pointer"
                                  >
                                    Registrar
                                  </button>
                                </div>
                                {(scopedActiveShift.cashMovements || []).length > 0 && (
                                  <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                                    {(scopedActiveShift.cashMovements || []).slice(0, 4).map(movement => (
                                      <div key={movement.id} className="flex items-center justify-between gap-2 text-[10px] bg-white border border-slate-100 rounded-lg px-2.5 py-1.5">
                                        <span className="font-bold text-slate-600 truncate">{movement.reason}</span>
                                        <span className={`font-black font-mono ${movement.type === 'suprimento' ? 'text-blue-600' : 'text-rose-600'}`}>
                                          {movement.type === 'suprimento' ? '+' : '-'}R$ {Number(movement.amount || 0).toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </form>

                              <p className="text-[10px] text-slate-400">Iniciado em: <strong className="text-slate-600 font-semibold">{new Date(scopedActiveShift.openedAt || Date.now()).toLocaleString('pt-BR')}</strong></p>

                              <button
                                onClick={() => {
                                  setCloseActualCash(getExpectedShiftBalance(scopedActiveShift));
                                  setIsShiftCloseModalOpen(true);
                                }}
                                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                Encerrar Turno & Fechar Caixa
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                              <span className="text-2xl block mb-2">🔒</span>
                              <span className="text-xs font-bold text-slate-700 block">Nenhum Turno de Caixa Ativo</span>
                              <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto mt-1 leading-relaxed">Abra o caixa para monitorar o faturamento diário automático do sistema.</p>
                              <button
                                onClick={() => {
                                  setOpenInitialBalance(150);
                                  setIsShiftOpenModalOpen(true);
                                }}
                                className="mt-4 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-black rounded-lg uppercase cursor-pointer"
                              >
                                Registrar Abertura 🔑
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cashier Balance Aggregations / Archive */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Histórico de Fechamento de Caixa</span>
                            <span className="text-[9px] text-slate-400 font-bold block">Últimos {scopedShiftHistory.length} turnos</span>
                          </div>

                          <div className="mt-4 space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {scopedShiftHistory.length === 0 ? (
                              <p className="text-[11px] text-slate-400 text-center py-8">Nenhum histórico de caixa fechado registrado.</p>
                            ) : (
                              scopedShiftHistory.map((shf) => {
                                const devRevenue = shf.finalBalance ? (shf.finalBalance - shf.initialBalance - getShiftCashAdjustment(shf)) : 0;
                                const diff = shf.actualCashInHand !== undefined && shf.finalBalance !== undefined 
                                  ? shf.actualCashInHand - shf.finalBalance
                                  : 0;

                                return (
                                  <div key={shf.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center gap-2 text-xs">
                                    <div>
                                      <div className="font-extrabold text-slate-800 font-mono text-[11px]">{shf.id}</div>
                                      <span className="text-[9px] text-slate-400 block mt-0.5">Operado por {shf.closedBy}</span>
                                      <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(shf.openedAt || Date.now()).toLocaleDateString('pt-BR')} {new Date(shf.openedAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                      {(shf.cashMovements || []).length > 0 && (
                                        <span className="text-[9px] text-blue-600 block mt-0.5 font-bold">Ajustes: {shf.cashMovements?.length} mov. ({getShiftCashAdjustment(shf) >= 0 ? '+' : ''}R$ {getShiftCashAdjustment(shf).toFixed(2)})</span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span className="font-bold text-slate-800 block">Faturado: R$ {Number(devRevenue || 0).toFixed(2)}</span>
                                      {diff === 0 ? (
                                        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Sem Divergência</span>
                                      ) : (
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${diff > 0 ? 'bg-frz-primary/10 text-frz-primary' : 'bg-rose-50 text-rose-600'}`}>
                                          Contagem: {diff > 0 ? '+' : ''}R$ {Number(diff || 0).toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>





                    {/* AUTOMATED SIMULATED NOTIFICATION SYSTEM DISCHARGING QUEUE */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                        <div>
                          <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Módulo de Notificações Integradas (WhatsApp, SMS & E-mail de Clientes)</span>
                          <h3 className="text-sm font-extrabold text-slate-800 mt-0.5 font-sans">Logs de Notificações Automáticas de Comanda</h3>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-black uppercase tracking-wider select-none">
                          🟢 Gateway de Notificação Ativo
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {visibleNotifications.length === 0 ? (
                          <div className="text-center py-12 text-slate-400">
                            <span className="text-xl block mb-2">✉️</span>
                            <span className="text-xs font-bold text-slate-700 block">Nenhum log de notificação enviado ainda.</span>
                            <p className="text-[10px] text-slate-400 max-w-[280px] mx-auto mt-1">Quando os clientes se registrarem ou o caixa fechar comandas, os disparos de SMS/E-mail automáticos serão ilustrados aqui.</p>
                          </div>
                        ) : (
                          visibleNotifications.map((notif) => (
                            <div key={notif.id} className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between gap-3 text-xs leading-relaxed animate-fadeIn">
                              <div className="flex gap-3 items-start">
                                <div className={`p-1.5 rounded-lg shrink-0 ${
                                  notif.type === 'Email' 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : notif.type === 'WhatsApp'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {notif.type === 'Email' ? (
                                    <Mail className="w-4 h-4" />
                                  ) : notif.type === 'WhatsApp' ? (
                                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <strong className="text-slate-800 font-extrabold">{notif.recipient}</strong>
                                    <span className="text-[9px] text-slate-400 font-mono">({notif.contact})</span>
                                    {notif.sender && (
                                      <span className="text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold font-mono">De: {notif.sender}</span>
                                    )}
                                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded font-mono">{notif.id}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100/50 select-text whitespace-pre-wrap font-sans leading-relaxed text-left">
                                    {notif.message}
                                  </div>
                                </div>
                              </div>
                              <div className="md:text-right shrink-0 flex md:flex-col justify-between items-center md:items-end gap-1">
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-extrabold uppercase inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Enviado
                                </span>
                                <span className="text-[9px] text-slate-400 block mt-1">{new Date(notif.timestamp || Date.now()).toLocaleTimeString('pt-BR')}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Active comandas display
                  <div className="flex flex-col gap-6">
                    {selectedComanda ? (
                      <ComandaDetailView
                        comanda={selectedComanda}
                        products={scopedProducts}
                        onAddProduct={handleAddProductToComanda}
                        onRemoveItem={handleRemoveItemFromComanda}
                        onUpdateItemQuantity={handleUpdateItemQuantity}
                        onCloseComanda={handleCloseComanda}
                        onDeleteComanda={handleDeleteComanda}
                        onOpenSimulatorForComanda={(comandaId) => {
                          setClientActiveComandaId(comandaId);
                          setViewMode('both');
                        }}
                        onToggleClosureReminder={handleToggleClosureReminder}
                        onBackToList={() => setSelectedComandaId(null)}
                      />
                    ) : (
                      /* Standard Tickets listing Board with aggregations & filters */
                      <ComandaList
                        comandas={scopedComandas}
                        selectedComanda={selectedComanda}
                        onSelect={(c) => setSelectedComandaId(c.id)}
                        onOpenCreateModal={() => setIsNewComandaModalOpen(true)}
                        onOpenManageUnits={() => setIsManageUnitsModalOpen(true)}
                        unidades={scopedUnidades}
                        operatingUnit={operatingUnit}
                      />
                    )}
                  </div>
                )}
                </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: REASSURING LIVE SMARTPHONE SIMULATOR FOR CUSTOMER (Renders if mode is BOTH or CLIENT) */}
        {(viewMode === 'both' || viewMode === 'client') && (
          <div className={`${viewMode === 'both' ? 'lg:col-span-4' : 'lg:col-span-12'} flex flex-col items-center justify-start`}>
            
            {/* Return button when in client-only mode */}
            {viewMode === 'client' && (
              <div className="w-full max-w-md mb-4">
                <button
                  onClick={() => setViewMode('both')}
                  className="w-full py-2.5 bg-frz-primary hover:bg-frz-primary-hover text-white rounded-xl text-xs font-black shadow-sm cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <Layout className="w-4 h-4" />
                  Voltar para Caixa + Celular
                </button>
              </div>
            )}

            {/* Header info label explaining simulator features */}
            {viewMode === 'both' && (
              <div className="text-center mb-3 text-slate-400 scale-[0.95] max-w-[340px]">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                  Simulador de Auto-Atendimento
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                  Qualquer compra feita no smartphone decrementa o Estoque na Estação de Caixa em tempo real.
                </p>
              </div>
            )}

            <ClientMobileView
              comandas={scopedComandas}
              products={scopedProducts}
              activeComandaId={clientActiveComandaId}
              isSyncing={!isInitialized}
              onAddProductFromClient={handleAddProductToComanda}
              onSignExistingItem={handleSignExistingComandaItem}
              onDisconnectClient={handleDisconnectClient}
            />
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="text-center py-6 mt-auto text-xs text-slate-500 font-medium border-t border-slate-200 bg-white/40">
        SalesFlow • Sistema Integrado com Assinatura Digital, Controle de Estoque & Caixa • Horário local: 2026-06-05 UTC
      </footer>

      {/* 3. NEW COMANDA REGISTRATION MODAL FOR CENTRAL CASHIER ADM */}
      {isNewComandaModalOpen && (
        <div 
          onClick={() => setIsNewComandaModalOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative cursor-default"
          >
            <button
              onClick={() => setIsNewComandaModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1.5">Abrir Nova Comanda Manual</h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Adicione uma comanda no sistema a pedido de um cliente no balcão.</p>

            <form onSubmit={handleAdminCreateComandaSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do aluno / colaborador / diretor"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Classificação</label>
                <select
                  value={newClientType}
                  onChange={(e) => setNewClientType(e.target.value as ClientType)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50 cursor-pointer"
                >
                  <option value="Aluno">Aluno</option>
                  <option value="Colaborador">Colaborador</option>
                  <option value="Diretoria">Diretoria</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">E-mail para Notificação</label>
                  <input
                    type="email"
                    placeholder="aluno@exemplo.com"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 font-sans">Celular (SMS)</label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  {newClientType === 'Colaborador' ? 'Departamento' : 'Curso ou Treinamento'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={newClientType === 'Colaborador' ? 'Ex: Departamento Financeiro' : 'Ex: Pós-graduação em Data Science'}
                  value={newClientCourse}
                  onChange={(e) => setNewClientCourse(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Unidade</label>
                <select
                  value={newClientUnit}
                  onChange={(e) => setNewClientUnit(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-[#F8FAFC]/50 cursor-pointer"
                >
                  {scopedUnidades.map(u => (
                     <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Mês de Competência</label>
                <select
                  value={newClientMonth}
                  onChange={(e) => setNewClientMonth(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-[#F8FAFC]/50 cursor-pointer"
                >
                  {MONTHS.map(m => (
                     <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 -mx-6 -mb-6 mt-6 rounded-b-3xl">
                <span className="text-[10px] text-slate-400 font-semibold italic">Alterações aplicadas na hora</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewComandaModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-150 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                  >
                    Sair
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white text-xs font-black rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                    Confirmar e Sair
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isManageUnitsModalOpen && (
        <UnitManagementModal
          isOpen={isManageUnitsModalOpen}
          onClose={() => setIsManageUnitsModalOpen(false)}
          unidades={scopedUnidades}
          onSaveUnidades={handleSaveUnidades}
          comandas={scopedComandas}
        />
      )}

      {isProfileModalOpen && session && (
        <div
          onClick={closeProfileModal}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative cursor-default text-left"
          >
            <button
              onClick={closeProfileModal}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1.5 flex items-center gap-1.5 font-sans">
              <Users className="w-5 h-5 text-frz-primary" />
              Editar Perfil
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Atualize os dados visíveis do usuário atual sem fechar o caixa.</p>

            <form onSubmit={handleSaveProfile} className="space-y-4 font-sans">
              {profileError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-bold">
                  {profileError}
                </div>
              )}

              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-frz-primary text-white flex items-center justify-center text-xl font-black overflow-hidden shrink-0">
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="Avatar do perfil" className="w-full h-full object-cover" />
                  ) : (
                    profileName.charAt(0).toUpperCase() || 'A'
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer transition">
                    <Camera className="w-3.5 h-3.5" />
                    Trocar avatar
                    <input type="file" accept="image/*" onChange={handleProfileAvatarUpload} className="hidden" />
                  </label>
                  {profileAvatar && (
                    <button
                      type="button"
                      onClick={() => setProfileAvatar('')}
                      className="block text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      Remover avatar
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nome Exibido</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 -mx-6 -mb-6 mt-6 rounded-b-3xl">
                <span className="text-[10px] text-slate-400 font-semibold italic">Não altera caixa, comandas ou senha</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-150 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                  >
                    Sair
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white text-xs font-black rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ABERTURA DE CAIXA */}
      {isShiftOpenModalOpen && (
        <div 
          onClick={() => setIsShiftOpenModalOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative cursor-default text-left"
          >
            <button
              onClick={() => setIsShiftOpenModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1.5 flex items-center gap-1.5 font-sans">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Abertura de Turno de Caixa
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Insira o valor em dinheiro do saldo inicial para abrir a gaveta comercial.</p>

            <form onSubmit={handleOpenShift} className="space-y-4 font-sans">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 font-sans">Saldo de Abertura (R$)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={openInitialBalance}
                  onChange={(e) => setOpenInitialBalance(Number(e.target.value))}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 font-sans">Observações da Abertura</label>
                <textarea
                  placeholder="Ex: Notas de 10 e 20 para troco"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50 h-20 resize-none font-sans"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 -mx-6 -mb-6 mt-6 rounded-b-3xl">
                <span className="text-[10px] text-slate-400 font-semibold italic">Alterações aplicadas na hora</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShiftOpenModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-150 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                  >
                    Sair
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white text-xs font-black rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                    Confirmar e Sair
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FECHAMENTO DE CAIXA */}
      {isShiftCloseModalOpen && scopedActiveShift && (
        <div 
          onClick={() => setIsShiftCloseModalOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative cursor-default text-left"
          >
            <button
              onClick={() => setIsShiftCloseModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1.5 flex items-center gap-1.5 font-sans">
              <Lock className="w-5 h-5 text-rose-600" />
              Fechamento de Caixa / Turno
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans justify-normal text-left">Compare o valor estimado calculado pelo faturamento do sistema com a contagem manual da gaveta física.</p>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1 bg-slate-50/50 font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo Inicial:</span>
                  <span className="font-bold text-slate-800">R$ {Number(scopedActiveShift.initialBalance || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendas do Turno (+):</span>
                  <span className="font-bold text-emerald-600 font-mono">+ R$ {Number(getShiftRevenue(scopedActiveShift) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sangria/Suprimento:</span>
                  <span className={`font-bold font-mono ${getShiftCashAdjustment(scopedActiveShift) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {getShiftCashAdjustment(scopedActiveShift) >= 0 ? '+' : '-'} R$ {Math.abs(getShiftCashAdjustment(scopedActiveShift)).toFixed(2)}
                  </span>
                </div>
                <hr className="border-slate-200 border-dashed my-1" />
                <div className="flex justify-between font-extrabold text-slate-900">
                  <span>Valor Calculado Estimado:</span>
                  <span className="text-frz-primary font-mono">R$ {getExpectedShiftBalance(scopedActiveShift).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Total em Dinheiro Contado (R$)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={closeActualCash}
                  onChange={(e) => setCloseActualCash(Number(e.target.value))}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 uppercase font-sans">Notas do Fechamento</label>
                <textarea
                  placeholder="Se houver diferença, relate neste campo"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50 h-16 resize-none font-sans"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 -mx-6 -mb-6 mt-6 rounded-b-3xl">
                <span className="text-[10px] text-slate-400 font-semibold italic">Alterações aplicadas na hora</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShiftCloseModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-150 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                  >
                    Sair
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white text-xs font-black rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                    Confirmar e Sair
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
