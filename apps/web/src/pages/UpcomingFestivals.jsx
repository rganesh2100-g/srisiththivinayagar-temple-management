import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import UnifiedDashboardSidebar from '@/components/UnifiedDashboardSidebar.jsx';
import FestivalModal from '@/components/FestivalModal.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Image as ImageIcon } from 'lucide-react';

const UpcomingFestivals = () => {
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState(null);

  useEffect(() => {
    const fetchFestivals = async () => {
      try {
        const records = await pb.collection('festivals').getList(1, 50, {
          filter: 'is_deleted != true && status="active"',
          sort: '+date',
          $autoCancel: false
        });
        
        setFestivals(records.items);
      } catch (error) {
        console.error('Error fetching festivals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFestivals();

    const subscribeToFestivals = async () => {
      try {
        await pb.collection('festivals').subscribe('*', (e) => {
          fetchFestivals();
        });
      } catch (error) {
        console.error('Error subscribing to real-time festivals:', error);
      }
    };

    subscribeToFestivals();

    return () => {
      pb.collection('festivals').unsubscribe('*').catch((err) => {
        console.error('Error unsubscribing from festivals:', err);
      });
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleString('en-US', { month: 'short' }),
      year: date.getFullYear(),
      full: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    };
  };

  const getImageUrl = (festival) => {
    if (!festival.image) {
      return null;
    }
    
    try {
      return pb.files.getUrl(festival, festival.image, { thumb: '300x300' });
    } catch (err) {
      console.error('Error generating image URL:', err);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Upcoming Festivals | Sri Siththi Vinayagar Tempel Kultur Verein e.V</title>
      </Helmet>
      <Header />
      
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        <UnifiedDashboardSidebar />
        
        <main className="flex-1 p-fluid min-w-0">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 min-w-0">
              <h1 className="text-fluid-h1 text-primary mb-4 sm:mb-6">
                Upcoming Festivals
              </h1>
              <p className="text-sm sm:text-lg text-muted-foreground leading-relaxed text-pretty px-2">
                Join us in celebrating our rich cultural heritage. Discover upcoming festivals, special poojas, and community events at the temple.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary" />
              </div>
            ) : festivals.length === 0 ? (
              <div className="text-center py-16 sm:py-20 bg-card rounded-2xl shadow-sm border border-border/50 mx-4 sm:mx-0">
                <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground opacity-50 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">No Upcoming Festivals</h3>
                <p className="text-sm sm:text-base text-muted-foreground">Please check back later for new event announcements.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {festivals.map((festival) => {
                  const dateInfo = formatDate(festival.date);
                  const imageUrl = getImageUrl(festival);
                  
                  return (
                    <Card 
                      key={festival.id} 
                      onClick={() => setSelectedFestival(festival)}
                      className="border-none shadow-md hover:shadow-xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 bg-card flex flex-col h-full cursor-pointer focus-within:ring-2 focus-within:ring-primary outline-none min-w-0"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedFestival(festival);
                        }
                      }}
                    >
                      <div className="relative h-48 sm:h-56 lg:h-64 overflow-hidden shrink-0 bg-muted flex items-center justify-center border-b border-border/50">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={festival.name || 'Festival Image'} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=800&q=80';
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                            <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-30 shrink-0" />
                            <span className="text-xs sm:text-sm font-medium tracking-wide uppercase opacity-70">No Cover Image</span>
                          </div>
                        )}
                        
                        {festival.date && (
                          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-background/95 backdrop-blur-sm rounded-xl shadow-lg text-center min-w-[4rem] sm:min-w-[4.5rem] overflow-hidden">
                            <div className="bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold uppercase py-1 sm:py-1.5 px-2 tracking-wider truncate">
                              {dateInfo.month}
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-foreground py-1 sm:py-1.5">
                              {dateInfo.day}
                            </div>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 sm:p-6 flex flex-col flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 transition-colors group-hover:text-primary" title={festival.name}>
                          {festival.name}
                        </h3>
                        {festival.date && (
                          <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 gap-2 shrink-0">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
                            <span className="font-medium truncate">{dateInfo.full}</span>
                          </div>
                        )}
                        <p className="text-sm sm:text-base text-muted-foreground line-clamp-3 leading-relaxed mt-auto text-pretty">
                          {festival.description || 'Join us for this auspicious celebration at the temple. Click to view more details.'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />

      <FestivalModal 
        festival={selectedFestival}
        isOpen={!!selectedFestival}
        onClose={() => setSelectedFestival(null)}
      />
    </div>
  );
};

export default UpcomingFestivals;