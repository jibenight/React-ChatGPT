import { useAppStore } from '@/stores/appStore';

function SidebarModeToggle() {
  const projectMode = useAppStore((s) => s.projectMode);
  const setProjectMode = useAppStore((s) => s.setProjectMode);

  return (
    <div className='px-4 pt-3'>
      <div className='rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900'>
        <div className='flex rounded-md bg-white p-1 dark:bg-slate-950'>
          <button
            type='button'
            onClick={() => setProjectMode(true)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              projectMode
                ? 'bg-teal-500/15 text-teal-700 dark:text-teal-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Projet
          </button>
          <button
            type='button'
            onClick={() => setProjectMode(false)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              !projectMode
                ? 'bg-teal-500/15 text-teal-700 dark:text-teal-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Sans projet
          </button>
        </div>
      </div>
    </div>
  );
}

export default SidebarModeToggle;
