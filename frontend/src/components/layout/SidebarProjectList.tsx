import { useAppStore } from '@/stores/appStore';

interface SidebarProjectListProps {
  activeProject: any;
  onOpenPanel: () => void;
}

function SidebarProjectList({
  activeProject,
  onOpenPanel,
}: SidebarProjectListProps) {
  const projectMode = useAppStore((s) => s.projectMode);

  if (!projectMode) return null;

  return (
    <div className='shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'>
      <div className='flex items-center justify-between'>
        <p className='text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500'>
          Projet actif
        </p>
        <button
          type='button'
          onClick={onOpenPanel}
          className='rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white'
        >
          Gérer
        </button>
      </div>
      <p className='mt-2 truncate text-sm font-semibold text-gray-900 dark:text-slate-100'>
        {activeProject?.name || 'Aucun projet sélectionné'}
      </p>
    </div>
  );
}

export default SidebarProjectList;
