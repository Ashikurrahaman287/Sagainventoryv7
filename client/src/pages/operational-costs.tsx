import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertOperationalCostSchema, type OperationalCost, type InsertOperationalCost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign,
  Calendar, Tag, ChevronDown, ChevronUp,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

const CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Marketing",
  "Transport",
  "Maintenance",
  "Office Supplies",
  "Insurance",
  "Miscellaneous",
];

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#6366f1",
  Utilities: "#f59e0b",
  Salaries: "#10b981",
  Marketing: "#3b82f6",
  Transport: "#f97316",
  Maintenance: "#8b5cf6",
  "Office Supplies": "#ec4899",
  Insurance: "#14b8a6",
  Miscellaneous: "#94a3b8",
};

const fmt = (n: number) =>
  "৳" + n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function CostDialog({
  open,
  onClose,
  editItem,
}: {
  open: boolean;
  onClose: () => void;
  editItem?: OperationalCost | null;
}) {
  const { toast } = useToast();
  const form = useForm<InsertOperationalCost>({
    resolver: zodResolver(insertOperationalCostSchema),
    defaultValues: editItem
      ? {
          name: editItem.name,
          category: editItem.category,
          amount: editItem.amount,
          date: editItem.date,
          description: editItem.description ?? "",
        }
      : {
          name: "",
          category: "",
          amount: "",
          date: format(new Date(), "yyyy-MM-dd"),
          description: "",
        },
  });

  const createMut = useMutation({
    mutationFn: (d: InsertOperationalCost) =>
      apiRequest("POST", "/api/operational-costs", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operational-costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/operational-costs/monthly"] });
      toast({ title: "Cost added" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (d: InsertOperationalCost) =>
      apiRequest("PATCH", `/api/operational-costs/${editItem!.id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operational-costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/operational-costs/monthly"] });
      toast({ title: "Cost updated" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const onSubmit = (d: InsertOperationalCost) => {
    if (editItem) updateMut.mutate(d);
    else createMut.mutate(d);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? "Edit Cost" : "Add Operational Cost"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Name</FormLabel>
                  <FormControl>
                    <Input data-testid="input-cost-name" placeholder="e.g. Monthly Rent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-cost-category">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (৳)</FormLabel>
                    <FormControl>
                      <Input data-testid="input-cost-amount" type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input data-testid="input-cost-date" type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      data-testid="textarea-cost-description"
                      placeholder="Additional notes..."
                      rows={2}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-cost">
                {isPending ? "Saving…" : editItem ? "Update" : "Add Cost"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function OperationalCosts() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<OperationalCost | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  const { data: costs = [], isLoading } = useQuery<OperationalCost[]>({
    queryKey: ["/api/operational-costs"],
  });

  const { data: monthlyData = [] } = useQuery<Array<{ month: string; total: number }>>({
    queryKey: ["/api/operational-costs/monthly"],
  });

  const { data: salesMonthly = [] } = useQuery<Array<{ date: string; sales: number; profit: number }>>({
    queryKey: ["/api/dashboard/chart"],
    queryFn: () => fetch("/api/dashboard/chart?days=180").then((r) => r.json()),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/operational-costs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operational-costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/operational-costs/monthly"] });
      toast({ title: "Cost deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const now = new Date();
  const thisMonthStart = startOfMonth(now).toISOString().slice(0, 10);
  const thisMonthEnd = endOfMonth(now).toISOString().slice(0, 10);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1)).toISOString().slice(0, 10);
  const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1)).toISOString().slice(0, 10);
  const yearStart = `${now.getFullYear()}-01-01`;

  const thisMonthTotal = costs
    .filter((c) => c.date >= thisMonthStart && c.date <= thisMonthEnd)
    .reduce((s, c) => s + Number(c.amount), 0);

  const lastMonthTotal = costs
    .filter((c) => c.date >= lastMonthStart && c.date <= lastMonthEnd)
    .reduce((s, c) => s + Number(c.amount), 0);

  const thisYearTotal = costs
    .filter((c) => c.date >= yearStart)
    .reduce((s, c) => s + Number(c.amount), 0);

  const allTimeTotal = costs.reduce((s, c) => s + Number(c.amount), 0);

  const monthGrowth =
    lastMonthTotal > 0
      ? (((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1)
      : null;

  const availableMonths = useMemo(() => {
    const months = new Set(costs.map((c) => c.date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [costs]);

  const filtered = useMemo(() => {
    return costs.filter((c) => {
      if (filterCategory !== "all" && c.category !== filterCategory) return false;
      if (filterMonth !== "all" && !c.date.startsWith(filterMonth)) return false;
      return true;
    });
  }, [costs, filterCategory, filterMonth]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    costs.forEach((c) => {
      map[c.category] = (map[c.category] || 0) + Number(c.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [costs]);

  const openAdd = () => {
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (c: OperationalCost) => {
    setEditItem(c);
    setDialogOpen(true);
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operational Costs</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track and analyse your business operating expenses</p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-cost">
          <Plus className="w-4 h-4 mr-2" /> Add Cost
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">This Month</span>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold" data-testid="stat-this-month">{fmt(thisMonthTotal)}</div>
            {monthGrowth !== null && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${Number(monthGrowth) > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {Number(monthGrowth) > 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {Math.abs(Number(monthGrowth))}% vs last month
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Last Month</span>
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold" data-testid="stat-last-month">{fmt(lastMonthTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">This Year</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold" data-testid="stat-this-year">{fmt(thisYearTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">All Time</span>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold" data-testid="stat-all-time">{fmt(allTimeTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => "৳" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
                  <Tooltip
                    formatter={(v: number) => [fmt(v), "Cost"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                    {categoryBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmt(v)]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Growth Report — monthly cost vs prev */}
      {monthlyData.length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Growth Report — Cost Trend (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => "৳" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
                <Tooltip
                  formatter={(v: number) => [fmt(v), "Monthly Cost"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {monthlyData.map((m, i) => {
                const prev = monthlyData[i - 1];
                const change = prev && prev.total > 0 ? ((m.total - prev.total) / prev.total) * 100 : null;
                return (
                  <div key={m.month} className="bg-muted/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground mb-1">{m.month}</div>
                    <div className="text-sm font-semibold">৳{(m.total / 1000).toFixed(1)}k</div>
                    {change !== null && (
                      <div className={`text-xs ${change > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {change > 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Costs Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">All Cost Entries</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40 h-8 text-xs" data-testid="filter-category">
                  <Tag className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-36 h-8 text-xs" data-testid="filter-month">
                  <Calendar className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map((m) => (
                    <SelectItem key={m} value={m}>
                      {format(parseISO(m + "-01"), "MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {costs.length === 0 ? "No costs recorded yet. Click 'Add Cost' to start." : "No results for the selected filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Description</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors" data-testid={`row-cost-${c.id}`}>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          style={{ borderColor: CATEGORY_COLORS[c.category] + "60", color: CATEGORY_COLORS[c.category] }}
                          className="text-xs"
                        >
                          {c.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{format(parseISO(c.date), "dd MMM yyyy")}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(Number(c.amount))}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">{c.description || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEdit(c)}
                            data-testid={`button-edit-cost-${c.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteMut.mutate(c.id)}
                            data-testid={`button-delete-cost-${c.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/50 bg-muted/20">
                    <td colSpan={3} className="px-4 py-3 text-sm font-medium text-muted-foreground">
                      Total ({filtered.length} entries)
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {fmt(filtered.reduce((s, c) => s + Number(c.amount), 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CostDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null); }}
        editItem={editItem}
      />
    </div>
  );
}
