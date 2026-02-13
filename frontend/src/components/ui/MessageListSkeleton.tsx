import { Skeleton } from '@/components/ui/skeleton';

function MessageListSkeleton() {
  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8'>
      {/* Message utilisateur court (align\u00e9 \u00e0 droite) */}
      <div className='flex justify-end'>
        <div className='w-2/5 space-y-2'>
          <Skeleton className='ml-auto h-3 w-4/5 rounded' />
          <Skeleton className='ml-auto h-3 w-3/5 rounded' />
        </div>
      </div>

      {/* R\u00e9ponse assistant longue (align\u00e9e \u00e0 gauche) */}
      <div className='flex justify-start'>
        <div className='w-4/5 space-y-2'>
          <Skeleton className='h-3 w-full rounded' />
          <Skeleton className='h-3 w-11/12 rounded' />
          <Skeleton className='h-3 w-4/5 rounded' />
          <Skeleton className='h-3 w-3/5 rounded' />
        </div>
      </div>

      {/* Message utilisateur court */}
      <div className='flex justify-end'>
        <div className='w-1/3 space-y-2'>
          <Skeleton className='ml-auto h-3 w-full rounded' />
        </div>
      </div>

      {/* R\u00e9ponse assistant longue */}
      <div className='flex justify-start'>
        <div className='w-3/4 space-y-2'>
          <Skeleton className='h-3 w-full rounded' />
          <Skeleton className='h-3 w-5/6 rounded' />
          <Skeleton className='h-3 w-2/3 rounded' />
        </div>
      </div>
    </div>
  );
}

export default MessageListSkeleton;
