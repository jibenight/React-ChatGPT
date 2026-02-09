"use client";
import type { AssistantMessageUiMeta } from "@/features/chat/chatUxState";
import { Button } from "@/components/ui/button";

type MessageActionsProps = {
  meta?: AssistantMessageUiMeta | null;
  canRetry?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
};

const canRenderRetry = (
  status: AssistantMessageUiMeta["status"] | undefined,
  canRetry: boolean
) => canRetry && (status === "error" || status === "cancelled");

export const MessageActions = ({
  meta,
  canRetry = false,
  isRetrying = false,
  onRetry,
}: MessageActionsProps) => {
  if (!canRenderRetry(meta?.status, canRetry)) return null;

  return (
    <div className="aui-message-actions mt-2 flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 rounded-full px-4 text-xs font-semibold"
        onClick={onRetry}
        disabled={isRetrying}>
        {isRetrying ? "Nouvelle tentative..." : "Réessayer"}
      </Button>
    </div>
  );
};

