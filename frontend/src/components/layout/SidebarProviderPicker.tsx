import Aioption from '@/features/chat/AiOption';
import LogOut from '@/features/auth/Logout';
import chatGPT from '@/assets/chatGPT.mp4';
import { useAppStore } from '@/stores/appStore';

interface SidebarProviderPickerProps {
  onClose: () => void;
}

function SidebarProviderPicker({ onClose }: SidebarProviderPickerProps) {
  const profil = useAppStore((s) => s.profil);
  const setProfil = useAppStore((s) => s.setProfil);
  const selectedOption = useAppStore((s) => s.selectedOption);
  const setSelectedOption = useAppStore((s) => s.setSelectedOption);
  const providerAvatar = selectedOption?.avatar || chatGPT;

  return (
    <aside className='flex h-screen w-80 shrink-0 flex-col border-r border-gray-200 bg-white text-gray-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'>
      <div className='flex h-full flex-col'>
        <div className='border-b border-gray-200 px-4 py-4 dark:border-slate-800/70'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='text-[10px] uppercase tracking-[0.26em] text-gray-500 dark:text-slate-400'>
                Fournisseur IA
              </p>
              <h2 className='mt-1 text-base font-semibold text-gray-900 dark:text-slate-100'>
                Choisir le modèle
              </h2>
              <p className='mt-1 text-xs text-gray-500 dark:text-slate-400'>
                Change rapidement selon ton besoin.
              </p>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white'
            >
              Fermer
            </button>
          </div>
          <div className='mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-slate-800 dark:bg-slate-900'>
            <div className='flex items-center gap-2'>
              <video
                src={providerAvatar}
                autoPlay
                muted
                loop
                playsInline
                className='h-8 w-8 rounded-md border border-gray-300 object-cover dark:border-slate-700'
              />
              <div className='min-w-0'>
                <p className='truncate text-xs font-semibold text-gray-900 dark:text-slate-100'>
                  {selectedOption?.name || 'Aucun modèle sélectionné'}
                </p>
                <p className='truncate text-[11px] text-gray-500 dark:text-slate-400'>
                  {selectedOption?.provider || 'openai'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto p-4'>
          <Aioption selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
        </div>

        <div className='border-t border-gray-200 px-4 py-4 dark:border-slate-800/70'>
          <LogOut setProfil={setProfil} profil={profil} />
        </div>
      </div>
    </aside>
  );
}

export default SidebarProviderPicker;
