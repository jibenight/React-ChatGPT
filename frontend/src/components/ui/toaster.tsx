import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position='top-right'
      toastOptions={{
        className:
          'border border-gray-200 bg-white text-gray-800 shadow-lg dark:border-border dark:bg-card dark:text-foreground',
      }}
      richColors
      closeButton
    />
  );
}
