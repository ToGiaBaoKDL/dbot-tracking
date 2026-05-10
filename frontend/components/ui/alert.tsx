import * as React from "react";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success";
}

export function Alert({ className = "", variant = "default", children, ...props }: AlertProps) {
  const variants: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-md p-3 text-sm ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
