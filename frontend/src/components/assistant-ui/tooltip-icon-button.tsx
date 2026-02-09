"use client";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentType, ElementRef } from "react";
import { Slottable } from "@radix-ui/react-slot";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "right" | "bottom" | "left";

type TooltipIconButtonProps = ComponentPropsWithoutRef<typeof Button> & {
  tooltip: string;
  side?: TooltipSide;
};

const TooltipContentComponent = TooltipContent as ComponentType<any>;

export const TooltipIconButton = forwardRef<
  ElementRef<typeof Button>,
  TooltipIconButtonProps
>(({ children, tooltip, side = "bottom", className, ...rest }, ref) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          {...rest}
          className={cn(
            "aui-button-icon min-h-11 min-w-11 p-2 sm:min-h-9 sm:min-w-9 sm:p-1.5",
            className
          )}
          ref={ref}>
          <Slottable>{children}</Slottable>
          <span className="aui-sr-only sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContentComponent side={side}>{tooltip}</TooltipContentComponent>
    </Tooltip>
  );
});

TooltipIconButton.displayName = "TooltipIconButton";
