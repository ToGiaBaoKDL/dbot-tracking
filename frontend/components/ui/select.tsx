import * as React from "react"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"
