import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, Info, MapPin } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage.jsx';

const AboutPage = () => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const deities = [
    {
      name: t('aboutPage.deities.raja', 'LORD RAJA RAJESWARI AMMAN'),
      image: 'https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/d0b5c8f2b753258e8eb0d4e29e6a8e94.jpg',
      alt: 'goddess deity in green dress with yellow flowers and ornate gold frame'
    },
    {
      name: t('aboutPage.deities.shiva', 'LORD SHIVA'),
      image: 'https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/27f09d294ee8702953f31c07bedb243c.jpg',
      alt: 'deity with green foliage/plants and colorful robes'
    },
    {
      name: t('aboutPage.deities.murugan', 'LORD MURUGAN'),
      image: 'https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/668305a410741d2f636c0860f27a813e.jpg',
      alt: 'deity in colorful dress with ornate gold frame and attendants'
    },
    {
      name: t('aboutPage.deities.bhairava', 'LORD BHAIRAVA'),
      image: 'https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/9a5b84650a4be7c05d74d7149ecddb8d.jpg',
      alt: 'deity in cream/white dress with flowers and ornate gold frame'
    }
  ];

  const committee = [
    { 
      role: t('aboutPage.president', 'President'), 
      name: t('aboutPage.comingSoon', 'Coming Soon'),
      phone: '+491787902696'
    },
    { 
      role: t('aboutPage.secretary', 'Secretary'), 
      name: t('aboutPage.comingSoon', 'Coming Soon'),
      phone: '+4917640440800'
    },
    { 
      role: t('aboutPage.treasurer', 'Treasurer'), 
      name: t('aboutPage.comingSoon', 'Coming Soon'),
      phone: '+4917634629124'
    }
  ];

  return (
    <>
      <Helmet>
        <title>{`${t('aboutPage.pageTitle')} - ${t('nav.templeName', 'Sri Siththi Vinayagar Tempel Kultur Verein e.V')}`}</title>
        <meta name="description" content="Learn about the history, darshan timings, deities, and management of Sri Siththi Vinayagar Tempel Kultur Verein e.V." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-[#FDF8F0]">
        <Header />
        
        <main className="flex-1 py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-20">
          
          {/* Title & EXPANDED Photo Section */}
          <section>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-10 text-center md:text-left"
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#8B0000] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                {t('aboutPage.pageTitle')}
              </h1>
              <div className="w-24 h-1.5 bg-[#CC2222] rounded-full mx-auto md:mx-0"></div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full"
            >
              <img 
                src="https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/09d860839ea08e854cbef63831f2a320.jpg"
                alt="Beautifully decorated Lord Ganesha deity statue with colorful flower garlands and ornate gold decorations"
                className="w-full h-auto rounded-2xl shadow-lg object-cover aspect-[16/9] md:aspect-[21/9]"
              />
            </motion.div>
          </section>

          {/* Darshan Timings & Temple History Section */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-5 lg:col-span-4"
            >
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-border/50 h-full flex flex-col justify-center">
                <h2 className="text-2xl lg:text-3xl font-bold text-[#8B0000] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {t('aboutPage.darshanTimings')}
                </h2>
                <div className="w-12 h-1 bg-[#CC2222] mb-6 rounded-full"></div>
                <div className="space-y-2">
                  <p className="text-lg text-foreground font-medium">
                    {t('aboutPage.daily')}
                  </p>
                  <p className="text-xl text-muted-foreground">
                    17:30 - 20:00
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="md:col-span-7 lg:col-span-8"
            >
              <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-border/50 h-full">
                <h2 className="text-3xl font-bold text-[#8B0000] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {t('aboutPage.templeHistory')}
                </h2>
                <div className="w-16 h-1 bg-[#CC2222] mb-6 rounded-full"></div>
                <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed space-y-4">
                  <p>
                    {t('aboutPage.historyText')}
                  </p>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Contact Information Section */}
          <section>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-[#CC2222]/20 shadow-md bg-white overflow-hidden">
                <div className="pb-5 border-b border-border/50 bg-[#8B0000]/5 text-center p-6">
                  <h2 className="flex items-center justify-center gap-2 text-2xl lg:text-3xl text-[#8B0000] font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                    <Info className="w-6 h-6" />
                    {t('aboutPage.contactInfo')}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/50">
                    
                    <div className="flex flex-col items-center text-center p-8 md:p-10 hover:bg-muted/30 transition-colors">
                      <div className="w-14 h-14 rounded-full bg-[#CC2222]/10 flex items-center justify-center mb-5">
                        <MapPin className="w-7 h-7 text-[#CC2222]" />
                      </div>
                      <p className="font-bold text-foreground text-lg mb-2">{t('aboutPage.addressTitle')}</p>
                      <p className="text-muted-foreground">HUMBOLDT STR.103</p>
                      <p className="text-muted-foreground">90459 Nürnberg</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-8 md:p-10 hover:bg-muted/30 transition-colors">
                      <div className="w-14 h-14 rounded-full bg-[#CC2222]/10 flex items-center justify-center mb-5">
                        <Phone className="w-7 h-7 text-[#CC2222]" />
                      </div>
                      <p className="font-bold text-foreground text-lg mb-2">{t('aboutPage.phoneTitle')}</p>
                      <p className="text-muted-foreground">017634629124</p>
                      <p className="text-muted-foreground">0911 43958608</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-8 md:p-10 hover:bg-muted/30 transition-colors">
                      <div className="w-14 h-14 rounded-full bg-[#CC2222]/10 flex items-center justify-center mb-5">
                        <Mail className="w-7 h-7 text-[#CC2222]" />
                      </div>
                      <p className="font-bold text-foreground text-lg mb-2">{t('aboutPage.emailTitle')}</p>
                      <a href="mailto:info@sristhivinayagar.com" className="text-[#CC2222] font-medium hover:underline break-all transition-all">
                        info@sristhivinayagar.com
                      </a>
                    </div>

                </div>
              </Card>
            </motion.div>
          </section>

          {/* Temple Deities Section */}
          <section>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[#8B0000] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                {t('aboutPage.templeDeities')}
              </h2>
              <div className="w-24 h-1.5 bg-[#CC2222] mx-auto rounded-full mb-6"></div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('aboutPage.templeDeitiesSubtitle', 'The deities worshipped in this temple.')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {deities.map((deity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex"
                >
                  <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 w-full flex flex-col bg-white">
                    <img 
                      src={deity.image} 
                      alt={deity.alt} 
                      className="w-full h-64 object-cover border-b border-border/10"
                    />
                    <CardContent className="p-6 flex items-center justify-center">
                      <h3 className="text-lg font-bold text-[#8B0000] tracking-wide text-center" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {deity.name}
                      </h3>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Management Committee Section */}
          <section className="pb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[#8B0000] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                {t('aboutPage.managementCommittee')}
              </h2>
              <div className="w-24 h-1.5 bg-[#CC2222] mx-auto rounded-full"></div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
              {committee.map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="text-center border-border/50 shadow-sm hover:shadow-md transition-all duration-300 bg-white py-8">
                    <CardContent className="p-6 flex flex-col items-center justify-center">
                      <div className="w-24 h-24 bg-[#8B0000]/5 rounded-2xl rotate-3 mb-6 flex items-center justify-center border border-[#8B0000]/10">
                        <div className="w-full h-full -rotate-3 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                          <span className="text-[#CC2222] font-medium text-sm">Photo</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1">{member.name}</h3>
                      <p className="text-[#CC2222] font-medium uppercase tracking-wider text-sm mb-3">{member.role}</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        Telephone:{' '}
                        <a 
                          href={`tel:${member.phone}`}
                          className="text-[#CC2222] font-medium hover:underline transition-all"
                        >
                          {member.phone}
                        </a>
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default AboutPage;