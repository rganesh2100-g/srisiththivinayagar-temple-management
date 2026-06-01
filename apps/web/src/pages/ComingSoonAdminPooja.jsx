import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Wrench, ArrowLeft } from 'lucide-react';

const ComingSoonAdminPooja = () => {
  return (
    <AdminLayout>
      <Helmet>
        <title>Pooja Management Coming Soon | Admin Portal</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center relative overflow-hidden px-4 py-12">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[30rem] h-[30rem] bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 max-w-xl mx-auto text-center space-y-8 bg-card p-10 md:p-16 rounded-3xl shadow-lg border border-border"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary text-secondary-foreground mb-2 shadow-sm">
            <Wrench className="w-8 h-8" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground font-serif">
              Under Construction
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              We're preparing something special. The new pooja slot management interface is currently being built and will be available soon.
            </p>
          </div>

          <div className="pt-6">
            <Button asChild variant="default" className="rounded-xl shadow-sm">
              <Link to="/admin-dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default ComingSoonAdminPooja;