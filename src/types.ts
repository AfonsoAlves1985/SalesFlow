export type ClientType = 'Aluno' | 'Colaborador' | 'Diretoria';
export type PaymentStatus = 'Pendente' | 'Pago';

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
  updatedAt?: string;
}

export interface OrderedItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  price: number;
  quantity: number;
  timestamp: string;
  signature?: string; // Base64 data-URL of drawn signature
  signedAt?: string;
}

export interface Comanda {
  id: string;
  clientName: string;
  clientType: ClientType;
  clientEmail?: string;
  clientPhone?: string;
  courseOrTraining: string;
  month: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt?: string;
  closedAt?: string;
  items: OrderedItem[];
  unit?: string;
  closureReminderActive?: boolean;
}

export interface CashierShift {
  id: string;
  openedAt: string;
  openedBy: string;
  closedAt?: string;
  closedBy?: string;
  initialBalance: number;
  finalBalance?: number;
  actualCashInHand?: number;
  notes?: string;
  isActive: boolean;
}

export interface UserSession {
  id?: string;
  username: string;
  loginName: string;
  role: 'admin' | 'cashier';
  email?: string;
  avatar?: string;
}

export interface SystemUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier';
  status: 'active' | 'invited';
  password?: string;
  invitationCode?: string;
  needsPasswordChange?: boolean;
  avatar?: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  price: number;
  totalValue: number;
  reference: string;
  timestamp: string;
}

export type ThemeType = 'slate' | 'emerald' | 'midnight' | 'gold-dark';
