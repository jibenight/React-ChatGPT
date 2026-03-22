import { useTranslation } from 'react-i18next';
import { usePlanStore } from '@/stores/planStore';

export function usePlanLimits() {
  const { t } = useTranslation();
  const { limits, subscription, openUpgrade } = usePlanStore();

  const messagesRemaining: number | null = (() => {
    if (!limits?.messagesPerDay) return null;
    const used = subscription?.messagesUsedToday ?? 0;
    return Math.max(0, limits.messagesPerDay - used);
  })();

  const canSendMessage = messagesRemaining === null || messagesRemaining > 0;

  const canCreateProject = (() => {
    if (!limits?.projectsMax) return true;
    return (subscription?.projectsCount ?? 0) < limits.projectsMax;
  })();

  const canCreateThread = (() => {
    if (!limits?.threadsMax) return true;
    return (subscription?.threadsCount ?? 0) < limits.threadsMax;
  })();

  const canUseProvider = (provider: string): boolean => {
    if (!limits?.providers) return true;
    return limits.providers.includes(provider);
  };

  const canCollaborate = limits?.collaborate ?? false;

  const checkAndPrompt = (feature: string): boolean => {
    if (feature === 'message' && !canSendMessage) {
      openUpgrade(
        t('billing:messageLimitReached', {
          count: limits?.messagesPerDay ?? 0,
        }),
      );
      return false;
    }
    if (feature === 'project' && !canCreateProject) {
      openUpgrade(
        t('billing:projectLimitReached', {
          count: limits?.projectsMax ?? 0,
        }),
      );
      return false;
    }
    if (feature === 'thread' && !canCreateThread) {
      openUpgrade(
        t('billing:threadLimitReached', {
          count: limits?.threadsMax ?? 0,
        }),
      );
      return false;
    }
    return true;
  };

  return {
    canSendMessage,
    canCreateProject,
    canCreateThread,
    canUseProvider,
    canCollaborate,
    messagesRemaining,
    checkAndPrompt,
  };
}
