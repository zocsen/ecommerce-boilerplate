"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  CheckoutStepper — step indicator for the checkout flow              */
/* ------------------------------------------------------------------ */

export interface CheckoutStep {
  id: number
  label: string
  icon: React.ElementType
}

export interface CheckoutStepperProps {
  steps: readonly CheckoutStep[]
  currentStep: number
  onStepClick: (stepId: number) => void
}

/**
 * Renders a horizontal stepper with connecting lines.
 * Completed steps are clickable; future steps are disabled.
 */
export function CheckoutStepper({ steps, currentStep, onStepClick }: CheckoutStepperProps) {
  return (
    <div className="mt-8 flex items-center gap-0">
      {steps.map((step, idx) => {
        const StepIcon = step.icon
        const isActive = currentStep === step.id
        const isCompleted = currentStep > step.id

        return (
          <div key={step.id} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  "mx-3 h-px w-8 transition-colors duration-500 sm:w-16",
                  isCompleted ? "bg-foreground" : "bg-border",
                )}
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (isCompleted) onStepClick(step.id)
              }}
              disabled={!isCompleted && !isActive}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-500",
                isActive && "cursor-pointer bg-foreground text-background",
                isCompleted && "cursor-pointer bg-muted text-foreground hover:bg-muted/80",
                !isActive && !isCompleted && "cursor-default text-muted-foreground",
              )}
            >
              {isCompleted ? <Check className="size-4" /> : <StepIcon className="size-4" />}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.id}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
