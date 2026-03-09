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
  RotateCcw,
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

interface AiTradeRecord {
  id: string;
  ticker: string;
  companyName: string;
  side: string;
  shares: string;
  price: string;
  total: string;
  reasoning: string;
  newsIds: string[];
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
  positions: AiPosition[];
  trades: AiTradeRecord[];
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

function ResetPortfolioDialog({ onReset, currentValue }: { onReset: () => void; currentValue: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    const capital = parseFloat(amount);
    if (!capital || capital <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/investing/ai-portfolio/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startingCapital: capital }),
      });
      if (res.ok) {
        toast.success("Portfolio reset with $" + capital.toLocaleString());
        setOpen(false);
        setAmount("");
        onReset();
      } else {
        const json = await res.json();
        toast.error(json.error);
      }
    } catch { toast.error("Failed to reset portfolio"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset Ayden&apos;s Portfolio</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will deactivate the current portfolio and start fresh. All positions will be closed. Trade history is preserved for reference.
        </p>
        <div className="space-y-2 mt-2">
          <Label htmlFor="resetAmount">Starting Capital ($)</Label>
          <Input
            id="resetAmount"
            type="number"
            step="0.01"
            placeholder={currentValue.toFixed(0)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Your current portfolio value: {fmtMoney(currentValue)}</p>
        </div>
        <Button onClick={handleReset} disabled={saving} variant="destructive">
          {saving ? "Resetting..." : "Reset Portfolio"}
        </Button>
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
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [news, setNews] = useState<MarketNewsArticle[]>([]);
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [aiPortfolio, setAiPortfolio] = useState<AiPortfolioData | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingAi, setLoadingAi] = useState(true);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [newsFilter, setNewsFilter] = useState<string>("all");

  const quoteMap = new Map(quotes.map((q) => [q.ticker, q]));

  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/holdings");
      const json = await res.json();
      if (res.ok) setHoldings(json.data);
      else toast.error(json.error);
    } catch { toast.error("Failed to load holdings"); }
    finally { setLoadingHoldings(false); }
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

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/quotes");
      const json = await res.json();
      if (res.ok) setQuotes(json.data);
    } catch { /* quotes are supplemental, don't toast */ }
  }, []);

  const fetchAiPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/ai-portfolio");
      const json = await res.json();
      if (res.ok) setAiPortfolio(json.data);
    } catch { toast.error("Failed to load AI portfolio"); }
    finally { setLoadingAi(false); }
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

  const evaluateNow = async () => {
    setEvaluating(true);
    try {
      const res = await fetch("/api/investing/ai-portfolio/evaluate", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        const d = json.data;
        toast.success(`Evaluated: ${d.decisions} decisions, ${d.executed} trades`);
        fetchAiPortfolio();
        fetchQuotes();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error("Failed to evaluate trades");
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
    fetchWatchlist();
    fetchNews();
    fetchQuotes();
    fetchAiPortfolio();
    fetchSnapshots();
  }, [fetchHoldings, fetchWatchlist, fetchNews, fetchQuotes, fetchAiPortfolio, fetchSnapshots]);

  // Chat context — pre-calculate totals
  const userTotalValue = holdings.reduce((sum, h) => {
    const q = quoteMap.get(h.ticker);
    const price = q?.price || parseFloat(h.avgCostBasis);
    return sum + parseFloat(h.shares) * price;
  }, 0);

  const chatContextData = [
    `Your Portfolio: ${holdings.length} positions, ${fmtMoney(userTotalValue)} total value`,
    holdings.length > 0 ? holdings.map((h) => {
      const q = quoteMap.get(h.ticker);
      const price = q?.price || parseFloat(h.avgCostBasis);
      const value = parseFloat(h.shares) * price;
      const cost = parseFloat(h.shares) * parseFloat(h.avgCostBasis);
      const pnl = value - cost;
      return `  ${h.ticker}: ${parseFloat(h.shares)} shares, ${fmtMoney(value)} (${pnl >= 0 ? "+" : ""}${fmtMoney(pnl)})`;
    }).join("\n") : "",
    aiPortfolio ? `\nAyden's Portfolio: ${fmtMoney(aiPortfolio.totalValue)} (${fmtPct(aiPortfolio.totalReturn)} return), ${aiPortfolio.positions.length} positions, ${fmtMoney(aiPortfolio.cashBalance)} cash` : "",
    aiPortfolio && aiPortfolio.positions.length > 0 ? aiPortfolio.positions.map((p) =>
      `  ${p.ticker}: ${parseFloat(p.shares)} shares, ${fmtMoney(p.marketValue)} (${fmtPct(p.pnlPct)})`
    ).join("\n") : "",
    watchlist.length > 0 ? `\nWatchlist: ${watchlist.map((w) => w.value).join(", ")}` : "",
    news.length > 0 ? `\nRecent news: ${news.slice(0, 5).map((n) => n.headline + (n.aiSentiment ? " [" + n.aiSentiment + "]" : "")).join("; ")}` : "",
  ].filter(Boolean).join("\n");
  useChatContext("Investing", chatContextData);

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

  // Computed values for user portfolio
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
  const sectors = Array.from(new Set(holdings.map((h) => h.sector).filter(Boolean)));
  const tickerItems = watchlist.filter((w) => w.type === "ticker");
  const sectorItems = watchlist.filter((w) => w.type === "sector");

  // Filtered news
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

  // AI portfolio metrics
  const quotesUpdatedAt = quotes.length > 0
    ? formatTimeAgo(quotes.reduce((latest, q) => q.updatedAt > latest ? q.updatedAt : latest, quotes[0].updatedAt))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investing</h1>
        <p className="text-muted-foreground">
          Portfolio, AI trading, and market analysis
          {quotesUpdatedAt && <span className="ml-2 text-xs">(quotes {quotesUpdatedAt})</span>}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Your Portfolio</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtMoney(totalMarketValue)}</div>
            <PnlText value={totalPnl} className="text-sm" />
            <span className="text-sm text-muted-foreground"> (<PctText value={totalPnlPct} className="text-sm" />)</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ayden&apos;s Portfolio</CardTitle></CardHeader>
          <CardContent>
            {aiPortfolio ? (
              <>
                <div className="text-2xl font-bold">{fmtMoney(aiPortfolio.totalValue)}</div>
                <PctText value={aiPortfolio.totalReturn} className="text-sm" />
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">--</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Positions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositions}</div>
            <p className="text-xs text-muted-foreground">{sectors.length} sectors</p>
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
          <TabsTrigger value="ai" className="gap-1.5"><Bot className="h-4 w-4" />Ayden&apos;s Portfolio</TabsTrigger>
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
            <h2 className="text-lg font-semibold">Holdings</h2>
            <AddHoldingDialog onCreated={fetchHoldings} />
          </div>
          {loadingHoldings ? (
            <p className="text-muted-foreground text-sm">Loading holdings...</p>
          ) : holdings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">No holdings yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your stock positions to start tracking your portfolio.</p>
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

        {/* ==================== AYDEN'S PORTFOLIO ==================== */}
        <TabsContent value="ai" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Ayden&apos;s Portfolio</h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={evaluateNow} disabled={evaluating}>
                <RefreshCw className={"h-4 w-4 mr-1" + (evaluating ? " animate-spin" : "")} />
                {evaluating ? "Evaluating..." : "Evaluate Now"}
              </Button>
              {aiPortfolio && (
                <ResetPortfolioDialog onReset={fetchAiPortfolio} currentValue={totalMarketValue} />
              )}
            </div>
          </div>

          {loadingAi ? (
            <p className="text-muted-foreground text-sm">Loading AI portfolio...</p>
          ) : !aiPortfolio ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">No AI portfolio yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ayden&apos;s portfolio will be created automatically when the first trade evaluation runs.
                  It will start with capital matching your portfolio value.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* AI Portfolio summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtMoney(aiPortfolio.totalValue)}</div>
                    <PctText value={aiPortfolio.totalReturn} className="text-sm" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cash</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtMoney(aiPortfolio.cashBalance)}</div>
                    <p className="text-xs text-muted-foreground">
                      {((aiPortfolio.cashBalance / aiPortfolio.totalValue) * 100).toFixed(1)}% of portfolio
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Holdings</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtMoney(aiPortfolio.holdingsValue)}</div>
                    <p className="text-xs text-muted-foreground">{aiPortfolio.positions.length} positions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Starting Capital</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtMoney(aiPortfolio.startingCapital)}</div>
                    <p className="text-xs text-muted-foreground">
                      Since {new Date(aiPortfolio.inceptionDate).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Positions */}
              {aiPortfolio.positions.length > 0 && (
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
                        const posTodayGain = pos.dailyChange !== null ? parseFloat(pos.shares) * pos.dailyChange : 0;
                        return (
                          <TableRow key={pos.id}>
                            <TableCell className="font-mono font-semibold">{pos.ticker}</TableCell>
                            <TableCell>{pos.companyName}</TableCell>
                            <TableCell>{parseFloat(pos.shares).toLocaleString()}</TableCell>
                            <TableCell>{fmtMoney(parseFloat(pos.avgCostBasis))}</TableCell>
                            <TableCell>
                              <div>
                                <div>{fmtMoney(pos.currentPrice)}</div>
                                {pos.dailyChangePct !== null && <PctText value={pos.dailyChangePct} className="text-xs" />}
                              </div>
                            </TableCell>
                            <TableCell>{fmtMoney(pos.marketValue)}</TableCell>
                            <TableCell>
                              {pos.dailyChange !== null ? (
                                <div>
                                  <PnlText value={posTodayGain} />
                                  <div><PctText value={pos.dailyChangePct ?? 0} className="text-xs" /></div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">--</span>
                              )}
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
                          <PnlText value={aiPortfolio.positions.reduce((sum, p) => sum + (p.dailyChange !== null ? parseFloat(p.shares) * p.dailyChange : 0), 0)} />
                        </TableCell>
                        <TableCell>
                          <PnlText value={aiPortfolio.holdingsValue - aiPortfolio.positions.reduce((sum, p) => sum + parseFloat(p.shares) * parseFloat(p.avgCostBasis), 0)} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              )}

              {/* AI Trade Log */}
              <Card>
                <CardHeader><CardTitle className="text-base">Recent Trades</CardTitle></CardHeader>
                {aiPortfolio.trades.length === 0 ? (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">No trades yet. Ayden will evaluate positions hourly during market hours.</p>
                  </CardContent>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Shares</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="max-w-[300px]">Reasoning</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiPortfolio.trades.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(trade.executedAt).toLocaleDateString()}
                            <div className="text-xs text-muted-foreground">
                              {new Date(trade.executedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={trade.side === "BUY" ? "default" : "destructive"}>
                              {trade.side}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-semibold">{trade.ticker}</TableCell>
                          <TableCell>{parseFloat(trade.shares).toLocaleString()}</TableCell>
                          <TableCell>{fmtMoney(parseFloat(trade.price))}</TableCell>
                          <TableCell>{fmtMoney(parseFloat(trade.total))}</TableCell>
                          <TableCell className="max-w-[300px]">
                            <p className="text-sm text-muted-foreground truncate" title={trade.reasoning}>
                              {trade.reasoning}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        {/* ==================== PERFORMANCE ==================== */}
        <TabsContent value="performance" className="space-y-4">
          <h2 className="text-lg font-semibold">Performance Comparison</h2>

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
                    <Line type="monotone" dataKey="user" stroke="#3b82f6" name="Your Portfolio" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ai" stroke="#8b5cf6" name="Ayden's Portfolio" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Metrics comparison */}
          {aiPortfolio && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Your Stats</CardTitle></CardHeader>
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
                <CardHeader><CardTitle className="text-base">Ayden&apos;s Stats</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="font-medium">{fmtMoney(aiPortfolio.totalValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Starting Capital</span>
                    <span className="font-medium">{fmtMoney(aiPortfolio.startingCapital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total P&L</span>
                    <PnlText value={aiPortfolio.totalValue - aiPortfolio.startingCapital} className="font-medium" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Return</span>
                    <PctText value={aiPortfolio.totalReturn} className="font-medium" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Positions</span>
                    <span className="font-medium">{aiPortfolio.positions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Trades</span>
                    <span className="font-medium">{aiPortfolio.trades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cash Reserve</span>
                    <span className="font-medium">
                      {fmtMoney(aiPortfolio.cashBalance)} ({((aiPortfolio.cashBalance / aiPortfolio.totalValue) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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
