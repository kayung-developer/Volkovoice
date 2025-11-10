// frontend/src/components/WelcomeScreen.jsx (Completed)
import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, Bot, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

import useAuth from '../hooks/useAuth';
import Navbar from './layout/Navbar';

const WelcomeScreen = () => {
  const { user, profile } = useAuth();
  // Prefer the backend profile name, then Firebase display name, then email
  const userName = profile?.full_name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User';

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.5,
        ease: 'easeOut',
      },
    }),
  };

  const featureCards = [
    {
      icon: Mic,
      title: 'Live Translation',
      description: 'Engage in real-time, bidirectional voice conversations with our AI.',
      link: '/session',
      color: 'primary',
    },
    {
      icon: Bot,
      title: 'Voice Clone Studio',
      description: 'Create and manage your personalized AI voices for a unique identity.',
      link: '/voice-clones',
      color: 'secondary',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-dark-bg">
      <Navbar />
      <main className="flex-grow flex items-center justify-center p-4 pt-16">
        <div className="max-w-4xl w-full text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-pink-500 to-orange-500"
          >
            Welcome, {userName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400"
          >
            Unlock seamless communication. What would you like to do today?
          </motion.p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            {featureCards.map((card, index) => (
              <motion.div
                key={card.title}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="h-full"
              >
                <Link to={card.link} className="block h-full group">
                  <div className="h-full p-8 bg-white dark:bg-dark-card rounded-2xl shadow-lg hover:shadow-2xl dark:hover:shadow-primary/20 transform hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                    {/* --- NEW: Decorative glow effect --- */}
                    <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 dark:bg-primary/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className={`relative z-10 mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center bg-${card.color}/10`}>
                      <card.icon className={`w-8 h-8 text-${card.color}`} />
                    </div>
                    <h2 className="relative z-10 text-xl font-bold text-gray-900 dark:text-white">{card.title}</h2>
                    <p className="relative z-10 mt-2 text-gray-600 dark:text-gray-400">{card.description}</p>
                    <div className="relative z-10 mt-6 flex items-center justify-center text-primary font-semibold">
                      <span>Go to Session</span>
                      <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default WelcomeScreen;