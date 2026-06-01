import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import BookingModal from '@/components/BookingModal.jsx';
import PoojaCard from '@/components/PoojaCard.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Calendar as CalendarIcon, ChevronRight, Home } from 'lucide-react';

const PoojaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pooja, setPooja] = useState(null);
  const [relatedPoojas, setRelatedPoojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    const fetchPoojaDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const record = await pb.collection('poojas').getOne(id, {
          expand: 'festival',
          $autoCancel: false
        });
        setPooja(record);

        // Fetch related poojas
        if (record.category) {
          const related = await pb.collection('poojas').getList(1, 4, {
            filter: `category="${record.category}" && id!="${record.id}" && status="published" && is_deleted=false`,
            $autoCancel: false
          });
          setRelatedPoojas(related.items);
        }
      } catch (err) {
        console.error('Error fetching pooja details:', err);
        setError('Pooja not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchPoojaDetails();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full space-y-8">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !pooja) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">{error || 'Pooja not found'}</h2>
          <Button asChild>
            <Link to="/poojas">Back to Offerings</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{pooja.name} | Sri Siththi Vinayagar Temple</title>
      </Helmet>
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary flex items-center"><Home className="w-4 h-4 mr-1" /> Home</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link to="/poojas" className="hover:text-primary">Poojas</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-foreground font-medium truncate">{pooja.name}</span>
        </nav>

        <div className="mb-16">
          {/* Details Header */}
          <div className="flex flex-col">
            <div className="mb-8">
              {pooja.category && (
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none">
                  {pooja.category}
                </Badge>
              )}
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight" style={{ letterSpacing: '-0.02em' }}>
                {pooja.name}
              </h1>
              <div className="text-3xl font-semibold text-primary mb-8">
                €{pooja.price || pooja.donation_amount}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 p-6 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{pooja.duration} mins</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Availability</p>
                  <p className="font-medium capitalize">{pooja.availabilityType === 'allDays' ? 'Every Day' : 'Specific Dates'}</p>
                </div>
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full sm:w-auto sm:min-w-[200px] text-lg h-14 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
              onClick={() => setIsBookingModalOpen(true)}
            >
              Book Now
            </Button>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="description" className="mb-16">
          <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-base">Description</TabsTrigger>
            <TabsTrigger value="availability" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-base">Availability</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-base">Reviews</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="pt-6">
            <div className="prose prose-gray max-w-none">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{pooja.description}</p>
            </div>
          </TabsContent>
          <TabsContent value="availability" className="pt-6">
            <div className="bg-muted/20 p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-lg mb-4">Scheduling Information</h3>
              <p className="text-muted-foreground mb-4">
                {pooja.availabilityType === 'allDays' && 'This pooja can be booked on any day of the week, subject to slot availability.'}
                {pooja.availabilityType === 'specificDaysRegularly' && `This pooja is available on specific days: ${pooja.specificDays ? JSON.parse(pooja.specificDays).join(', ') : ''}.`}
                {pooja.availabilityType === 'specificDate' && 'This pooja is only available on specific dates.'}
              </p>
              <Button variant="outline" onClick={() => setIsBookingModalOpen(true)}>Check Calendar</Button>
            </div>
          </TabsContent>
          <TabsContent value="reviews" className="pt-6">
            <div className="text-center py-12 bg-muted/20 rounded-xl border border-border">
              <p className="text-muted-foreground">No reviews yet for this pooja.</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Related Poojas */}
        {relatedPoojas.length > 0 && (
          <section className="border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-foreground mb-8">Similar Offerings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedPoojas.map(related => (
                <PoojaCard key={related.id} pooja={related} />
              ))}
            </div>
          </section>
        )}

      </main>

      <Footer />

      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)} 
        pooja={pooja} 
      />
    </div>
  );
};

export default PoojaDetailPage;