import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Calendar, Clock, CreditCard, AlertCircle, PartyPopper, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const PoojaSchedulePage = () => {
  const [poojas, setPoojas] = useState([]);
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all published poojas
      const poojasData = await pb.collection('poojas').getList(1, 50, {
        filter: 'status="Published"',
        sort: '-created',
        $autoCancel: false
      });
      
      // Fetch all festivals
      const festivalsData = await pb.collection('festivals').getList(1, 50, {
        sort: 'date',
        $autoCancel: false
      });

      setPoojas(poojasData.items);
      setFestivals(festivalsData.items);
    } catch (err) {
      console.error('Error fetching schedule data:', err);
      setError('Failed to load pooja schedule. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBookClick = (pooja) => {
    if (isAuthenticated) {
      navigate(`/pooja-booking/${pooja.id}`);
    } else {
      navigate('/login', { state: { returnTo: `/pooja-booking/${pooja.id}` } });
    }
  };

  const parseArrayString = (str) => {
    if (!str) return [];
    try {
      return JSON.parse(str);
    } catch (e) {
      return str.split(',').map(s => s.trim()).filter(Boolean);
    }
  };

  // Separate poojas into regular and festival
  const regularPoojas = poojas.filter(p => p.category !== 'Festival Pooja');
  const festivalPoojas = poojas.filter(p => p.category === 'Festival Pooja');

  const PoojaCard = ({ pooja }) => {
    const dates = parseArrayString(pooja.available_dates || pooja.specificDates);
    const slots = parseArrayString(pooja.time_slots || pooja.timeSlots);
    
    return (
      <div className="bg-card rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-border flex flex-col overflow-hidden group h-full">
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors font-serif">
              {pooja.name}
            </h3>
            {pooja.category && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                pooja.category === 'Festival Pooja' ? 'bg-orange-100 text-orange-800' : 'bg-primary/10 text-primary'
              }`}>
                {pooja.category}
              </span>
            )}
          </div>
          
          <p className="text-muted-foreground mb-6 line-clamp-3 flex-1">
            {pooja.description || "Join us for this auspicious pooja to seek divine blessings."}
          </p>
          
          <div className="space-y-3 mb-6 bg-muted/30 p-4 rounded-xl border border-border/50">
            {dates.length > 0 && (
              <div className="flex items-start gap-3 text-sm text-foreground">
                <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block mb-1">Available Dates:</span>
                  <div className="flex flex-wrap gap-1">
                    {dates.slice(0, 3).map((d, i) => (
                      <span key={i} className="bg-background border border-border px-2 py-1 rounded text-xs">{d}</span>
                    ))}
                    {dates.length > 3 && <span className="text-xs text-muted-foreground self-center">+{dates.length - 3} more</span>}
                  </div>
                </div>
              </div>
            )}
            
            {slots.length > 0 && (
              <div className="flex items-start gap-3 text-sm text-foreground">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block mb-1">Time Slots:</span>
                  <span className="text-muted-foreground">{slots.join(', ')}</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 text-sm text-foreground">
              <CreditCard className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="font-semibold">Donation: </span>
                <span className="text-success font-bold">€{pooja.donation_amount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 pt-0 mt-auto">
          <Button 
            onClick={() => handleBookClick(pooja)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-6 text-lg font-semibold transition-all duration-200 shadow-sm hover:shadow"
          >
            {isAuthenticated ? 'Book Now' : 'Login to Book'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Pooja Schedule | Sri Sithivinayagar Temple</title>
        <meta name="description" content="Explore our regular and special poojas. Book your slots in advance to participate in the divine blessings." />
      </Helmet>

      <Header />

      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 font-serif">
              Temple Pooja Schedule
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our regular and special poojas. Book your slots in advance to participate in the divine blessings.
            </p>
          </div>

          {loading ? (
            <div className="space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-6" />
                    <div className="space-y-3 mb-6">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-5 w-2/3" />
                    </div>
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 text-center max-w-2xl mx-auto">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-destructive mb-2">Oops! Something went wrong</h3>
              <p className="text-destructive/80 mb-6">{error}</p>
              <Button onClick={fetchData} variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-20">
              
              {/* SECTION 1: Regular & Special Poojas */}
              <section>
                <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <h2 className="text-3xl font-bold text-foreground font-serif">Regular & Special Poojas</h2>
                </div>
                
                {regularPoojas.length === 0 ? (
                  <div className="bg-card rounded-2xl p-12 text-center shadow-sm border border-border">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Poojas Scheduled</h3>
                    <p className="text-muted-foreground">There are currently no regular poojas available for booking.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {regularPoojas.map((pooja) => (
                      <PoojaCard key={pooja.id} pooja={pooja} />
                    ))}
                  </div>
                )}
              </section>

              {/* SECTION 2: Upcoming Festivals & Festival Poojas */}
              {festivals.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
                    <PartyPopper className="w-8 h-8 text-accent" />
                    <h2 className="text-3xl font-bold text-foreground font-serif">Upcoming Festivals</h2>
                  </div>

                  <div className="space-y-12">
                    {festivals.map(festival => {
                      // Find poojas linked to this festival
                      const linkedPoojas = festivalPoojas.filter(p => p.festival === festival.id);
                      
                      return (
                        <div key={festival.id} className="bg-card rounded-3xl shadow-sm border border-accent/20 overflow-hidden">
                          <div className="bg-accent/10 p-6 md:p-8 border-b border-accent/20">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2 font-serif">
                                  {festival.name}
                                </h3>
                                {festival.description && (
                                  <p className="text-muted-foreground max-w-3xl">
                                    {festival.description}
                                  </p>
                                )}
                              </div>
                              {festival.date && (
                                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-accent/30 shrink-0 text-center">
                                  <span className="block text-xs font-bold text-accent uppercase tracking-wider mb-1">Date</span>
                                  <span className="text-lg font-bold text-foreground">
                                    {new Date(festival.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-6 md:p-8">
                            <h4 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-accent" />
                              Special Poojas for {festival.name}
                            </h4>
                            
                            {linkedPoojas.length === 0 ? (
                              <p className="text-muted-foreground italic bg-muted/30 p-4 rounded-xl text-center border border-border">
                                No specific poojas have been scheduled for this festival yet.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {linkedPoojas.map(pooja => (
                                  <PoojaCard key={pooja.id} pooja={pooja} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PoojaSchedulePage;