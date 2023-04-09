import chatGPT from '../assets/chatGPT.webp';
import chatGPTAnime from '../assets/chatGPT.gif';
import { useState } from 'react';

function ChatText(props) {
  const [imgSrc, setImgSrc] = useState(chatGPT);

  const handleMouseOver = () => {
    setImgSrc(chatGPTAnime);
  };

  const handleMouseOut = () => {
    setImgSrc(chatGPT);
  };
  return (
    <div className=' m-3  flex xl:w-2/3 xl:mx-auto'>
      <img
        src={imgSrc}
        alt=''
        className='h-20 w-20 flex-shrink-0 rounded-full'
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        key={imgSrc}
      />
      <p className='mx-5 px-5 p-3 rounded-lg bg-slate-200'>
        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Magni aperiam
        quod voluptatem ipsa totam laudantium ducimus nesciunt velit enim nulla
        provident, autem vitae? Libero itaque exercitationem adipisci dolore
        fuga dolores?Lorem, ipsum dolor sit amet consectetur adipisicing elit.
        Voluptatum, ut harum eos architecto perspiciatis pariatur, alias et
        eligendi esse sapiente voluptatibus quidem deleniti sint ducimus nobis
        nisi dolorem minima molestias. Lorem ipsum dolor sit, amet consectetur
        adipisicing elit. Rerum reprehenderit architecto in quam officiis
        perspiciatis cupiditate quia voluptatibus. Alias rerum labore accusamus
        architecto fuga quos consectetur nihil odit enim porro!Lorem Lorem ipsum
        dolor sit amet consectetur adipisicing elit. Quidem quod fuga, est
        cumque enim maxime perspiciatis asperiores odit suscipit, corporis qui
        totam earum. Mollitia sequi quod nisi consequatur, blanditiis illo?
      </p>
    </div>
  );
}

export default ChatText;
