import { cn } from "@/presentation/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-foreground select-none", className)}
      {...props}
    />
  );
}
