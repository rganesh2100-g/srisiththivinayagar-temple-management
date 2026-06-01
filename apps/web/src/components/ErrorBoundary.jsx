import React from 'react';
import { AlertCircle, WifiOff, ShieldAlert, FileQuestion, RotateCcw, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorType: 'UNKNOWN'
    };
  }

  static getDerivedStateFromError(error) {
    let errorType = 'UNKNOWN';
    const msg = (error.message || '').toLowerCase();
    const status = error.original?.status || error.status;

    if (!navigator.onLine || msg.includes('network') || msg.includes('fetch') || msg.includes('offline')) {
      errorType = 'NETWORK';
    } else if (status === 403 || msg.includes('permission') || msg.includes('unauthorized')) {
      errorType = 'AUTH';
    } else if (status === 404 || msg.includes('not found') || msg.includes('no route')) {
      errorType = 'NOT_FOUND';
    }

    return { hasError: true, error, errorType };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'UNKNOWN' });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { errorType, error } = this.state;
      
      let Icon = AlertCircle;
      let title = "Something went wrong";
      let description = "An unexpected error occurred while loading this section.";
      let themeClass = "border-destructive/20 bg-destructive/5 text-destructive";

      if (errorType === 'NETWORK') {
        Icon = WifiOff;
        title = "Connection Error";
        description = "We couldn't connect to the server. Please check your internet connection.";
        themeClass = "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-500";
      } else if (errorType === 'AUTH') {
        Icon = ShieldAlert;
        title = "Access Denied";
        description = "You do not have the required permissions to view this content.";
        themeClass = "border-destructive/20 bg-destructive/5 text-destructive";
      } else if (errorType === 'NOT_FOUND') {
        Icon = FileQuestion;
        title = "Content Not Found";
        description = "The requested page or data could not be found. It may have been moved or deleted.";
        themeClass = "border-border bg-muted/30 text-muted-foreground";
      }

      // If it's a full-page error (not wrapped in a smaller container), render a full-page view
      if (this.props.fullPage) {
        return (
          <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 py-12 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${themeClass}`}>
              <Icon className="w-12 h-12" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{title}</h1>
            <p className="text-muted-foreground mb-8 max-w-md">{description}</p>
            {import.meta.env.MODE === 'development' && error?.message && (
              <p className="text-xs font-mono bg-muted p-2 rounded max-w-lg mb-8 truncate text-left w-full border border-border/50">
                {error.message}
              </p>
            )}
            <div className="flex items-center gap-4">
              <Button onClick={this.handleRetry} variant="default" className="gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                <Home className="w-4 h-4" /> Go to Home
              </Button>
            </div>
          </div>
        );
      }

      // Component-level error boundary
      return (
        <Card className={`h-full w-full flex items-center justify-center min-h-[250px] shadow-sm ${themeClass}`}>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Icon className="w-8 h-8 mb-3 opacity-80" />
            <h3 className="text-lg font-bold mb-1 currentColor">{title}</h3>
            <p className="text-sm opacity-80 mb-6 max-w-xs">{description}</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={this.handleRetry}
                className="bg-background text-foreground hover:bg-muted"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;