import React, { useState, useEffect, useRef } from 'react';
import { Product, Comanda, ClientType, ThemeType, OrderedItem, CashierShift, UserSession, SystemUser } from './types';
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
  MapPin
} from 'lucide-react';

// Subcomponents import
import StockManagement from './components/StockManagement';
import ComandaList from './components/ComandaList';
import ComandaDetailView from './components/ComandaDetailView';
import ClientMobileView from './components/ClientMobileView';
import AccessManagement from './components/AccessManagement';
import InviteActivation from './components/InviteActivation';
import UnitManagementModal from './components/UnitManagementModal';
import WhatsAppAuthSandbox from './components/WhatsAppAuthSandbox';
import { testSupabaseConnection } from './lib/supabase';
import { isSupabaseConfigured, pushDataToSupabase, pullStateFromSupabase } from './lib/supabaseSync';

export default function App() {
  // Brand Logo selection state
  const [brandLogoOption, setBrandLogoOption] = useState<'quantum' | 'shield' | 'infinite'>(() => {
    return (localStorage.getItem('salesflow_brand_logo_v5') as any) || 'infinite';
  });

  const renderBrandLogo = (option: 'quantum' | 'shield' | 'infinite') => {
    switch (option) {
      case 'quantum':
        return (
          <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-[#C5A059] to-[#E5C079] rounded-xl shadow-lg shadow-amber-500/10 transition-all duration-300 transform hover:scale-105 active:scale-95">
            <Sparkles className="w-5.5 h-5.5 text-zinc-950 stroke-[2.5] animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 bg-indigo-500 border border-slate-900 rounded-full animate-ping" />
          </div>
        );
      case 'shield':
        return (
          <div className="relative w-10 h-10 flex items-center justify-center bg-slate-900 border border-amber-500/30 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95">
            <Shield className="w-5.5 h-5.5 text-[#C5A059]" />
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
  const [viewMode, setViewMode] = useState<'both' | 'admin' | 'client'>('both');
  const [isClientOnlyMode, setIsClientOnlyMode] = useState(false);
  
  // Data State loading from localStorage with Initial Failback
  const [products, setProducts] = useState<Product[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [categories, setCategories] = useState<string[]>(['Bebidas', 'Alimentos', 'Papelaria', 'Vestuário', 'Acessórios']);
  const [unidades, setUnidades] = useState<string[]>(['Sede Principal', 'Filial Norte', 'Filial Sul']);
  
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
  const [clientActiveComandaId, setClientActiveComandaId] = useState<string | null>(null);
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'comandas' | 'estoque' | 'caixa_notificacoes' | 'acessos'>('comandas');
  
  // System Users List for Access Management
  const [users, setUsers] = useState<SystemUser[]>(() => {
    const saved = localStorage.getItem('salesflow_users_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
    ];
  });

  // Track active invite processing
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(null);

  // Real-time synchronization state (Option 1 SSE Router)
  const [realTimeStatus, setRealTimeStatus] = useState<'connected' | 'connecting' | 'failed'>('connecting');
  const [isInitialized, setIsInitialized] = useState(false);

  // User Session Management
  const [session, setSession] = useState<UserSession | null>(null);
  
  // Cashier Shifts Management (abertura e fechamento de caixa)
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<CashierShift[]>([]);
  
  // Notification logs & Toast state (Configure um sistema de notificação automatizado)
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeToasts, setActiveToasts] = useState<Array<{ id: string; title: string; description: string; type: 'email' | 'sms' }>>([]);

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

  // Drawer Opening/Closing input states
  const [isShiftOpenModalOpen, setIsShiftOpenModalOpen] = useState(false);
  const [isShiftCloseModalOpen, setIsShiftCloseModalOpen] = useState(false);
  const [openInitialBalance, setOpenInitialBalance] = useState<number>(150);
  const [openNotes, setOpenNotes] = useState('');
  const [closeActualCash, setCloseActualCash] = useState<number>(150);
  const [closeNotes, setCloseNotes] = useState('');

  // References to keep polling state comparison stable preventing keyboard layout/input refocus drops
  const productsRef = useRef<Product[]>(products);
  const comandasRef = useRef<Comanda[]>(comandas);
  const notificationsRef = useRef<any[]>(notifications);
  const categoriesRef = useRef<string[]>(categories);
  const unidadesRef = useRef<string[]>(unidades);

  useEffect(() => {
    productsRef.current = products;
    comandasRef.current = comandas;
    notificationsRef.current = notifications;
    categoriesRef.current = categories;
    unidadesRef.current = unidades;
  }, [products, comandas, notifications, categories, unidades]);

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
    const cachedCategories = localStorage.getItem('salesflow_categories');
    const cachedUnidades = localStorage.getItem('salesflow_unidades');

    let loadedProducts = INITIAL_PRODUCTS;
    if (cachedProducts) {
      try {
        const parsed = JSON.parse(cachedProducts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedProducts = parsed;
        }
      } catch (e) {
        console.warn("Error parsing cached products, resorting to fallback:", e);
      }
    }
    setProducts(loadedProducts);

    let loadedComandas = INITIAL_COMANDAS;
    if (cachedComandas) {
      try {
        const parsed = JSON.parse(cachedComandas);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedComandas = parsed;
        }
      } catch (e) {
        console.warn("Error parsing cached comandas, resorting to fallback:", e);
      }
    }
    setComandas(loadedComandas);

    let loadedCategories = ['Bebidas', 'Alimentos', 'Papelaria', 'Vestuário', 'Acessórios'];
    if (cachedCategories) {
      try {
        const parsed = JSON.parse(cachedCategories);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedCategories = parsed;
        }
      } catch (e) {}
    }
    setCategories(loadedCategories);

    let loadedUnidades = ['Sede Principal', 'Filial Norte', 'Filial Sul'];
    if (cachedUnidades) {
      try {
        const parsed = JSON.parse(cachedUnidades);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedUnidades = parsed;
        }
      } catch (e) {}
    }
    setUnidades(loadedUnidades);

    if (cachedSession) {
      try {
        setSession(JSON.parse(cachedSession));
      } catch (e) {}
    }
    if (cachedActiveShift) {
      try {
        setActiveShift(JSON.parse(cachedActiveShift));
      } catch (e) {}
    }
    if (cachedShiftHistory) {
      try {
        const parsed = JSON.parse(cachedShiftHistory);
        if (Array.isArray(parsed)) {
          setShiftHistory(parsed);
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

    // Connect to Express back-office initial database state
    fetch('/api/state')
      .then(res => res.json())
      .then(data => {
        let needsSyncToServer = false;

        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
          localStorage.setItem('salesflow_categories', JSON.stringify(data.categories));
          loadedCategories = data.categories;
        }

        if (data.unidades && Array.isArray(data.unidades) && data.unidades.length > 0) {
          setUnidades(data.unidades);
          localStorage.setItem('salesflow_unidades', JSON.stringify(data.unidades));
          loadedUnidades = data.unidades;
        }

        // Server is empty or does not have products, but client has products in localStorage
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
          localStorage.setItem('salesflow_products_v2', JSON.stringify(data.products));
          loadedProducts = data.products;
        } else if (loadedProducts && loadedProducts.length > 0) {
          needsSyncToServer = true;
        }

        // Server is empty or does not have comandas, but client has comandas in localStorage
        if (data.comandas && Array.isArray(data.comandas) && data.comandas.length > 0) {
          setComandas(data.comandas);
          localStorage.setItem('salesflow_tickets_v2', JSON.stringify(data.comandas));
          loadedComandas = data.comandas;
        } else if (loadedComandas && loadedComandas.length > 0) {
          needsSyncToServer = true;
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
              notifications: data.notifications || []
            })
          }).catch(err => console.error("Restore push failed:", err));
        }

        if (data.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          localStorage.setItem('salesflow_notifications', JSON.stringify(data.notifications));
        }

        if (data.whatsStatus) {
          setWhatsConnectionStatus(data.whatsStatus);
          localStorage.setItem('salesflow_whats_status', data.whatsStatus);
        }

        if (data.whatsNumber) {
          setSystemWhatsNumber(data.whatsNumber);
          localStorage.setItem('salesflow_system_whats_number', data.whatsNumber);
        }

        // Check URL parameters to see if scanned on real mobile device
        const urlParams = new URLSearchParams(window.location.search);
        const comandaParam = urlParams.get('comanda');

        if (comandaParam) {
          // Find if this comanda exists in loadedComandas
          const comandaExists = loadedComandas.find(c => c.id === comandaParam);
          if (!comandaExists) {
            // Automatically create the comanda so they don't see any "enter code" or "register" forms!
            const autoClientName = urlParams.get('name') || "Cliente QR Especial";
            const autoCourse = urlParams.get('course') || "Área do Aluno Elite";
            const newAutoComanda: Comanda = {
              id: comandaParam,
              clientName: autoClientName,
              clientType: 'Aluno',
              courseOrTraining: autoCourse,
              month: 'Junho',
              status: 'Pendente',
              createdAt: new Date().toISOString(),
              items: [],
              unit: 'Sede Principal'
            };
            const updatedList = [newAutoComanda, ...loadedComandas];
            setComandas(updatedList);
            localStorage.setItem('salesflow_tickets_v2', JSON.stringify(updatedList));

            // Sync with Server immediately
            fetch('/api/comandas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newAutoComanda)
            }).catch(() => {});
          }

          setClientActiveComandaId(comandaParam);
          localStorage.setItem('salesflow_client_active_id_v2', comandaParam);
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

  // Hybrid Real-Time synchronization hook: Server-Sent Events (SSE) with standard polling recovery
  useEffect(() => {
    if (!isInitialized) return;
    let active = true;
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const pollSync = async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;

        // Sync Products if changed by another machine
        if (data.products && JSON.stringify(data.products) !== JSON.stringify(productsRef.current)) {
          setProducts(data.products);
          localStorage.setItem('salesflow_products_v2', JSON.stringify(data.products));
        }

        // Sync Comandas if changed by smartphone active consumer
        if (data.comandas && JSON.stringify(data.comandas) !== JSON.stringify(comandasRef.current)) {
          setComandas(data.comandas);
          localStorage.setItem('salesflow_tickets_v2', JSON.stringify(data.comandas));
        }

        // Sync notifications/tickets faturados list
        if (data.notifications && JSON.stringify(data.notifications) !== JSON.stringify(notificationsRef.current)) {
          setNotifications(data.notifications);
          localStorage.setItem('salesflow_notifications', JSON.stringify(data.notifications));
        }

        // Sync categories list
        if (data.categories && JSON.stringify(data.categories) !== JSON.stringify(categoriesRef.current)) {
          setCategories(data.categories);
          localStorage.setItem('salesflow_categories', JSON.stringify(data.categories));
        }
      } catch (err) {
        // Tolerates network offline states
      }
    };

    const connectSSE = () => {
      if (!active) return;
      setRealTimeStatus('connecting');

      let hasOpened = false;

      // If we attempt reconnection, stop the old EventSource
      if (eventSource) {
        eventSource.close();
      }

      // Safety handshake timeout: if proxy/browser keeps SSE request 'Pending' for over 3.5s
      const handshakeTimeout = setTimeout(() => {
        if (!active || hasOpened) return;
        console.warn("⚠️ SSE connection handshake timed out (3.5s). Activating failover polling immediately...");
        setRealTimeStatus('failed');
        
        // Spawn fallback poller to keep data perfectly synced in background
        if (!fallbackInterval) {
          fallbackInterval = setInterval(pollSync, 3000);
        }
      }, 3500);

      try {
        eventSource = new EventSource('/api/events');

        eventSource.onopen = () => {
          if (!active) return;
          hasOpened = true;
          clearTimeout(handshakeTimeout);
          console.log("🟢 Real-Time SSE channel opened successfully.");
          setRealTimeStatus('connected');
          
          // Once SSE is active, we don't need aggressive interval polling.
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
        };

        eventSource.onerror = (err) => {
          if (!active) return;
          hasOpened = true;
          clearTimeout(handshakeTimeout);
          console.warn("⚠️ SSE Real-time offline, reverting to failover polling loop:", err);
          setRealTimeStatus('failed');
          eventSource?.close();

          // Spawn fall-back interval poller
          if (!fallbackInterval) {
            fallbackInterval = setInterval(pollSync, 3000);
          }

          // Schedule an back-off reconnection try in 8 seconds to prevent spam
          setTimeout(() => {
            if (active) connectSSE();
          }, 8000);
        };

        // Custom state_updated broadcast message event listener
        eventSource.addEventListener('state_updated', (e: any) => {
          if (!active) return;
          try {
            const data = JSON.parse(e.data);
            
            // Sync Products if changed by another machine
            if (data.products && JSON.stringify(data.products) !== JSON.stringify(productsRef.current)) {
              setProducts(data.products);
              localStorage.setItem('salesflow_products_v2', JSON.stringify(data.products));
            }

            // Sync Comandas if changed by smartphone active consumer
            if (data.comandas && JSON.stringify(data.comandas) !== JSON.stringify(comandasRef.current)) {
              setComandas(data.comandas);
              localStorage.setItem('salesflow_tickets_v2', JSON.stringify(data.comandas));
            }

            // Sync notifications
            if (data.notifications && JSON.stringify(data.notifications) !== JSON.stringify(notificationsRef.current)) {
              setNotifications(data.notifications);
              localStorage.setItem('salesflow_notifications', JSON.stringify(data.notifications));
            }

            // Sync categories list
            if (data.categories && JSON.stringify(data.categories) !== JSON.stringify(categoriesRef.current)) {
              setCategories(data.categories);
              localStorage.setItem('salesflow_categories', JSON.stringify(data.categories));
            }

            // Sync WhatsApp Web configurations in real time
            if (data.whatsStatus) {
              setWhatsConnectionStatus(data.whatsStatus);
              localStorage.setItem('salesflow_whats_status', data.whatsStatus);
            }
            if (data.whatsNumber) {
              setSystemWhatsNumber(data.whatsNumber);
              localStorage.setItem('salesflow_system_whats_number', data.whatsNumber);
            }
          } catch (err) {
            console.error("Failed to parse SSE broadcast payload:", err);
          }
        });

      } catch (err) {
        if (!active) return;
        setRealTimeStatus('failed');
        if (!fallbackInterval) {
          fallbackInterval = setInterval(pollSync, 2000);
        }
      }
    };

    // Establish link on load
    connectSSE();

    return () => {
      active = false;
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  // Sync back into localStorage and server on state updates
  const saveProductsToStorage = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem('salesflow_products_v2', JSON.stringify(updatedProducts));
    
    fetch('/api/products/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProducts)
    }).catch(() => {});
  };

  const saveComandasToStorage = (updatedComandas: Comanda[]) => {
    setComandas(updatedComandas);
    localStorage.setItem('salesflow_tickets_v2', JSON.stringify(updatedComandas));

    fetch('/api/comandas/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedComandas)
    }).catch(() => {});
  };

  const handleSaveCategories = (updatedCategories: string[], updatedProducts?: Product[]) => {
    setCategories(updatedCategories);
    localStorage.setItem('salesflow_categories', JSON.stringify(updatedCategories));
    
    let currentProds = products;
    if (updatedProducts) {
      setProducts(updatedProducts);
      localStorage.setItem('salesflow_products_v2', JSON.stringify(updatedProducts));
      currentProds = updatedProducts;
    }

    fetch('/api/state/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        products: currentProds, 
        comandas: comandasRef.current, 
        notifications: notificationsRef.current, 
        categories: updatedCategories 
      })
    }).catch(() => {});
  };

  const handleSaveUnidades = (updatedUnidades: string[], updatedComandas?: Comanda[]) => {
    setUnidades(updatedUnidades);
    localStorage.setItem('salesflow_unidades', JSON.stringify(updatedUnidades));
    
    let currentComas = comandas;
    if (updatedComandas) {
      setComandas(updatedComandas);
      localStorage.setItem('salesflow_tickets_v2', JSON.stringify(updatedComandas));
      currentComas = updatedComandas;
    }

    fetch('/api/state/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        products: productsRef.current, 
        comandas: currentComas, 
        notifications: notificationsRef.current, 
        categories: categoriesRef.current,
        unidades: updatedUnidades
      })
    }).catch(() => {});
  };

  // Persist user list changes securely in localStorage
  useEffect(() => {
    localStorage.setItem('salesflow_users_v2', JSON.stringify(users));
  }, [users]);

  // Synchronize operating unit with the units catalog list
  useEffect(() => {
    if (unidades.length > 0 && !unidades.includes(operatingUnit)) {
      setOperatingUnit(unidades[0]);
      localStorage.setItem('salesflow_operating_unit', unidades[0]);
    }
  }, [unidades, operatingUnit]);

  // Set default client unit when create comanda modal is opened using the operating unit
  useEffect(() => {
    if (isNewComandaModalOpen && unidades.length > 0) {
      setNewClientUnit(operatingUnit || unidades[0]);
    }
  }, [isNewComandaModalOpen, unidades, operatingUnit]);

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
              
              const toastId = `toast-whats-connected-${Date.now()}`;
              setActiveToasts(prev => [
                ...prev,
                {
                  id: toastId,
                  title: "🟢 WhatsApp Pareado!",
                  description: `Dispositivo conectado com sucesso por QR Code!`,
                  type: 'email'
                }
              ]);
              setTimeout(() => {
                setActiveToasts(current => current.filter(t => t.id !== toastId));
              }, 4000);
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
          if (Array.isArray(parsed)) setProducts(parsed);
        }
        if (e.key === 'salesflow_users_v2' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setUsers(parsed);
        }
        if (e.key === 'salesflow_tickets_v2' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setComandas(parsed);
        }
        if (e.key === 'salesflow_client_active_id_v2' && e.newValue) {
          setClientActiveComandaId(e.newValue);
        }
        if (e.key === 'salesflow_session') {
          setSession(e.newValue ? JSON.parse(e.newValue) : null);
        }
        if (e.key === 'salesflow_active_shift') {
          setActiveShift(e.newValue ? JSON.parse(e.newValue) : null);
        }
        if (e.key === 'salesflow_shift_history' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setShiftHistory(parsed);
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

  // Active comanda reference
  const selectedComanda = comandas.find(c => c.id === selectedComandaId) || null;

  // --- BUSINESS LOGIC COMMANDS ---

  // 1. Manage Stock (CRUD)
  const handleSaveProduct = (updatedProduct: Product) => {
    const exists = products.some(p => p.id === updatedProduct.id);
    let newProducts: Product[] = [];
    if (exists) {
      newProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    } else {
      newProducts = [...products, updatedProduct];
    }
    saveProductsToStorage(newProducts);
  };

  const handleDeleteProduct = (productId: string) => {
    const newProducts = products.filter(p => p.id !== productId);
    saveProductsToStorage(newProducts);
  };

  // 2. Add product/item to comanda (reduces inventory stock!)
  const handleAddProductToComanda = (comandaId: string, productId: string, quantity: number, signature?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock < quantity) {
      alert('Estoque insuficiente para este produto.');
      return;
    }

    // Decrement from inventory database
    const updatedProducts = products.map(p => {
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

    const updatedComandas = comandas.map(c => {
      if (c.id === comandaId) {
        return { ...c, items: [...c.items, newItem] };
      }
      return c;
    });

    saveComandasToStorage(updatedComandas);
  };

  // 3. Remove item from comanda (restores stock!)
  const handleRemoveItemFromComanda = (comandaId: string, itemId: string) => {
    const targetComanda = comandas.find(c => c.id === comandaId);
    if (!targetComanda) return;

    const targetItem = targetComanda.items.find(i => i.id === itemId);
    if (!targetItem) return;

    // Restore product stock first
    const updatedProducts = products.map(p => {
      if (p.id === targetItem.productId) {
        return { ...p, stock: p.stock + targetItem.quantity };
      }
      return p;
    });
    saveProductsToStorage(updatedProducts);

    // Strip item from list
    const updatedComandas = comandas.map(c => {
      if (c.id === comandaId) {
        return {
          ...c,
          items: c.items.filter(item => item.id !== itemId)
        };
      }
      return c;
    });
    saveComandasToStorage(updatedComandas);
  };

  // 4. Update item quantity in comanda (re-evaluates stock differences)
  const handleUpdateItemQuantity = (comandaId: string, itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;

    const targetComanda = comandas.find(c => c.id === comandaId);
    if (!targetComanda) return;

    const targetItem = targetComanda.items.find(i => i.id === itemId);
    if (!targetItem) return;

    const stockDifference = newQuantity - targetItem.quantity;
    const associatedProduct = products.find(p => p.id === targetItem.productId);

    if (associatedProduct && associatedProduct.stock < stockDifference) {
      alert(`Erro: Estoque insuficiente. Restam apenas ${associatedProduct.stock} unidades de ${associatedProduct.name}.`);
      return;
    }

    // Adjust product inventory
    if (associatedProduct) {
      const updatedProducts = products.map(p => {
        if (p.id === associatedProduct.id) {
          return { ...p, stock: p.stock - stockDifference };
        }
        return p;
      });
      saveProductsToStorage(updatedProducts);
    }

    // Apply change inside comanda
    const updatedComandas = comandas.map(c => {
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
    
    const comandaLiveUrl = `${window.location.origin}${window.location.pathname}?comanda=${comanda.id}`;
    const statusEmoji = newStatus === 'Pago' ? '✅ PAGO E ENCERRADO' : `⏳ ${newStatus.toUpperCase()}`;
    const messageWhatsApp = `*SalesFlow* 🛎️\nOlá, *${clientName}*!\nAtualização de comanda (*${comanda.id}*):\n• Status: *${statusEmoji}*\n• Unidade: *${comanda.unit || 'Sede Principal'}*\n\nAcompanhe seu consumo e assine digitalmente: \n${comandaLiveUrl}\n\n_Mensagem automática enviada via sistema WhatsApp SalesFlow do número: ${systemWhatsNumber}_`;

    const newNotifEmail = {
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
    const updatedNotifs = [newNotifEmail, newNotifSms, newNotifWhatsApp, ...safeNotifications];
    setNotifications(updatedNotifs);
    localStorage.setItem('salesflow_notifications', JSON.stringify(updatedNotifs));

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
    const toastWhatsId = `toast-whats-${Date.now()}`;

    const whatsToastElement = isWhatsConnectedState ? {
      id: toastWhatsId,
      title: `💬 WhatsApp Automático Notificado`,
      description: `Via WhatsApp do Sistema: ${systemWhatsNumber}`,
      type: 'email' // maps to green message theme badge in UI
    } : {
      id: toastWhatsId,
      title: `⚠️ Envio WhatsApp Bloqueado`,
      description: `O número ${systemWhatsNumber} está deslogado! Conecte via QR Code.`,
      type: 'sms' // alert notification badge styling (red highlight)
    };

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
      },
      whatsToastElement
    ]);

    // Slide out after 6 seconds
    setTimeout(() => {
      setActiveToasts(current => current.filter(t => t.id !== toastEmailId && t.id !== toastSmsId));
    }, 6000);
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
        email: foundUser.email
      };
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
      email: updatedUser.email
    };
    
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

  const handleSaveUser = (user: SystemUser) => {
    setUsers(curr => {
      const exists = curr.some(u => u.id === user.id);
      if (exists) {
        return curr.map(u => u.id === user.id ? user : u);
      } else {
        return [...curr, user];
      }
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
        body: `Olá ${user.name},\n\nVocê acaba de ser convidado para operar o sistema SalesFlow com o cargo de: ${user.role === 'admin' ? 'Co-Administrador' : 'Operador de Caixa'}.\n\nSua senha temporária de primeiro acesso é: "${user.password || '123'}"\n\nUtilize este link de ativação seguro para cadastrar sua senha definitiva: ${inviteUrl}\n\nSalesFlow Security Team`
      };

      setNotifications(prev => [newNotif, ...prev]);

      // Toast notifications
      const toastId = `toast-invite-${Date.now()}`;
      setActiveToasts(prev => [
        ...prev,
        {
          id: toastId,
          title: `✉️ Convite Enviado para ${user.name}`,
          description: `Cargo: ${user.role === 'admin' ? 'Co-Administrador' : 'Operador'} | Enviado para: ${email}`,
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
        setActiveShift(null);
        setShiftHistory([]);
        setClientActiveComandaId(null);
        setSelectedComandaId(null);
      } else {
        setProducts([]);
        setComandas([]);
        setNotifications([]);
        setActiveShift(null);
        setShiftHistory([]);
        setClientActiveComandaId(null);
        setSelectedComandaId(null);
      }
      alert("Sucesso: Módulo zerado para uso imediato! Comece cadastrando um item de estoque no botão 'Estoque & Produtos'.");
    } catch (err) {
      setProducts([]);
      setComandas([]);
      setNotifications([]);
      setActiveShift(null);
      setShiftHistory([]);
      setClientActiveComandaId(null);
      setSelectedComandaId(null);
      alert("Sucesso: Cache de dados limpo com sucesso!");
    }
  };

  // --- CASH REGISTER SHIFT ACTIONS (Abertura e Fechamento de Caixa) ---
  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const newShift: CashierShift = {
      id: `SHF-${Math.floor(1000 + Math.random() * 9000)}`,
      openedAt: new Date().toISOString(),
      openedBy: session?.username || 'Usuário',
      initialBalance: Number(openInitialBalance),
      notes: openNotes,
      isActive: true
    };
    setActiveShift(newShift);
    localStorage.setItem('salesflow_active_shift', JSON.stringify(newShift));
    setIsShiftOpenModalOpen(false);
    setOpenNotes('');
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const shiftRevenue = getShiftRevenue(activeShift);
    const expectedBalance = activeShift.initialBalance + shiftRevenue;

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
    setIsShiftCloseModalOpen(false);
    setCloseNotes('');
    setCloseActualCash(0);
  };

  const getShiftRevenue = (shift: CashierShift) => {
    return comandas
      .filter(c => c.status === 'Pago' && c.closedAt && c.closedAt >= shift.openedAt && (!shift.closedBy || c.closedAt <= shift.openedAt))
      .reduce((val, c) => {
        const comandaValue = c.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return val + comandaValue;
      }, 0);
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
      triggerNotification(closedComanda, 'Pago');
    }
  };

  const handleToggleClosureReminder = (comandaId: string) => {
    const updatedComandas = comandas.map(c => {
      if (c.id === comandaId) {
        return { ...c, closureReminderActive: !c.closureReminderActive };
      }
      return c;
    });
    saveComandasToStorage(updatedComandas);
  };

  // 6. Delete a comanda entirely (cancels, restoring inventory of all active unsaved products in it!)
  const handleDeleteComanda = (comandaId: string) => {
    const targetComanda = comandas.find(c => c.id === comandaId);
    if (!targetComanda) return;

    // Restore stock for all non-paid comanda items
    if (targetComanda.status === 'Pendente') {
      let tempProducts = [...products];
      targetComanda.items.forEach(item => {
        tempProducts = tempProducts.map(p => {
          if (p.id === item.productId) {
            return { ...p, stock: p.stock + item.quantity };
          }
          return p;
        });
      });
      saveProductsToStorage(tempProducts);
    }

    const updatedComandas = comandas.filter(c => c.id !== comandaId);
    saveComandasToStorage(updatedComandas);

    if (selectedComandaId === comandaId) {
      setSelectedComandaId(null);
    }
  };

  // 7. Dynamic registration / opening tab from QR Code Simulator
  const handleRegisterNewComanda = (meta: { name: string; type: ClientType; course: string; month: string; email?: string; phone?: string; unit?: string }) => {
    const generatedId = `COM-${Math.floor(1000 + Math.random() * 9000)}`;
    const newComanda: Comanda = {
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
      unit: meta.unit || (unidades && unidades[0]) || 'Sede Principal'
    };

    const safeComandas = Array.isArray(comandas) ? comandas : [];
    const updatedComandas = [newComanda, ...safeComandas];
    saveComandasToStorage(updatedComandas);

    // Store visitor's pointer session
    setClientActiveComandaId(generatedId);
    try {
      localStorage.setItem('salesflow_client_active_id_v2', generatedId);
    } catch (e) {}

    // Alert or select
    setSelectedComandaId(generatedId); // highlights on POS too instantly!

    // Trigger register notifications with safe catch
    try {
      triggerNotification(newComanda, 'Abertura de Pedido');
    } catch (e) {
      console.error("Error triggering registration notification:", e);
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
    
    // Auto-trigger notification for signed status update "Pedido Assinado / Pronto"
    const currentTicket = comandas.find(c => c.id === comandaId);
    if (currentTicket) {
      triggerNotification(currentTicket, 'Assinado Digitalmente');
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
      unit: newClientUnit || unidades[0] || 'Sede Principal'
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
          bg: 'theme-gold-dark bg-[#09090B]',
          headerBg: 'bg-[#121214] border-white/5',
          textColor: 'text-slate-200',
          brandColor: 'bg-[#C5A059] hover:bg-[#B38F46] text-[#09090B]',
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
              <div className={`p-1.5 rounded-lg shrink-0 ${toast.type === 'email' ? 'bg-amber-500/20 text-amber-400' : 'bg-[#C5A059]/20 text-[#C5A059]'}`}>
                {toast.type === 'email' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-black block tracking-wide text-slate-200">{toast.title}</span>
                <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{toast.description}</p>
                <div className="text-[9px] text-[#C5A059] font-bold tracking-widest uppercase mt-2 select-none">● Envio Automatizado Efetuado</div>
              </div>
            </div>
          ))}
        </div>

        {/* Outer view wrapping just the client card but seamlessly styled */}
        <div className="w-full max-w-[390px] min-h-screen md:min-h-[640px] flex items-center justify-center">
          <ClientMobileView
            comandas={comandas}
            products={products}
            activeComandaId={clientActiveComandaId}
            onRegisterComanda={handleRegisterNewComanda}
            onAddProductFromClient={handleAddProductToComanda}
            onSignExistingItem={handleSignExistingComandaItem}
            onDisconnectClient={handleDisconnectClient}
            realTimeStatus={realTimeStatus}
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
              <div className="text-[9px] text-[#C5A059] font-bold tracking-widest uppercase mt-2 select-none">● Envio Automatizado Efetuado</div>
            </div>
          </div>
        ))}
      </div>

      {/* 1. MAIN GLOBAL STYLED HEADER */}
      <header className={`py-4 px-6 text-white ${themeStyle.headerBg} border-b shadow-md flex flex-col md:flex-row justify-between items-center gap-4 transition duration-300`}>
        <div className="flex items-center gap-3">
          {renderBrandLogo(brandLogoOption)}
          <div>
            <h1 className="text-base font-black tracking-wide uppercase flex items-center gap-1.5 font-mono">
              SalesFlow <span className={`text-[9px] ${theme === 'gold-dark' ? 'bg-[#C5A059] text-[#09090B]' : 'bg-slate-700 text-indigo-400'} font-bold px-1.5 py-0.5 rounded`}>PRO V4.5</span>
            </h1>
            <p className="text-[10px] text-slate-300">Estação de Atendimento Comercial & QR Code</p>
          </div>
        </div>

        {/* Presentation Controls and Theme Switcher (Atrativos e Modernos presets) */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Real-time Indicator Badge */}
          <div className={`flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border ${
            realTimeStatus === 'connected' ? 'border-emerald-500/20' :
            realTimeStatus === 'connecting' ? 'border-amber-500/20' : 'border-rose-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              realTimeStatus === 'connected' ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]' :
              realTimeStatus === 'connecting' ? 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]' :
              'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
            }`} />
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-300">
              {realTimeStatus === 'connected' ? 'SSE Tempo Real Ativo ⚡' :
               realTimeStatus === 'connecting' ? 'SSE Sincronizando...' : 'Segurança (Polling)'}
            </span>
          </div>

          {/* Template presets switcher */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/50">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1.5">Template:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setTheme('gold-dark')}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${theme === 'gold-dark' ? 'bg-[#C5A059] text-[#09090B]' : 'text-slate-300 hover:bg-slate-700'}`}
              >
                Sophisticated Dark 🌌
              </button>
              <button
                onClick={() => setTheme('slate')}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${theme === 'slate' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
              >
                Slate Clean
              </button>
              <button
                onClick={() => setTheme('emerald')}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${theme === 'emerald' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
              >
                Emerald Bistro
              </button>
              <button
                onClick={() => setTheme('midnight')}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${theme === 'midnight' ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
              >
                Midnight Tech
              </button>
            </div>
          </div>


          {/* Screen Layout View Toggle (Dual screens, full admin or smartphone client) */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setViewMode('both')}
              className={`text-[9px] uppercase tracking-wider font-bold py-1 px-2.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${viewMode === 'both' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              title="Mostrar tela de caixa e celular do cliente juntas"
            >
              <Layout className="w-3.5 h-3.5" />
              Ver Lado a Lado
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`text-[9px] uppercase tracking-wider font-bold py-1 px-2.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${viewMode === 'admin' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              title="Apenas tela principal do Caixa/Administrador"
            >
              <Building2 className="w-3.5 h-3.5" />
              Apenas Caixa (Admin)
            </button>
            <button
              onClick={() => setViewMode('client')}
              className={`text-[9px] uppercase tracking-wider font-bold py-1 px-2.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${viewMode === 'client' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              title="Apenas celular do cliente via QR Code"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Simular Smartphone
            </button>
          </div>
        </div>
      </header>

      {/* 2. DYNAMIC LAYOUT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: ESTAÇÃO PRINCIPAL / ADMIN POS (Renders if mode is BOTH or ADMIN) */}
        {(viewMode === 'both' || viewMode === 'admin') && (
          <div className={`${viewMode === 'both' ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-6`}>
            
            {session === null ? (
              userForPasswordChange ? (
                /* PASSWORD RESET ON FIRST LOGIN OVERLAY/FORM */
                <div id="first-access-password-change" className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full mx-auto my-12 shadow-2xl space-y-6 animate-slideIn text-left">
                  <div className="text-center">
                    <div className="relative w-14 h-14 bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Key className="w-7 h-7 text-[#C5A059]" />
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
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#C5A059]"
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
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#C5A059]"
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
                        className="flex-1 py-3 bg-[#C5A059] hover:bg-[#B38F46] text-[#09090B] font-extrabold text-xs rounded-xl transition cursor-pointer"
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
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#C5A059] font-sans"
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
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#C5A059] hover:bg-[#B38F46] text-[#09090B] font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow"
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
                <div className="bg-slate-800/45 p-4 rounded-3xl border border-slate-700/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-slate-300">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        {session.username}
                        <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-black uppercase">{session.role}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Sessão Comercial Autenticada</p>
                    </div>
                  </div>

                  {/* Cashier Operating Branch Select Option */}
                  <div className="flex items-center gap-2.5 bg-slate-900/60 hover:bg-slate-900/85 border border-slate-700/40 p-2.5 px-3.5 rounded-2xl transition duration-150 shadow-inner w-full sm:w-auto">
                    <MapPin className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                    <div className="text-left">
                      <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest leading-none mb-0.5">Unidade Ativa do Caixa</span>
                      <select
                        id="cashier-operating-unit-select"
                        value={operatingUnit}
                        onChange={(e) => handleUpdateOperatingUnit(e.target.value)}
                        className="bg-transparent border-none text-xs font-black text-[#C5A059] focus:outline-none cursor-pointer pr-5 font-mono select-none"
                        style={{ colorScheme: 'dark' }}
                      >
                        {unidades.map(u => (
                          <option key={u} value={u} className="bg-slate-900 text-white font-sans font-bold">{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {activeShift ? (
                      <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Caixa Aberto ({activeShift.id})
                        </span>
                        <button
                          onClick={() => {
                            setCloseActualCash(activeShift.initialBalance + getShiftRevenue(activeShift));
                            setIsShiftCloseModalOpen(true);
                          }}
                          className="bg-[#C5A059] hover:bg-[#B38F4B] text-black px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition shrink-0 cursor-pointer shadow-sm"
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
                          className="bg-[#C5A059] hover:bg-[#B38F4B] text-black px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition shrink-0 shadow-sm cursor-pointer"
                        >
                          Abrir Caixa
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handleFactoryReset}
                      className="p-2 bg-[#1E293B] hover:bg-amber-600/25 border border-amber-500/20 hover:border-amber-500/50 text-amber-500 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wide font-mono"
                      title="Zerar dados de teste para iniciar limpo"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-amber-500" />
                      Zerar Sistema
                    </button>

                    <button
                      onClick={handleLogout}
                      className="p-2 bg-slate-700 hover:bg-rose-900 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                      title="Sair do sistema"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub Tab selection with 3 elements now: Comandas, Estoque, Caixa & Notificacoes */}
                <div className="flex bg-white/60 p-1 rounded-2xl border border-slate-200 w-full max-w-2xl overflow-x-auto gap-1">
                  <button
                    onClick={() => {
                      setActiveAdminSubTab('comandas');
                      setSelectedComandaId(null);
                    }}
                    className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${activeAdminSubTab === 'comandas' ? 'bg-[#C5A059] text-black shadow-sm' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/50'}`}
                  >
                    <Layers className="w-4 h-4" />
                    Comandas Ativas ({comandas.filter(c => c.status === 'Pendente').length})
                  </button>
                  <button
                    onClick={() => setActiveAdminSubTab('estoque')}
                    className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${activeAdminSubTab === 'estoque' ? 'bg-[#C5A059] text-black shadow-sm' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/50'}`}
                  >
                    <Package className="w-4 h-4" />
                    Estoque & Produtos ({products.length})
                  </button>
                  <button
                    onClick={() => setActiveAdminSubTab('caixa_notificacoes')}
                    className={`flex-1 min-w-[130px]  py-2 px-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${activeAdminSubTab === 'caixa_notificacoes' ? 'bg-[#C5A059] text-black shadow-sm' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/50'}`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Caixa & Notificações
                  </button>
                  {session?.role === 'admin' && (
                    <button
                      onClick={() => setActiveAdminSubTab('acessos')}
                      className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${activeAdminSubTab === 'acessos' ? 'bg-[#C5A059] text-black shadow-sm' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/50'}`}
                    >
                      <Users className="w-4 h-4" />
                      Controle de Acessos ({users.length})
                    </button>
                  )}
                </div>

                {/* Warning message if they haven't opened the cashier register yet */}
                {!activeShift && activeAdminSubTab !== 'caixa_notificacoes' && activeAdminSubTab !== 'acessos' && (
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
                      className="bg-[#C5A059] hover:bg-[#B38F46] text-black px-3.5 py-1.5 rounded-xl font-bold font-mono text-[10px] uppercase cursor-pointer transition shrink-0"
                    >
                      Abertura de Caixa 🔑
                    </button>
                  </div>
                )}

                {/* Sub-Tab rendering logic */}
                {activeAdminSubTab === 'estoque' ? (
                  <StockManagement
                    products={products}
                    onSaveProduct={handleSaveProduct}
                    onDeleteProduct={handleDeleteProduct}
                    categories={categories}
                    onSaveCategories={handleSaveCategories}
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
                  />
                ) : activeAdminSubTab === 'caixa_notificacoes' ? (
                  /* GORGEOUS COMMERCIAL REPORTING / SYSTEM PANEL */
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Active Shift dashboard */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Status do Turno Atual</span>
                          {activeShift ? (
                            <div className="mt-4 space-y-4">
                              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div>
                                  <span className="text-[9px] text-slate-400 uppercase">Operador Responsável</span>
                                  <div className="text-xs font-black text-slate-700 mt-0.5">{activeShift.openedBy}</div>
                                </div>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full">ABERTO</span>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50/50 p-2 text-center rounded-xl border border-slate-100">
                                  <span className="text-[9px] text-slate-400 block font-semibold">Abertura</span>
                                  <span className="text-xs font-black text-slate-700">R$ {activeShift.initialBalance.toFixed(2)}</span>
                                </div>
                                <div className="bg-slate-50/50 p-2 text-center rounded-xl border border-slate-100">
                                  <span className="text-[9px] text-slate-400 block font-semibold">Vendas Caixa</span>
                                  <span className="text-xs font-black text-emerald-600 font-mono">+R$ {getShiftRevenue(activeShift).toFixed(2)}</span>
                                </div>
                                <div className="bg-[#C5A059]/10 p-2 text-center rounded-xl border border-slate-100">
                                  <span className="text-[9px] text-slate-400 block font-semibold">Estimado</span>
                                  <span className="text-xs font-black text-[#C5A059] font-mono">R$ {(activeShift.initialBalance + getShiftRevenue(activeShift)).toFixed(2)}</span>
                                </div>
                              </div>
                              
                              <p className="text-[10px] text-slate-400">Iniciado em: <strong className="text-slate-600 font-semibold">{new Date(activeShift.openedAt).toLocaleString('pt-BR')}</strong></p>

                              <button
                                onClick={() => {
                                  setCloseActualCash(activeShift.initialBalance + getShiftRevenue(activeShift));
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
                            <span className="text-[9px] text-slate-400 font-bold block">Últimos {shiftHistory.length} turnos</span>
                          </div>

                          <div className="mt-4 space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {shiftHistory.length === 0 ? (
                              <p className="text-[11px] text-slate-400 text-center py-8">Nenhum histórico de caixa fechado registrado.</p>
                            ) : (
                              shiftHistory.map((shf) => {
                                const devRevenue = shf.finalBalance ? (shf.finalBalance - shf.initialBalance) : 0;
                                const diff = shf.actualCashInHand !== undefined && shf.finalBalance !== undefined 
                                  ? shf.actualCashInHand - shf.finalBalance
                                  : 0;

                                return (
                                  <div key={shf.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center gap-2 text-xs">
                                    <div>
                                      <div className="font-extrabold text-slate-800 font-mono text-[11px]">{shf.id}</div>
                                      <span className="text-[9px] text-slate-400 block mt-0.5">Operado por {shf.closedBy}</span>
                                      <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(shf.openedAt).toLocaleDateString('pt-BR')} {new Date(shf.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-bold text-slate-800 block">Faturado: R$ {devRevenue.toFixed(2)}</span>
                                      {diff === 0 ? (
                                        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Sem Divergência</span>
                                      ) : (
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${diff > 0 ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'bg-rose-50 text-rose-600'}`}>
                                          Contagem: {diff > 0 ? '+' : ''}R$ {diff.toFixed(2)}
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

                    {/* SYSTEM CONFIG: SENDING WHATSAPP SETTINGS */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#C5A059]/10 pb-4 mb-4.5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                            <MessageSquare className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">Canais de Integração</span>
                            <h3 className="text-sm font-extrabold text-slate-800 font-sans">Gateway de WhatsApp do Caixa</h3>
                          </div>
                        </div>

                        {/* Connection status badge */}
                        <div className="flex items-center self-start sm:self-center">
                          {whatsConnectionStatus === 'connected' ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                              🟢 CONECTADO
                            </span>
                          ) : whatsConnectionStatus === 'connecting' ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                              ⏳ ESCANEANDO...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"></span>
                              🔴 DESCONECTADO
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {whatsConnectionStatus === 'disconnected' && (
                          <div className="space-y-4 text-left">
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Conecte sua conta do WhatsApp para que o sistema SalesFlow possa despachar notificações automáticas de status de comanda, faturamentos e assinaturas digitais do caixa. Selecione o método de pareamento preferido abaixo:
                            </p>

                            {/* Method Selector Tabs */}
                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/60 max-w-md">
                              <button
                                type="button"
                                onClick={() => setWhatsConnectionMethod('qrcode')}
                                className={`flex-1 py-2 px-3 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                                  whatsConnectionMethod === 'qrcode'
                                    ? 'bg-white text-slate-800 shadow-xs border border-slate-200/40'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                🔗 Via Código QR (Sem Digitar)
                              </button>
                              <button
                                type="button"
                                onClick={() => setWhatsConnectionMethod('manual')}
                                className={`flex-1 py-2 px-3 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                                  whatsConnectionMethod === 'manual'
                                    ? 'bg-white text-slate-800 shadow-xs border border-slate-200/40'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                ✍️ Digitar Número Manualmente
                              </button>
                            </div>

                            {whatsConnectionMethod === 'qrcode' ? (
                              <div className="space-y-3.5 pt-1">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                  Gere o QR Code de autenticação para escanear com seu celular. O sistema SalesFlow identificará seu remetente automaticamente após a leitura, sem necessidade de digitar nenhum número anteriormente.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWhatsConnectionStatus('connecting');
                                    localStorage.setItem('salesflow_whats_status', 'connecting');

                                    // Trigger server connection simulation (no number sent; server auto-generates scanning cell details upon connection)
                                    fetch('/api/whatsapp/connect', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({})
                                    }).catch(err => console.error("Error setting up server QR connection:", err));
                                  }}
                                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm uppercase tracking-wider font-mono cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Key className="w-3.5 h-3.5 text-white animate-pulse" />
                                  Gerar QR Code de Pareamento 🔗
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4 pt-1">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                  Preencha o número do transmissor abaixo para ativar instantaneamente o canal de disparos de WhatsApp sem precisar ler nenhum código de barras na tela do seu celular.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3 items-end">
                                  <div className="flex-grow w-full">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 font-mono">Número do WhatsApp Remetente</label>
                                    <div className="relative">
                                      <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-400">+</span>
                                      <input
                                        type="text"
                                        value={systemWhatsNumber.replace(/^\+/, '')}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/[^\d\s()+-]/g, '');
                                          setSystemWhatsNumber(val ? '+' + val : '');
                                          localStorage.setItem('salesflow_system_whats_number', val ? '+' + val : '');
                                        }}
                                        className="w-full pl-7 pr-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl transition font-mono text-slate-800"
                                        placeholder="Ex: 5511999999999"
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!systemWhatsNumber || systemWhatsNumber.length < 8) {
                                        alert("Por favor, digite um número de WhatsApp válido.");
                                        return;
                                      }
                                      setWhatsConnectionStatus('connected');
                                      localStorage.setItem('salesflow_whats_status', 'connected');

                                      fetch('/api/whatsapp/config', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ number: systemWhatsNumber })
                                      }).then(() => {
                                        fetch('/api/whatsapp/force-connect', { method: 'POST' })
                                          .catch(err => console.error("Error setting up manual session:", err));
                                      }).catch(err => console.error("Error saving manual config:", err));
                                    }}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm uppercase tracking-wider font-mono cursor-pointer flex items-center justify-center gap-1.5"
                                  >
                                    <Check className="w-3.5 h-3.5 text-white" />
                                    Ativar Canal por Número ⚡
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {whatsConnectionStatus === 'connecting' && (
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-4">
                            <div className="max-w-[285px]">
                              <span className="text-[10px] font-black tracking-wider text-[#C5A059] uppercase block mb-1">Pareamento WhatsApp Web</span>
                              <h4 className="text-xs font-extrabold text-slate-800 font-sans">Escaneie o QR Code</h4>
                              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                                Abra o WhatsApp no smartphone, vá em <strong className="text-slate-600 font-bold">Aparelhos Conectados &gt; Conectar um Aparelho</strong>, e mire na imagem abaixo:
                              </p>
                            </div>

                            {/* Dynamic generated scanner-ready QR code targeting api.qrserver */}
                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180&data=${encodeURIComponent(`salesflow-session-auth-${systemWhatsNumber.replace(/\D/g, '')}-${Date.now()}`)}`}
                                alt="WhatsApp QR Setup Code"
                                width={180}
                                height={180}
                                className="rounded-lg object-contain bg-white"
                                referrerPolicy="no-referrer"
                              />
                              <div className="mt-3.5 flex items-center gap-1.5 text-[9px] text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-black uppercase tracking-wider animate-pulse font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                                Aguardando leitura do QR no celular...
                              </div>
                            </div>

                            <div className="flex gap-2 w-full max-w-sm">
                              <button
                                type="button"
                                onClick={() => {
                                  setWhatsConnectionStatus('disconnected');
                                  localStorage.setItem('salesflow_whats_status', 'disconnected');

                                  fetch('/api/whatsapp/disconnect', { method: 'POST' })
                                    .catch(err => console.error("Error canceling server session:", err));
                                }}
                                className="flex-1 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl text-[10px] font-extrabold uppercase transition cursor-pointer font-sans"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setWhatsConnectionStatus('connected');
                                  localStorage.setItem('salesflow_whats_status', 'connected');
                                  
                                  fetch('/api/whatsapp/force-connect', { method: 'POST' })
                                    .catch(err => console.error("Error forcing server session:", err));

                                  const customToastId = `toast-whats-forced-${Date.now()}`;
                                  setActiveToasts(prev => [
                                    ...prev,
                                    {
                                      id: customToastId,
                                      title: "🟢 WhatsApp Pareado!",
                                      description: `Número ${systemWhatsNumber} conectado via simulação instantânea de leitura.`,
                                      type: 'email'
                                    }
                                  ]);
                                  setTimeout(() => {
                                    setActiveToasts(current => current.filter(t => t.id !== customToastId));
                                  }, 4000);
                                }}
                                className="flex-grow flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold uppercase transition cursor-pointer shadow-sm font-sans"
                              >
                                Autoconectar Instantâneo 📱
                              </button>
                            </div>
                          </div>
                        )}

                        {whatsConnectionStatus === 'connected' && (
                          <div className="bg-emerald-500/[0.02] p-5 rounded-2xl border border-emerald-500/10 flex flex-col md:flex-row justify-between items-center gap-4 text-left">
                            <div className="flex gap-3.5 items-start">
                              <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-inner relative">
                                <MessageSquare className="w-5 h-5 text-white" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center border border-emerald-100 shadow-sm">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                </span>
                              </div>
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                                  Telefone Pareado & Ativo
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black font-mono">CONEXÃO WEB</span>
                                </h4>
                                <p className="text-[11px] font-mono font-black text-slate-600 mt-0.5">{systemWhatsNumber}</p>
                                <div className="text-[10px] text-slate-400 mt-2.5 space-y-0.5">
                                  <p>• Dispositivo: <strong className="text-slate-600 font-bold">Node-Agent WhatsApp API Session (Estável)</strong></p>
                                  <p>• Logs Ativos: <strong className="text-slate-600 font-bold">Pronto para despachos</strong></p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  // Send test WhatsApp dispatch and store on DB
                                  const testNotif = {
                                    id: `W-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
                                    timestamp: new Date().toISOString(),
                                    recipient: "Operador de Canal",
                                    course: "Autoteste Caixa",
                                    contact: systemWhatsNumber,
                                    type: 'WhatsApp',
                                    message: `*SalesFlow Canal Ativo* ✅\nEste é um disparo manual de autodiagnóstico. Seu transmissor do número ${systemWhatsNumber} está respondendo com sucesso!`,
                                    status: 'Sucesso',
                                    sender: systemWhatsNumber
                                  };
                                  
                                  fetch('/api/notifications', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(testNotif)
                                  }).catch(() => {});

                                  const diagToastId = `toast-diag-${Date.now()}`;
                                  setActiveToasts(prev => [
                                    ...prev,
                                    {
                                      id: diagToastId,
                                      title: "🚀 Conexão Confirmada",
                                      description: "Disparo de autoteste efetuado em logs com sucesso!",
                                      type: 'email'
                                    }
                                  ]);
                                  setTimeout(() => {
                                    setActiveToasts(current => current.filter(t => t.id !== diagToastId));
                                  }, 4000);
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold uppercase transition tracking-wider font-mono cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <Send className="w-3.5 h-3.5 text-white" />
                                Testar Canal
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Deseja desconectar e deslogar esta conta de WhatsApp do sistema de cobrança?")) {
                                    setWhatsConnectionStatus('disconnected');
                                    localStorage.setItem('salesflow_whats_status', 'disconnected');

                                    fetch('/api/whatsapp/disconnect', { method: 'POST' })
                                      .catch(err => console.error("Error disconnecting server session:", err));

                                    const logoutToastId = `toast-logout-${Date.now()}`;
                                    setActiveToasts(prev => [
                                      ...prev,
                                      {
                                        id: logoutToastId,
                                        title: "🔴 WhatsApp Desconectado",
                                        description: "O canal de mensageria foi despareado com sucesso.",
                                        type: 'sms'
                                      }
                                    ]);
                                    setTimeout(() => {
                                      setActiveToasts(current => current.filter(t => t.id !== logoutToastId));
                                    }, 4000);
                                  }
                                }}
                                className="px-4 py-2 text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl text-[10px] font-extrabold uppercase transition tracking-wider font-mono cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                Desconectar Canal 🔌
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CLOUD INTEGRATION: SUPABASE CLOUD DATABASE CONFIGURATION */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#C5A059]/10 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                            <Layers className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">Bases de Dados Relacionais</span>
                            <h3 className="text-sm font-extrabold text-slate-800 font-sans">Sincronização & Exportação Supabase (PostgreSQL)</h3>
                          </div>
                        </div>

                        {/* Connection status badge */}
                        <div className="flex items-center self-start sm:self-center">
                          {!isSupabaseConfigured() ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                              ● Modo Sandbox Local
                            </span>
                          ) : supabaseConnectionStatus === 'connected' ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                              Estável & Conectado
                            </span>
                          ) : supabaseConnectionStatus === 'error' ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                              ⚠️ Erro de Parâmetros
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                              ● Verificando Conexão...
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content panel */}
                      <div className="space-y-4 text-left">
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Este painel prepara o sistema para uma transição impecável para ambientes locais de IDE, execução por linha de comando (CLI), e conectividade direta com o <strong>Supabase (PostgreSQL)</strong> e hospedagem no <strong>Vercel</strong>.
                        </p>

                        {!isSupabaseConfigured() ? (
                          <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-100 space-y-3">
                            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                              <span>📂 Como Ativar a Sincronização Automática</span>
                              <span className="text-[8px] bg-indigo-50 text-indigo-700 py-0.5 px-1.5 rounded font-black font-mono">SUPABASE</span>
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              O sistema está pronto para produção. Para ativar o banco em nuvem real, basta editar o arquivo <strong>.env</strong> ao exportar para sua máquina local e preencher as variáveis <code className="bg-slate-200/60 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_URL</code> e <code className="bg-slate-200/60 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_ANON_KEY</code>.
                            </p>
                            <div className="pt-2 flex flex-wrap gap-2">
                              <div className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 py-1 px-2.5 rounded-lg flex items-center gap-1.5 font-bold font-mono">
                                📄 supabase-schema.sql Gerado
                              </div>
                              <div className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 py-1 px-2.5 rounded-lg flex items-center gap-1.5 font-bold font-mono">
                                📄 vercel.json Gerado
                              </div>
                              <div className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 py-1 px-2.5 rounded-lg flex items-center gap-1.5 font-bold font-mono">
                                📄 IDE_CLI_README.md Pronto
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-4">
                            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
                              <span className="text-xs font-black uppercase text-slate-800 tracking-wider font-mono">Controlador de Sincronia</span>
                              <span className="text-[9px] text-slate-400 font-mono">Estabilidade PostgreSQL: 100%</span>
                            </div>

                            {supabaseConnectionStatus === 'error' ? (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 rounded-xl text-[10.5px] leading-relaxed">
                                <strong className="block font-black uppercase tracking-wider text-[9.5px] mb-0.5 text-amber-700 font-mono">⚠️ Aviso do Banco de Dados:</strong>
                                {supabaseErrorDetails}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Sincronize os dados locais de teste que você inseriu na interface diretamente com o banco relacional de produção no Supabase com um único clique.
                              </p>
                            )}

                            {/* Sincronização logs list */}
                            {supabaseLogMessages.length > 0 && (
                              <div className="p-3 bg-slate-950 text-slate-300 font-mono text-[9px] rounded-xl max-h-[140px] overflow-y-auto space-y-1 leading-normal">
                                {supabaseLogMessages.map((msg, idx) => (
                                  <div key={idx} className={`${msg.startsWith('❌') ? 'text-rose-400' : msg.startsWith('✅') ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {msg}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2">
                              {/* Sync Button */}
                              <button
                                type="button"
                                disabled={supabaseLoading}
                                onClick={async () => {
                                  setSupabaseLoading(true);
                                  setSupabaseLogMessages([]);
                                  
                                  const payload = {
                                    products,
                                    comandas,
                                    notifications,
                                    categories,
                                    unidades
                                  };

                                  const result = await pushDataToSupabase(payload);
                                  setSupabaseLogMessages(result.logs);
                                  setSupabaseLoading(false);

                                  const toastId = `toast-sync-${Date.now()}`;
                                  setActiveToasts(prev => [
                                    ...prev,
                                    {
                                      id: toastId,
                                      title: result.success ? "✅ Sincronia Efetuada" : "❌ Falha ao Enviar",
                                      description: result.success ? "Dados de comandas e cardápio carregados no Supabase." : "Verifique as configurações das tabelas.",
                                      type: result.success ? 'email' : 'sms'
                                    }
                                  ]);
                                  setTimeout(() => {
                                    setActiveToasts(current => current.filter(t => t.id !== toastId));
                                  }, 4000);
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10.5px] font-black uppercase transition tracking-wider font-mono cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98 disabled:opacity-50"
                              >
                                {supabaseLoading ? (
                                  <>Sincronizando Tabelas...</>
                                ) : (
                                  <>
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    Migrar Dados Atuais para o Supabase 🚀
                                  </>
                                )}
                              </button>

                              {/* Pull Button */}
                              <button
                                type="button"
                                disabled={supabaseLoading}
                                onClick={async () => {
                                  setSupabaseLoading(true);
                                  setSupabaseLogMessages(prev => [...prev, 'Baixando dados remotos de comandas e catálogo...']);
                                  
                                  const result = await pullStateFromSupabase();
                                  if (result.success && result.state) {
                                    setProducts(result.state.products);
                                    setComandas(result.state.comandas);
                                    setNotifications(result.state.notifications);
                                    setCategories(result.state.categories);
                                    setUnidades(result.state.unidades);
                                    setSupabaseLogMessages(prev => [...prev, '✅ Estado local totalmente atualizado com dados da nuvem Supabase!']);
                                  } else {
                                    setSupabaseLogMessages(prev => [...prev, `❌ Falha ao ler dados: ${result.error || 'Tabelas não criadas.'}`]);
                                  }
                                  setSupabaseLoading(false);
                                }}
                                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-[10.5px] font-black uppercase transition tracking-wider font-mono cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                              >
                                📥 Baixar Estado da Nuvem
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Export & deployment checklist details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex gap-2.5">
                            <div className="p-1.5 bg-[#C5A059]/10 text-[#C5A059] rounded-lg h-fit">
                              <Check className="w-3.5 h-3.5 text-[#C5A059]" />
                            </div>
                            <div className="text-left text-[11px]">
                              <span className="font-extrabold text-slate-800 block">Esquema SQL Preparado</span>
                              <p className="text-slate-400 text-[10px] leading-normal.5 mt-0.5">O script <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700 font-mono">supabase-schema.sql</code> já está salvo na raiz para ser colado no painel.</p>
                            </div>
                          </div>

                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex gap-2.5">
                            <div className="p-1.5 bg-[#C5A059]/10 text-[#C5A059] rounded-lg h-fit">
                              <Check className="w-3.5 h-3.5 text-[#C5A059]" />
                            </div>
                            <div className="text-left text-[11px]">
                              <span className="font-extrabold text-slate-800 block">Pronto para o Vercel</span>
                              <p className="text-slate-400 text-[10px] leading-normal.5 mt-0.5">Configurado com o roteamento dinâmico <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700 font-mono">vercel.json</code> pronto para deploy contínuo.</p>
                            </div>
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
                        {notifications.length === 0 ? (
                          <div className="text-center py-12 text-slate-400">
                            <span className="text-xl block mb-2">✉️</span>
                            <span className="text-xs font-bold text-slate-700 block">Nenhum log de notificação enviado ainda.</span>
                            <p className="text-[10px] text-slate-400 max-w-[280px] mx-auto mt-1">Quando os clientes se registrarem ou o caixa fechar comandas, os disparos de SMS/E-mail automáticos serão ilustrados aqui.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
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
                                  <div className="text-[10px] text-slate-400 bg-white p-2 rounded-xl border border-slate-100/50 select-text whitespace-pre-wrap font-sans leading-relaxed text-left">
                                    {notif.message}
                                  </div>
                                </div>
                              </div>
                              <div className="md:text-right shrink-0 flex md:flex-col justify-between items-center md:items-end gap-1">
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-extrabold uppercase inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Enviado
                                </span>
                                <span className="text-[9px] text-slate-400 block mt-1">{new Date(notif.timestamp).toLocaleTimeString('pt-BR')}</span>
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
                      /* Expanded Single Ticket view with print receipt & add items options */
                      <ComandaDetailView
                        comanda={selectedComanda}
                        products={products}
                        onAddProduct={handleAddProductToComanda}
                        onRemoveItem={handleRemoveItemFromComanda}
                        onUpdateItemQuantity={handleUpdateItemQuantity}
                        onCloseComanda={handleCloseComanda}
                        onDeleteComanda={handleDeleteComanda}
                        onToggleClosureReminder={handleToggleClosureReminder}
                        onOpenSimulatorForComanda={(cid) => {
                          setClientActiveComandaId(cid);
                          localStorage.setItem('salesflow_client_active_id_v2', cid);
                          setViewMode('both'); // split layout so they see both sync!
                        }}
                        onBackToList={() => setSelectedComandaId(null)}
                      />
                    ) : (
                      /* Standard Tickets listing Board with aggregations & filters */
                      <ComandaList
                        comandas={comandas}
                        selectedComanda={selectedComanda}
                        onSelect={(c) => setSelectedComandaId(c.id)}
                        onOpenCreateModal={() => setIsNewComandaModalOpen(true)}
                        onOpenManageUnits={() => setIsManageUnitsModalOpen(true)}
                        unidades={unidades}
                        operatingUnit={operatingUnit}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: REASSURING LIVE SMARTPHONE SIMULATOR FOR CUSTOMER (Renders if mode is BOTH or CLIENT) */}
        {(viewMode === 'both' || viewMode === 'client') && (
          <div className={`${viewMode === 'both' ? 'lg:col-span-4' : 'lg:col-span-12'} flex flex-col items-center justify-start`}>
            
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
              comandas={comandas}
              products={products}
              activeComandaId={clientActiveComandaId}
              onRegisterComanda={handleRegisterNewComanda}
              onAddProductFromClient={handleAddProductToComanda}
              onSignExistingItem={handleSignExistingComandaItem}
              onDisconnectClient={handleDisconnectClient}
              realTimeStatus={realTimeStatus}
            />
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="text-center py-6 mt-auto text-xs text-slate-400 font-medium border-t border-slate-200 bg-white/40">
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
                  {unidades.map(u => (
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
                    className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F4B] text-black text-xs font-black rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-black" />
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
          unidades={unidades}
          onSaveUnidades={handleSaveUnidades}
          comandas={comandas}
        />
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
                    className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F4B] text-black text-xs font-black rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-black" />
                    Confirmar e Sair
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FECHAMENTO DE CAIXA */}
      {isShiftCloseModalOpen && activeShift && (
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
                  <span className="font-bold text-slate-800">R$ {activeShift.initialBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendas do Turno (+):</span>
                  <span className="font-bold text-emerald-600 font-mono">+ R$ {getShiftRevenue(activeShift).toFixed(2)}</span>
                </div>
                <hr className="border-slate-200 border-dashed my-1" />
                <div className="flex justify-between font-extrabold text-slate-900">
                  <span>Valor Calculado Estimado:</span>
                  <span className="text-[#C5A059] font-mono">R$ {(activeShift.initialBalance + getShiftRevenue(activeShift)).toFixed(2)}</span>
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
                    className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F4B] text-black text-xs font-black rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-black" />
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
