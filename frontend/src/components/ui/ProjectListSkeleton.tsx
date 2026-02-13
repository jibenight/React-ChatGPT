import { Skeleton } from '@/components/ui/skeleton';

function ProjectListSkeleton() {
  return (
    <div className='grid gap-3'>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className='rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60'
        >
          <Skeleton className='h-4 w-3/5 rounded' />
          <Skeleton className='mt-2 h-3 w-2/5 rounded' />
        </div>
      ))}
    </div>
  );
}

export default ProjectListSkeleton;
