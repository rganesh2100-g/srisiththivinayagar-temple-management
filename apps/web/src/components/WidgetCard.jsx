import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const WidgetCard = ({ title, description, children, footer, className, headerAction, variant = "default" }) => {
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      variant === "primary" ? "bg-primary text-primary-foreground shadow-lg border-none" : "bg-card shadow-sm border-border/50",
      className
    )}>
      {(title || description || headerAction) && (
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="space-y-1.5">
            {title && (
              <CardTitle className={cn(
                "text-xl font-heading font-bold",
                variant === "primary" ? "text-primary-foreground" : "text-foreground"
              )}>
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className={cn(
                variant === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {description}
              </CardDescription>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className={cn(
          "pt-4",
          variant === "primary" ? "bg-primary-foreground/10" : "bg-muted/30"
        )}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
};

export default WidgetCard;