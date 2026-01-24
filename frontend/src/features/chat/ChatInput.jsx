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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className='absolute bottom-3 flex items-center justify-between w-full p-3 border-t border-gray-300'>
        <button type='button' disabled>
          <img src={upload} alt='' className='h-6 w-6 opacity-50' />
        </button>

        <input
          type='text'
          placeholder='Message'
          className='block w-full py-2 pl-4 mx-3 bg-gray-200 rounded-full outline-none focus:text-gray-700'
          {...register('message')}
          required
          disabled={loading}
        />

        <button type='button' disabled>
          <img src={microphone} alt='' className='h-6 w-6 opacity-50' />
        </button>
        <button type='submit' className='mx-2' disabled={loading}>
          <img src={navigation} alt='' className='h-6 w-6 rotate-90' />
        </button>
      </div>
    </form>
  );
}

export default ChatInput;
