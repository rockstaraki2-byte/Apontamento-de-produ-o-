export const COLOR_MAP: Record<string, string> = {
  "0": "INDEFINIDA",
  "1": "ZINCADO",
  "2": "COR DE PREPARACAO",
  "3": "PRETO FOSCO",
  "4": "COBRE",
  "5": "PRATA",
  "6": "CHAMPAGNE",
  "7": "ROSÊ",
  "8": "INCOLOR",
  "9": "PRETO BRILHO",
  "10": "BRANCO (LEITOSO)",
  "11": "CINZA",
  "12": "DOURADO",
  "13": "GRAFITE",
  "14": "INOX"
};

export type Role =
  | "ADMIN"
  | "GERENCIA"
  | "LEITURA"
  | "PCP"
  | "ESTOQUE"
  | "EMBALAGEM"
  | "PRODUCAO"
  | "MONTAGEM_RODRIGO"
  | "PINTURA"
  | "CORTE_LASER"
  | "PROJETISTA"
  | "REPRESENTANTE"
  | "PRENSA_RAFAEL"
  | "INJETORA"
  | "PRENSA_EDUARDO"
  | "BANHO_QUIMICO"
  | "SOLDA"
  | "MONTAGEM_RETRATIL"
  | "ENCARREGADO"
  | "TORNO_CNC_WILLIAN"
  | "TORNO_CNC_HENRIQUE";

export interface NestTask {
  id: number;
  nestName: string;
  partName: string;
  size: string;
  totalQuantity: number;
  cutQuantity: number;
  thumbnailBase64?: string;
  sequence?: number; // For planning sequence
  status: "PLANEJAMENTO" | "PENDENTE" | "EM_CORTE" | "CORTADO";
  isActive: boolean;
  createdAt: number;
  completedAt?: number;
}
export type OrderStatus =
  | "AGUARDANDO_APROVACAO"
  | "PENDENTE"
  | "TEM_ESTOQUE"
  | "EM_PRODUCAO"
  | "PRODUZIDO"
  | "EM_CORTE"
  | "CORTADO"
  | "EM_PINTURA"
  | "PINTADO"
  | "EMBALANDO"
  | "EMBALADO"
  | "PLANEJADO"
  | "FATURADO"
  | "FATURADO_PARCIAL";

export interface User {
  id: string;
  name: string;
  role: Role;
  fcmToken?: string;
  password?: string;
  phone?: string;
  email?: string;
  tenantId?: string;
  sectorIds?: number[];
  machines?: string[];
}

export interface Tenant {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  systemName?: string;
  monthlyBillingGoal?: number;
  machines?: string[];
}

export interface Item {
  id: number;
  code: string;
  name: string;
  notes: string;
  basePrice?: number;
  productionPoints?: number;
  type?: "PRODUTO" | "PECA" | "EPI";
  components?: { itemId: number; quantity: number }[];
  imageUrl?: string;
  standardCycles?: Record<number, number>; // sectorId -> time in minutes
}

export interface Employee {
  id: string;
  name: string;
  sectorId: number;
  isActive: boolean;
  uniformSizes?: {
    shirt?: string;
    pants?: string;
    shoes?: string;
  };
  phone?: string;
  cpf?: string;
  admissionDate?: number;
}

export interface AttendanceRecord {
  id: string; // usually employeeId_date
  employeeId: string;
  date: string; // 'YYYY-MM-DD'
  morning: "PRESENTE" | "FALTA" | null;
  afternoon: "PRESENTE" | "FALTA" | null;
}

export interface Uniform {
  id: string;
  name: string;
  size: string;
  stock: number;
  minStock: number;
}

export interface UniformDistribution {
  id: string;
  employeeId: string;
  uniformId: string;
  quantity: number;
  date: number;
  notes?: string;
}

export interface EpiDistribution {
  id: string;
  employeeId: string;
  itemId: number; // reference to the EPI Item
  quantity: number;
  date: number;
  notes?: string;
}

export interface ProductAttribute {
  id: number;
  type: "COLOR" | "SIZE" | "VARIATION";
  value: string;
}

export interface AppNotification {
  id: number;
  message: string;
  read: boolean;
  createdAt: number;
  type?: string;
  recipientId?: string; // If set, only this user sees it
  orderId?: number | string; 
  details?: any;
  title?: string;
  severity?: "low" | "medium" | "high" | "critical";
  actionUrl?: string;
}

export interface StockEntry {
  id: string; // `${itemId}|${color}|${size}|${variation}|${stage}`
  itemId: number;
  color: string;
  size: string;
  variation: string;
  quantity: number;
  reservedQuantity?: number;
  stage: "INTERMEDIARIO" | "ACABADO";
  declaredPackages?: number;
  measurementUnit?: string;
}

export interface Order {
  id: number;
  orderCode: string;
  itemId: number;
  color: string;
  size: string;
  variation: string;
  customerName: string;
  representativeName?: string;
  representativeId?: string;
  totalQuantity: number;
  packedQuantity: number;
  producedQuantity?: number;
  paintedQuantity?: number;
  cutQuantity?: number;
  invoicedQuantity?: number;
  isThirdPartyLaser?: boolean;
  isActive: boolean;
  createdAt: number;
  deliveryDate: string;
  paymentCondition?: string;
  paymentTerms?: string;
  billingRule?: 'cadastro' | 'ultimo_pedido';
  isUrgent?: boolean;
  isProgramacao?: boolean;
  status?: OrderStatus;
  statusOriginalPdf?: string;
  unitPrice?: number;
  paintedColor?: string;
  notes?: string;
  _alreadyDeducted?: boolean;
  laserAssignments?: { partName: string; size: string; quantity: number }[];
  customProductName?: string;
}

export interface ProductionLog {
  id: number;
  processName?: string;
  orderId?: number; // Optional for manual/third-party production
  itemId?: number; // Linked standard item ID
  operatorId: string;
  quantityPacked?: number;
  quantityProcessed?: number;
  quantityPainted?: number;
  quantityCut?: number;
  quantityInvoiced?: number;
  type?: "EMBALAGEM" | "PRODUCAO" | "PINTURA" | "CORTE_LASER" | "FATURAMENTO" | "BANHO_QUIMICO" | "PRENSA_RAFAEL" | "PRENSA_EDUARDO" | "INJETORA" | "RESERVA" | "TORNO_CNC_WILLIAN" | "TORNO_CNC_HENRIQUE";
  timestamp: number;
  durationMillis: number;
  skipInventoryUpdate?: boolean;
  
  // Custom fields for new roles
  measurementUnit?: "PÇS" | "SACOS" | "CAIXAS" | "KG"; // Banho Químico
  qtyPerPackage?: number; // Banho Químico
  declaredPackages?: number; // Banho Químico
  thirdPartyName?: string; // Banho Químico
  customProductName?: string; // Banho Químico / Prensa
  nestedPartName?: string; // name of the part in nesting
  paintedColor?: string; // Pintura
  packagesConfig?: { boxes: number; itemsPerBox: number }[]; // Embalagem automatic labels
  labelsPrintedQuantity?: number; // Total item quantity that has been printed
  labelsPrintedCount?: number;    // Number of physical labels printed
  labelsPrintedAt?: number;       // Timestamp of last print
  
  // Prensa Eduardo
  parentItemId?: number; 
  processPerformed?: string;
  customOperatorName?: string;
  
  // Prensa Rafael
  coilPlanId?: number;
  consumedCoilQty?: number;
  associatedBatchId?: number;
  associatedBatchName?: string;
}

export interface ActiveTask {
  id: number;
  itemId: number;
  color: string;
  size: string;
  variation: string;
  operatorId: string;
  startTime: number;
  type?: "EMBALAGEM" | "PRODUCAO" | "PINTURA" | "CORTE_LASER" | "PRENSA_RAFAEL" | "PRENSA_EDUARDO" | "BANHO_QUIMICO" | "INJETORA" | "TORNO_CNC_WILLIAN" | "TORNO_CNC_HENRIQUE";
  processName?: string;
  partName?: string;
  taskId?: number;
  thirdPartyName?: string;
  customProductName?: string;
  paintedColor?: string;
  associatedBatchId?: number;
  associatedBatchName?: string;
  partialQuantity?: number;
  tenantId?: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tradeName?: string;
}

export interface Sector {
  id: number;
  name: string;
  dailyCapacity?: number;
}

export interface ProductFlow {
  id: number;
  itemId: number;
  sectorIds: number[]; // Ordered array of sector IDs
  sectorTimes?: Record<string, number>; // sectorId (string) -> standard cycle time in seconds
}

export interface ProductionBatch {
  id: number;
  name: string;
  sectorId: number;
  orderIds: number[];
  status: "PENDENTE" | "EM_PRODUCAO" | "CONCLUIDO";
  createdAt: number;
  rawMaterial?: string;
  generatedPiece?: string;
  deadline?: string;
  notes?: string;
  operatorId?: string;
  isGerenciaLote?: boolean;
  assignedOperatorIds?: string[];
  checkedOrderIds?: number[];
  liberatedOrderIds?: number[];
}

export interface ProductionAgenda {
  id: number;
  orderId: number;
  batchId?: number;
  sectorId: number;
  estimatedDate: string; // YYYY-MM-DD
}

export interface StockMovement {
  id: string;
  itemId: number;
  color: string;
  size: string;
  variation: string;
  quantity: number;
  type: "ENTRADA" | "SAIDA";
  description: string;
  timestamp: number;
}

export interface CoilCuttingPlan {
  id: number;
  name: string;
  coilItemId: number; // Raw material item or Base plastic/mold for Injetora
  targetItemIds: number[]; // Intermediate pieces produced
  status: "PENDENTE" | "EM_PRODUCAO" | "CONCLUIDO";
  createdAt: number;
  type?: "PRENSA_RAFAEL" | "INJETORA" | "TORNO_CNC_WILLIAN" | "TORNO_CNC_HENRIQUE";
  plannedExecutionDate?: string; // Formatted date YYYY-MM-DD
  requiresMoldChange?: boolean; // Specific for Injetora
  targetQuantity?: number; // Qtd. a ser produzida
  orderId?: number; // Para associar a um pedido específico
  batchId?: number; // Para associar a um lote de produção manual
}

export interface Carga {
  id: string;
  name: string;
  dayOfWeek?: string;
  orderIds: number[];
  orderQuantities?: Record<number, number>;
  stockEntries?: {
    id: string; // `${itemId}|${color}|${size}|${variation}|${stage}`
    itemId: number;
    color: string;
    size: string;
    variation: string;
    quantity: number;
  }[];
  route?: string[];
  status: "PLANEJADA" | "EM_TRANSITO" | "ENTREGUE" | "FATURADA";
  createdAt: number;
  notes?: string;
  driverName?: string;
  vehiclePlate?: string;
  departureDate?: string;
}

export interface ProductionSchedule {
  id: string; // usually "global"
  workingDays: number[]; // days [0..6] (0 = Sunday, 1 = Monday, etc.)
  startHour: string; // "HH:MM"
  endHour: string; // "HH:MM"
  lunchStart: string; // "HH:MM"
  lunchEnd: string; // "HH:MM"
  coffeeBreaks: { start: string; end: string }[];
  holidays: string[]; // List of "YYYY-MM-DD"
}

export interface ExtraHourEntry {
  id: string; // "timestamp" or "id"
  date: string; // "YYYY-MM-DD"
  sectorId: string; // E.g., "PINTURA" or "CORTE_LASER"
  startHour: string; // "HH:MM"
  endHour: string; // "HH:MM"
}

export interface ItemPriceHistory {
  id: string;
  itemId: number;
  customerName: string;
  unitPrice: number;
  orderCode: string;
  createdAt: number;
  source: "PDF" | "MANUAL" | "EXCEL";
}

export interface SystemSettings {
  id: string;
  companyLogoUrl?: string;
  companyName?: string;
  systemName?: string;
  primaryColor?: string;
  monthlyBillingGoal?: number;
}

export interface TornoEvent {
  id: string;
  operatorId: string;
  operatorName: string;
  type: "REGULAGEM" | "LIMPEZA";
  description: string;
  timestamp: number;
}

export interface MachineStop {
  id: string;
  operatorId: string;
  operatorName: string;
  role: string;
  machineName: string;
  reason: "MANUTENÇÃO" | "QUEBRA" | "OUTRO";
  otherReasonDescription?: string;
  timestamp: number;
  durationMinutes: number;
  status: "ATIVO" | "RESOLVIDO";
  resolvedAt?: number;
}

export interface PerformanceQuestion {
  id: string;
  text: string;
  category: string;
  createdAt: number;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  date: number;
  reviewerId: string;
  answers: {
    questionId: string;
    questionText: string;
    rating: number;
    comment: string;
  }[];
  generalComment: string;
  productivityMetric: number;
  sectorBenchmarkMetric: number;
  sectorAverageMetric: number;
}

export interface LaserQuoteItem {
  id: string;
  description: string;          // e.g. "EUROPA CHAPA LATERAL DE SECCIONADORA CORTE LASER PÇ1"
  measures: string;             // e.g. "668x240x1/2"
  lengthMm: number;             // Altura / Comprimento (mm)
  widthMm: number;              // Largura (mm)
  thicknessMm: number;          // Espessura (mm)
  materialType: string;         // e.g. "Aço carbono", "Aço Inox"
  
  // Laser Cutting Time calculation
  cuttingTimeSeconds: number;   // Tempo de corte em segundos
  cuttingRatePerSec: number;    // Taxa do tempo de corte (R$ 0,15 a R$ 0,60/seg)

  // Bending (Dobra) calculation
  hasBending?: boolean;         // Possui serviço de dobra?
  bendingQuantity?: number;     // Qtd de dobras por peça
  bendingRatePerKg?: number;    // Taxa de dobra por KG (Padrão R$ 2,00/KG)
  bendingCost?: number;         // Custo unitário de dobra (calculatedWeightKg * bendingRatePerKg * bendingQuantity)
  
  // Rateio e Custos Adicionais
  proratedExtraCostWithMat?: number;    // Custo extra rateado unitário com material
  proratedExtraCostWithoutMat?: number; // Custo extra rateado unitário sem material
  
  // Material calculation
  steelDensityFactor: number;   // Padrão 7.92
  materialPricePerKg: number;   // R$/kg do material
  calculatedWeightKg: number;   // (lengthMm * widthMm * thicknessMm * 7.92) / 1000000
  
  // Calculated prices
  cuttingCost: number;          // cuttingTimeSeconds * cuttingRatePerSec
  materialCost: number;         // calculatedWeightKg * materialPricePerKg
  unitPriceWithMaterial: number;   // (cuttingCost + materialCost + bendingCost + proratedExtra) * (1 + additionPercent/100)
  unitPriceWithoutMaterial: number; // (cuttingCost + bendingCost + proratedExtra) * (1 + additionPercent/100)
  quantity: number;                 // Qtd de peças
  totalWithMaterial: number;        // quantity * unitPriceWithMaterial
  totalWithoutMaterial: number;     // quantity * unitPriceWithoutMaterial
}

export interface LaserQuote {
  id: string;
  quoteCode: string;            // e.g. "ORC-001-CLIENTE-2026"
  customerId?: number;          // Linked customer ID from db.customers
  customerName: string;         // Nome do Cliente
  contactInfo?: string;         // Contato
  createdDate: string;          // YYYY-MM-DD
  validityDays: number;         // Padrão 10 dias
  createdBy: string;            // E.g. "Marcos (Projetista)"
  createdAt: number;            // Timestamp
  items: LaserQuoteItem[];
  totalWithMaterial: number;    // Soma dos itens com material
  totalWithoutMaterial: number; // Soma dos itens sem material
  totalWeightKg: number;        // Peso total do material do lote em KG
  totalBendingCost?: number;    // Custo total de dobra
  extraCosts?: number;          // Custos adicionais fixos (mão de obra, frete, etc.) em R$ rateados nos unitários
  additionPercent?: number;     // Porcentagem adicional aplicada nos valores unitários (padrão 0%)
  notes?: string;
  status: "RASCUNHO" | "ENVIADO" | "APROVADO" | "APROVADO_COM_MATERIAL" | "APROVADO_SEM_MATERIAL" | "REJEITADO";
  tenantId?: string;
}



