import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface LoadingScreenProps {
  onComplete?: () => void;
  duration?: number;
}

const LoadingScreen = ({ onComplete, duration = 3000 }: LoadingScreenProps) => {
  const [showTitle, setShowTitle] = useState(false);
  const [showSlogan, setShowSlogan] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show title first
    const titleTimer = setTimeout(() => {
      setShowTitle(true);
    }, 300);

    // Show slogan after title
    const sloganTimer = setTimeout(() => {
      setShowSlogan(true);
    }, 1200);

    // Complete loading
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(sloganTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white px-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-60 h-60 sm:w-80 sm:h-80 bg-primary/5 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute -bottom-40 -left-40 w-60 h-60 sm:w-80 sm:h-80 bg-accent/5 rounded-full blur-3xl animate-pulse-glow delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-r from-primary/2 to-accent/2 rounded-full blur-3xl animate-spin-slow"></div>
      </div>

      {/* Main loading content */}
      <div className="relative z-10 text-center space-y-8 sm:space-y-12 w-full max-w-2xl">
        {/* Animated glow behind logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 1.2 }}
          className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] sm:w-[180px] sm:h-[180px] rounded-full bg-primary blur-[60px]"
        />

        {/* Dirq Solutions Logo - responsive */}
        <motion.svg
          width="100%"
          height="120"
          viewBox="0 0 600 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto max-w-md sm:max-w-lg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Magnifying glass circle (line drawing animation) - larger to fit text */}
          <motion.circle
            cx="95"
            cy="80"
            r="58"
            stroke="#18C9C5"
            strokeWidth="5"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />

          {/* Magnifying glass handle (line drawing animation) */}
          <motion.line
            x1="135"
            y1="121"
            x2="175"
            y2="160"
            stroke="#18C9C5"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.0, ease: "easeInOut", delay: 0.5 }}
          />

          {/* Dirq text inside magnifying glass - same size as Solutions */}
          <motion.text
            x="95"
            y="80"
            fontFamily="Arial, sans-serif"
            fontSize="42"
            fontWeight="700"
            textAnchor="middle"
            fill="#18C9C5"
            dominantBaseline="middle"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            Dirq
          </motion.text>

          {/* Solutions text next to logo - same size as Dirq */}
          <motion.text
            x="185"
            y="80"
            fontFamily="Arial, sans-serif"
            fontSize="42"
            fontWeight="700"
            fill="#18C9C5"
            dominantBaseline="middle"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 1.1 }}
          >
            Solutions
          </motion.text>
        </motion.svg>

        {/* Slogan - elegant and centered below logo - responsive */}
        <motion.p
          className="text-lg sm:text-2xl text-gray-500/80 font-light tracking-wider italic px-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 2.0 }}
        >
          To make life easier
        </motion.p>
      </div>
    </div>
  );
};

export { LoadingScreen };
export default LoadingScreen;
