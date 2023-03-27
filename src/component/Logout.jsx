import logout from '../assets/logout.gif';
import profil from '../assets/profil.gif';

function LogOut() {
  return (
    <div className='flex justify-evenly w-full'>
      <div className='flex flex-col items-center'>
        <div className='flex items-center justify-center rounded-full bg-white h-12 w-12'>
          <img
            src={profil}
            alt='icon for log out'
            className='h-9 w-9 rounded-full'
          />
        </div>
        <p className='mr-2 text-white italic text-lg'>Profil</p>
      </div>
      <div className='flex flex-col items-center'>
        <div className='flex items-center justify-center rounded-full bg-white h-12 w-12'>
          <img src={logout} alt='icon for log out' className='h-8 w-8' />
        </div>
        <p className='mr-2 text-white italic text-lg'>Log Out</p>
      </div>
    </div>
  );
}

export default LogOut;
