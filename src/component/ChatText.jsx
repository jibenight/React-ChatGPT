import chatGPT from '../assets/chatGPT.webp';

function ChatText(props) {
  return (
    <div className='rounded-lg m-3 px-5 p-3 bg-slate-200 flex xl:w-2/3 xl:mx-auto'>
      <img
        src={chatGPT}
        alt=''
        className='h-20 w-20 flex-shrink-0 rounded-full'
      />
      <p className='mx-10'>
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
