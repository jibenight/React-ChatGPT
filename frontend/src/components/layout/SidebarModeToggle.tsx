import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';

function SidebarModeToggle() {
  const { t } = useTranslation();
  const projectMode = useAppStore((s) => s.projectMode);
  const setProjectMode = useAppStore((s) => s.setProjectMode);

  return (
    <div className='flex gap-1 px-4 pt-2'>
      <button
        type='button'
        onClick={() => setProjectMode(true)}
        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          projectMode
            ? 'bg-teal-500/15 text-teal-700 dark:text-teal-100'
            : 'text-gray-500 hover:text-gray-700 dark:text-muted-foreground dark:hover:text-foreground'
        }`}
      >
        {t('projects:projectMode')}
      </button>
      <button
        type='button'
        onClick={() => setProjectMode(false)}
        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          !projectMode
            ? 'bg-teal-500/15 text-teal-700 dark:text-teal-100'
            : 'text-gray-500 hover:text-gray-700 dark:text-muted-foreground dark:hover:text-foreground'
        }`}
      >
        {t('projects:freeMode')}
      </button>
    </div>
  );
}

export default SidebarModeToggle;
