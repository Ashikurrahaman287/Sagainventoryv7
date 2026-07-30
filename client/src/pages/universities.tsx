import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, TrendingUp, Users, ShoppingBag, Search, ArrowUpDown } from "lucide-react";
import { DHAKA_UNIVERSITIES } from "@/lib/universities";

interface UniversityStat {
  university: string;
  salesCount: number;
  revenue: number;
  uniqueCustomers: number;
}

const fmt = (v: number) =>
  "৳" + v.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type SortKey = "revenue" | "salesCount" | "uniqueCustomers" | "university";

export default function Universities() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: stats = [], isLoading } = useQuery<UniversityStat[]>({
    queryKey: ["/api/universities/stats"],
    queryFn: async () => {
      const res = await fetch("/api/universities/stats");
      if (!res.ok) throw new Error("Failed to load university stats");
      return res.json();
    },
  });

  // Build a set for quick look-up of universities that have sales
  const hasSalesSet = new Set(stats.map((s) => s.university));

  // Merge: universities with stats + all known Dhaka universities (with zero stats)
  const allRows: UniversityStat[] = [
    ...stats,
    ...DHAKA_UNIVERSITIES
      .filter((u) => !hasSalesSet.has(u.value))
      .map((u) => ({ university: u.value, salesCount: 0, revenue: 0, uniqueCustomers: 0 })),
  ];

  const filtered = allRows.filter((r) =>
    r.university.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "university") {
      cmp = a.university.localeCompare(b.university);
    } else {
      cmp = a[sortKey] - b[sortKey];
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const totalRevenue = stats.reduce((s, r) => s + r.revenue, 0);
  const totalSales = stats.reduce((s, r) => s + r.salesCount, 0);
  const totalCustomers = stats.reduce((s, r) => s + r.uniqueCustomers, 0);
  const activeUnis = stats.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="h-8 w-8" />
          Universities
        </h1>
        <p className="text-muted-foreground">Sales and customer breakdown by university</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Universities", value: activeUnis, icon: GraduationCap, color: "blue" },
          { label: "Total Revenue", value: fmt(totalRevenue), icon: TrendingUp, color: "green" },
          { label: "Total Orders", value: totalSales, icon: ShoppingBag, color: "orange" },
          { label: "Unique Students", value: totalCustomers, icon: Users, color: "purple" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg`}>
                  <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <CardTitle className="text-base">All Dhaka Universities</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search university…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 w-56 text-sm"
                />
              </div>
              <Select
                value={sortKey}
                onValueChange={(v) => { setSortKey(v as SortKey); setSortDir("desc"); }}
              >
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Sort: Revenue</SelectItem>
                  <SelectItem value="salesCount">Sort: Orders</SelectItem>
                  <SelectItem value="uniqueCustomers">Sort: Students</SelectItem>
                  <SelectItem value="university">Sort: Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleSort("university")}
                    >
                      University <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">
                    <button
                      className="flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                      onClick={() => toggleSort("salesCount")}
                    >
                      Orders <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">
                    <button
                      className="flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                      onClick={() => toggleSort("uniqueCustomers")}
                    >
                      Students <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                      onClick={() => toggleSort("revenue")}
                    >
                      Revenue <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No universities match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((row, idx) => {
                    const uniMeta = DHAKA_UNIVERSITIES.find((u) => u.value === row.university);
                    const isActive = row.salesCount > 0;
                    return (
                      <TableRow key={row.university} className={!isActive ? "opacity-50" : ""}>
                        <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium leading-tight">{row.university}</p>
                            {uniMeta?.shortName && (
                              <p className="text-xs text-muted-foreground">{uniMeta.shortName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {row.salesCount > 0 ? (
                            <span className="font-semibold">{row.salesCount}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {row.uniqueCustomers > 0 ? (
                            <span className="font-semibold">{row.uniqueCustomers}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {row.revenue > 0 ? fmt(row.revenue) : <span className="text-muted-foreground font-normal">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isActive ? "success" : "outline"}
                            className="text-xs"
                          >
                            {isActive ? "Active" : "No sales"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
