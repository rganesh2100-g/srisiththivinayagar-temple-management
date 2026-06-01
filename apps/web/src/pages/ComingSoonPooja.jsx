import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft } from 'lucide-react';

const ComingSoonPooja = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Pooja Booking Coming Soon | Sri Sithivinayagar Temple</title>
        <meta name="description" content="Our new pooja booking experience is coming soon." />
      </Helmet>

      <Header />

      <main className="flex-1 flex items-center justify-center relative overflow-hidden py-20 px-4">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 max-w-2xl mx-auto text-center space-y-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary mb-4 shadow-sm border border-primary/20">
            <Sparkles className="w-10 h-10" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Coming Soon
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
              We're preparing something special. Our new and improved pooja booking experience will be available shortly. Check back soon!
            </p>
          </div>

          <div className="pt-8">
            <Button asChild size="lg" className="rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Home
              </Link>
            </Button>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default ComingSoonPooja;