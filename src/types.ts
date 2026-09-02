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
  | "TORNO_CNC_HENRIQUE"
  | "QUALIDADE";

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
  batchId?: number | null;
  coilPlanId?: number | null;
  laserQuoteId?: string | null;
  tenantId?: string;
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
  | "FATURADO_PARCIAL"
  | "CANCELADO";

export interface UserPermissions {
  canDeleteOrders?: boolean;
  canEditOrders?: boolean;
  canDeleteBatches?: boolean;
  canDeleteLogs?: boolean;
  canEditLogs?: boolean;
  canManageSettings?: boolean;
  canBulkDelete?: boolean;
  canApproveQuality?: boolean;
  canReproveQuality?: boolean;
}

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
  permissions?: UserPermissions;
}

export interface Tenant {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  systemName?: string;
  monthlyBillingGoal?: number;
  machines?: string[];
  allowedScreens?: string[];
  allowedSubTabs?: string[];
  exigirQualidadeNaEmbalagem?: boolean;
  soldaProcesses?: string[];
}

export interface SubTabOption {
  key: string;
  label: string;
  parentScreen: string;
}

export const ALL_AVAILABLE_SUBTABS: SubTabOption[] = [
  // PCP / Admin Sub-tabs
  { key: "pcp:painel", label: "PCP - Painel Geral", parentScreen: "pcp" },
  { key: "pcp:monitoramento", label: "PCP - Monitoramento", parentScreen: "pcp" },
  { key: "pcp:gestao_pessoas", label: "PCP - Gestão de Pessoas", parentScreen: "pcp" },
  { key: "pcp:evolucao_embalagem", label: "PCP - Evolução Embalagem", parentScreen: "pcp" },
  { key: "pcp:etiquetas", label: "PCP - Etiquetas", parentScreen: "pcp" },
  { key: "pcp:cadastros", label: "PCP - Aba Cadastros Geral", parentScreen: "pcp" },
  { key: "pcp:lotes", label: "PCP - Gestão de Lotes", parentScreen: "pcp" },

  // PCP Cadastros Inner Sub-tabs
  { key: "pcp:cadastro_clientes", label: "Cadastros - Clientes", parentScreen: "pcp" },
  { key: "pcp:cadastro_setores", label: "Cadastros - Setores", parentScreen: "pcp" },
  { key: "pcp:cadastro_fluxos", label: "Cadastros - Fluxos por Produto", parentScreen: "pcp" },
  { key: "pcp:cadastro_motivos_reprovacao", label: "Cadastros - Motivos de Reprovação", parentScreen: "pcp" },
  { key: "pcp:cadastro_planos_corte", label: "Cadastros - Planos de Corte & Injeção (Prensa e Injetora)", parentScreen: "pcp" },
  { key: "pcp:cadastro_representantes", label: "Cadastros - Contatos Representantes", parentScreen: "pcp" },
  { key: "pcp:cadastro_bom", label: "Cadastros - Composição de Produtos (BOM)", parentScreen: "pcp" },
  { key: "pcp:cadastro_configuracoes", label: "Cadastros - Configurações do Sistema", parentScreen: "pcp" },

  // Estoque Sub-tabs
  { key: "estoque:produtos", label: "Estoque - Produtos Acabados", parentScreen: "estoque" },
  { key: "estoque:epis", label: "Estoque - Equipamentos de Proteção (EPI)", parentScreen: "estoque" },
  { key: "estoque:uniformes", label: "Estoque - Uniformes & Vestuário", parentScreen: "estoque" },
  { key: "estoque:relatorios", label: "Estoque - Ficha/Recibo de Entrega", parentScreen: "estoque" },

  // Pedidos Sub-tabs
  { key: "pedidos:faturamento", label: "Pedidos - Faturamento / Lista", parentScreen: "pedidos" },
  { key: "pedidos:novo", label: "Pedidos - Lançar Novo Pedido", parentScreen: "pedidos" },

  // Representantes Sub-tabs
  { key: "representante:status", label: "Representante - Status dos Pedidos", parentScreen: "representante" },
  { key: "representante:novo", label: "Representante - Criar Novo Pedido", parentScreen: "representante" },

  // Orçamentos Laser Sub-tabs
  { key: "orcamentos:lista", label: "Orçamentos - Lista de Orçamentos", parentScreen: "orcamentos" },
  { key: "orcamentos:novo", label: "Orçamentos - Criar Orçamento", parentScreen: "orcamentos" },
];

export function isSubTabAllowed(tenant: Tenant | null | undefined, subTabKey: string): boolean {
  if (!tenant) return true;
  if (!tenant.allowedSubTabs || tenant.allowedSubTabs.length === 0) return true;
  if (subTabKey === "pcp:cadastro_fluxos" || subTabKey === "pcp:cadastro_motivos_reprovacao") {
    return true;
  }
  return tenant.allowedSubTabs.includes(subTabKey);
}

export interface ScreenOption {
  key: string;
  label: string;
  category: "Geral" | "PCP e Pedidos" | "Produção e Setores" | "Estoque" | "Gestão";
  path: string;
}

export const ALL_AVAILABLE_SCREENS: ScreenOption[] = [
  // Geral
  { key: "inicio", label: "Início / Dashboard", category: "Geral", path: "/" },
  { key: "admin", label: "Monitor de Produção", category: "Geral", path: "/admin" },
  { key: "relatorios", label: "Relatórios Gerenciais", category: "Geral", path: "/relatorios" },
  { key: "historico", label: "Histórico de Produção", category: "Geral", path: "/historico" },

  // PCP e Pedidos
  { key: "pcp", label: "Cadastros PCP", category: "PCP e Pedidos", path: "/pcp" },
  { key: "pedidos", label: "Gestão de Pedidos", category: "PCP e Pedidos", path: "/pedidos" },
  { key: "lotes", label: "Gestão de Lotes", category: "PCP e Pedidos", path: "/lotes" },
  { key: "gestao-clientes", label: "Gestão de Clientes", category: "PCP e Pedidos", path: "/gestao-clientes" },
  { key: "itens", label: "Cadastro de Itens", category: "PCP e Pedidos", path: "/itens" },
  { key: "orcamentos", label: "Orçamentos Laser", category: "PCP e Pedidos", path: "/orcamentos" },
  { key: "nests", label: "Gestão de Nests", category: "PCP e Pedidos", path: "/nests" },
  { key: "representante", label: "Painel Representante", category: "PCP e Pedidos", path: "/representante" },

  // Produção e Setores
  { key: "producao", label: "Painel da Produção", category: "Produção e Setores", path: "/producao" },
  { key: "qualidade", label: "Módulo de Qualidade / Inspeção", category: "Produção e Setores", path: "/qualidade" },
  { key: "relatorios-qualidade", label: "Relatórios de Qualidade & Retrabalho", category: "Geral", path: "/relatorios-qualidade" },
  { key: "cortelaser", label: "Setor Corte Laser", category: "Produção e Setores", path: "/cortelaser" },
  { key: "pintura", label: "Setor Pintura", category: "Produção e Setores", path: "/pintura" },
  { key: "prensa-eduardo", label: "Setor Prensa (E)", category: "Produção e Setores", path: "/prensa-eduardo" },
  { key: "torno-cnc-willian", label: "Setor Torno Willian", category: "Produção e Setores", path: "/torno-cnc-willian" },
  { key: "torno-cnc-henrique", label: "Setor Torno Henrique", category: "Produção e Setores", path: "/torno-cnc-henrique" },
  { key: "prensa-rafael", label: "Setor Prensa (R)", category: "Produção e Setores", path: "/prensa-rafael" },
  { key: "injetora", label: "Setor Injetora", category: "Produção e Setores", path: "/injetora" },
  { key: "banho-quimico", label: "Setor Banho / Zincagem", category: "Produção e Setores", path: "/banho-quimico" },
  { key: "embalagem", label: "Setor Embalagem", category: "Produção e Setores", path: "/embalagem" },
  { key: "montagem-retratil", label: "Setor Montagem Retrátil", category: "Produção e Setores", path: "/montagem-retratil" },

  // Estoque
  { key: "estoque", label: "Estoque Geral (Produtos/EPIs)", category: "Estoque", path: "/estoque" },
  { key: "estoque-chapas", label: "Estoque de Chapas", category: "Estoque", path: "/estoque-chapas" },
  { key: "estoque-laser", label: "Estoque Pçs Cortadas Laser", category: "Estoque", path: "/estoque-laser" },

  // Gestão
  { key: "financeiro", label: "Financeiro", category: "Gestão", path: "/financeiro" },
];

export interface Item {
  id: number;
  code: string;
  name: string;
  notes: string;
  basePrice?: number;
  unitPrice?: number;
  unit?: string;
  productiveCost?: number; // Custo produtivo unitário (R$)
  productionPoints?: number;
  type?: "PRODUTO" | "PECA" | "EPI";
  components?: { itemId: number; quantity: number }[];
  imageUrl?: string;
  standardCycles?: Record<number, number>; // sectorId -> time in minutes
  fluxos?: string[]; // Vínculo com N fluxos de produção
  requiresLaserCut?: boolean; // Produto que precisa passar pelo setor de corte a laser
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
  imageUrl?: string;
  code?: string;
  tenantId?: string;
}

export interface AppNotification {
  id: number;
  message: string;
  read: boolean;
  createdAt: number;
  tenantId?: string;
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
  isPrinted?: boolean;
  printedAt?: number;
  printCount?: number;
  isActive: boolean;
  createdAt: number;
  deliveryDate: string;
  paymentCondition?: string;
  paymentTerms?: string;
  fiscalType?: "COM_NF" | "SEM_NF" | "MEIA_NOTA";
  billingRule?: 'cadastro' | 'ultimo_pedido';
  isUrgent?: boolean;
  isProgramacao?: boolean;
  status?: OrderStatus;
  statusOriginalPdf?: string;
  unitPrice?: number;
  unit?: string;
  paintedColor?: string;
  notes?: string;
  _alreadyDeducted?: boolean;
  laserAssignments?: { partName: string; size: string; quantity: number }[];
  customProductName?: string;
  discountPercent?: number;
  discountAmount?: number;
  hasRET?: boolean;
  qualidadeAprovada?: boolean;
  statusQualidade?: "AGUARDANDO" | "EM_INSPECAO" | "APROVADO" | "REPROVADO" | "RETRABALHO";
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
  type?: "EMBALAGEM" | "PRODUCAO" | "PINTURA" | "CORTE_LASER" | "FATURAMENTO" | "BANHO_QUIMICO" | "PRENSA_RAFAEL" | "PRENSA_EDUARDO" | "INJETORA" | "RESERVA" | "TORNO_CNC_WILLIAN" | "TORNO_CNC_HENRIQUE" | "MONTAGEM_RETRATIL";
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

  // Laser Cut Sheet Usage
  platesCutQuantity?: number;
  sheetStockId?: string;
  hasLeftover?: boolean;
  leftoverDimensions?: string;
}

export interface SheetStockEntry {
  id: string;
  invoiceNumber: string;         // Número da Nota Fiscal (NF)
  supplier: string;              // Fornecedor
  dimensions: string;            // Dimensão da chapa (ex: 1200x3000x3.17mm)
  description: string;           // Descrição da chapa / Tipo de Material
  materialType?: string;         // ex: "Aço Carbono", "Aço Inox"
  thicknessMm?: number;          // Espessura em mm
  initialQuantity: number;       // Qtd inicial na NF
  currentQuantity: number;       // Qtd atual disponível no estoque
  entryDate: number;             // Data e hora da entrada (timestamp automático)
  createdBy?: string;            // Usuário que deu entrada (PCP / Gerência)
  tenantId?: string;
  notes?: string;
}

export interface SheetStockMovement {
  id: string;
  sheetStockId?: string;
  invoiceNumber?: string;
  supplier?: string;
  description: string;           // Descrição da movimentação
  type: "ENTRADA" | "SAIDA";
  quantity: number;              // Qtd de chapas movimentadas
  dimensions?: string;
  timestamp: number;             // Timestamp automático (data/hora entrada ou saída)
  operatorName?: string;         // Nome do operador ou usuário PCP/Gerência
  taskId?: number;
  taskName?: string;
  platesCutQuantity?: number;    // Qtd de chapas cortadas no laser
  hasLeftover?: boolean;         // Se teve sobra
  leftoverDimensions?: string;   // Dimensão da sobra (se houver)
  tenantId?: string;
}

export interface ActiveTask {
  id: number;
  itemId: number;
  color: string;
  size: string;
  variation: string;
  operatorId: string;
  startTime: number;
  type?: "EMBALAGEM" | "PRODUCAO" | "PINTURA" | "CORTE_LASER" | "PRENSA_RAFAEL" | "PRENSA_EDUARDO" | "BANHO_QUIMICO" | "INJETORA" | "TORNO_CNC_WILLIAN" | "TORNO_CNC_HENRIQUE" | "MONTAGEM_RETRATIL";
  processName?: string;
  partName?: string;
  taskId?: number;
  thirdPartyName?: string;
  customProductName?: string;
  paintedColor?: string;
  associatedBatchId?: number;
  associatedBatchName?: string;
  partialQuantity?: number;
  sectorId?: number | string;
  sectorName?: string;
  tenantId?: string;
  customerName?: string;
  orderCode?: string;
  pendingProductionId?: string;
  previousProcesses?: string[];
}

export interface PrensaPendingProduction {
  id: string;
  itemId: number;
  partName: string;
  color?: string;
  size?: string;
  variation?: string;
  customerName?: string;
  orderCode?: string;
  orderId?: number;
  associatedBatchId?: number;
  associatedBatchName?: string;
  quantity: number;
  completedProcesses: string[];
  lastProcess: string;
  lastOperator: string;
  lastTimestamp: number;
  operatorId?: string;
  notes?: string;
  tenantId?: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  bairro?: string;
  tradeName?: string;
  fiscalType?: "COM_NF" | "SEM_NF" | "MEIA_NOTA";
  defaultPaymentTerms?: string;
  defaultDiscountPercent?: number;
  hasRET?: boolean;
}

export interface Sector {
  id: number | string;
  name: string;
  department?: string;
  active?: boolean;
  role?: string;
  code?: string;
  dailyCapacity?: number;
  recommendedCount?: number;
  hourlyCost?: number;        // Custo de operação/hora (R$/h)
  productiveCost?: number;    // Custo fixo/direto do setor
  revenueGoalDaily?: number;  // Meta faturamento diária (R$)
  revenueGoalWeekly?: number; // Meta faturamento semanal (R$)
  icon?: string;
  zone?: string;
  description?: string;
  rolesIncluded?: string[];
  fluxos?: string[];          // Vínculo com N fluxos de produção
}

export interface Flow {
  id: string;
  nome: string;               // ex: "Fluxo A", "Fluxo B", "Fluxo AB"
  codigo: string;             // ex: "FLUXO_A", "FLUXO_B", "FLUXO_AB"
  ativo: boolean;
  descricao?: string;
  fluxosComponentes?: string[]; // Para fluxos compostos, ex: ["FLUXO_A", "FLUXO_B"]
  createdAt: number;
  updatedAt: number;
  tenantId?: string;
}

export interface RejectionReason {
  id: string;
  codigo: string;             // ex: "MOT-001"
  descricao: string;          // ex: "Solda com trinca/porosa"
  categoria?: string;
  ativo: boolean;
  createdAt: number;
  tenantId?: string;
}

export interface ProductionStep {
  id: string;
  itemId: number;
  orderId?: number;
  ordemProducaoId?: number;
  loteId?: number | string;
  setorId?: number;
  fluxoUtilizado?: string;
  status:
    | "pendente"
    | "em_producao"
    | "em_inspecao"
    | "concluido_etapa"
    | "aguardando_qualidade"
    | "aprovado"
    | "reprovado"
    | "retrabalho"
    | "finalizado";
  quantidadeProduzida: number;
  operadorId?: string;
  operadorNome?: string;
  setorExecutorId?: number;
  fluxoExecutorId?: string;
  isRetrabalho?: boolean;
  retrabalhoOrigemId?: string | number;
  quantidadeRetrabalhos?: number;
  motivoReprovacao?: string;
  codigoMotivo?: string;
  setorDestinoRetorno?: number;
  iniciadoEm?: number;
  finalizadoEm?: number;
  createdAt: number;
  updatedAt: number;
  tenantId?: string;
}

/**
 * Motor de Elegibilidade (Flow Matching Engine)
 * Retorna os setores elegíveis para produzir um item com base nos fluxos (resolvendo compostos recursivamente)
 */
export function getSetoresElegiveisParaItem(
  item: { fluxos?: string[] },
  setores: Sector[],
  todosFluxos: Flow[] = []
): Sector[] {
  if (!item.fluxos || item.fluxos.length === 0) {
    return setores; // Fallback de retrocompatibilidade: item sem fluxo vai para qualquer setor
  }

  const normString = (str?: string) => {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim();
  };

  const expandirFluxos = (fluxoList: string[], visited = new Set<string>()): Set<string> => {
    const atomicos = new Set<string>();
    for (const rawCode of fluxoList) {
      if (!rawCode || visited.has(rawCode)) continue;
      visited.add(rawCode);
      const codeUpper = rawCode.trim().toUpperCase();
      const codeNorm = normString(rawCode);

      const found = todosFluxos.find(
        (f) =>
          String(f.id) === String(rawCode) ||
          f.codigo?.toUpperCase() === codeUpper ||
          normString(f.codigo) === codeNorm ||
          f.nome?.toUpperCase() === codeUpper ||
          normString(f.nome) === codeNorm
      );

      if (found && found.fluxosComponentes && found.fluxosComponentes.length > 0) {
        const sub = expandirFluxos(found.fluxosComponentes, visited);
        sub.forEach((s) => atomicos.add(s));
      } else {
        if (codeUpper) atomicos.add(codeUpper);
        if (codeNorm) atomicos.add(codeNorm);
        if (found?.codigo) {
          atomicos.add(found.codigo.toUpperCase());
          atomicos.add(normString(found.codigo));
        }
        if (found?.nome) {
          atomicos.add(found.nome.toUpperCase());
          atomicos.add(normString(found.nome));
        }
        if (found?.id) atomicos.add(String(found.id).toUpperCase());
      }
    }
    return atomicos;
  };

  const fluxosItem = expandirFluxos(item.fluxos);

  return setores.filter((setor) => {
    if (!setor.fluxos || setor.fluxos.length === 0) {
      // Se o setor não tiver fluxos restritos, ele aceita itens
      return true;
    }
    const fluxosSetor = expandirFluxos(setor.fluxos);
    for (const f of fluxosItem) {
      if (fluxosSetor.has(f)) return true;
    }
    return false;
  });
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
  type?: "PRENSA_RAFAEL" | "INJETORA" | "TORNO_CNC_WILLIAN" | "TORNO_CNC_HENRIQUE" | "MONTAGEM_RETRATIL" | "PRENSA_EDUARDO" | "BANHO_QUIMICO";
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
  manualTotalAdjustment?: number;
  manualDailyAdjustments?: Record<string, number>;
  manualRepAdjustments?: Record<string, number>;
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
  status: "RASCUNHO" | "ENVIADO" | "APROVADO" | "APROVADO_COM_MATERIAL" | "APROVADO_SEM_MATERIAL" | "REJEITADO" | "CORTADO" | "FINALIZADO";
  tenantId?: string;
}



