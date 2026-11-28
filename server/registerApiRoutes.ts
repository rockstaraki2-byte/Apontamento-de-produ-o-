import type { Express } from "express";
import { nodeHandler, fetchGetHandler } from "./httpAdapters";
import login from "../api/auth/login";
import tenants from "../api/tenants";
import users from "../api/users";
import tenantSettings from "../api/tenant-settings";
import sync from "../api/integration/teksystem/sync";
import processQueue from "../api/integration/teksystem/process";
import reconcile from "../api/integration/teksystem/reconcile-orders";
import importOrders from "../api/pedidos/importar/index";
import validateOrders from "../api/pedidos/importar/validar";
import lateOrders from "../api/relatorios/pedidos-atrasados/index";
import { GET as billing } from "../api/integration/billing";
import { GET as billingDaily } from "../api/integration/billing-daily";
import { registerTempOrderImportRoute } from "./tempOrderImport_20261128_49fedcb5273a.ts";

export function registerApiRoutes(app: Express) {
  registerTempOrderImportRoute(app);
  app.all("/api/auth/login", nodeHandler(login));
  app.all("/api/tenants", nodeHandler(tenants));
  app.all("/api/users", nodeHandler(users));
  app.all("/api/tenant-settings", nodeHandler(tenantSettings));
  app.all("/api/integration/teksystem/sync", nodeHandler(sync));
  app.all("/api/integration/teksystem/process", nodeHandler(processQueue));
  app.all("/api/integration/teksystem/reconcile-orders", nodeHandler(reconcile));
  app.all("/api/pedidos/importar", nodeHandler(importOrders));
  app.all("/api/pedidos/importar/validar", nodeHandler(validateOrders));
  app.all("/api/relatorios/pedidos-atrasados", nodeHandler(lateOrders));
  app.all("/api/integration/billing", fetchGetHandler(billing));
  app.all("/api/integration/billing-daily", fetchGetHandler(billingDaily));
  app.all("/api/cron/daily-invoiced-reports", fetchGetHandler(billingDaily, { __daily_invoiced_reports: "1" }));
  app.all("/api/cron/preventive-maintenance-alerts", fetchGetHandler(billingDaily, { __preventive_maintenance_alerts: "1" }));
  app.all("/api/import-orders-22sep-1500-7c91e2", nodeHandler((req, res) => {
    req.query = { ...req.query, __legacy_order_import: "1" };
    return importOrders(req, res);
  }));
  // /api/production-planning is already registered directly in server.ts.
}
