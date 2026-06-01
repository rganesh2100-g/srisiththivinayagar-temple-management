import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';

const SoftDeleteConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionType = 'soft_delete', // 'soft_delete', 'restore', 'hard_delete'
  loading = false,
  isFinancial = false,
  amount = 0
}) => {
  
  const getIcon = () => {
    switch (actionType) {
      case 'restore': return <RefreshCw className="w-8 h-8 text-blue-600" />;
      case 'hard_delete': return <Trash2 className="w-8 h-8 text-destructive" />;
      default: return <AlertTriangle className="w-8 h-8 text-amber-600" />;
    }
  };

  const getActionText = () => {
    switch (actionType) {
      case 'restore': return 'Restore Record';
      case 'hard_delete': return 'Permanently Delete';
      default: return 'Move to Trash';
    }
  };

  const getActionClass = () => {
    switch (actionType) {
      case 'restore': return 'bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 active:scale-[0.98]';
      case 'hard_delete': return 'bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all duration-200 active:scale-[0.98]';
      default: return 'bg-amber-600 hover:bg-amber-700 text-white transition-all duration-200 active:scale-[0.98]';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !loading && !open && onClose()}>
      <AlertDialogContent className="professional-dialog-content sm:max-w-[500px]">
        <AlertDialogHeader className="text-left space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className={`p-4 rounded-2xl shrink-0 flex items-center justify-center ${
              actionType === 'restore' ? 'bg-blue-100' : 
              actionType === 'hard_delete' ? 'bg-destructive/10' : 'bg-amber-100'
            }`}>
              {getIcon()}
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-bold font-playfair tracking-tight text-foreground">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base text-muted-foreground leading-relaxed">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
          
          {isFinancial && actionType === 'soft_delete' && (
            <div className="mt-6 p-4 bg-amber-50/50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" />
              <p className="leading-snug">Financial Impact: <span className="font-bold">€{amount?.toFixed(2)}</span> will be REMOVED from the temple accounts ledger.</p>
            </div>
          )}
          
          {isFinancial && actionType === 'restore' && (
            <div className="mt-6 p-4 bg-blue-50/50 border border-blue-200 rounded-xl text-blue-800 text-sm font-medium flex items-start gap-3">
              <RefreshCw className="w-5 h-5 mt-0.5 shrink-0 text-blue-600" />
              <p className="leading-snug">Financial Impact: <span className="font-bold">€{amount?.toFixed(2)}</span> will be ADDED BACK to the temple accounts ledger.</p>
            </div>
          )}

          {actionType === 'hard_delete' && (
            <div className="mt-6 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-destructive text-sm font-medium flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <p className="leading-snug">This action CANNOT be undone. The record and any associated files will be permanently erased from the database.</p>
            </div>
          )}
        </AlertDialogHeader>
        
        <AlertDialogFooter className="mt-8 flex gap-3 sm:justify-end">
          <AlertDialogCancel 
            disabled={loading} 
            className="mt-0 bg-muted/50 hover:bg-muted text-foreground border-transparent hover:text-foreground transition-all duration-200"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={getActionClass()}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {getActionText()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SoftDeleteConfirmationDialog;