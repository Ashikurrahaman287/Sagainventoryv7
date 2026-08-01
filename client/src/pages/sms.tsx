import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MessageSquare, CheckCircle2, XCircle, Send, Wifi, RefreshCw, Phone } from "lucide-react";
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

const MAX_SMS = 160;

const eventLabels: Record<string, { label: string; color: string }> = {
  new_sale:        { label: "New Sale",        color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  payment_received:{ label: "Payment Received",color: "bg-green-500/10 text-green-400 border-green-500/20" },
  order_delivered: { label: "Order Delivered", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  manual:          { label: "Manual",          color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
};

export default function SmsPage() {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

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

  const sendMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      const res = await apiRequest("POST", "/api/sms/send", { phone, message });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/balance"] });
      if (data.success) {
        toast({ title: "SMS sent ✅", description: `Message delivered to ${phone}.` });
        setPhone("");
        setMessage("");
      } else {
        toast({ title: "SMS failed ❌", description: data.error ?? "Unknown error", variant: "destructive" });
      }
    },
    onError: (e: any) => {
      toast({ title: "Failed to send SMS", description: e.message, variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      setResendingId(id);
      const res = await apiRequest("POST", `/api/sms/resend/${id}`);
      return res.json();
    },
    onSuccess: (data) => {
      setResendingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/sms/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/stats"] });
      if (data.success) {
        toast({ title: "SMS resent ✅", description: "Message delivered successfully." });
      } else {
        toast({ title: "Resend failed ❌", description: data.error ?? "Unknown error", variant: "destructive" });
      }
    },
    onError: (e: any) => {
      setResendingId(null);
      toast({ title: "Resend failed", description: e.message, variant: "destructive" });
    },
  });

  const remaining = MAX_SMS - message.length;
  const canSend = phone.trim().length >= 8 && message.trim().length > 0 && remaining >= 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          SMS
        </h1>
        <p className="text-muted-foreground">Send messages and track all SMS notifications</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <Send className="h-4 w-4" /> Total Sent
            </div>
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-3xl font-bold">{stats?.total ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Delivered
            </div>
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-3xl font-bold text-green-500">{stats?.sent ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <XCircle className="h-4 w-4 text-destructive" /> Failed
            </div>
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-3xl font-bold text-destructive">{stats?.failed ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <Wifi className="h-4 w-4 text-yellow-500" /> SMS Balance
            </div>
            {loadingBalance ? <Skeleton className="h-8 w-24" /> : (
              <p className="text-3xl font-bold font-mono">
                {balance?.balance != null ? balance.balance : "—"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manual send */}
      <Card className="border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-500">
            <Phone className="h-5 w-5" />
            Send SMS Manually
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                placeholder="e.g. 01712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Message</Label>
                <span className={`text-xs font-mono ${remaining < 0 ? "text-destructive" : remaining < 20 ? "text-yellow-500" : "text-muted-foreground"}`}>
                  {remaining} / {MAX_SMS}
                </span>
              </div>
              <Textarea
                placeholder="Type your message here…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!canSend || sendMutation.isPending}
              onClick={() => sendMutation.mutate({ phone: phone.trim(), message: message.trim() })}
            >
              {sendMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send SMS</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
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
                    const isFailed = log.status === "failed";
                    const isResending = resendingId === log.id;
                    return (
                      <tr key={log.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isFailed ? "bg-destructive/5" : ""}`}>
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
                          <div className="flex items-center gap-2">
                            {isFailed ? (
                              <>
                                <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 shrink-0">
                                  <XCircle className="h-3 w-3 mr-1" /> Failed
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs border-orange-400/50 text-orange-500 hover:bg-orange-500/10"
                                  disabled={isResending || resendMutation.isPending}
                                  onClick={() => resendMutation.mutate(log.id)}
                                >
                                  {isResending ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <><RefreshCw className="h-3 w-3 mr-1" /> Resend</>
                                  )}
                                </Button>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/5">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Sent
                              </Badge>
                            )}
                          </div>
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
