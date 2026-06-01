import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Youtube } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ContactForm from '@/components/ContactForm.jsx';

const ContactPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('contactPage.heroTitle')} - {t('nav.templeName')}</title>
        <meta name="description" content="Get in touch with Sri Siththi Vinayagar Tempel Kultur Verein e.V for any inquiries, pooja bookings, or general questions." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=2000&auto=format&fit=crop"
                alt="Temple entrance"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 mix-blend-multiply"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 text-center px-4 max-w-3xl mx-auto mt-12"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                {t('contactPage.heroTitle')}
              </h1>
              <p className="text-lg md:text-xl text-white/90 font-medium">
                {t('contactPage.heroSubtitle')}
              </p>
            </motion.div>
          </section>

          <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-7"
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-foreground mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {t('contactPage.inquiryTitle')}
                  </h2>
                  <p className="text-muted-foreground">
                    {t('contactPage.inquiryDesc')}
                  </p>
                </div>
                
                <ContactForm />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="lg:col-span-5 space-y-8"
              >
                <div className="bg-muted/30 rounded-2xl p-8 border border-border/50 h-full">
                  <h3 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {t('contactPage.templeInfo')}
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{t('contactPage.address')}</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          Sri Siththi Vinayagar Tempel Kultur Verein e.V<br />
                          Humboldt Str.103<br />
                          90459 Nürnberg, Germany
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{t('contactPage.phone')}</h4>
                        <p className="text-muted-foreground">
                          <a href="tel:+4991143958088" className="hover:text-primary transition-colors">
                            0911 43958088
                          </a>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{t('contactPage.email')}</h4>
                        <p className="text-muted-foreground">
                          <a href="mailto:info@sithivinayagar.at" className="hover:text-primary transition-colors">
                            info@sithivinayagar.at
                          </a>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{t('contactPage.hours')}</h4>
                        <div className="text-muted-foreground space-y-1">
                          <p className="flex justify-between gap-4">
                            <span>{t('contactPage.monFri')}</span>
                            <span className="font-medium text-foreground">08:00 - 12:00, 17:00 - 20:30</span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span>{t('contactPage.satSun')}</span>
                            <span className="font-medium text-foreground">08:00 - 13:30, 17:00 - 21:00</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="my-8 border-border" />

                  <div>
                    <h4 className="font-semibold text-foreground mb-4">{t('contactPage.followUs')}</h4>
                    <div className="flex gap-3">
                      <a href="#" className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200" aria-label="Facebook">
                        <Facebook className="w-5 h-5" />
                      </a>
                      <a href="#" className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200" aria-label="Instagram">
                        <Instagram className="w-5 h-5" />
                      </a>
                      <a href="#" className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200" aria-label="YouTube">
                        <Youtube className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ContactPage;