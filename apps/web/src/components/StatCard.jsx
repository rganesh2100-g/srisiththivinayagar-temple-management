import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, className }) => {
  return (
    <Card className={cn("overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-primary font-heading tracking-tight">{value}</h3>
              {trend && (
                <span className={cn(
                  "flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
                  trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                )}>
                  {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
          </div>
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-accent-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;