import Aioption from '@/features/chat/AiOption';
import { User } from 'lucide-react';
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
    <aside className='flex h-screen w-80 shrink-0 flex-col border-r border-gray-200 bg-white text-gray-900 dark:border-white/[0.06] dark:bg-sidebar dark:text-foreground'>
      <div className='flex h-full flex-col'>
        <div className='border-b border-gray-200 px-4 py-4 dark:border-white/[0.06]'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='text-[10px] uppercase tracking-[0.26em] text-gray-500 dark:text-muted-foreground'>
                Fournisseur IA
              </p>
              <h2 className='mt-1 text-base font-semibold text-gray-900 dark:text-foreground'>
                Choisir le modèle
              </h2>
              <p className='mt-1 text-xs text-gray-500 dark:text-muted-foreground'>
                Change rapidement selon ton besoin.
              </p>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-border dark:bg-card dark:text-foreground dark:hover:border-border dark:hover:text-foreground'
            >
              Fermer
            </button>
          </div>
          <div className='mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-border dark:bg-card'>
            <div className='flex items-center gap-2'>
              <video
                src={providerAvatar}
                autoPlay
                muted
                loop
                playsInline
                className='h-8 w-8 rounded-md border border-gray-300 object-cover dark:border-border'
              />
              <div className='min-w-0'>
                <p className='truncate text-xs font-semibold text-gray-900 dark:text-foreground'>
                  {selectedOption?.name || 'Aucun modèle sélectionné'}
                </p>
                <p className='truncate text-[11px] text-gray-500 dark:text-muted-foreground'>
                  {selectedOption?.provider || 'openai'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto p-4'>
          <Aioption selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
        </div>

        <div className='border-t border-gray-200 px-4 py-2.5 dark:border-white/[0.06]'>
          <button
            type='button'
            onClick={() => setProfil(!profil)}
            className='flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground'
          >
            <User className='h-4 w-4' />
            Profil
          </button>
        </div>
      </div>
    </aside>
  );
}

export default SidebarProviderPicker;
