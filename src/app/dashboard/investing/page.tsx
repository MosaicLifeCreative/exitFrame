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
  FlaskConical,
  Wallet,
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

  // Sandbox (tastytrade sandbox — Ayden paper trading)
  const [sandboxPositions, setSandboxPositions] = useState<TastyPosition[]>([]);
  const [sandboxBalance, setSandboxBalance] = useState<TastyBalance | null>(null);
  const [loadingSandbox, setLoadingSandbox] = useState(true);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

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

  const fetchSandbox = useCallback(async () => {
    try {
      const [posRes, balRes] = await Promise.all([
        fetch("/api/investing/tastytrade/sandbox/positions"),
        fetch("/api/investing/tastytrade/sandbox/balance"),
      ]);
      const posJson = await posRes.json();
      const balJson = await balRes.json();
      if (posRes.ok && posJson.data) {
        setSandboxPositions(posJson.data.positions || []);
        setSandboxError(null);
      } else {
        setSandboxError(posJson.error || "Sandbox not configured");
      }
      if (balRes.ok && balJson.data) {
        setSandboxBalance(balJson.data);
      }
    } catch {
      setSandboxError("Sandbox not configured");
    } finally {
      setLoadingSandbox(false);
    }
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
    fetchSandbox();
    fetchWatchlist();
    fetchNews();
    fetchSnapshots();
  }, [fetchHoldings, fetchQuotes, fetchTastytrade, fetchSandbox, fetchWatchlist, fetchNews, fetchSnapshots]);

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

  // sandbox computed
  const sbNetLiq = sandboxBalance?.netLiquidatingValue ?? 0;

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
    sandboxBalance ? `\nSandbox: Net Liq ${fmtMoney(sbNetLiq)}, Cash ${fmtMoney(sandboxBalance.cashBalance)}` : "",
    sandboxPositions.length > 0 ? sandboxPositions.map((p) =>
      `  ${p.symbol}: ${p.quantity} ${p.direction}, ${fmtMoney(p.marketValue)} (${fmtPct(p.unrealizedPnlPct)})`
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Sandbox</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sandboxBalance ? fmtMoney(sbNetLiq) : "--"}</div>
            <p className="text-xs text-muted-foreground">
              {sandboxBalance ? `${sandboxPositions.length} positions` : "Not configured"}
            </p>
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
          <TabsTrigger value="sandbox" className="gap-1.5"><FlaskConical className="h-4 w-4" />Sandbox</TabsTrigger>
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

        {/* ==================== SANDBOX ==================== */}
        <TabsContent value="sandbox" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Sandbox</h2>
              <p className="text-sm text-muted-foreground">tastytrade paper trading — Ayden&apos;s practice arena</p>
            </div>
            {!sandboxError && (
              <Button size="sm" variant="outline" onClick={() => { setLoadingSandbox(true); fetchSandbox(); }}>
                <RefreshCw className="h-4 w-4 mr-1" />Refresh
              </Button>
            )}
          </div>

          {loadingSandbox ? (
            <p className="text-muted-foreground text-sm">Loading sandbox data...</p>
          ) : sandboxError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">Sandbox Not Configured</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  Create a tastytrade sandbox account and add the credentials to your environment variables to enable Ayden&apos;s paper trading.
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Required env vars:</p>
                  <code className="block bg-muted px-3 py-2 rounded text-left max-w-sm mx-auto">
                    TASTYTRADE_SANDBOX_CLIENT_SECRET<br />
                    TASTYTRADE_SANDBOX_REFRESH_TOKEN
                  </code>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Sandbox balance */}
              {sandboxBalance && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net Liquidating Value</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{fmtMoney(sandboxBalance.netLiquidatingValue)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cash Balance</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{fmtMoney(sandboxBalance.cashBalance)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Buying Power</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{fmtMoney(sandboxBalance.equityBuyingPower)}</div>
                      <p className="text-xs text-muted-foreground">Options: {fmtMoney(sandboxBalance.derivativeBuyingPower)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Positions</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{sandboxPositions.length}</div>
                      <p className="text-xs text-muted-foreground">Paper trades</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Sandbox positions */}
              {sandboxPositions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium mb-1">No sandbox positions</h3>
                    <p className="text-sm text-muted-foreground">
                      Ayden will use the sandbox to practice trading strategies with fake money before going live.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader><CardTitle className="text-base">Sandbox Positions</CardTitle></CardHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Avg Open</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Market Value</TableHead>
                        <TableHead>Unrealized P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sandboxPositions.map((pos, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono font-semibold">
                            {pos.instrumentType === "Equity Option" ? formatOptionSymbol(pos) : pos.symbol}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {pos.instrumentType === "Equity Option" ? "Option" : "Equity"}
                            </Badge>
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
              <CardHeader><CardTitle className="text-base">Sandbox</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Net Liq Value</span>
                  <span className="font-medium">{sandboxBalance ? fmtMoney(sbNetLiq) : "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cash Balance</span>
                  <span className="font-medium">{sandboxBalance ? fmtMoney(sandboxBalance.cashBalance) : "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Positions</span>
                  <span className="font-medium">{sandboxBalance ? sandboxPositions.length : "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={sandboxError ? "secondary" : "default"}>
                    {sandboxError ? "Not configured" : "Active"}
                  </Badge>
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
