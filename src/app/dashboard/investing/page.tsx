"use client";

import { useEffect, useState, useCallback } from "react";
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

function AddHoldingDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ticker: "",
    companyName: "",
    shares: "",
    avgCostBasis: "",
    sector: "",
    notes: "",
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
          ticker: form.ticker,
          companyName: form.companyName,
          shares: parseFloat(form.shares),
          avgCostBasis: parseFloat(form.avgCostBasis),
          sector: form.sector || undefined,
          notes: form.notes || undefined,
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
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Holding
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Portfolio Holding</DialogTitle>
        </DialogHeader>
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
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Adding..." : "Add Holding"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddWatchlistDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "ticker" as "ticker" | "sector",
    value: "",
    label: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!form.value || !form.label) {
      toast.error("Value and label are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/investing/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          value: form.value,
          label: form.label,
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Added " + form.value + " to watchlist");
        setForm({ type: "ticker", value: "", label: "", notes: "" });
        setOpen(false);
        onCreated();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error("Failed to add to watchlist");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add to Watchlist
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Watchlist Item</DialogTitle>
        </DialogHeader>
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
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Adding..." : "Add to Watchlist"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditableHoldingRow({
  holding,
  onUpdate,
  onDelete,
}: {
  holding: PortfolioHolding;
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

  const handleSave = async () => {
    try {
      const res = await fetch("/api/investing/holdings/" + holding.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shares: parseFloat(form.shares),
          avgCostBasis: parseFloat(form.avgCostBasis),
          sector: form.sector || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Updated " + holding.ticker);
        setEditing(false);
        onUpdate();
      } else {
        const json = await res.json();
        toast.error(json.error);
      }
    } catch {
      toast.error("Failed to update holding");
    }
  };

  const fmtMoney = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (editing) {
    return (
      <TableRow>
        <TableCell className="font-mono font-semibold">{holding.ticker}</TableCell>
        <TableCell>{holding.companyName}</TableCell>
        <TableCell>
          <Input type="number" step="0.0001" className="w-24 h-8" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} />
        </TableCell>
        <TableCell>
          <Input type="number" step="0.01" className="w-28 h-8" value={form.avgCostBasis} onChange={(e) => setForm({ ...form, avgCostBasis: e.target.value })} />
        </TableCell>
        <TableCell>{fmtMoney(parseFloat(form.shares) * parseFloat(form.avgCostBasis))}</TableCell>
        <TableCell>
          <Input className="w-28 h-8" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
        </TableCell>
        <TableCell>
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
      <TableCell>{fmtMoney(totalCost)}</TableCell>
      <TableCell>
        {holding.sector && <Badge variant="secondary">{holding.sector}</Badge>}
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

export default function InvestingPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [news, setNews] = useState<MarketNewsArticle[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [newsFilter, setNewsFilter] = useState<string>("all");

  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/holdings");
      const json = await res.json();
      if (res.ok) setHoldings(json.data);
      else toast.error(json.error);
    } catch {
      toast.error("Failed to load holdings");
    } finally {
      setLoadingHoldings(false);
    }
  }, []);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/watchlist");
      const json = await res.json();
      if (res.ok) setWatchlist(json.data);
      else toast.error(json.error);
    } catch {
      toast.error("Failed to load watchlist");
    } finally {
      setLoadingWatchlist(false);
    }
  }, []);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("/api/investing/news?limit=100");
      const json = await res.json();
      if (res.ok) setNews(json.data);
      else toast.error(json.error);
    } catch {
      toast.error("Failed to load news");
    } finally {
      setLoadingNews(false);
    }
  }, []);

  const crawlNews = async () => {
    setCrawling(true);
    try {
      const res = await fetch("/api/investing/crawl-news", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Fetched " + json.data.fetched + " articles, analyzed " + json.data.analyzed);
        fetchNews();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error("Failed to crawl news");
    } finally {
      setCrawling(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
    fetchWatchlist();
    fetchNews();
  }, [fetchHoldings, fetchWatchlist, fetchNews]);

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

  const totalCostBasis = holdings.reduce((sum, h) => sum + parseFloat(h.shares) * parseFloat(h.avgCostBasis), 0);
  const fmtMoney = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalPositions = holdings.length;
  const sectors = Array.from(new Set(holdings.map((h) => h.sector).filter(Boolean)));
  const tickerItems = watchlist.filter((w) => w.type === "ticker");
  const sectorItems = watchlist.filter((w) => w.type === "sector");

  // Filter news
  const filteredNews = newsFilter === "all"
    ? news
    : newsFilter === "bullish" || newsFilter === "bearish" || newsFilter === "neutral"
      ? news.filter((n) => n.aiSentiment === newsFilter)
      : news.filter((n) => n.relatedTickers.includes(newsFilter));

  // Get unique tickers from news for filter dropdown
  const newsTickers = Array.from(new Set(news.flatMap((n) => n.relatedTickers))).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investing</h1>
        <p className="text-muted-foreground">Portfolio holdings, watchlist, and AI-powered market analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Cost Basis</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtMoney(totalCostBasis)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Positions</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalPositions}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Sectors</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{sectors.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Watching</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{watchlist.length}</div>
            <p className="text-xs text-muted-foreground">{tickerItems.length} tickers, {sectorItems.length} sectors</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="portfolio">
        <TabsList>
          <TabsTrigger value="portfolio" className="gap-1.5"><TrendingUp className="h-4 w-4" />Portfolio</TabsTrigger>
          <TabsTrigger value="watchlist" className="gap-1.5"><Eye className="h-4 w-4" />Watchlist</TabsTrigger>
          <TabsTrigger value="news" className="gap-1.5">
            <Newspaper className="h-4 w-4" />News & Insights
            {news.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{news.length}</Badge>}
          </TabsTrigger>
        </TabsList>

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
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((holding) => (
                    <EditableHoldingRow key={holding.id} holding={holding} onUpdate={fetchHoldings} onDelete={deleteHolding} />
                  ))}
                  <TableRow className="font-semibold bg-muted/50">
                    <TableCell colSpan={4}>Total</TableCell>
                    <TableCell>{fmtMoney(totalCostBasis)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

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
                      {tickerItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                          <span className="font-mono font-semibold text-sm">{item.value}</span>
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

        <TabsContent value="news" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Market News</h2>
              <Select value={newsFilter} onValueChange={setNewsFilter}>
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Articles</SelectItem>
                  <SelectItem value="bullish">Bullish</SelectItem>
                  <SelectItem value="bearish">Bearish</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  {newsTickers.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
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
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline leading-tight flex-1"
                          >
                            {article.headline}
                          </a>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>

                        {article.aiSummary && (
                          <p className="text-sm text-muted-foreground mt-1 ml-6">
                            {article.aiSummary}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 ml-6">
                          <div className="flex gap-1">
                            {article.relatedTickers.slice(0, 5).map((t) => (
                              <Badge key={t} variant="outline" className="text-xs font-mono cursor-pointer" onClick={() => setNewsFilter(t)}>
                                {t}
                              </Badge>
                            ))}
                          </div>
                          <SentimentBadge sentiment={article.aiSentiment} />
                          <RelevanceBar score={article.aiRelevanceScore} />
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatTimeAgo(article.publishedAt)}
                          </span>
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
