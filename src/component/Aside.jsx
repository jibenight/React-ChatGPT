import { useState } from 'react';
import chatGPT from '../assets/chatGPT.webp';
import Aioption from './Aioption';
import LogOut from './Logout';

function Aside(props) {
  const [selectedOption, setSelectedOption] = useState(props);

  function handleSelectOption(option) {
    setSelectedOption(option);
  }

  return (
    <div className='bg-gray-800 w-100 h-screen divide-y divide-gray-100 flex flex-col'>
      <div className='m-3 mt-5 mb-10'>
        <div className='m-3 flex items-center justify-center'>
          <img
            src={selectedOption.avatar || chatGPT}
            alt='robot avatar'
            className='h-20 w-20 flex-shrink-0 rounded-full'
          />
        </div>
        <h1 className='text-gray-100 text-2xl italic text-center'>
          Hello, Jean
        </h1>
      </div>

      <div className='m-3 flex-grow'>
        <Aioption setSelectedOption={handleSelectOption} />
      </div>

      <div className=' flex justify-center items-center m-3 p-3'>
        <LogOut />
      </div>
    </div>
  );
}

export default Aside;
