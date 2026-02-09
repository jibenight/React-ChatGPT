import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { MessageActions } from "@/components/assistant-ui/message-actions";
import { MessageReceipt } from "@/components/assistant-ui/message-receipt";
import { MessageStatus } from "@/components/assistant-ui/message-status";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { useAuiState } from "@assistant-ui/store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";

export const Thread = ({
  draftKey,
  initialDraft,
  searchQuery,
  scrollToIndex,
  onRetryAssistantMessage,
}) => {
  const [draftValue, setDraftValue] = useState(initialDraft || "");
  const viewportRef = useRef(null);

  useEffect(() => {
    if (!draftKey || typeof window === "undefined") return undefined;
    try {
      localStorage.setItem(draftKey, draftValue || "");
    } catch {
      // ignore storage errors
    }
    return undefined;
  }, [draftKey, draftValue]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = event => {
      if (event?.detail?.key !== draftKey) return;
      setDraftValue("");
    };
    window.addEventListener("chat-draft-clear", handler);
    return () => window.removeEventListener("chat-draft-clear", handler);
  }, [draftKey]);

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container flex h-full flex-col bg-background"
      style={{
        ["--thread-max-width"]: "44rem",
      } as CSSProperties}>
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        ref={viewportRef}
        className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-4 pt-4">
        <AuiIf condition={({ thread }) => thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>

        <VirtualizedMessages
          viewportRef={viewportRef}
          scrollToIndex={scrollToIndex}
          components={{
            UserMessage: () => <UserMessage searchQuery={searchQuery} />,
            EditComposer,
            AssistantMessage: () => (
              <AssistantMessage
                searchQuery={searchQuery}
                onRetryAssistantMessage={onRetryAssistantMessage} />
            ),
          }} />

        <ThreadPrimitive.ViewportFooter
          className="aui-thread-viewport-footer sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-3xl pb-4 md:pb-6">
          <ThreadScrollToBottom />
           <Composer draftValue={draftValue} onDraftChange={setDraftValue} />
         </ThreadPrimitive.ViewportFooter>
       </ThreadPrimitive.Viewport>
     </ThreadPrimitive.Root>
  );
};

const VirtualizedMessages = ({ components, viewportRef, scrollToIndex }) => {
  const messagesLength = useAuiState(({ thread }) => thread.messages.length);
  const virtualizer = useVirtualizer({
    count: messagesLength,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 120,
    overscan: 6,
  });

  useEffect(() => {
    if (scrollToIndex === null || scrollToIndex === undefined) return;
    if (scrollToIndex < 0 || scrollToIndex >= messagesLength) return;
    virtualizer.scrollToIndex(scrollToIndex, { align: "center" });
  }, [messagesLength, scrollToIndex, virtualizer]);

  if (messagesLength === 0) return null;

  return (
    <div
      className="relative w-full"
      style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map(item => (
        <div
          key={item.key}
          ref={virtualizer.measureElement}
          data-index={item.index}
          className="absolute left-0 top-0 w-full"
          style={{ transform: `translateY(${item.start}px)` }}>
          <ThreadPrimitive.MessageByIndex
            index={item.index}
            components={components} />
        </div>
      ))}
    </div>
  );
};

const ThreadScrollToBottom = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Aller en bas"
        variant="outline"
        className="aui-thread-scroll-to-bottom absolute -top-12 z-10 size-11 self-center rounded-full disabled:invisible dark:bg-background dark:hover:bg-accent">
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome = () => {
  return (
    <div
      className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col">
      <div
        className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
        <div
          className="aui-thread-welcome-message flex size-full flex-col justify-center px-4">
          <h1
            className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in font-semibold text-2xl duration-200">
            Bonjour
          </h1>
          <p
            className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in text-muted-foreground text-xl delay-75 duration-200">
            Comment puis-je vous aider aujourd'hui ?
          </p>
        </div>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const SUGGESTIONS = [{
  title: "Quelle est la météo",
  label: "à San Francisco ?",
  prompt: "Quelle est la météo à San Francisco ?",
}, {
  title: "Explique les hooks React",
  label: "comme useState et useEffect",
  prompt: "Explique les hooks React comme useState et useEffect",
}];

const ThreadSuggestions = () => {
  return (
    <div
      className="aui-thread-welcome-suggestions grid w-full @md:grid-cols-2 gap-2 pb-4">
      {SUGGESTIONS.map((suggestion, index) => (
        <div
          key={suggestion.prompt}
          className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 @md:nth-[n+3]:block nth-[n+3]:hidden animate-in fill-mode-both duration-200"
          style={{ animationDelay: `${100 + index * 50}ms` }}>
          <ThreadPrimitive.Suggestion prompt={suggestion.prompt} send asChild>
            <Button
              variant="ghost"
              className="aui-thread-welcome-suggestion h-auto w-full @md:flex-col flex-wrap items-start justify-start gap-1 rounded-2xl border px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
              aria-label={suggestion.prompt}>
              <span className="aui-thread-welcome-suggestion-text-1 font-medium">
                {suggestion.title}
              </span>
              <span className="aui-thread-welcome-suggestion-text-2 text-muted-foreground">
                {suggestion.label}
              </span>
            </Button>
          </ThreadPrimitive.Suggestion>
        </div>
      ))}
    </div>
  );
};

const Composer = ({ draftValue, onDraftChange }) => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone
        className="aui-composer-attachment-dropzone flex w-full flex-col rounded-2xl border border-input px-1 pt-2 outline-none transition-shadow has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50">
        <ComposerAttachments />
        <ComposerPrimitive.Input
          placeholder="Écrire un message..."
          className="aui-composer-input mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
          rows={1}
          autoFocus
          value={draftValue}
          onChange={event => onDraftChange?.(event.target.value)}
          aria-label="Zone de message" />
        <ComposerAction />
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction = () => {
  return (
    <div
      className="aui-composer-action-wrapper relative mx-2 mb-2 flex items-center justify-between">
      <ComposerAddAttachment />
      <AuiIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Envoyer"
            side="bottom"
            type="submit"
            variant="default"
            size="icon"
            className="aui-composer-send size-11 rounded-full"
            aria-label="Envoyer le message">
            <ArrowUpIcon className="aui-composer-send-icon size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-cancel size-11 rounded-full"
            aria-label="Arrêter la génération">
            <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root
        className="aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const getMessageText = content => {
  if (!Array.isArray(content)) return "";
  return content
    .filter(part => part?.type === "text" && typeof part.text === "string")
    .map(part => part.text)
    .join("\n");
};

const useSearchMatch = searchQuery => {
  const content = useAuiState(({ message }) => message.content);
  return useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return false;
    const text = getMessageText(content).toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  }, [content, searchQuery]);
};

const AssistantMessage = ({ searchQuery, onRetryAssistantMessage }) => {
  const isMatch = useSearchMatch(searchQuery);
  const messageId = useAuiState(({ message }) => message.id);
  const content = useAuiState(({ message }) => message.content);
  const uiMeta = useAuiState(({ message }) => message.metadata?.ui || null);
  const retryMeta = useAuiState(({ message }) => message.metadata?.retry || null);
  const hasText = getMessageText(content).trim().length > 0;
  const showInlineError =
    !hasText && (uiMeta?.status === "error" || uiMeta?.status === "cancelled");

  return (
    <MessagePrimitive.Root
      className={`aui-assistant-message-root fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-(--thread-max-width) animate-in py-3 duration-150 ${
        isMatch ? "ring-2 ring-teal-400/40 rounded-2xl" : ""
      }`}
      data-role="assistant">
      <div
        className="aui-assistant-message-content wrap-break-word px-2 text-foreground leading-relaxed">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            tools: { Fallback: ToolFallback },
          }} />
        <MessageError />
        {showInlineError && (
          <p
            className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-xs dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {uiMeta?.error || "La génération a été interrompue."}
          </p>
        )}
        <div className="mt-2 ml-0.5 flex flex-wrap items-center gap-2">
          <MessageStatus meta={uiMeta} />
          <MessageReceipt meta={uiMeta} />
        </div>
        <MessageActions
          meta={uiMeta}
          canRetry={Boolean(retryMeta?.canRetry)}
          isRetrying={Boolean(retryMeta?.isRetrying)}
          onRetry={() => onRetryAssistantMessage?.(messageId)} />
      </div>
      <div className="aui-assistant-message-footer mt-1 ml-2 flex">
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="aui-assistant-action-bar-root col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground data-floating:absolute data-floating:rounded-md data-floating:border data-floating:bg-background data-floating:p-1 data-floating:shadow-sm">
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copier">
          <AuiIf condition={({ message }) => message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={({ message }) => !message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Regénérer">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton tooltip="Plus" className="data-[state=open]:bg-accent">
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item
              className="aui-action-bar-more-item flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
              <DownloadIcon className="size-4" />
              Exporter en Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage = ({ searchQuery }) => {
  const isMatch = useSearchMatch(searchQuery);
  return (
    <MessagePrimitive.Root
      className={`aui-user-message-root fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-(--thread-max-width) animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2 ${
        isMatch ? "ring-2 ring-teal-400/40 rounded-2xl" : ""
      }`}
      data-role="user">
      <UserMessageAttachments />
      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div
          className="aui-user-message-content wrap-break-word rounded-2xl bg-muted px-4 py-2.5 text-foreground">
          <MessagePrimitive.Parts />
        </div>
        <div
          className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
          <UserActionBar />
        </div>
      </div>
      <BranchPicker
        className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end">
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Modifier" className="aui-user-action-edit size-11">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer = () => {
  return (
    <MessagePrimitive.Root
      className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root
        className="aui-edit-composer-root ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none"
          autoFocus />
        <div
          className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              Annuler
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">Mettre à jour</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-muted-foreground text-xs",
        className
      )}
      {...rest}>
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Précédent">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Suivant">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
