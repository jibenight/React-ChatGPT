import Dropdown from './Dropdown';
import Aioption from './Aioption';

function Aside() {
  return (
    <div className='bg-gray-800 w-100 h-screen divide-y divide-gray-100'>
      <div className='m-3 h-10'>
        <h1 className='text-gray-100 text-2xl italic'>Hello, Jean</h1>
      </div>

      <div className='m-3'>
        <Aioption />
      </div>
    </div>
  );
}

export default Aside;
