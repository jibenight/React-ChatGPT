import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Une erreur a été capturée :', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='flex min-h-screen items-center justify-center bg-white dark:bg-zinc-900 p-6'>
          <div className='max-w-md w-full text-center space-y-6'>
            <div className='text-5xl text-red-500 dark:text-red-400'>&#9888;</div>
            <h1 className='text-2xl font-semibold text-zinc-900 dark:text-zinc-100'>
              Une erreur inattendue est survenue
            </h1>
            <p className='text-zinc-600 dark:text-zinc-400'>
              L&apos;application a rencontré un problème. Veuillez recharger la
              page pour réessayer.
            </p>
            {this.state.error && (
              <details className='text-left text-sm text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4'>
                <summary className='cursor-pointer font-medium text-zinc-700 dark:text-zinc-300'>
                  Détails de l&apos;erreur
                </summary>
                <pre className='mt-2 whitespace-pre-wrap break-words'>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReload}
              className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900'
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
