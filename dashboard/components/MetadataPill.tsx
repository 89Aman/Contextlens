export default function MetadataPill({
  label,
  value,
  variant = "default"
}: {
  label: string;
  value: string | number;
  variant?: "default" | "success" | "warning" | "error" | "info";
}) {
  const getVariantColors = (variant: string) => {
    switch (variant) {
      case "success":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200";
      case "warning":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200";
      case "error":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200";
      case "info":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200";
      default:
        return "bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium ${getVariantColors(variant)}`}>
      <span className="text-xs font-medium">{label}:</span>
      <span>{value}</span>
    </div>
  );
}