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
  cashMovements?: CashierCashMovement[];
}

export interface CashierCashMovement {
  id: string;
  type: 'suprimento' | 'sangria';
  amount: number;
  reason: string;
  createdAt: string;
  createdBy: string;
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

export type AuditEntityType = 'comanda' | 'produto' | 'estoque' | 'caixa' | 'usuario' | 'unidade' | 'categoria' | 'pdv' | 'sistema';
export type AuditActionType = 'criou' | 'editou' | 'excluiu' | 'abriu' | 'fechou' | 'assinou' | 'estornou' | 'resetou' | 'ativou';

export type ReceivableStatus = 'Pendente' | 'Parcial' | 'Pago' | 'Cancelado';

export interface Receivable {
  id: string;
  comandaId: string;
  clientName: string;
  clientType: ClientType;
  courseOrTraining: string;
  unit?: string;
  month: string;
  amount: number;
  paidAmount: number;
  status: ReceivableStatus;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  canceledAt?: string;
  paymentMethod?: 'Dinheiro' | 'Pix' | 'Cartao' | 'Outro';
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName: string;
  actorLogin?: string;
  actorRole?: UserSession['role'];
  action: AuditActionType;
  entityType: AuditEntityType;
  entityId?: string;
  entityLabel: string;
  summary: string;
  details?: Record<string, string | number | boolean | null | undefined>;
}

export type ThemeType = 'slate' | 'emerald' | 'midnight' | 'gold-dark';
