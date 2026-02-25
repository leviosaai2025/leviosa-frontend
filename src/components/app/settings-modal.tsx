"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  DollarSign,
  Info,
  Loader2,
  MessageSquareText,
  PlugZap,
  Save,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { clamp, cn } from "@/lib/utils";
import { automationApi, naverApi, talktalkApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-client";
import type {
  AutomationConfigResponse,
  NaverConnectionStatus,
  TalkTalkStatus,
} from "@/types/api";

type SectionId = "naver" | "talktalk" | "automation" | "ai-config" | "pricing";

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode; helpUrl: string; helpText: string }[] = [
  { id: "naver", label: "Naver API", icon: <PlugZap className="size-4" />, helpUrl: "https://leviosa.notion.site/naver-api-setup", helpText: "How to get your Naver Commerce API credentials and connect your store." },
  {
    id: "talktalk",
    label: "TalkTalk",
    icon: <MessageSquareText className="size-4" />,
    helpUrl: "https://leviosa.notion.site/talktalk-setup",
    helpText: "How to set up TalkTalk real-time messaging and get your token.",
  },
  { id: "automation", label: "Automation", icon: <Zap className="size-4" />, helpUrl: "https://leviosa.notion.site/automation-setup", helpText: "How automation works: polling, confidence thresholds, and auto-posting." },
  {
    id: "ai-config",
    label: "AI Config",
    icon: <Sparkles className="size-4" />,
    helpUrl: "https://leviosa.notion.site/ai-config-setup",
    helpText: "How to configure AI responses with your policy text and FAQ data.",
  },
  {
    id: "pricing",
    label: "Pricing",
    icon: <DollarSign className="size-4" />,
    helpUrl: "https://leviosa.notion.site/pricing-setup",
    helpText: "How the pricing formula works and how to set fee and margin rates.",
  },
];

// ---------- Help Tooltip ----------

function HelpBadge({ helpUrl, helpText }: { helpUrl: string; helpText: string }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="flex size-6 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-600 hover:bg-neutral-50"
      >
        <Info className="size-3.5" />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 pt-1.5 z-50"
          >
            <div className="w-56 rounded-xl border border-neutral-100 bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,.12)]">
              <p className="text-xs text-neutral-500 leading-relaxed">{helpText}</p>
              <a
                href={helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Learn more
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ConnectForm {
  naver_client_id: string;
  client_secret: string;
  store_id: string;
}

// ---------- Shared styled primitives ----------

const inputCn =
  "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:ring-0";

const inputSmCn =
  "w-20 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-foreground text-right outline-none transition-colors focus:border-neutral-400 focus:bg-white";

function StyledButton({
  children,
  onClick,
  type = "button",
  disabled,
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "primary" | "danger" | "ghost";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:pointer-events-none",
        variant === "primary" &&
          "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.98]",
        variant === "danger" &&
          "bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 active:scale-[0.98]",
        variant === "ghost" &&
          "bg-neutral-100 text-foreground hover:bg-neutral-200 active:scale-[0.98]",
        className
      )}
    >
      {children}
    </button>
  );
}

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        connected
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-neutral-100 text-neutral-500 border border-neutral-200"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          connected ? "bg-emerald-500" : "bg-neutral-400"
        )}
      />
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}

// ---------- Setting Row ----------

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-neutral-100 last:border-b-0">
      <div className="pr-4 min-w-0">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ---------- Section: Naver ----------

function NaverSection({
  loading,
  naverStatus,
  onStatusChange,
}: {
  loading: boolean;
  naverStatus: NaverConnectionStatus | null;
  onStatusChange: (status: NaverConnectionStatus) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectForm, setConnectForm] = useState<ConnectForm>({
    naver_client_id: "",
    client_secret: "",
    store_id: "",
  });

  const handleConnect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !connectForm.naver_client_id.trim() ||
      !connectForm.client_secret.trim() ||
      !connectForm.store_id.trim()
    ) {
      toast.error("All Naver credentials are required.");
      return;
    }
    try {
      setConnecting(true);
      const response = await naverApi.connect({
        naver_client_id: connectForm.naver_client_id.trim(),
        client_secret: connectForm.client_secret.trim(),
        store_id: connectForm.store_id.trim(),
      });
      onStatusChange({
        is_connected: response.data.is_connected,
        naver_client_id: response.data.naver_client_id,
        store_id: response.data.store_id,
      });
      setConnectForm({ naver_client_id: "", client_secret: "", store_id: "" });
      toast.success("Naver account connected.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await naverApi.disconnect();
      onStatusChange({
        is_connected: false,
        naver_client_id: null,
        store_id: null,
      });
      toast.success("Naver account disconnected.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 pt-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  if (naverStatus?.is_connected) {
    return (
      <>
        <SettingRow label="Status">
          <StatusPill connected />
        </SettingRow>
        <SettingRow label="Client ID">
          <code className="text-xs text-neutral-500 bg-neutral-50 rounded px-2 py-1">
            {naverStatus.naver_client_id}
          </code>
        </SettingRow>
        <SettingRow label="Store ID">
          <code className="text-xs text-neutral-500 bg-neutral-50 rounded px-2 py-1">
            {naverStatus.store_id}
          </code>
        </SettingRow>
        <div className="pt-5">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <StyledButton variant="danger" disabled={disconnecting}>
                {disconnecting && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Disconnect
              </StyledButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Naver account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will stop all automation and posting flows until you
                  reconnect.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect}>
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </>
    );
  }

  return (
    <form className="space-y-4 pt-2" onSubmit={handleConnect}>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500">
          Naver Client ID
        </label>
        <input
          className={inputCn}
          value={connectForm.naver_client_id}
          onChange={(e) =>
            setConnectForm((c) => ({ ...c, naver_client_id: e.target.value }))
          }
          placeholder="Enter client ID"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500">
          Client Secret
        </label>
        <input
          type="password"
          className={inputCn}
          value={connectForm.client_secret}
          onChange={(e) =>
            setConnectForm((c) => ({ ...c, client_secret: e.target.value }))
          }
          placeholder="Enter client secret"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500">
          Store ID
        </label>
        <input
          className={inputCn}
          value={connectForm.store_id}
          onChange={(e) =>
            setConnectForm((c) => ({ ...c, store_id: e.target.value }))
          }
          placeholder="Enter store ID"
        />
      </div>
      <StyledButton type="submit" disabled={connecting}>
        {connecting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <PlugZap className="size-3.5" />
        )}
        Connect
      </StyledButton>
    </form>
  );
}

// ---------- Section: TalkTalk ----------

function TalkTalkSection({
  loading,
  naverConnected,
  talktalkStatus,
  onStatusChange,
}: {
  loading: boolean;
  naverConnected: boolean;
  talktalkStatus: TalkTalkStatus | null;
  onStatusChange: (status: TalkTalkStatus) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);

  const handleConnect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token.trim()) {
      toast.error("TalkTalk token is required.");
      return;
    }
    try {
      setConnecting(true);
      const response = await talktalkApi.connect({
        talktalk_token: token.trim(),
      });
      onStatusChange({
        talktalk_enabled: response.data.talktalk_enabled,
        webhook_url: response.data.webhook_url,
      });
      setToken("");
      toast.success("TalkTalk connected.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await talktalkApi.disconnect();
      onStatusChange({ talktalk_enabled: false, webhook_url: null });
      toast.success("TalkTalk disconnected.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied.");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-5 pt-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  if (!naverConnected) {
    return (
      <div className="pt-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            Naver connection required
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            Connect your Naver Commerce account first before enabling TalkTalk.
          </p>
        </div>
      </div>
    );
  }

  if (talktalkStatus?.talktalk_enabled) {
    return (
      <>
        <SettingRow label="Status">
          <StatusPill connected />
        </SettingRow>
        {talktalkStatus.webhook_url && (
          <SettingRow label="Webhook URL">
            <div className="flex items-center gap-1.5">
              <code className="max-w-[240px] truncate text-xs text-neutral-500 bg-neutral-50 rounded px-2 py-1">
                {talktalkStatus.webhook_url}
              </code>
              <button
                onClick={() => handleCopy(talktalkStatus.webhook_url!)}
                className="flex size-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </SettingRow>
        )}
        <div className="pt-5">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <StyledButton variant="danger" disabled={disconnecting}>
                {disconnecting && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Disconnect
              </StyledButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect TalkTalk?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will stop receiving TalkTalk messages and disable
                  auto-responses.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect}>
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </>
    );
  }

  return (
    <form className="space-y-4 pt-2" onSubmit={handleConnect}>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500">
          TalkTalk Token
        </label>
        <input
          type="password"
          className={inputCn}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter TalkTalk token"
        />
      </div>
      <StyledButton type="submit" disabled={connecting}>
        {connecting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <PlugZap className="size-3.5" />
        )}
        Connect
      </StyledButton>
    </form>
  );
}

// ---------- Toggle Switch ----------

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-neutral-900" : "bg-neutral-200"
      )}
    >
      <span
        className={cn(
          "inline-block size-4.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}

// ---------- Slider ----------

function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-neutral-900"
      style={{
        background: `linear-gradient(to right, #171717 0%, #171717 ${pct}%, #e5e5e5 ${pct}%, #e5e5e5 100%)`,
      }}
    />
  );
}

// ---------- Section: Automation ----------

function AutomationSection({
  loading,
  config,
  onConfigChange,
  onToggle,
  onSave,
  savingConfig,
  togglingAutomation,
}: {
  loading: boolean;
  config: AutomationConfigResponse | null;
  onConfigChange: (
    updater: (
      c: AutomationConfigResponse | null
    ) => AutomationConfigResponse | null
  ) => void;
  onToggle: (enabled: boolean) => void;
  onSave: () => void;
  savingConfig: boolean;
  togglingAutomation: boolean;
}) {
  if (loading || !config) {
    return (
      <div className="space-y-5 pt-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <>
      <SettingRow label="Automation" description="Master switch">
        <Toggle
          checked={config.is_enabled}
          onChange={onToggle}
          disabled={togglingAutomation}
        />
      </SettingRow>
      <SettingRow
        label="Auto-post"
        description="Post high-confidence replies automatically"
      >
        <Toggle
          checked={config.auto_post_enabled}
          onChange={(v) =>
            onConfigChange((c) => (c ? { ...c, auto_post_enabled: v } : c))
          }
        />
      </SettingRow>
      <SettingRow
        label="Test mode"
        description="Process inquiries but don't post"
      >
        <Toggle
          checked={config.test_mode}
          onChange={(v) =>
            onConfigChange((c) => (c ? { ...c, test_mode: v } : c))
          }
        />
      </SettingRow>

      {config.test_mode && (
        <div className="py-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium text-amber-800">
              Test mode is enabled
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Automation processes inquiries, but posting to Naver is disabled.
            </p>
          </div>
        </div>
      )}

      <SettingRow
        label="Confidence threshold"
        description={`${Math.round(config.confidence_threshold * 100)}%`}
      >
        <div className="w-36">
          <RangeSlider
            value={config.confidence_threshold}
            onChange={(v) =>
              onConfigChange((c) =>
                c ? { ...c, confidence_threshold: v } : c
              )
            }
          />
        </div>
      </SettingRow>
      <SettingRow label="Poll interval" description="Minutes between checks">
        <input
          type="number"
          min={1}
          max={60}
          value={config.poll_interval_minutes}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (Number.isNaN(parsed)) return;
            onConfigChange((c) =>
              c ? { ...c, poll_interval_minutes: clamp(parsed, 1, 60) } : c
            );
          }}
          className={inputSmCn}
        />
      </SettingRow>
      <SettingRow label="Max auto posts" description="Per cycle">
        <input
          type="number"
          min={1}
          max={100}
          value={config.max_auto_posts_per_cycle}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (Number.isNaN(parsed)) return;
            onConfigChange((c) =>
              c
                ? { ...c, max_auto_posts_per_cycle: clamp(parsed, 1, 100) }
                : c
            );
          }}
          className={inputSmCn}
        />
      </SettingRow>

      <div className="pt-5">
        <StyledButton onClick={onSave} disabled={savingConfig}>
          {savingConfig ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save Changes
        </StyledButton>
      </div>
    </>
  );
}

// ---------- Section: AI Config ----------

function AIConfigSection({
  loading,
  config,
  onConfigChange,
  onSave,
  savingConfig,
}: {
  loading: boolean;
  config: AutomationConfigResponse | null;
  onConfigChange: (
    updater: (
      c: AutomationConfigResponse | null
    ) => AutomationConfigResponse | null
  ) => void;
  onSave: () => void;
  savingConfig: boolean;
}) {
  if (loading || !config) {
    return (
      <div className="space-y-5 pt-2">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <>
      <div className="py-4 border-b border-neutral-100">
        <label className="text-[13px] font-medium text-foreground">
          Policy text
        </label>
        <p className="text-xs text-neutral-400 mt-0.5 mb-2.5">
          Return/refund/shipping policy that guides AI answers.
        </p>
        <textarea
          value={config.policy_text ?? ""}
          onChange={(e) =>
            onConfigChange((c) =>
              c ? { ...c, policy_text: e.target.value || null } : c
            )
          }
          placeholder="Return/refund/shipping policy..."
          className={cn(inputCn, "min-h-28 resize-none")}
        />
      </div>
      <div className="py-4">
        <label className="text-[13px] font-medium text-foreground">
          FAQ JSON
        </label>
        <p className="text-xs text-neutral-400 mt-0.5 mb-2.5">
          JSON array with keys &quot;q&quot; and &quot;a&quot;.
        </p>
        <textarea
          value={config.faq_json ?? ""}
          onChange={(e) =>
            onConfigChange((c) =>
              c ? { ...c, faq_json: e.target.value || null } : c
            )
          }
          placeholder='[{"q":"How long is shipping?","a":"2-3 business days"}]'
          className={cn(inputCn, "min-h-28 resize-none font-mono text-xs")}
        />
      </div>
      <div className="pt-2">
        <StyledButton onClick={onSave} disabled={savingConfig}>
          {savingConfig ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save Changes
        </StyledButton>
      </div>
    </>
  );
}

// ---------- Section: Pricing ----------

function PricingSection({
  config,
  onConfigChange,
}: {
  config: AutomationConfigResponse | null;
  onConfigChange: (
    updater: (
      c: AutomationConfigResponse | null
    ) => AutomationConfigResponse | null
  ) => void;
}) {
  // Local state so inputs always render even if API fails
  const [feeRate, setFeeRate] = useState(5.0);
  const [marginRate, setMarginRate] = useState(5.0);
  const [saving, setSaving] = useState(false);

  // Sync from loaded config
  useEffect(() => {
    if (config) {
      setFeeRate(config.naver_fee_rate);
      setMarginRate(config.min_margin_rate);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await automationApi.updateConfig({
        naver_fee_rate: feeRate,
        min_margin_rate: marginRate,
      });
      onConfigChange(() => response.data);
      toast.success("Pricing settings updated.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="py-4 border-b border-neutral-100">
        <p className="text-xs text-neutral-400">
          Selling price = source price / (1 - fee% - margin%)
        </p>
      </div>
      <SettingRow label="Naver Fee Rate" description="Platform fee percentage">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={feeRate}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) setFeeRate(clamp(parsed, 0, 100));
            }}
            className={inputSmCn}
          />
          <span className="text-xs text-neutral-400">%</span>
        </div>
      </SettingRow>
      <SettingRow label="Minimum Margin" description="Target profit margin">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={marginRate}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) setMarginRate(clamp(parsed, 0, 100));
            }}
            className={inputSmCn}
          />
          <span className="text-xs text-neutral-400">%</span>
        </div>
      </SettingRow>
      {feeRate + marginRate >= 100 && (
        <div className="py-3">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-medium text-red-700">
              Fee + Margin must be less than 100%
            </p>
          </div>
        </div>
      )}
      <div className="pt-5">
        <StyledButton onClick={handleSave} disabled={saving || feeRate + marginRate >= 100}>
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save Changes
        </StyledButton>
      </div>
    </>
  );
}

// ---------- Main Modal ----------

export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [section, setSection] = useState<SectionId>("naver");

  const [naverStatus, setNaverStatus] =
    useState<NaverConnectionStatus | null>(null);
  const [talktalkStatus, setTalktalkStatus] = useState<TalkTalkStatus | null>(
    null
  );
  const [automationConfig, setAutomationConfig] =
    useState<AutomationConfigResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [togglingAutomation, setTogglingAutomation] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [naverRes, autoRes, ttRes] = await Promise.all([
        naverApi.status(),
        automationApi.getConfig(),
        talktalkApi.status(),
      ]);
      setNaverStatus(naverRes.data);
      setAutomationConfig(autoRes.data);
      setTalktalkStatus(ttRes.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadSettings();
  }, [open, loadSettings]);

  const handleAutomationToggle = useCallback(async (isEnabled: boolean) => {
    if (!automationConfig) return;
    try {
      setTogglingAutomation(true);
      const response = await automationApi.toggle({ is_enabled: isEnabled });
      setAutomationConfig(response.data);
      toast.success(isEnabled ? "Automation enabled." : "Automation disabled.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setTogglingAutomation(false);
    }
  }, [automationConfig]);

  const handleConfigSave = useCallback(async () => {
    if (!automationConfig) return;
    try {
      setSavingConfig(true);
      const response = await automationApi.updateConfig({
        auto_post_enabled: automationConfig.auto_post_enabled,
        confidence_threshold: automationConfig.confidence_threshold,
        poll_interval_minutes: automationConfig.poll_interval_minutes,
        max_auto_posts_per_cycle: automationConfig.max_auto_posts_per_cycle,
        policy_text: automationConfig.policy_text,
        faq_json: automationConfig.faq_json,
        test_mode: automationConfig.test_mode,
      });
      setAutomationConfig(response.data);
      toast.success("Configuration updated.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingConfig(false);
    }
  }, [automationConfig]);

  const currentSection = SECTIONS.find((s) => s.id === section);
  const sectionTitle = currentSection?.label ?? "";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30"
            onClick={() => onOpenChange(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) =>
              e.target === e.currentTarget && onOpenChange(false)
            }
          >
            <div className="flex w-full max-w-[720px] h-[min(560px,85vh)] rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,.16)] overflow-hidden">
              {/* Left sidebar */}
              <div className="w-48 flex-shrink-0 border-r border-neutral-100 p-3 flex flex-col bg-neutral-50/50">
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-foreground mb-3"
                >
                  <X className="size-4" />
                </button>

                <nav className="flex flex-col gap-0.5">
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSection(s.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors text-left",
                        section === s.id
                          ? "bg-white text-foreground font-semibold shadow-[0_1px_3px_rgba(0,0,0,.08)]"
                          : "text-neutral-500 hover:bg-white/60 hover:text-foreground"
                      )}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Right content */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-shrink-0 px-6 pt-6 pb-1 border-b border-neutral-100">
                  <div className="flex items-center gap-2 pb-3">
                    <h2 className="text-base font-semibold tracking-tight">
                      {sectionTitle}
                    </h2>
                    {currentSection && (
                      <HelpBadge helpUrl={currentSection.helpUrl} helpText={currentSection.helpText} />
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  {section === "naver" && (
                    <NaverSection
                      loading={loading}
                      naverStatus={naverStatus}
                      onStatusChange={setNaverStatus}
                    />
                  )}
                  {section === "talktalk" && (
                    <TalkTalkSection
                      loading={loading}
                      naverConnected={naverStatus?.is_connected ?? false}
                      talktalkStatus={talktalkStatus}
                      onStatusChange={setTalktalkStatus}
                    />
                  )}
                  {section === "automation" && (
                    <AutomationSection
                      loading={loading}
                      config={automationConfig}
                      onConfigChange={setAutomationConfig}
                      onToggle={handleAutomationToggle}
                      onSave={handleConfigSave}
                      savingConfig={savingConfig}
                      togglingAutomation={togglingAutomation}
                    />
                  )}
                  {section === "ai-config" && (
                    <AIConfigSection
                      loading={loading}
                      config={automationConfig}
                      onConfigChange={setAutomationConfig}
                      onSave={handleConfigSave}
                      savingConfig={savingConfig}
                    />
                  )}
                  {section === "pricing" && (
                    <PricingSection
                      config={automationConfig}
                      onConfigChange={setAutomationConfig}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
