export type ClientType = 'Aluno' | 'Colaborador' | 'Diretoria';
export type PaymentStatus = 'Pendente' | 'Pago';

export interface ScopeFields {
  companyId?: string;
  workspaceId?: string;
  spaceId?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
}

export interface Workspace extends ScopeFields {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
}

export interface Space extends ScopeFields {
  id: string;
  companyId: string;
  workspaceId: string;
  name: string;
  slug: string;
  type: 'caixa' | 'evento' | 'loja' | 'cantina' | 'outro';
  status: 'active' | 'inactive';
}

export const DEFAULT_COMPANY: Company = {
  id: 'grupo-frz',
  name: 'Grupo FRZ',
  slug: 'grupo-frz',
  status: 'active'
};

export const DEFAULT_WORKSPACE: Workspace = {
  id: 'febracis-pa',
  companyId: DEFAULT_COMPANY.id,
  name: 'Febracis PA',
  slug: 'febracis-pa',
  status: 'active'
};

export const DEFAULT_SPACE: Space = {
  id: 'caixa-principal',
  companyId: DEFAULT_COMPANY.id,
  workspaceId: DEFAULT_WORKSPACE.id,
  name: 'Caixa Principal',
  slug: 'caixa-principal',
  type: 'caixa',
  status: 'active'
};

export const DEFAULT_SCOPE: Required<ScopeFields> = {
  companyId: DEFAULT_COMPANY.id,
  workspaceId: DEFAULT_WORKSPACE.id,
  spaceId: DEFAULT_SPACE.id
};

export interface Product extends ScopeFields {
  id: string;
  code: string;
  name: string;
  price: number;
  costPrice?: number;
  stock: number;
  minStock?: number;
  supplier?: string;
  category: string;
  image?: string;
  updatedAt?: string;
}

export type UserRole = 'admin' | 'manager' | 'finance' | 'stock' | 'cashier';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Co-Administrador',
  manager: 'Gerente Operacional',
  finance: 'Financeiro',
  stock: 'Estoquista',
  cashier: 'Operador de Caixa'
};

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

export interface Comanda extends ScopeFields {
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

export interface CashierShift extends ScopeFields {
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
  role: UserRole;
  email?: string;
  avatar?: string;
  companyId?: string;
  workspaceIds?: string[];
  spaceIds?: string[];
}

export interface SystemUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'invited';
  password?: string;
  invitationCode?: string;
  needsPasswordChange?: boolean;
  avatar?: string;
  companyId?: string;
  workspaceIds?: string[];
  spaceIds?: string[];
  createdAt: string;
}

export interface StockMovement extends ScopeFields {
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

export interface Receivable extends ScopeFields {
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

export interface AuditLogEntry extends ScopeFields {
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
