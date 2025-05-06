import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-none bg-secondary dark:bg-primary-dark",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
