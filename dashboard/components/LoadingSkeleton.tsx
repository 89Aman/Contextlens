import type { ReactNode } from "react";

interface LoadingSkeletonProps {
  className?: string;
  children?: ReactNode;
}

export default function LoadingSkeleton({
  className = "",
  children
}: LoadingSkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    >
      {children}
    </div>
  );
}