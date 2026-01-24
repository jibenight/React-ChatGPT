import { useUser } from '../UserContext';
import Aioption from './Aioption';
import LogOut from './Logout';
import chatGPT from '../assets/chatGPT.mp4';

function Aside({ setProfil, profil, selectedOption, setSelectedOption }) {
  const { userData } = useUser();
  const hasUserData = userData && userData.username;

  return (
    <div className='bg-gray-800 w-64 h-screen divide-y divide-gray-100 flex flex-col flex-shrink-0'>
      <div className='m-3 mt-5 mb-10'>
        <div className='m-3 flex items-center justify-center'>
          <video
            src={selectedOption?.avatar || chatGPT}
            autoPlay={true}
            className='h-20 w-20 flex-shrink-0 rounded-full'
          />
        </div>

        {hasUserData ? (
          <h1 className='text-gray-100 text-2xl italic text-center'>
            Hello, {userData.username}
          </h1>
        ) : (
          <h1 className='text-gray-100 text-2xl italic text-center'>
            Loading...
          </h1>
        )}
      </div>

      <div className='m-3 flex-grow'>
        <Aioption
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
        />
      </div>

      <div className=' flex justify-center items-center m-3 p-3'>
        <LogOut setProfil={setProfil} profil={profil} />
      </div>
    </div>
  );
}

export default Aside;
