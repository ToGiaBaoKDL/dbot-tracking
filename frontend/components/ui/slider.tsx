import * as React from "react"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className = "", label, ...props }, ref) => {
    return (
      <div className={`flex flex-col ${className}`}>
        {label && (
          <span className="text-sm text-muted-foreground">{label}</span>
        )}
        <input
          ref={ref}
          type="range"
          className="mt-2 block w-full accent-primary"
          {...props}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"
