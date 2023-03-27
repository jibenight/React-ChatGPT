import { useForm } from 'react-hook-form';
import upload from '../assets/telecharger.png';
import navigation from '../assets/navigation.png';
import microphone from '../assets/microphone.png';

function ChatInput() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const onSubmit = data => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className='absolute bottom-3 flex items-center justify-between w-full p-3 border-t border-gray-300'>
        <button>
          <img src={upload} alt='' className='h-6 w-6' />
        </button>

        <input
          type='text'
          placeholder='Message'
          className='block w-full py-2 pl-4 mx-3 bg-gray-200 rounded-full outline-none focus:text-gray-700'
          name='message'
          {...register('example')}
          required
        />

        <button>
          <img src={microphone} alt='' className='h-6 w-6' />
        </button>
        <button type='submit' className='mx-2'>
          <img src={navigation} alt='' className='h-6 w-6 rotate-90' />
        </button>
      </div>
    </form>
  );
}

export default ChatInput;
