"use client";
import type { AssistantMessageUiMeta } from "@/features/chat/chatUxState";
import { cn } from "@/lib/utils";
import { CheckIcon, ReceiptTextIcon } from "lucide-react";

type MessageReceiptProps = {
  meta?: AssistantMessageUiMeta | null;
  className?: string;
};

const formatClock = (value: number) =>
  new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const MessageReceipt = ({ meta, className }: MessageReceiptProps) => {
  if (!meta || meta.status !== "done") return null;
  const finishedAt = meta.finishedAt || meta.startedAt;

  return (
    <div
      className={cn(
        "aui-message-receipt inline-flex min-h-8 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
        className
      )}>
      <ReceiptTextIcon className="size-3.5 shrink-0" />
      <span>Reçu</span>
      <CheckIcon className="size-3.5 shrink-0" />
      <span>Réponse générée à {formatClock(finishedAt)}</span>
      {meta.attempt > 1 && <span>• tentative {meta.attempt}</span>}
    </div>
  );
};
