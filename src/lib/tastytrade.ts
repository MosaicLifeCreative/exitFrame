import TastytradeClient from "@tastytrade/api";
import type { ClientConfig } from "@tastytrade/api";

// ─── Client Singletons ─────────────────────────────────

let prodClient: TastytradeClient | null = null;
let sandboxClient: TastytradeClient | null = null;

function getProdConfig(): ClientConfig {
  const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET;
  const refreshToken = process.env.TASTYTRADE_REFRESH_TOKEN;
  if (!clientSecret || !refreshToken) {
    throw new Error("TASTYTRADE_CLIENT_SECRET and TASTYTRADE_REFRESH_TOKEN are required");
  }
  return {
    ...TastytradeClient.ProdConfig,
    clientSecret,
    refreshToken,
    oauthScopes: ["read"],
  } as ClientConfig;
}

function getSandboxConfig(): ClientConfig {
  const clientSecret = process.env.TASTYTRADE_SANDBOX_CLIENT_SECRET;
  const refreshToken = process.env.TASTYTRADE_SANDBOX_REFRESH_TOKEN;
  if (!clientSecret || !refreshToken) {
    throw new Error("TASTYTRADE_SANDBOX_CLIENT_SECRET and TASTYTRADE_SANDBOX_REFRESH_TOKEN are required");
  }
  return {
    ...TastytradeClient.SandboxConfig,
    clientSecret,
    refreshToken,
    oauthScopes: ["read", "trade"],
  } as ClientConfig;
}

export function getProdClient(): TastytradeClient {
  if (!prodClient) {
    prodClient = new TastytradeClient(getProdConfig());
  }
  return prodClient;
}

export function getSandboxClient(): TastytradeClient {
  if (!sandboxClient) {
    sandboxClient = new TastytradeClient(getSandboxConfig());
  }
  return sandboxClient;
}

// ─── Account Discovery ──────────────────────────────────

let cachedProdAccountNumber: string | null = null;
let cachedSandboxAccountNumber: string | null = null;

export async function getProdAccountNumber(): Promise<string> {
  if (cachedProdAccountNumber) return cachedProdAccountNumber;
  const client = getProdClient();
  const accounts = await client.accountsAndCustomersService.getCustomerAccounts();
  if (!accounts || (Array.isArray(accounts) && accounts.length === 0)) {
    throw new Error("No tastytrade production accounts found");
  }
  const accountList = Array.isArray(accounts) ? accounts : [accounts];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = accountList[0] as any;
  cachedProdAccountNumber = first?.account?.["account-number"] ?? first?.["account-number"] ?? first?.account?.accountNumber ?? first?.accountNumber;
  if (!cachedProdAccountNumber) {
    throw new Error("Could not determine account number from tastytrade response");
  }
  return cachedProdAccountNumber;
}

export async function getSandboxAccountNumber(): Promise<string> {
  if (cachedSandboxAccountNumber) return cachedSandboxAccountNumber;
  const client = getSandboxClient();
  const accounts = await client.accountsAndCustomersService.getCustomerAccounts();
  if (!accounts || (Array.isArray(accounts) && accounts.length === 0)) {
    throw new Error("No tastytrade sandbox accounts found");
  }
  const accountList = Array.isArray(accounts) ? accounts : [accounts];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = accountList[0] as any;
  cachedSandboxAccountNumber = first?.account?.["account-number"] ?? first?.["account-number"] ?? first?.account?.accountNumber ?? first?.accountNumber;
  if (!cachedSandboxAccountNumber) {
    throw new Error("Could not determine sandbox account number from tastytrade response");
  }
  return cachedSandboxAccountNumber;
}

// ─── Types ──────────────────────────────────────────────

export interface TastyPosition {
  symbol: string;
  instrumentType: string;
  underlyingSymbol: string;
  quantity: number;
  direction: string; // "Long" or "Short"
  averageOpenPrice: number;
  closePrice: number;
  currentPrice: number;
  marketValue: number;
  realizedDayGain: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  multiplier: number;
  expirationDate?: string;
  strikePrice?: number;
  optionType?: string; // "C" or "P"
}

export interface TastyBalance {
  accountNumber: string;
  cashBalance: number;
  netLiquidatingValue: number;
  equityBuyingPower: number;
  derivativeBuyingPower: number;
  maintenanceRequirement: number;
  longEquityValue: number;
  shortEquityValue: number;
  longDerivativeValue: number;
  shortDerivativeValue: number;
  pendingCash: number;
}

export interface OptionChainExpiration {
  expirationDate: string;
  daysToExpiration: number;
  expirationType: string;
  strikes: OptionStrike[];
}

export interface OptionStrike {
  strikePrice: number;
  call?: OptionContract;
  put?: OptionContract;
}

export interface OptionContract {
  symbol: string;
  streamerSymbol?: string;
}

export interface TastyOrder {
  timeInForce: string; // "Day", "GTC", "GTD"
  orderType: string; // "Limit", "Market", "Stop", "Stop Limit"
  price?: number; // limit price
  stopTrigger?: number;
  legs: TastyOrderLeg[];
}

export interface TastyOrderLeg {
  instrumentType: string; // "Equity", "Equity Option"
  symbol: string;
  action: string; // "Buy to Open", "Sell to Close", "Sell to Open", "Buy to Close"
  quantity: number;
}

// ─── Production (Read-Only) ─────────────────────────────

export async function getPositions(): Promise<TastyPosition[]> {
  const client = getProdClient();
  const accountNumber = await getProdAccountNumber();
  const raw = await client.balancesAndPositionsService.getPositionsList(accountNumber);
  return normalizePositions(raw);
}

export async function getBalance(): Promise<TastyBalance> {
  const client = getProdClient();
  const accountNumber = await getProdAccountNumber();
  const raw = await client.balancesAndPositionsService.getAccountBalanceValues(accountNumber);
  return normalizeBalance(accountNumber, raw);
}

export async function getOptionChain(symbol: string): Promise<OptionChainExpiration[]> {
  const client = getProdClient();
  const raw = await client.instrumentsService.getNestedOptionChain(symbol.toUpperCase());
  return normalizeOptionChain(raw);
}

export async function getTransactionHistory(
  days: number = 30
): Promise<unknown[]> {
  const client = getProdClient();
  const accountNumber = await getProdAccountNumber();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const raw = await client.transactionsService.getAccountTransactions(accountNumber, {
    "start-date": startDate.toISOString().slice(0, 10),
  });
  return Array.isArray(raw) ? raw : [];
}

export async function getLiveOrders(): Promise<unknown[]> {
  const client = getProdClient();
  const accountNumber = await getProdAccountNumber();
  const raw = await client.orderService.getLiveOrders(accountNumber);
  return Array.isArray(raw) ? raw : [];
}

// ─── Sandbox (Ayden Paper Trading) ──────────────────────

export async function getSandboxPositions(): Promise<TastyPosition[]> {
  const client = getSandboxClient();
  const accountNumber = await getSandboxAccountNumber();
  const raw = await client.balancesAndPositionsService.getPositionsList(accountNumber);
  return normalizePositions(raw);
}

export async function getSandboxBalance(): Promise<TastyBalance> {
  const client = getSandboxClient();
  const accountNumber = await getSandboxAccountNumber();
  const raw = await client.balancesAndPositionsService.getAccountBalanceValues(accountNumber);
  return normalizeBalance(accountNumber, raw);
}

export async function placeSandboxOrder(order: TastyOrder): Promise<unknown> {
  const client = getSandboxClient();
  const accountNumber = await getSandboxAccountNumber();

  const orderPayload = {
    "time-in-force": order.timeInForce,
    "order-type": order.orderType,
    ...(order.price !== undefined && { price: String(order.price) }),
    ...(order.stopTrigger !== undefined && { "stop-trigger": String(order.stopTrigger) }),
    legs: order.legs.map((leg) => ({
      "instrument-type": leg.instrumentType,
      symbol: leg.symbol,
      action: leg.action,
      quantity: leg.quantity,
    })),
  };

  return client.orderService.createOrder(accountNumber, orderPayload);
}

export async function getSandboxOrders(): Promise<unknown[]> {
  const client = getSandboxClient();
  const accountNumber = await getSandboxAccountNumber();
  const raw = await client.orderService.getOrders(accountNumber);
  return Array.isArray(raw) ? raw : [];
}

export async function cancelSandboxOrder(orderId: number): Promise<unknown> {
  const client = getSandboxClient();
  const accountNumber = await getSandboxAccountNumber();
  return client.orderService.cancelOrder(accountNumber, orderId);
}

export async function dryRunSandboxOrder(order: TastyOrder): Promise<unknown> {
  const client = getSandboxClient();
  const accountNumber = await getSandboxAccountNumber();

  const orderPayload = {
    "time-in-force": order.timeInForce,
    "order-type": order.orderType,
    ...(order.price !== undefined && { price: String(order.price) }),
    ...(order.stopTrigger !== undefined && { "stop-trigger": String(order.stopTrigger) }),
    legs: order.legs.map((leg) => ({
      "instrument-type": leg.instrumentType,
      symbol: leg.symbol,
      action: leg.action,
      quantity: leg.quantity,
    })),
  };

  return client.orderService.postOrderDryRun(accountNumber, orderPayload);
}

export async function getSandboxOptionChain(symbol: string): Promise<OptionChainExpiration[]> {
  const client = getSandboxClient();
  const raw = await client.instrumentsService.getNestedOptionChain(symbol.toUpperCase());
  return normalizeOptionChain(raw);
}

// ─── Normalization Helpers ──────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePositions(raw: any): TastyPosition[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : [raw];

  return items.map((p) => {
    const qty = Number(p.quantity ?? p["quantity"] ?? 0);
    const direction = p["quantity-direction"] ?? p.quantityDirection ?? (qty >= 0 ? "Long" : "Short");
    const avgOpen = Number(p["average-open-price"] ?? p.averageOpenPrice ?? 0);
    const closePrice = Number(p["close-price"] ?? p.closePrice ?? 0);
    const multiplier = Number(p.multiplier ?? 1);
    const currentPrice = closePrice || avgOpen;
    const marketValue = Math.abs(qty) * currentPrice * multiplier;
    const costBasis = Math.abs(qty) * avgOpen * multiplier;
    const unrealizedPnl = direction === "Long"
      ? marketValue - costBasis
      : costBasis - marketValue;
    const unrealizedPnlPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

    return {
      symbol: p.symbol ?? "",
      instrumentType: p["instrument-type"] ?? p.instrumentType ?? "Equity",
      underlyingSymbol: p["underlying-symbol"] ?? p.underlyingSymbol ?? p.symbol ?? "",
      quantity: Math.abs(qty),
      direction,
      averageOpenPrice: avgOpen,
      closePrice,
      currentPrice,
      marketValue: Math.round(marketValue * 100) / 100,
      realizedDayGain: Number(p["realized-day-gain"] ?? p.realizedDayGain ?? 0),
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      unrealizedPnlPct: Math.round(unrealizedPnlPct * 100) / 100,
      multiplier,
      expirationDate: p["expires-at"] ?? p.expiresAt ?? undefined,
      strikePrice: p["strike-price"] ? Number(p["strike-price"]) : p.strikePrice ? Number(p.strikePrice) : undefined,
      optionType: p["option-type"] ?? p.optionType ?? undefined,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeBalance(accountNumber: string, raw: any): TastyBalance {
  if (!raw) {
    return {
      accountNumber,
      cashBalance: 0,
      netLiquidatingValue: 0,
      equityBuyingPower: 0,
      derivativeBuyingPower: 0,
      maintenanceRequirement: 0,
      longEquityValue: 0,
      shortEquityValue: 0,
      longDerivativeValue: 0,
      shortDerivativeValue: 0,
      pendingCash: 0,
    };
  }

  return {
    accountNumber,
    cashBalance: Number(raw["cash-balance"] ?? raw.cashBalance ?? 0),
    netLiquidatingValue: Number(raw["net-liquidating-value"] ?? raw.netLiquidatingValue ?? 0),
    equityBuyingPower: Number(raw["equity-buying-power"] ?? raw.equityBuyingPower ?? 0),
    derivativeBuyingPower: Number(raw["derivative-buying-power"] ?? raw.derivativeBuyingPower ?? 0),
    maintenanceRequirement: Number(raw["maintenance-requirement"] ?? raw.maintenanceRequirement ?? 0),
    longEquityValue: Number(raw["long-equity-value"] ?? raw.longEquityValue ?? 0),
    shortEquityValue: Number(raw["short-equity-value"] ?? raw.shortEquityValue ?? 0),
    longDerivativeValue: Number(raw["long-derivative-value"] ?? raw.longDerivativeValue ?? 0),
    shortDerivativeValue: Number(raw["short-derivative-value"] ?? raw.shortDerivativeValue ?? 0),
    pendingCash: Number(raw["pending-cash"] ?? raw.pendingCash ?? 0),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOptionChain(raw: any): OptionChainExpiration[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : raw.expirations ?? raw["expirations"] ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((exp: any) => {
    const expirationDate = exp["expiration-date"] ?? exp.expirationDate ?? "";
    const dte = exp["days-to-expiration"] ?? exp.daysToExpiration ?? 0;
    const expType = exp["expiration-type"] ?? exp.expirationType ?? "Regular";
    const strikes = (exp.strikes ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => ({
        strikePrice: Number(s["strike-price"] ?? s.strikePrice ?? 0),
        call: s.call
          ? { symbol: s.call, streamerSymbol: s["call-streamer-symbol"] ?? s.callStreamerSymbol }
          : undefined,
        put: s.put
          ? { symbol: s.put, streamerSymbol: s["put-streamer-symbol"] ?? s.putStreamerSymbol }
          : undefined,
      })
    );

    return { expirationDate, daysToExpiration: dte, expirationType: expType, strikes };
  });
}

// ─── Connection Test ────────────────────────────────────

export async function testConnection(env: "production" | "sandbox"): Promise<{
  connected: boolean;
  accountNumber?: string;
  error?: string;
}> {
  try {
    if (env === "production") {
      const accountNumber = await getProdAccountNumber();
      return { connected: true, accountNumber };
    } else {
      const accountNumber = await getSandboxAccountNumber();
      return { connected: true, accountNumber };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { connected: false, error: msg };
  }
}
