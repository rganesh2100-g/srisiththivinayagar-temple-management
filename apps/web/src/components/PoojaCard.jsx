import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Euro } from 'lucide-react';

const PoojaCard = ({ pooja }) => {
  return (
    <Card className="group relative flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-[var(--card-hover-elevation)] hover:-translate-y-1 bg-gradient-to-br from-[hsl(var(--card-surface-gradient-start))] to-[hsl(var(--card-surface-gradient-end))] border-border/40">
      {/* Decorative hover glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          {pooja.category && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-transparent font-medium tracking-wide uppercase text-[10px] px-2.5 py-1">
              {pooja.category}
            </Badge>
          )}
        </div>
        
        <h3 className="text-2xl font-bold font-heading text-foreground mb-4 line-clamp-2 text-balance leading-snug">
          {pooja.name}
        </h3>
        
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border/50 shadow-sm">
            <Euro className="w-4 h-4 text-primary/80" />
            <span className="font-semibold text-foreground">{(pooja.price || pooja.donation_amount)?.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border/50 shadow-sm">
            <Clock className="w-4 h-4 text-primary/80" />
            <span className="font-medium">{pooja.duration} mins</span>
          </div>
        </div>

        {pooja.description && (
          <p className="text-muted-foreground text-sm line-clamp-3 mb-6">
            {pooja.description}
          </p>
        )}
      </div>
      
      <div className="px-6 pb-6 md:px-8 md:pb-8 mt-auto relative z-10">
        <Button 
          asChild 
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 h-12 text-base font-medium shadow-sm group-hover:shadow-md"
        >
          <Link to={`/poojas/${pooja.id}`}>View Details</Link>
        </Button>
      </div>
    </Card>
  );
};

export default PoojaCard;