import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

const NotFoundPage = () => {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <Helmet>
        <title>Page Not Found | Sri Siththi Vinayagar Temple</title>
      </Helmet>
      
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <FileQuestion className="w-12 h-12 text-muted-foreground opacity-50" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">404</h1>
      <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-3">Page Not Found</h2>
      
      <p className="text-muted-foreground mb-8 max-w-md text-pretty">
        The page you are looking for doesn't exist, has been removed, or you don't have permission to access it.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Button asChild variant="default" size="lg" className="h-12 px-8">
          <Link to="/">Go to Homepage</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-12 px-8 text-muted-foreground hover:text-foreground">
          <button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </button>
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;