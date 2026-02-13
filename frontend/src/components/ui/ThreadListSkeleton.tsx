import { Skeleton } from '@/components/ui/skeleton';

function ThreadListSkeleton() {
  return (
    <div className='space-y-2'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='flex items-center gap-2 px-3 py-2'>
          <Skeleton className='h-2 w-2 shrink-0 rounded-full' />
          <Skeleton className='h-3 flex-1 rounded' />
        </div>
      ))}
    </div>
  );
}

export default ThreadListSkeleton;
