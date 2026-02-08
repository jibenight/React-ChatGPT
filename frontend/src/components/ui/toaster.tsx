import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position='top-right'
      toastOptions={{
        className:
          'border border-gray-200 bg-white text-gray-800 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
      }}
      richColors
      closeButton
    />
  );
}
