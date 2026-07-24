import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, CheckCircle2, XCircle, Send, Wifi } from "lucide-react";
import { format } from "date-fns";

interface SmsLog {
  id: string;
  event: string;
  recipient: string;
  message: string;
  requestId: string | null;
  status: string;
  error: string | null;
  saleId: string | null;
  receiptNumber: string | null;
  createdAt: string;
}

interface SmsStats {
  total: number;
  sent: number;
  failed: number;
}

interface SmsBalance {
  balance: string | null;
}

const eventLabels: Record<string, { label: string; color: string }> = {
  new_sale: { label: "New Sale", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  payment_received: { label: "Payment Received", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  order_delivered: { label: "Order Delivered", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};

export default function SmsPage() {
  const { data: stats, isLoading: loadingStats } = useQuery<SmsStats>({
    queryKey: ["/api/sms/stats"],
  });

  const { data: balance, isLoading: loadingBalance } = useQuery<SmsBalance>({
    queryKey: ["/api/sms/balance"],
    refetchInterval: 60_000,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery<SmsLog[]>({
    queryKey: ["/api/sms/logs"],
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          SMS Logs
        </h1>
        <p className="text-muted-foreground">Track all SMS notifications sent to customers</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <Send className="h-4 w-4" /> Total Sent
            </div>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{stats?.total ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Delivered
            </div>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold text-green-500">{stats?.sent ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <XCircle className="h-4 w-4 text-destructive" /> Failed
            </div>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold text-destructive">{stats?.failed ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <Wifi className="h-4 w-4 text-yellow-500" /> SMS Balance
            </div>
            {loadingBalance ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-3xl font-bold font-mono">
                {balance?.balance != null ? `৳${balance.balance}` : "—"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Message History</span>
            <span className="text-sm font-normal text-muted-foreground">
              {logs.length} record{logs.length !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No SMS messages sent yet.</p>
              <p className="text-sm mt-1">Messages will appear here when sales are created or orders are delivered.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Time</th>
                    <th className="text-left py-2 pr-4 font-medium">Event</th>
                    <th className="text-left py-2 pr-4 font-medium">Recipient</th>
                    <th className="text-left py-2 pr-4 font-medium">Receipt</th>
                    <th className="text-left py-2 pr-4 font-medium">Message</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const ev = eventLabels[log.event] ?? { label: log.event, color: "bg-muted text-muted-foreground" };
                    return (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-muted-foreground">
                          {format(new Date(log.createdAt), "dd MMM yy HH:mm")}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ev.color}`}>
                            {ev.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs">{log.recipient}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                          {log.receiptNumber ?? "—"}
                        </td>
                        <td className="py-3 pr-4 max-w-xs">
                          <p className="truncate text-xs text-muted-foreground" title={log.message}>
                            {log.message}
                          </p>
                          {log.error && (
                            <p className="text-xs text-destructive mt-0.5 truncate" title={log.error}>
                              ⚠ {log.error}
                            </p>
                          )}
                        </td>
                        <td className="py-3">
                          {log.status === "sent" ? (
                            <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/5">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Sent
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
                              <XCircle className="h-3 w-3 mr-1" /> Failed
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
