"use client";
import type { AssistantMessageUiMeta } from "@/features/chat/chatUxState";
import { cn } from "@/lib/utils";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderIcon,
  PauseCircleIcon,
  SparklesIcon,
} from "lucide-react";

type MessageStatusProps = {
  meta?: AssistantMessageUiMeta | null;
  className?: string;
};

const STATUS_TEXT: Record<AssistantMessageUiMeta["status"], string> = {
  thinking: "Préparation de la réponse",
  streaming: "Réponse en cours",
  done: "Réponse terminée",
  error: "Réponse en erreur",
  cancelled: "Réponse annulée",
};

const STATUS_ICON = {
  thinking: SparklesIcon,
  streaming: LoaderIcon,
  done: CheckCircle2Icon,
  error: AlertCircleIcon,
  cancelled: PauseCircleIcon,
} as const;

const STATUS_CLASS = {
  thinking: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300",
  streaming: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200",
  cancelled: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
} as const;

const formatDuration = (startedAt: number, finishedAt: number | null) => {
  if (!finishedAt || finishedAt <= startedAt) return null;
  const seconds = (finishedAt - startedAt) / 1000;
  const formatter = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  });
  return `${formatter.format(seconds)}s`;
};

export const MessageStatus = ({ meta, className }: MessageStatusProps) => {
  if (!meta) return null;
  const Icon = STATUS_ICON[meta.status];
  const duration = formatDuration(meta.startedAt, meta.finishedAt);
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "aui-message-status inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold",
        STATUS_CLASS[meta.status],
        className
      )}>
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          meta.status === "streaming" && "animate-spin"
        )} />
      <span>{STATUS_TEXT[meta.status]}</span>
      {meta.attempt > 1 && <span>• tentative {meta.attempt}</span>}
      {duration && <span>• {duration}</span>}
    </div>
  );
};

