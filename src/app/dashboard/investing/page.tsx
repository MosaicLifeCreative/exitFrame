"use client";

import { useEffect, useState, useCallback } from "react";
import { useChatContext } from "@/hooks/useChatContext";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  TrendingUp,
  Eye,
  Newspaper,
  Pencil,
  X,
  Check,
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Bot,
  BarChart3,
  Wallet,
  Brain,
  CheckCircle2,
  Clock,
  Lightbulb,
  BookOpen,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LineChart,
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

// ============================================
// TYPES
// ============================================

interface PortfolioHolding {
  id: string;
  ticker: string;
  companyName: string;
  shares: string;
  avgCostBasis: string;
  sector: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

interface WatchlistItem {
  id: string;
  type: string;
  value: string;
  label: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

interface MarketNewsArticle {
  id: string;
  source: string;
  headline: string;
  summary: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  relatedTickers: string[];
  aiRelevanceScore: number | null;
  aiSummary: string | null;
  aiSentiment: string | null;
  isRead: boolean;
}

interface QuoteData {
  ticker: string;
  price: number;
  change: number | null;
  changePct: number | null;
  updatedAt: string;
}

interface TastyPosition {
  symbol: string;
  instrumentType: string;
  underlyingSymbol: string;
  quantity: number;
  direction: string;
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
  optionType?: string;
}

interface TastyBalance {
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

interface AiPosition {
  id: string;
  ticker: string;
  companyName: string;
  shares: string;
  avgCostBasis: string;
  currentPrice: number;
  dailyChange: number | null;
  dailyChangePct: number | null;
  marketValue: number;
  pnl: number;
  pnlPct: number;
}

interface AiTrade {
  id: string;
  ticker: string;
  companyName: string;
  side: string;
  shares: string;
  price: string;
  total: string;
  reasoning: string;
  executedAt: string;
}

interface AiPortfolioData {
  id: string;
  name: string;
  cashBalance: number;
  startingCapital: number;
  inceptionDate: string;
  totalValue: number;
  holdingsValue: number;
  totalReturn: number;
  totalTrades: number;
  positions: AiPosition[];
  trades: AiTrade[];
}

interface TradingInsights {
  performance: {
    totalTrades: number;
    wins: number;
    losses: number;
    breakeven: number;
    winRate: number;
    totalPnl: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
  };
  tickerPerformance: Array<{ ticker: string; trades: number; wins: number; losses: number; winRate: number; pnl: number }>;
  strategyPerformance: Array<{ strategy: string; trades: number; winRate: number; pnl: number }>;
  bestTrades: Array<{ ticker: string; pnl: number; pnlPct: number; reasoning: string; date: string }>;
  worstTrades: Array<{ ticker: string; pnl: number; pnlPct: number; reasoning: string; date: string }>;
  lessons: Array<{ ticker: string; lessons: string; outcome: string; pnl: number | null; date: string }>;
  observations: Array<{ text: string; date: string }>;
  rules: {
    active: Array<{ id: string; category: string; rule: string; source: string; performance: string | null }>;
    pending: Array<{ id: string; category: string; rule: string; rationale: string | null }>;
  };
  evolution: {
    cumulativeData: Array<{
      date: string;
      cumulativePnl: number;
      winRate: number;
      tradeNum: number;
      ticker: string;
      outcome: string | null;
      pnl: number;
    }>;
    timeline: Array<{
      date: string;
      type: "trade" | "rule_proposed" | "rule_approved" | "lesson" | "observation";
      title: string;
      detail: string | null;
      outcome?: string | null;
      pnl?: number | null;
    }>;
    strategyEvolution: Array<{
      month: string;
      strategies: Record<string, number>;
      dominant: string;
    }>;
  };
}

interface SnapshotData {
  portfolioType: string;
  totalValue: number;
  snapshotDate: string;
}

// ============================================
// UTILITY COMPONENTS
// ============================================

const fmtMoney = (n: number) =>
  "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (n: number) =>
  (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

function PnlText({ value, className = "" }: { value: number; className?: string }) {
  const color = value > 0 ? "text-green-600" : value < 0 ? "text-red-500" : "text-muted-foreground";
  return <span className={`${color} ${className}`}>{fmtMoney(value)}</span>;
}

function PctText({ value, className = "" }: { value: number; className?: string }) {
  const color = value > 0 ? "text-green-600" : value < 0 ? "text-red-500" : "text-muted-foreground";
  return <span className={`${color} ${className}`}>{fmtPct(value)}</span>;
}

function SentimentIcon({ sentiment }: { sentiment: string | null }) {
  if (sentiment === "bullish") return <ArrowUpRight className="h-4 w-4 text-green-600" />;
  if (sentiment === "bearish") return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const variant = sentiment === "bullish" ? "default" : sentiment === "bearish" ? "destructive" : "secondary";
  return <Badge variant={variant}>{sentiment}</Badge>;
}

function RelevanceBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">--</span>;
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? "bg-green-500" : score >= 0.4 ? "bg-yellow-500" : "bg-muted-foreground/30";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={color + " h-full rounded-full"} style={{ width: pct + "%" }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return diffMins + "m ago";
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return diffHours + "h ago";
  const diffDays = Math.floor(diffHours / 24);
  return diffDays + "d ago";
}

function formatOptionSymbol(pos: TastyPosition): string {
  if (pos.instrumentType !== "Equity Option") return pos.symbol;
  const parts = [];
  parts.push(pos.underlyingSymbol);
  if (pos.expirationDate) {
    const d = new Date(pos.expirationDate);
    parts.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  }
  if (pos.strikePrice) parts.push("$" + pos.strikePrice);
  if (pos.optionType) parts.push(pos.optionType === "C" ? "Call" : "Put");
  return parts.join(" ");
}

// ============================================
// DIALOG COMPONENTS
// ============================================

function AddHoldingDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ticker: "", companyName: "", shares: "", avgCostBasis: "", sector: "", notes: "",
  });

  const handleSubmit = async () => {
    if (!form.ticker || !form.companyName || !form.shares || !form.avgCostBasis) {
      toast.error("Ticker, company name, shares, and cost basis are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/investing/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: form.ticker, companyName: form.companyName,
          shares: parseFloat(form.shares), avgCostBasis: parseFloat(form.avgCostBasis),
          sector: form.sector || undefined, notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Added " + form.ticker + " to portfolio");
        setForm({ ticker: "", companyName: "", shares: "", avgCostBasis: "", sector: "", notes: "" });
        setOpen(false);
        onCreated();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error("Failed to add holding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Holding</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Portfolio Holding</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input id="ticker" placeholder="AAPL" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" placeholder="Apple Inc." value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shares">Shares</Label>
              <Input id="shares" type="number" step="0.0001" placeholder="100" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avgCostBasis">Avg Cost Basis ($)</Label>
              <Input id="avgCostBasis" type="number" step="0.01" placeholder="150.00" value={form.avgCostBasis} onChange={(e) => setForm({ ...form, avgCostBasis: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sector">Sector (optional)</Label>
            <Input id="sector" placeholder="Technology" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holdingNotes">Notes (optional)</Label>
            <Textarea id="holdingNotes" placeholder="Swing trade entry, earnings play, etc." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Adding..." : "Add Holding"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddWatchlistDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "ticker" as "ticker" | "sector", value: "", label: "", notes: "" });

  const handleSubmit = async () => {
    if (!form.value || !form.label) { toast.error("Value and label are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/investing/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: form.type, value: form.value, label: form.label, notes: form.notes || undefined }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Added " + form.value + " to watchlist");
        setForm({ type: "ticker", value: "", label: "", notes: "" });
        setOpen(false);
        onCreated();
      } else { toast.error(json.error); }
    } catch { toast.error("Failed to add to watchlist"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add to Watchlist</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Watchlist Item</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "ticker" | "sector" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ticker">Ticker</SelectItem>
                <SelectItem value="sector">Sector / Industry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="watchValue">{form.type === "ticker" ? "Ticker Symbol" : "Sector Name"}</Label>
              <Input id="watchValue" placeholder={form.type === "ticker" ? "NVDA" : "AI/Semiconductors"} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="watchLabel">Display Name</Label>
              <Input id="watchLabel" placeholder={form.type === "ticker" ? "NVIDIA Corp" : "AI & Semiconductors"} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="watchNotes">Notes (optional)</Label>
            <Textarea id="watchNotes" placeholder="Why you are watching this..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Adding..." : "Add to Watchlist"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// HOLDINGS ROW (with live prices)
// ============================================

function EditableHoldingRow({
  holding,
  quote,
  onUpdate,
  onDelete,
}: {
  holding: PortfolioHolding;
  quote?: QuoteData;
  onUpdate: () => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    shares: holding.shares,
    avgCostBasis: holding.avgCostBasis,
    sector: holding.sector || "",
    notes: holding.notes || "",
  });

  const costBasis = parseFloat(holding.avgCostBasis);
  const shares = parseFloat(holding.shares);
  const totalCost = costBasis * shares;
  const currentPrice = quote?.price || costBasis;
  const marketValue = shares * currentPrice;
  const pnl = marketValue - totalCost;
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const todayGain = quote?.change ? shares * quote.change : 0;
  const todayGainPct = quote?.changePct ?? 0;

  const handleSave = async () => {
    try {
      const res = await fetch("/api/investing/holdings/" + holding.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shares: parseFloat(form.shares), avgCostBasis: parseFloat(form.avgCostBasis),
          sector: form.sector || undefined, notes: form.notes || undefined,
        }),
      });
      if (res.ok) { toast.success("Updated " + holding.ticker); setEditing(false); onUpdate(); }
      else { const json = await res.json(); toast.error(json.error); }
    } catch { toast.error("Failed to update holding"); }
  };

  if (editing) {
    return (
      <TableRow>
        <TableCell className="font-mono font-semibold">{holding.ticker}</TableCell>
        <TableCell>{holding.companyName}</TableCell>
        <TableCell><Input type="number" step="0.0001" className="w-24 h-8" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} /></TableCell>
        <TableCell><Input type="number" step="0.01" className="w-28 h-8" value={form.avgCostBasis} onChange={(e) => setForm({ ...form, avgCostBasis: e.target.value })} /></TableCell>
        <TableCell colSpan={5}>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleSave}><Check className="h-4 w-4 text-green-600" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4 text-muted-foreground" /></Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-mono font-semibold">{holding.ticker}</TableCell>
      <TableCell>{holding.companyName}</TableCell>
      <TableCell>{parseFloat(holding.shares).toLocaleString()}</TableCell>
      <TableCell>{fmtMoney(costBasis)}</TableCell>
      <TableCell>
        {quote ? (
          <div>
            <div>{fmtMoney(currentPrice)}</div>
            {quote.changePct !== null && (
              <PctText value={quote.changePct} className="text-xs" />
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">--</span>
        )}
      </TableCell>
      <TableCell>{fmtMoney(marketValue)}</TableCell>
      <TableCell>
        {quote?.change !== null && quote?.change !== undefined ? (
          <div>
            <PnlText value={todayGain} />
            <div><PctText value={todayGainPct} className="text-xs" /></div>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">--</span>
        )}
      </TableCell>
      <TableCell>
        <div>
          <PnlText value={pnl} />
          <div><PctText value={pnlPct} className="text-xs" /></div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(holding.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function InvestingPage() {
  // My Portfolio (Fidelity — manual tracking)
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);

  // Our Portfolio (tastytrade live — Ayden-managed)
  const [ttPositions, setTtPositions] = useState<TastyPosition[]>([]);
  const [ttBalance, setTtBalance] = useState<TastyBalance | null>(null);
  const [loadingTt, setLoadingTt] = useState(true);
  const [ttError, setTtError] = useState<string | null>(null);

  // Ayden's Portfolio (DB-simulated paper trading)
  const [aiPortfolio, setAiPortfolio] = useState<AiPortfolioData | null>(null);
  const [loadingAiPortfolio, setLoadingAiPortfolio] = useState(true);
  const [insights, setInsights] = useState<TradingInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);

  // Watchlist & News
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [news, setNews] = useState<MarketNewsArticle[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [newsFilter, setNewsFilter] = useState<string>("all");

  // Performance
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);

  const quoteMap = new Map(quotes.map((q) => [q.ticker, q]));

  // ── Fetch functions ──────────────────────────────────

  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/holdings");
      const json = await res.json();
      if (res.ok) setHoldings(json.data);
      else toast.error(json.error);
    } catch { toast.error("Failed to load holdings"); }
    finally { setLoadingHoldings(false); }
  }, []);

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/quotes");
      const json = await res.json();
      if (res.ok) setQuotes(json.data);
    } catch { /* quotes are supplemental, don't toast */ }
  }, []);

  const fetchTastytrade = useCallback(async () => {
    try {
      const [posRes, balRes] = await Promise.all([
        fetch("/api/investing/tastytrade/positions"),
        fetch("/api/investing/tastytrade/balance"),
      ]);
      const posJson = await posRes.json();
      const balJson = await balRes.json();
      if (posRes.ok && posJson.data) {
        setTtPositions(posJson.data.positions || []);
        setTtError(null);
      } else {
        setTtError(posJson.error || "Failed to load positions");
      }
      if (balRes.ok && balJson.data) {
        setTtBalance(balJson.data);
      }
    } catch {
      setTtError("Failed to connect to tastytrade");
    } finally {
      setLoadingTt(false);
    }
  }, []);

  const fetchAiPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/ai-portfolio?tradeLimit=20");
      const json = await res.json();
      if (res.ok && json.data) {
        setAiPortfolio(json.data);
      } else {
        setAiPortfolio(null);
      }
    } catch {
      setAiPortfolio(null);
    } finally {
      setLoadingAiPortfolio(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/ai-portfolio/insights");
      const json = await res.json();
      if (res.ok && json.data) setInsights(json.data);
    } catch { /* supplemental */ }
    finally { setLoadingInsights(false); }
  }, []);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/watchlist");
      const json = await res.json();
      if (res.ok) setWatchlist(json.data);
      else toast.error(json.error);
    } catch { toast.error("Failed to load watchlist"); }
    finally { setLoadingWatchlist(false); }
  }, []);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/news?limit=100");
      const json = await res.json();
      if (res.ok) setNews(json.data);
      else toast.error(json.error);
    } catch { toast.error("Failed to load news"); }
    finally { setLoadingNews(false); }
  }, []);

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/snapshots?days=90");
      const json = await res.json();
      if (res.ok) setSnapshots(json.data);
    } catch { /* supplemental */ }
    finally { setLoadingSnapshots(false); }
  }, []);

  const crawlNews = async () => {
    setCrawling(true);
    try {
      const res = await fetch("/api/investing/crawl-news", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Fetched " + json.data.fetched + " articles, analyzed " + json.data.analyzed);
        fetchNews();
      } else { toast.error(json.error); }
    } catch { toast.error("Failed to crawl news"); }
    finally { setCrawling(false); }
  };

  useEffect(() => {
    fetchHoldings();
    fetchQuotes();
    fetchTastytrade();
    fetchAiPortfolio();
    fetchInsights();
    fetchWatchlist();
    fetchNews();
    fetchSnapshots();
  }, [fetchHoldings, fetchQuotes, fetchTastytrade, fetchAiPortfolio, fetchInsights, fetchWatchlist, fetchNews, fetchSnapshots]);

  // ── Computed values ──────────────────────────────────

  const userTotalValue = holdings.reduce((sum, h) => {
    const q = quoteMap.get(h.ticker);
    const price = q?.price || parseFloat(h.avgCostBasis);
    return sum + parseFloat(h.shares) * price;
  }, 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + parseFloat(h.shares) * parseFloat(h.avgCostBasis), 0);
  const totalMarketValue = userTotalValue;
  const totalPnl = totalMarketValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;
  const totalTodayGain = holdings.reduce((sum, h) => {
    const q = quoteMap.get(h.ticker);
    return sum + (q?.change ? parseFloat(h.shares) * q.change : 0);
  }, 0);
  const totalTodayGainPct = totalMarketValue > 0 ? (totalTodayGain / (totalMarketValue - totalTodayGain)) * 100 : 0;
  const totalPositions = holdings.length;
const tickerItems = watchlist.filter((w) => w.type === "ticker");
  const sectorItems = watchlist.filter((w) => w.type === "sector");

  // tastytrade computed
  const ttNetLiq = ttBalance?.netLiquidatingValue ?? 0;
  const ttTotalUnrealizedPnl = ttPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const ttEquityPositions = ttPositions.filter((p) => p.instrumentType === "Equity");
  const ttOptionPositions = ttPositions.filter((p) => p.instrumentType === "Equity Option");

  // Ayden's portfolio computed
  const aiTotalValue = aiPortfolio?.totalValue ?? 0;
  const aiTotalReturn = aiPortfolio?.totalReturn ?? 0;
  const aiPositionCount = aiPortfolio?.positions.length ?? 0;

  // News filtering
  const filteredNews = newsFilter === "all"
    ? news
    : newsFilter === "bullish" || newsFilter === "bearish" || newsFilter === "neutral"
      ? news.filter((n) => n.aiSentiment === newsFilter)
      : news.filter((n) => n.relatedTickers.includes(newsFilter));
  const newsTickers = Array.from(new Set(news.flatMap((n) => n.relatedTickers))).sort();

  // Chart data
  const chartData = (() => {
    const dateMap = new Map<string, { date: string; user?: number; ai?: number }>();
    for (const s of snapshots) {
      const dateStr = new Date(s.snapshotDate).toISOString().split("T")[0];
      const existing = dateMap.get(dateStr) || { date: dateStr };
      if (s.portfolioType === "USER") existing.user = s.totalValue;
      else if (s.portfolioType === "AI") existing.ai = s.totalValue;
      dateMap.set(dateStr, existing);
    }
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const quotesUpdatedAt = quotes.length > 0
    ? formatTimeAgo(quotes.reduce((latest, q) => q.updatedAt > latest ? q.updatedAt : latest, quotes[0].updatedAt))
    : null;

  // ── Chat context ──────────────────────────────────

  const chatContextData = [
    `My Portfolio (Fidelity): ${holdings.length} positions, ${fmtMoney(userTotalValue)} total value`,
    holdings.length > 0 ? holdings.map((h) => {
      const q = quoteMap.get(h.ticker);
      const price = q?.price || parseFloat(h.avgCostBasis);
      const value = parseFloat(h.shares) * price;
      const cost = parseFloat(h.shares) * parseFloat(h.avgCostBasis);
      const pnl = value - cost;
      return `  ${h.ticker}: ${parseFloat(h.shares)} shares, ${fmtMoney(value)} (${pnl >= 0 ? "+" : ""}${fmtMoney(pnl)})`;
    }).join("\n") : "",
    ttBalance ? `\nOur Portfolio (tastytrade): Net Liq ${fmtMoney(ttNetLiq)}, Cash ${fmtMoney(ttBalance.cashBalance)}, Buying Power ${fmtMoney(ttBalance.equityBuyingPower)}` : "",
    ttPositions.length > 0 ? ttPositions.map((p) =>
      `  ${p.symbol}: ${p.quantity} ${p.direction}, ${fmtMoney(p.marketValue)} (${fmtPct(p.unrealizedPnlPct)})`
    ).join("\n") : "",
    aiPortfolio ? `\nAyden's Portfolio: ${fmtMoney(aiPortfolio.totalValue)} (${fmtPct(aiPortfolio.totalReturn)} return), Cash ${fmtMoney(aiPortfolio.cashBalance)}` : "",
    aiPortfolio && aiPortfolio.positions.length > 0 ? aiPortfolio.positions.map((p) =>
      `  ${p.ticker}: ${parseFloat(p.shares)} shares, ${fmtMoney(p.marketValue)} (${fmtPct(p.pnlPct)})`
    ).join("\n") : "",
    watchlist.length > 0 ? `\nWatchlist: ${watchlist.map((w) => w.value).join(", ")}` : "",
    news.length > 0 ? `\nRecent news: ${news.slice(0, 5).map((n) => n.headline + (n.aiSentiment ? " [" + n.aiSentiment + "]" : "")).join("; ")}` : "",
  ].filter(Boolean).join("\n");
  useChatContext("Investing", chatContextData);

  // ── Actions ──────────────────────────────────

  const deleteHolding = async (id: string) => {
    try {
      const res = await fetch("/api/investing/holdings/" + id, { method: "DELETE" });
      if (res.ok) { toast.success("Removed from portfolio"); fetchHoldings(); }
      else { const json = await res.json(); toast.error(json.error); }
    } catch { toast.error("Failed to remove holding"); }
  };

  const deleteWatchlistItem = async (id: string) => {
    try {
      const res = await fetch("/api/investing/watchlist/" + id, { method: "DELETE" });
      if (res.ok) { toast.success("Removed from watchlist"); fetchWatchlist(); }
      else { const json = await res.json(); toast.error(json.error); }
    } catch { toast.error("Failed to remove from watchlist"); }
  };

  // ── Render ──────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investing</h1>
        <p className="text-muted-foreground">
          Portfolio tracking, AI-managed trading, and market analysis
          {quotesUpdatedAt && <span className="ml-2 text-xs">(quotes {quotesUpdatedAt})</span>}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">My Portfolio</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtMoney(totalMarketValue)}</div>
            {totalCostBasis > 0 ? (
              <>
                <PnlText value={totalPnl} className="text-sm" />
                <span className="text-sm text-muted-foreground"> (<PctText value={totalPnlPct} className="text-sm" />)</span>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Fidelity</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Our Portfolio</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtMoney(ttNetLiq)}</div>
            {ttPositions.length > 0 ? (
              <>
                <PnlText value={ttTotalUnrealizedPnl} className="text-sm" />
                <span className="text-xs text-muted-foreground ml-1">unrealized</span>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">tastytrade</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ayden&apos;s Portfolio</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiPortfolio ? fmtMoney(aiTotalValue) : "--"}</div>
            {aiPortfolio ? (
              <>
                <PctText value={aiTotalReturn} className="text-sm" />
                <span className="text-xs text-muted-foreground ml-1">return</span>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Paper trading</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Watching</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{watchlist.length}</div>
            <p className="text-xs text-muted-foreground">{tickerItems.length} tickers, {sectorItems.length} sectors</p>
          </CardContent>
        </Card>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="portfolio">
        <TabsList>
          <TabsTrigger value="portfolio" className="gap-1.5"><TrendingUp className="h-4 w-4" />My Portfolio</TabsTrigger>
          <TabsTrigger value="our-portfolio" className="gap-1.5"><Wallet className="h-4 w-4" />Our Portfolio</TabsTrigger>
          <TabsTrigger value="sandbox" className="gap-1.5"><Bot className="h-4 w-4" />Ayden&apos;s Portfolio</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5"><BarChart3 className="h-4 w-4" />Performance</TabsTrigger>
          <TabsTrigger value="watchlist" className="gap-1.5"><Eye className="h-4 w-4" />Watchlist</TabsTrigger>
          <TabsTrigger value="news" className="gap-1.5">
            <Newspaper className="h-4 w-4" />News
            {news.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{news.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ==================== MY PORTFOLIO ==================== */}
        <TabsContent value="portfolio" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">My Holdings (Fidelity)</h2>
            <AddHoldingDialog onCreated={fetchHoldings} />
          </div>
          {loadingHoldings ? (
            <p className="text-muted-foreground text-sm">Loading holdings...</p>
          ) : holdings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">No holdings yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your Fidelity positions to track your portfolio.</p>
                <AddHoldingDialog onCreated={fetchHoldings} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Avg Cost</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Market Value</TableHead>
                    <TableHead>Today</TableHead>
                    <TableHead>Total P&L</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((holding) => (
                    <EditableHoldingRow
                      key={holding.id}
                      holding={holding}
                      quote={quoteMap.get(holding.ticker)}
                      onUpdate={fetchHoldings}
                      onDelete={deleteHolding}
                    />
                  ))}
                  <TableRow className="font-semibold bg-muted/50">
                    <TableCell colSpan={5}>Total</TableCell>
                    <TableCell>{fmtMoney(totalMarketValue)}</TableCell>
                    <TableCell>
                      <PnlText value={totalTodayGain} />
                      <span className="text-xs ml-1">(<PctText value={totalTodayGainPct} className="text-xs" />)</span>
                    </TableCell>
                    <TableCell>
                      <PnlText value={totalPnl} />
                      <span className="text-xs ml-1">(<PctText value={totalPnlPct} className="text-xs" />)</span>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ==================== OUR PORTFOLIO (tastytrade live) ==================== */}
        <TabsContent value="our-portfolio" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Our Portfolio</h2>
              <p className="text-sm text-muted-foreground">tastytrade — managed by Ayden</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setLoadingTt(true); fetchTastytrade(); }}>
              <RefreshCw className="h-4 w-4 mr-1" />Refresh
            </Button>
          </div>

          {loadingTt ? (
            <p className="text-muted-foreground text-sm">Loading tastytrade data...</p>
          ) : ttError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">Connection Error</h3>
                <p className="text-sm text-muted-foreground mb-4">{ttError}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Balance summary */}
              {ttBalance && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net Liquidating Value</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{fmtMoney(ttBalance.netLiquidatingValue)}</div>
                      <p className="text-xs text-muted-foreground">Account {ttBalance.accountNumber}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cash Balance</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{fmtMoney(ttBalance.cashBalance)}</div>
                      {ttBalance.netLiquidatingValue > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {((ttBalance.cashBalance / ttBalance.netLiquidatingValue) * 100).toFixed(1)}% of portfolio
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Buying Power</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{fmtMoney(ttBalance.equityBuyingPower)}</div>
                      <p className="text-xs text-muted-foreground">
                        Options: {fmtMoney(ttBalance.derivativeBuyingPower)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Maintenance Req</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{fmtMoney(ttBalance.maintenanceRequirement)}</div>
                      <p className="text-xs text-muted-foreground">
                        Pending: {fmtMoney(ttBalance.pendingCash)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Positions */}
              {ttPositions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium mb-1">No positions yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Fund this account and Ayden will start managing positions based on your trading preferences and rules.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Equity positions */}
                  {ttEquityPositions.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Equity Positions</CardTitle></CardHeader>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Direction</TableHead>
                            <TableHead>Avg Open</TableHead>
                            <TableHead>Current</TableHead>
                            <TableHead>Market Value</TableHead>
                            <TableHead>Unrealized P&L</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ttEquityPositions.map((pos, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono font-semibold">{pos.symbol}</TableCell>
                              <TableCell>{pos.quantity}</TableCell>
                              <TableCell>
                                <Badge variant={pos.direction === "Long" ? "default" : "destructive"}>
                                  {pos.direction}
                                </Badge>
                              </TableCell>
                              <TableCell>{fmtMoney(pos.averageOpenPrice)}</TableCell>
                              <TableCell>{fmtMoney(pos.currentPrice)}</TableCell>
                              <TableCell>{fmtMoney(pos.marketValue)}</TableCell>
                              <TableCell>
                                <PnlText value={pos.unrealizedPnl} />
                                <div><PctText value={pos.unrealizedPnlPct} className="text-xs" /></div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  )}

                  {/* Options positions */}
                  {ttOptionPositions.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Options Positions</CardTitle></CardHeader>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contract</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Direction</TableHead>
                            <TableHead>Avg Open</TableHead>
                            <TableHead>Current</TableHead>
                            <TableHead>Market Value</TableHead>
                            <TableHead>Unrealized P&L</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ttOptionPositions.map((pos, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <div className="font-mono font-semibold text-sm">{formatOptionSymbol(pos)}</div>
                                <div className="text-xs text-muted-foreground">{pos.symbol}</div>
                              </TableCell>
                              <TableCell>{pos.quantity}</TableCell>
                              <TableCell>
                                <Badge variant={pos.direction === "Long" ? "default" : "destructive"}>
                                  {pos.direction}
                                </Badge>
                              </TableCell>
                              <TableCell>{fmtMoney(pos.averageOpenPrice)}</TableCell>
                              <TableCell>{fmtMoney(pos.currentPrice)}</TableCell>
                              <TableCell>{fmtMoney(pos.marketValue)}</TableCell>
                              <TableCell>
                                <PnlText value={pos.unrealizedPnl} />
                                <div><PctText value={pos.unrealizedPnlPct} className="text-xs" /></div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  )}

                  {/* Totals */}
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Positions: {ttPositions.length}</span>
                        <div className="flex gap-6">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total Market Value</div>
                            <div className="font-semibold">{fmtMoney(ttPositions.reduce((s, p) => s + p.marketValue, 0))}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total Unrealized P&L</div>
                            <PnlText value={ttTotalUnrealizedPnl} className="font-semibold" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* ==================== AYDEN'S PORTFOLIO ==================== */}
        <TabsContent value="sandbox" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Ayden&apos;s Portfolio</h2>
              <p className="text-sm text-muted-foreground">Autonomous paper trading — AI-managed positions</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setLoadingAiPortfolio(true); fetchAiPortfolio(); fetchInsights(); }}>
              <RefreshCw className="h-4 w-4 mr-1" />Refresh
            </Button>
          </div>

          {loadingAiPortfolio ? (
            <p className="text-muted-foreground text-sm">Loading portfolio data...</p>
          ) : !aiPortfolio ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">No portfolio yet</h3>
                <p className="text-sm text-muted-foreground">
                  Ayden&apos;s autonomous trading portfolio will be created on the next scheduled run during market hours.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Portfolio summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtMoney(aiPortfolio.totalValue)}</div>
                    <PctText value={aiPortfolio.totalReturn} className="text-sm" />
                    <span className="text-xs text-muted-foreground ml-1">total return</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cash</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtMoney(aiPortfolio.cashBalance)}</div>
                    <p className="text-xs text-muted-foreground">
                      {aiPortfolio.totalValue > 0 ? ((aiPortfolio.cashBalance / aiPortfolio.totalValue) * 100).toFixed(1) : "0"}% of portfolio
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Holdings</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtMoney(aiPortfolio.holdingsValue)}</div>
                    <p className="text-xs text-muted-foreground">{aiPositionCount} position{aiPositionCount !== 1 ? "s" : ""}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Starting Capital</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtMoney(aiPortfolio.startingCapital)}</div>
                    <p className="text-xs text-muted-foreground">{aiPortfolio.totalTrades} total trades</p>
                  </CardContent>
                </Card>
              </div>

              {/* Positions table */}
              {aiPortfolio.positions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium mb-1">No open positions</h3>
                    <p className="text-sm text-muted-foreground">
                      Ayden is fully in cash. She&apos;ll open positions when she identifies compelling opportunities.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader><CardTitle className="text-base">Open Positions</CardTitle></CardHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Shares</TableHead>
                        <TableHead>Avg Cost</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Market Value</TableHead>
                        <TableHead>Today</TableHead>
                        <TableHead>Total P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiPortfolio.positions.map((pos) => {
                        const shares = parseFloat(pos.shares);
                        const todayGain = pos.dailyChange ? shares * pos.dailyChange : 0;
                        const todayGainPct = pos.dailyChangePct ?? 0;
                        return (
                          <TableRow key={pos.id}>
                            <TableCell className="font-mono font-semibold">{pos.ticker}</TableCell>
                            <TableCell className="text-muted-foreground">{pos.companyName}</TableCell>
                            <TableCell>{shares}</TableCell>
                            <TableCell>{fmtMoney(parseFloat(pos.avgCostBasis))}</TableCell>
                            <TableCell>{fmtMoney(pos.currentPrice)}</TableCell>
                            <TableCell>{fmtMoney(pos.marketValue)}</TableCell>
                            <TableCell>
                              <PnlText value={todayGain} />
                              {todayGainPct !== 0 && <div><PctText value={todayGainPct} className="text-xs" /></div>}
                            </TableCell>
                            <TableCell>
                              <PnlText value={pos.pnl} />
                              <div><PctText value={pos.pnlPct} className="text-xs" /></div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-semibold bg-muted/50">
                        <TableCell colSpan={5}>Total</TableCell>
                        <TableCell>{fmtMoney(aiPortfolio.holdingsValue)}</TableCell>
                        <TableCell>
                          <PnlText value={aiPortfolio.positions.reduce((sum, p) => sum + (p.dailyChange ? parseFloat(p.shares) * p.dailyChange : 0), 0)} />
                        </TableCell>
                        <TableCell>
                          <PnlText value={aiPortfolio.positions.reduce((sum, p) => sum + p.pnl, 0)} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              )}

              {/* ==================== TRADING INSIGHTS ==================== */}
              <div className="pt-6 border-t">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Brain className="h-5 w-5" />
                  Trading Insights
                </h2>

                {loadingInsights ? (
                  <p className="text-muted-foreground text-sm">Loading insights...</p>
                ) : !insights ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Brain className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No trading data yet. Insights will appear as Ayden makes trades.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Performance Stats */}
                    {insights.performance.totalTrades > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <Card>
                          <CardContent className="pt-4 pb-3 px-4">
                            <p className="text-xs text-muted-foreground">Total Trades</p>
                            <p className="text-xl font-bold">{insights.performance.totalTrades}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 pb-3 px-4">
                            <p className="text-xs text-muted-foreground">Win Rate</p>
                            <p className="text-xl font-bold">{insights.performance.winRate}%</p>
                            <p className="text-xs text-muted-foreground">{insights.performance.wins}W / {insights.performance.losses}L / {insights.performance.breakeven}BE</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 pb-3 px-4">
                            <p className="text-xs text-muted-foreground">Total P&L</p>
                            <p className={`text-xl font-bold ${insights.performance.totalPnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {fmtMoney(insights.performance.totalPnl)}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 pb-3 px-4">
                            <p className="text-xs text-muted-foreground">Avg Win / Loss</p>
                            <p className="text-sm font-semibold text-green-600">{fmtMoney(insights.performance.avgWin)}</p>
                            <p className="text-sm font-semibold text-red-500">{fmtMoney(insights.performance.avgLoss)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 pb-3 px-4">
                            <p className="text-xs text-muted-foreground">Profit Factor</p>
                            <p className="text-xl font-bold">{insights.performance.profitFactor}x</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* ── Evolution: Cumulative P&L + Win Rate ── */}
                    {insights.evolution.cumulativeData.length >= 2 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            Trading Evolution
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">Cumulative P&L and rolling win rate over time</p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={280}>
                            <ComposedChart data={insights.evolution.cumulativeData}>
                              <defs>
                                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis
                                dataKey="tradeNum"
                                tickFormatter={(v) => {
                                  const data = insights.evolution.cumulativeData as Array<{ tradeNum: number; date: string }>;
                                  const idx = data.findIndex((d) => d.tradeNum === v);
                                  if (idx === -1) return "";
                                  const dateStr = new Date(data[idx].date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                                  // Only show label if this is the first trade on this date
                                  if (idx > 0) {
                                    const prevDateStr = new Date(data[idx - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                                    if (dateStr === prevDateStr) return "";
                                  }
                                  return dateStr;
                                }}
                                className="text-xs"
                              />
                              <YAxis
                                yAxisId="pnl"
                                tickFormatter={(v) => "$" + v.toFixed(0)}
                                className="text-xs"
                              />
                              <YAxis
                                yAxisId="wr"
                                orientation="right"
                                tickFormatter={(v) => v + "%"}
                                domain={[0, 100]}
                                className="text-xs"
                              />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (!active || !payload?.length) return null;
                                  const d = payload[0]?.payload as (typeof insights.evolution.cumulativeData)[0] | undefined;
                                  if (!d) return null;
                                  return (
                                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                                      <p className="font-semibold">{d.ticker} — Trade #{d.tradeNum}</p>
                                      <p className="text-muted-foreground text-xs">{new Date(d.date).toLocaleDateString()}</p>
                                      <p className={d.pnl >= 0 ? "text-green-600" : "text-red-500"}>
                                        Trade: {fmtMoney(d.pnl)} ({d.outcome})
                                      </p>
                                      <p>Cumulative: {fmtMoney(d.cumulativePnl)}</p>
                                      <p>Win Rate: {d.winRate}%</p>
                                    </div>
                                  );
                                }}
                              />
                              <ReferenceLine yAxisId="pnl" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                              <Area
                                yAxisId="pnl"
                                type="monotone"
                                dataKey="cumulativePnl"
                                stroke="hsl(var(--chart-1))"
                                fill="url(#pnlGradient)"
                                strokeWidth={2}
                                name="Cumulative P&L"
                              />
                              <Line
                                yAxisId="wr"
                                type="monotone"
                                dataKey="winRate"
                                stroke="hsl(var(--chart-2))"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                                name="Win Rate"
                              />
                              <Legend />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* ── Evolution Timeline ── */}
                    {insights.evolution.timeline.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Growth Timeline
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">Key moments in Ayden&apos;s trading journey</p>
                        </CardHeader>
                        <CardContent>
                          <div className="relative space-y-0">
                            {/* Vertical line */}
                            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                            {insights.evolution.timeline.slice(0, 20).map((event, i) => {
                              const iconClass = "h-3.5 w-3.5";
                              let icon;
                              let dotColor;
                              switch (event.type) {
                                case "trade":
                                  icon = event.outcome === "win"
                                    ? <ArrowUpRight className={`${iconClass} text-green-600`} />
                                    : event.outcome === "loss"
                                      ? <ArrowDownRight className={`${iconClass} text-red-500`} />
                                      : <Minus className={`${iconClass} text-muted-foreground`} />;
                                  dotColor = event.outcome === "win" ? "bg-green-600" : event.outcome === "loss" ? "bg-red-500" : "bg-muted-foreground";
                                  break;
                                case "rule_approved":
                                  icon = <CheckCircle2 className={`${iconClass} text-blue-500`} />;
                                  dotColor = "bg-blue-500";
                                  break;
                                case "rule_proposed":
                                  icon = <Clock className={`${iconClass} text-amber-500`} />;
                                  dotColor = "bg-amber-500";
                                  break;
                                case "lesson":
                                  icon = <Lightbulb className={`${iconClass} text-yellow-500`} />;
                                  dotColor = "bg-yellow-500";
                                  break;
                                case "observation":
                                  icon = <Eye className={`${iconClass} text-purple-500`} />;
                                  dotColor = "bg-purple-500";
                                  break;
                              }

                              return (
                                <div key={i} className="relative flex gap-3 py-2 pl-1">
                                  <div className={`relative z-10 flex items-center justify-center h-6 w-6 rounded-full ${dotColor}/10 shrink-0`}>
                                    {icon}
                                  </div>
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {event.type.replace("_", " ")}
                                      </Badge>
                                      {event.pnl != null && (
                                        <span className={`text-xs font-medium ${event.pnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                                          {fmtMoney(event.pnl)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm mt-0.5">{event.title}</p>
                                    {event.detail && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* ── Strategy Evolution ── */}
                    {insights.evolution.strategyEvolution.length >= 2 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Strategy Focus Over Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2 flex-wrap">
                            {insights.evolution.strategyEvolution.map((month) => (
                              <div key={month.month} className="text-center">
                                <p className="text-[10px] text-muted-foreground mb-1">{month.month}</p>
                                <Badge variant="secondary" className="text-xs">
                                  {month.dominant}
                                </Badge>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {Object.values(month.strategies).reduce((a, b) => a + b, 0)} trades
                                </p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Pending Rules — needs Trey's approval */}
                    {insights.rules.pending.length > 0 && (
                      <Card className="border-amber-500/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500" />
                            Pending Rules ({insights.rules.pending.length})
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">Ayden proposed these. Approve to add to her trading rules.</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {insights.rules.pending.map((rule) => (
                            <div key={rule.id} className="flex items-start justify-between gap-3 p-3 rounded-md bg-muted/50">
                              <div className="flex-1 min-w-0">
                                <Badge variant="outline" className="text-xs mb-1">{rule.category}</Badge>
                                <p className="text-sm">{rule.rule}</p>
                                {rule.rationale && <p className="text-xs text-muted-foreground mt-1">{rule.rationale}</p>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                  onClick={async () => {
                                    try {
                                      await fetch("/api/investing/ai-portfolio/rules", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ id: rule.id, action: "approve" }),
                                      });
                                      toast.success("Rule approved");
                                      fetchInsights();
                                    } catch { toast.error("Failed to approve rule"); }
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={async () => {
                                    try {
                                      await fetch("/api/investing/ai-portfolio/rules", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ id: rule.id, action: "reject" }),
                                      });
                                      toast.success("Rule rejected");
                                      fetchInsights();
                                    } catch { toast.error("Failed to reject rule"); }
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Active Trading Rules */}
                    {insights.rules.active.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Active Rules ({insights.rules.active.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {insights.rules.active.map((rule) => (
                              <div key={rule.id} className="flex items-start gap-2 text-sm">
                                <Badge variant="outline" className="text-xs shrink-0 mt-0.5">{rule.category}</Badge>
                                <span>{rule.rule}</span>
                                <Badge variant="secondary" className="text-xs shrink-0 ml-auto">{rule.source}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Lessons Learned */}
                    {insights.lessons.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Lessons Learned</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {insights.lessons.map((lesson, i) => (
                              <div key={i} className="text-sm border-l-2 border-muted-foreground/20 pl-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono font-semibold">{lesson.ticker}</span>
                                  <Badge variant={lesson.outcome === "win" ? "default" : lesson.outcome === "loss" ? "destructive" : "secondary"} className="text-xs">
                                    {lesson.outcome}
                                  </Badge>
                                  {lesson.pnl !== null && <PnlText value={lesson.pnl} className="text-xs" />}
                                  <span className="text-xs text-muted-foreground ml-auto">{lesson.date}</span>
                                </div>
                                <p className="text-muted-foreground">{lesson.lessons}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Market Observations */}
                    {insights.observations.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Market Observations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {insights.observations.map((obs, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{obs.date}</span>
                                <p>{obs.text}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Ticker Performance */}
                    {insights.tickerPerformance.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Performance by Ticker</CardTitle>
                        </CardHeader>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ticker</TableHead>
                              <TableHead>Trades</TableHead>
                              <TableHead>Win Rate</TableHead>
                              <TableHead>P&L</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {insights.tickerPerformance.map((tp) => (
                              <TableRow key={tp.ticker}>
                                <TableCell className="font-mono font-semibold">{tp.ticker}</TableCell>
                                <TableCell>{tp.trades} ({tp.wins}W/{tp.losses}L)</TableCell>
                                <TableCell>{tp.winRate}%</TableCell>
                                <TableCell><PnlText value={tp.pnl} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    )}

                    {/* Best & Worst Trades */}
                    {(insights.bestTrades.length > 0 || insights.worstTrades.length > 0) && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {insights.bestTrades.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base text-green-600">Best Trades</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {insights.bestTrades.map((t, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <div>
                                    <span className="font-mono font-semibold">{t.ticker}</span>
                                    <span className="text-muted-foreground text-xs ml-2">{t.date}</span>
                                  </div>
                                  <PnlText value={t.pnl} />
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                        {insights.worstTrades.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base text-red-500">Worst Trades</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {insights.worstTrades.map((t, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <div>
                                    <span className="font-mono font-semibold">{t.ticker}</span>
                                    <span className="text-muted-foreground text-xs ml-2">{t.date}</span>
                                  </div>
                                  <PnlText value={t.pnl} />
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Recent trades */}
              {aiPortfolio.trades.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Recent Trades</CardTitle></CardHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Shares</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Reasoning</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiPortfolio.trades.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            <div>{new Date(trade.executedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                            <div className="text-xs opacity-60">{new Date(trade.executedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={trade.side === "BUY" ? "default" : "destructive"}>
                              {trade.side}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-semibold">{trade.ticker}</TableCell>
                          <TableCell>{parseFloat(trade.shares)}</TableCell>
                          <TableCell>{fmtMoney(parseFloat(trade.price))}</TableCell>
                          <TableCell>{fmtMoney(parseFloat(trade.total))}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={trade.reasoning}>
                            {trade.reasoning}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ==================== PERFORMANCE ==================== */}
        <TabsContent value="performance" className="space-y-4">
          <h2 className="text-lg font-semibold">Performance</h2>

          {loadingSnapshots ? (
            <p className="text-muted-foreground text-sm">Loading performance data...</p>
          ) : chartData.length < 2 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">Not enough data yet</h3>
                <p className="text-sm text-muted-foreground">
                  Daily snapshots are taken at market close. Check back after a few trading days to see the comparison chart.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Portfolio Value Over Time</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      className="text-xs"
                    />
                    <YAxis
                      tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"}
                      className="text-xs"
                    />
                    <Tooltip
                      formatter={(value?: number | string) => value != null ? fmtMoney(Number(value)) : "--"}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="user" stroke="#3b82f6" name="My Portfolio" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ai" stroke="#8b5cf6" name="Our Portfolio" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Metrics comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">My Portfolio</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Market Value</span>
                  <span className="font-medium">{fmtMoney(totalMarketValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cost Basis</span>
                  <span className="font-medium">{fmtMoney(totalCostBasis)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total P&L</span>
                  <PnlText value={totalPnl} className="font-medium" />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Return</span>
                  <PctText value={totalPnlPct} className="font-medium" />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Positions</span>
                  <span className="font-medium">{totalPositions}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Our Portfolio</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Net Liq Value</span>
                  <span className="font-medium">{fmtMoney(ttNetLiq)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cash Balance</span>
                  <span className="font-medium">{fmtMoney(ttBalance?.cashBalance ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Unrealized P&L</span>
                  <PnlText value={ttTotalUnrealizedPnl} className="font-medium" />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Equity Positions</span>
                  <span className="font-medium">{ttEquityPositions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Options Positions</span>
                  <span className="font-medium">{ttOptionPositions.length}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Ayden&apos;s Portfolio</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <span className="font-medium">{aiPortfolio ? fmtMoney(aiTotalValue) : "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cost Basis</span>
                  <span className="font-medium">{aiPortfolio ? fmtMoney(aiPortfolio.startingCapital) : "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total P&L</span>
                  {aiPortfolio ? <PnlText value={aiTotalValue - aiPortfolio.startingCapital} className="font-medium" /> : <span className="font-medium">--</span>}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cash Balance</span>
                  <span className="font-medium">{aiPortfolio ? fmtMoney(aiPortfolio.cashBalance) : "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Positions</span>
                  <span className="font-medium">{aiPortfolio ? aiPositionCount : "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Return</span>
                  {aiPortfolio ? <PctText value={aiTotalReturn} className="font-medium" /> : <span className="font-medium">--</span>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== WATCHLIST ==================== */}
        <TabsContent value="watchlist" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Watchlist</h2>
            <AddWatchlistDialog onCreated={fetchWatchlist} />
          </div>
          {loadingWatchlist ? (
            <p className="text-muted-foreground text-sm">Loading watchlist...</p>
          ) : watchlist.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">Watchlist empty</h3>
                <p className="text-sm text-muted-foreground mb-4">Add tickers and sectors you want to monitor for news and analysis.</p>
                <AddWatchlistDialog onCreated={fetchWatchlist} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tickerItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Tickers</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tickerItems.map((item) => {
                        const q = quoteMap.get(item.value);
                        return (
                          <div key={item.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                            <span className="font-mono font-semibold text-sm">{item.value}</span>
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                            {q && (
                              <span className="text-sm font-medium">
                                {fmtMoney(q.price)}
                                {q.changePct !== null && <PctText value={q.changePct} className="text-xs ml-1" />}
                              </span>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-1" onClick={() => deleteWatchlistItem(item.id)}>
                              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
              {sectorItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Sectors & Industries</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {sectorItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                          <Badge variant="secondary">{item.value}</Badge>
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-1" onClick={() => deleteWatchlistItem(item.id)}>
                            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ==================== NEWS ==================== */}
        <TabsContent value="news" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Market News</h2>
              <Select value={newsFilter} onValueChange={setNewsFilter}>
                <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="Filter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Articles</SelectItem>
                  <SelectItem value="bullish">Bullish</SelectItem>
                  <SelectItem value="bearish">Bearish</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  {newsTickers.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={crawlNews} disabled={crawling}>
              <RefreshCw className={"h-4 w-4 mr-1" + (crawling ? " animate-spin" : "")} />
              {crawling ? "Crawling..." : "Refresh News"}
            </Button>
          </div>

          {loadingNews ? (
            <p className="text-muted-foreground text-sm">Loading news...</p>
          ) : news.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">No news yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click Refresh News to crawl headlines for your watchlist tickers and get AI analysis.
                </p>
                <Button onClick={crawlNews} disabled={crawling}>
                  <RefreshCw className={"h-4 w-4 mr-1" + (crawling ? " animate-spin" : "")} />
                  {crawling ? "Crawling..." : "Refresh News"}
                </Button>
              </CardContent>
            </Card>
          ) : filteredNews.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No articles match this filter.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNews.map((article) => (
                <Card key={article.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <SentimentIcon sentiment={article.aiSentiment} />
                          <a href={article.url} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline leading-tight flex-1">
                            {article.headline}
                          </a>
                          <a href={article.url} target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground shrink-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        {article.aiSummary && (
                          <p className="text-sm text-muted-foreground mt-1 ml-6">{article.aiSummary}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 ml-6">
                          <div className="flex gap-1">
                            {article.relatedTickers.slice(0, 5).map((t) => (
                              <Badge key={t} variant="outline" className="text-xs font-mono cursor-pointer" onClick={() => setNewsFilter(t)}>{t}</Badge>
                            ))}
                          </div>
                          <SentimentBadge sentiment={article.aiSentiment} />
                          <RelevanceBar score={article.aiRelevanceScore} />
                          <span className="text-xs text-muted-foreground ml-auto">{formatTimeAgo(article.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
