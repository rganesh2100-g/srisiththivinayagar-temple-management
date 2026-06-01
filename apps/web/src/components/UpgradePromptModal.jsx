import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, LockKeyhole, Sparkles, TrendingUp } from 'lucide-react';

const UpgradePromptModal = ({ isOpen, onOpenChange }) => {
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-border/50">
        <div className="bg-primary px-6 py-8 text-center relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-32 h-32 bg-accent/20 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4 shadow-lg ring-4 ring-accent/20">
              <LockKeyhole className="w-8 h-8 text-accent-foreground" />
            </div>
            <DialogTitle className="text-2xl font-bold font-heading text-primary-foreground mb-2">
              Unlock Temple Transparency
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/90 text-sm max-w-[280px] mx-auto">
              Upgrade to Premium Membership to access exclusive financial reports and insights.
            </DialogDescription>
          </div>
        </div>

        <div className="p-6 bg-card space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Financial Summaries</h4>
                <p className="text-xs text-muted-foreground mt-1">View detailed breakdowns of temple income and expenses.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Account Accountability</h4>
                <p className="text-xs text-muted-foreground mt-1">Ensure complete transparency in community contributions.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Premium Benefits</h4>
                <p className="text-xs text-muted-foreground mt-1">Support the temple and enjoy priority access to special events.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold h-11"
              onClick={() => {
                onOpenChange(false);
                navigate('/membership-selection');
              }}
            >
              Upgrade Now
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePromptModal;