import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Calendar, CalendarDays, Camera, Users, BookOpen, Heart, Info } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const HomePage = () => {
  const { t } = useTranslation();

  const quickActions = [
    { icon: Calendar, label: t('header.festivals', 'Festivals'), path: '/festivals', color: 'from-purple-600 to-purple-800' },
    { icon: CalendarDays, label: t('nav.poojaSchedule', 'Pooja Schedule'), path: '/poojas', color: 'from-teal-500 to-teal-700' },
    { icon: BookOpen, label: t('nav.bookPooja', 'Book Pooja'), path: '/poojas', color: 'from-orange-500 to-orange-700' },
    { icon: Camera, label: t('header.gallery', 'Gallery'), path: '/gallery', color: 'from-pink-500 to-pink-700' },
    { icon: Users, label: t('nav.membership', 'Membership'), path: '/membership/select', color: 'from-blue-500 to-blue-700' },
    { icon: Heart, label: t('footer.makeDonation', 'Make a Donation'), path: '/donate', color: 'from-red-500 to-red-700' },
    { icon: Info, label: t('header.about', 'About Us'), path: '/about', color: 'from-green-500 to-green-700' },
  ];

  return (
    <>
      <Helmet>
        <title>{t('home.hero_title', 'Sri Siththi Vinayagar Temple')} - Vienna</title>
        <meta name="description" content="Welcome to Sri Siththi Vinayagar Tempel Kultur Verein e.V, a sacred Hindu temple in Vienna dedicated to Lord Ganesha. Join us for poojas, festivals, and spiritual gatherings." />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          <section className="relative h-[500px] flex items-end justify-center overflow-hidden bg-black">
            <div className="absolute inset-0">
              <img
                src="https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/592a025634a3caad2f47706e8b36979c.jpg"
                alt="Sri Siththi Vinayagar Tempel Kultur Verein e.V interior with ornate architecture"
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-16"
            >
              <h1 className="text-[3rem] font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'Playfair Display, serif', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                {t('home.hero_title', 'Welcome to Sri Siththi Vinayagar Temple')}
              </h1>
              <p className="text-lg md:text-2xl text-amber-300 font-medium mb-10 max-w-2xl mx-auto" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                {t('home.hero_subtitle', 'Experience the divine presence and spiritual harmony in the heart of Vienna.')}
              </p>
              <Link to="/about">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-amber-400 text-amber-950 px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-amber-400/30 transition-all duration-300 mb-8"
                >
                  {t('header.about', 'Discover Our Temple')}
                </motion.button>
              </Link>
            </motion.div>
          </section>

          <section className="py-16 md:py-24 px-4 bg-secondary/30 relative">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-serif">Quick Access</h2>
                <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Link to={action.path}>
                      <motion.div
                        whileHover={{ y: -5 }}
                        className={`bg-gradient-to-br ${action.color} rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 text-center h-full flex flex-col items-center justify-center gap-4 relative overflow-hidden group`}
                      >
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
                        <action.icon className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-md relative z-10" />
                        <span className="text-white font-bold text-sm md:text-base tracking-wide drop-shadow-md relative z-10">
                          {action.label}
                        </span>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default HomePage;