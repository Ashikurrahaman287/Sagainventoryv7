import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Send, Eye, EyeOff, CheckCircle2, XCircle,
  AlertCircle, Shield, ExternalLink, Settings2, Info, Zap,
} from "lucide-react";

const PROVIDERS = [
  {
    name: "Brevo",
    label: "Brevo (Recommended)",
    logo: "🟦",
    host: "smtp-relay.brevo.com",
    port: "587",
    description: "300 free emails/day. Uses API — no IP restrictions, no app passwords.",
    signupUrl: "https://app.brevo.com/account/register",
    instructions: [
      { step: "1", text: "Sign up free at brevo.com (takes 1 min)" },
      { step: "2", text: 'Go to Account (top right) → "SMTP & API" → click the "API Keys" tab' },
      { step: "3", text: 'Click "Generate a new API key" → give it any name → click Generate' },
      { step: "4", text: "Copy the API key shown (starts with xkeysib-...)" },
      { step: "5", text: "Also go to the Senders & IP → Senders tab and add your email as a verified sender" },
      { step: "6", text: "Enter your Brevo login email + that API key below and click Save" },
    ],
    userLabel: "Your Brevo account email (sender address)",
    passLabel: "Brevo API Key (from API Keys tab)",
    passPlaceholder: "xkeysib-xxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    name: "Gmail",
    label: "Gmail (App Password required)",
    logo: "📧",
    host: "smtp.gmail.com",
    port: "587",
    description: "Use Gmail with a 16-character App Password (requires 2FA enabled).",
    signupUrl: "https://myaccount.google.com/apppasswords",
    instructions: [
      { step: "1", text: "Go to myaccount.google.com → Security → enable 2-Step Verification" },
      { step: "2", text: 'Go to myaccount.google.com/apppasswords → create "Mail" app password' },
      { step: "3", text: "Copy the 16-character password Google generates" },
      { step: "4", text: "Enter your Gmail address + that 16-char password below" },
    ],
    userLabel: "Gmail Address",
    passLabel: "Gmail App Password (16 characters)",
    passPlaceholder: "abcd efgh ijkl mnop",
  },
  {
    name: "Yahoo",
    label: "Yahoo Mail",
    logo: "💜",
    host: "smtp.mail.yahoo.com",
    port: "587",
    description: "Use Yahoo Mail with an App Password.",
    signupUrl: "https://login.yahoo.com/account/security",
    instructions: [
      { step: "1", text: "Go to login.yahoo.com → Account Security" },
      { step: "2", text: 'Click "Generate app password" → select "Other app"' },
      { step: "3", text: "Copy the generated password" },
      { step: "4", text: "Enter your Yahoo address + that password below" },
    ],
    userLabel: "Yahoo Email Address",
    passLabel: "Yahoo App Password",
    passPlaceholder: "xxxxxxxxxxxxxxxx",
  },
  {
    name: "SendGrid",
    label: "SendGrid",
    logo: "🔵",
    host: "smtp.sendgrid.net",
    port: "587",
    description: "100 free emails/day. Enterprise-grade reliability.",
    signupUrl: "https://signup.sendgrid.com",
    instructions: [
      { step: "1", text: "Sign up free at sendgrid.com" },
      { step: "2", text: "Go to Settings → API Keys → Create API Key (Full Access)" },
      { step: "3", text: "Copy the API key" },
      { step: "4", text: 'Enter "apikey" as the username and your API key as the password below' },
    ],
    userLabel: 'SMTP Username (type: apikey)',
    passLabel: "SendGrid API Key",
    passPlaceholder: "SG.xxxxxxxxxxxxxxxxxxxx",
  },
];

export default function EmailSettings() {
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [localSettings, setLocalSettings] = useState<Record<string, string> | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const { data: settings = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const current = localSettings ?? settings;

  const saveMut = useMutation({
    mutationFn: (data: Record<string, string>) => apiRequest("POST", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setLocalSettings(null);
      toast({ title: "Email settings saved!" });
    },
    onError: (e: any) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const testMut = useMutation({
    mutationFn: (to: string) => apiRequest("POST", "/api/email/test", { to }),
    onSuccess: () => toast({ title: "✅ Test email sent! Check your inbox." }),
    onError: (e: any) =>
      toast({ title: "Test failed", description: e.message, variant: "destructive" }),
  });

  const set = (key: string, val: string) =>
    setLocalSettings((prev) => ({ ...(prev ?? settings), [key]: val }));

  const applyProvider = (p: typeof PROVIDERS[0]) => {
    setSelectedProvider(p.name);
    setLocalSettings((prev) => ({
      ...(prev ?? settings),
      emailSmtpHost: p.host,
      emailSmtpPort: p.port,
    }));
  };

  const handleSave = () => {
    saveMut.mutate({
      emailEnabled: current.emailEnabled || "false",
      emailFromName: current.emailFromName || "Undergraduate Hub",
      emailSmtpHost: current.emailSmtpHost || "",
      emailSmtpPort: current.emailSmtpPort || "587",
      emailSmtpUser: current.emailSmtpUser || "",
      emailSmtpPass: current.emailSmtpPass || "",
    });
  };

  const isConfigured = !!(settings.emailSmtpHost && settings.emailSmtpUser && settings.emailSmtpPass);
  const isEnabled = settings.emailEnabled === "true";

  const activeProvider = PROVIDERS.find((p) =>
    settings.emailSmtpHost?.includes(p.host.split(".").slice(-2).join("."))
  );

  const displayProvider =
    selectedProvider
      ? PROVIDERS.find((p) => p.name === selectedProvider)
      : activeProvider;

  if (isLoading) return <div className="flex-1 p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Send automatic order confirmation emails to customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
            </Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
              <AlertCircle className="w-3 h-3 mr-1" /> Not Set Up
            </Badge>
          )}
          {isEnabled && isConfigured && (
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              <Mail className="w-3 h-3 mr-1" /> Active
            </Badge>
          )}
        </div>
      </div>

      {/* How it works */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              When a sale is placed, the customer automatically gets a branded order confirmation email with their receipt number, all items, totals, and payment method.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1 — Pick provider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" /> Step 1 — Pick an Email Provider
          </CardTitle>
          <CardDescription>
            Choose whichever service you already have or is easiest to sign up for. <strong>Brevo is the recommended option</strong> — free, no app-password hassle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROVIDERS.map((p) => {
              const isActive = (selectedProvider ?? activeProvider?.name) === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => applyProvider(p)}
                  data-testid={`button-provider-${p.name.toLowerCase()}`}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border/50 hover:border-border bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{p.logo}</span>
                    <span className="font-semibold text-sm">{p.label}</span>
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 ml-auto" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.description}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — Instructions for selected provider */}
      {displayProvider && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span>{displayProvider.logo}</span> Step 2 — Get Your {displayProvider.name} Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {displayProvider.instructions.map((item) => (
                <li key={item.step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div className="text-sm text-muted-foreground pt-0.5">{item.text}</div>
                </li>
              ))}
            </ol>
            <a
              href={displayProvider.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              Open {displayProvider.name} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Step 3 — Enter Your Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Enable toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <div className="font-medium text-sm">Enable Automatic Emails</div>
              <div className="text-xs text-muted-foreground">Send confirmation emails on every sale</div>
            </div>
            <Switch
              checked={current.emailEnabled === "true"}
              onCheckedChange={(v) => set("emailEnabled", v ? "true" : "false")}
              data-testid="toggle-email-enabled"
            />
          </div>

          {/* Sender name */}
          <div className="space-y-1.5">
            <Label>Sender Name</Label>
            <Input
              placeholder="Undergraduate Hub"
              value={current.emailFromName || ""}
              onChange={(e) => set("emailFromName", e.target.value)}
              data-testid="input-email-from-name"
            />
            <p className="text-xs text-muted-foreground">Shown as the sender name in customers' inboxes.</p>
          </div>

          {/* SMTP Host + Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>SMTP Host</Label>
              <Input
                placeholder="smtp-relay.brevo.com"
                value={current.emailSmtpHost || ""}
                onChange={(e) => set("emailSmtpHost", e.target.value)}
                data-testid="input-smtp-host"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input
                placeholder="587"
                value={current.emailSmtpPort || "587"}
                onChange={(e) => set("emailSmtpPort", e.target.value)}
                data-testid="input-smtp-port"
              />
            </div>
          </div>

          {/* SMTP User */}
          <div className="space-y-1.5">
            <Label>{displayProvider?.userLabel || "SMTP Username / Email"}</Label>
            <Input
              type="email"
              placeholder="yourname@gmail.com"
              value={current.emailSmtpUser || ""}
              onChange={(e) => set("emailSmtpUser", e.target.value)}
              data-testid="input-smtp-user"
            />
          </div>

          {/* SMTP Password */}
          <div className="space-y-1.5">
            <Label>{displayProvider?.passLabel || "SMTP Password / API Key"}</Label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                placeholder={displayProvider?.passPlaceholder || "your password or API key"}
                value={current.emailSmtpPass || ""}
                onChange={(e) => set("emailSmtpPass", e.target.value)}
                className="pr-10 font-mono"
                data-testid="input-smtp-pass"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" /> Stored securely in your database.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saveMut.isPending}
            className="w-full"
            data-testid="button-save-email-settings"
          >
            {saveMut.isPending ? "Saving…" : "Save Email Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Step 4 — Test */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4" /> Step 4 — Send a Test Email
          </CardTitle>
          <CardDescription>Verify everything works before going live.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="test@example.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              data-testid="input-test-email-to"
              className="flex-1"
            />
            <Button
              onClick={() => testMut.mutate(testTo)}
              disabled={testMut.isPending || !testTo || !isConfigured}
              variant="outline"
              data-testid="button-send-test-email"
            >
              {testMut.isPending ? "Sending…" : <><Send className="w-4 h-4 mr-2" />Send Test</>}
            </Button>
          </div>
          {!isConfigured && (
            <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Save your credentials above first.
            </p>
          )}
          {testMut.isSuccess && (
            <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Test email sent! Check your inbox.
            </div>
          )}
          {testMut.isError && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> {(testMut.error as any)?.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email Preview
          </CardTitle>
          <CardDescription>This is how order confirmation emails appear to customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl overflow-hidden border border-border/50 text-sm shadow-sm">
            <div style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)" }} className="px-8 py-7 text-center">
              <div className="text-white font-extrabold text-lg tracking-wide">UNDERGRADUATE HUB</div>
              <div className="text-blue-200 text-xs mt-1 tracking-widest">ORDER CONFIRMATION</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 px-8 py-5 border-b border-blue-100 dark:border-blue-900">
              <div className="font-bold text-blue-900 dark:text-blue-200 text-base">Thank you, Rahima Begum! 🎉</div>
              <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">Your order has been placed successfully.</div>
            </div>
            <div className="bg-white dark:bg-card px-8 py-5">
              <div className="flex justify-between text-xs mb-4">
                <div><div className="text-muted-foreground mb-1">Receipt Number</div><div className="font-bold text-blue-800 dark:text-blue-300 font-mono">RCP-2026-481920</div></div>
                <div className="text-right"><div className="text-muted-foreground mb-1">Date</div><div>16 July 2026</div></div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Items Purchased</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#1e3a8a" }}>
                      <th className="py-2 px-3 text-left text-blue-200 font-semibold">Product</th>
                      <th className="py-2 px-3 text-center text-blue-200 font-semibold">Qty</th>
                      <th className="py-2 px-3 text-right text-blue-200 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-gray-50 dark:bg-muted/30">
                      <td className="py-2 px-3">A4 Copy Paper (500 sheets)</td>
                      <td className="py-2 px-3 text-center">2</td>
                      <td className="py-2 px-3 text-right font-mono">৳700.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Blue Ballpoint Pen (12 pack)</td>
                      <td className="py-2 px-3 text-center">1</td>
                      <td className="py-2 px-3 text-right font-mono">৳120.00</td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex justify-between mt-3 pt-3 border-t-2 border-blue-800">
                  <span className="font-extrabold text-blue-800 dark:text-blue-300">TOTAL</span>
                  <span className="font-extrabold text-blue-800 dark:text-blue-300 font-mono">৳820.00</span>
                </div>
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900 px-8 py-4 text-center">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">✅ Payment Confirmed — Thank you for shopping with us!</div>
            </div>
            <div style={{ background: "#1e3a8a" }} className="px-8 py-4 text-center">
              <div className="text-white text-xs font-bold">Undergraduate Hub</div>
              <div className="text-blue-300 text-xs mt-1">Automated Order Confirmation</div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
