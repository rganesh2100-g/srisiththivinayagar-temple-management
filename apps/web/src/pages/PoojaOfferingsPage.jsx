import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import PoojaCard from '@/components/PoojaCard.jsx';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, FilterX, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { filterExpiredPoojas } from '@/utils/poojaUtils.js';

const CATEGORIES = ['All', 'Daily', 'Special', 'Regular', 'Festival'];

const PoojaOfferingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [poojas, setPoojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [maxPrice, setMaxPrice] = useState([1000]);

  const fetchPoojas = async () => {
    setLoading(true);
    setError(null);
    try {
      let filterQuery = 'status="published" && is_deleted=false';
      
      if (category !== 'All') {
        filterQuery += ` && category="${category}"`;
      }
      
      if (searchTerm) {
        filterQuery += ` && name ~ "${searchTerm}"`;
      }

      const records = await pb.collection('poojas').getFullList({
        filter: filterQuery,
        sort: '-created',
        $autoCancel: false
      });

      // Client-side price filtering since PocketBase doesn't support <= on numbers easily in all versions
      let filtered = records.filter(p => {
        const price = p.price || p.donation_amount || 0;
        return price <= maxPrice[0];
      });

      filtered = filterExpiredPoojas(filtered);
      setPoojas(filtered);
    } catch (err) {
      console.error('Error fetching poojas:', err);
      setError('Failed to load pooja offerings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPoojas();
      
      // Update URL params
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm);
      if (category !== 'All') params.set('category', category);
      setSearchParams(params, { replace: true });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, category, maxPrice]);

  const clearFilters = () => {
    setSearchTerm('');
    setCategory('All');
    setMaxPrice([1000]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Pooja Offerings | Sri Siththi Vinayagar Temple</title>
      </Helmet>
      <Header />

      {/* Hero Section */}
      <section className="bg-primary/5 py-16 md:py-24 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-primary mb-4"
          >
            Pooja Offerings
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Browse and book sacred rituals and ceremonies performed by our experienced priests.
          </motion.p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-64 shrink-0 space-y-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Search</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search poojas..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card text-foreground"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Category</h3>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-card text-foreground">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Max Price</h3>
                <span className="text-sm font-medium text-primary">€{maxPrice[0]}</span>
              </div>
              <Slider 
                value={maxPrice} 
                onValueChange={setMaxPrice} 
                max={1000} 
                step={10}
                className="py-4"
              />
            </div>

            <Button variant="outline" onClick={clearFilters} className="w-full">
              <FilterX className="w-4 h-4 mr-2" /> Clear Filters
            </Button>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h3>
                <p className="text-destructive/80 mb-4">{error}</p>
                <Button onClick={fetchPoojas} variant="outline">Try Again</Button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-10 w-full mt-4" />
                  </div>
                ))}
              </div>
            ) : poojas.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border border-dashed">
                <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No poojas found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your filters or search term.</p>
                <Button onClick={clearFilters}>Clear All Filters</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {poojas.map((pooja, index) => (
                  <motion.div
                    key={pooja.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <PoojaCard pooja={pooja} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PoojaOfferingsPage;