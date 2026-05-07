import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "success" | "outline"
}

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-primary/10 text-primary hover:bg-primary/20",
    secondary: "bg-muted text-muted-foreground hover:bg-muted/80",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    success: "bg-success/15 text-success hover:bg-success/25",
    outline: "border border-border text-foreground hover:bg-muted",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
