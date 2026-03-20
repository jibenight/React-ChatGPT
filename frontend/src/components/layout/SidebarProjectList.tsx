import { FolderOpen, ChevronRight } from 'lucide-react';
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
    <button
      type='button'
      onClick={onOpenPanel}
      className='flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-foreground dark:hover:bg-card'
    >
      <FolderOpen className='h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-muted-foreground' />
      <span className='truncate font-semibold'>
        {activeProject?.name || 'Aucun projet sélectionné'}
      </span>
      <ChevronRight className='ml-auto h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-muted-foreground' />
    </button>
  );
}

export default SidebarProjectList;
