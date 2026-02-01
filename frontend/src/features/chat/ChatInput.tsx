import { useForm } from 'react-hook-form';
import upload from '../../assets/telecharger.png';
import navigation from '../../assets/navigation.png';
import microphone from '../../assets/microphone.png';

function ChatInput({ onSend, loading }) {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm();

  const onSubmit = data => {
    if (onSend) {
      onSend(data.message || '');
      reset({ message: '' });
    }
  };

  return (
    <div className='sticky bottom-0 w-full bg-gradient-to-t from-white via-white/95 to-transparent dark:from-slate-950 dark:via-slate-950/95'>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className='mx-auto w-full max-w-4xl px-4 pb-6 pt-3'
      >
        <div className='flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-lg focus-within:ring-2 focus-within:ring-teal-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:focus-within:ring-teal-400/30'>
          <button type='button' disabled className='p-2'>
            <img src={upload} alt='' className='h-5 w-5 opacity-50' />
          </button>

          <input
            type='text'
            placeholder='Écrire un message...'
            className='flex-1 bg-transparent px-2 py-2 text-sm text-gray-700 placeholder:text-gray-400 outline-none dark:text-slate-100 dark:placeholder:text-slate-500'
            {...register('message')}
            required
            disabled={loading}
          />

          <button type='button' disabled className='p-2'>
            <img src={microphone} alt='' className='h-5 w-5 opacity-50' />
          </button>
          <button
            type='submit'
            className='flex items-center justify-center rounded-xl bg-teal-500 px-4 py-2 text-white shadow-sm transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={loading}
          >
            <img src={navigation} alt='' className='h-4 w-4 rotate-90' />
          </button>
        </div>
        <p className='mt-2 text-center text-[11px] text-gray-400 dark:text-slate-500'>
          Vos clés API sont chiffrées en base. Vos conversations restent
          privées.
        </p>
      </form>
    </div>
  );
}

export default ChatInput;
