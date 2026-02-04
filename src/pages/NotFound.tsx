import { useLocation } from "react-router-dom";
import { useEffect } from "react";

import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import notFoundAnimation from "@/assets/404-not-found.lottie";
import bravitaLogo from "@/assets/bravita-logo.webp";

const NotFound = () => {

  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-start justify-center bg-[#FFFBF4] p-4 pt-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full"
      >
        {/* Lottie Animation */}
        <div className="flex justify-center overflow-hidden">
          <div className="-my-12">
            <DotLottieReact
              src={notFoundAnimation}
              loop
              autoplay
              style={{ width: "600px", height: "600px" }}
            />
          </div>
        </div>

        <motion.img
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          src={bravitaLogo}
          alt="Bravita"
          className="w-48 h-auto mx-auto mb-4"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-neutral-500 mb-8 leading-relaxed"
        >
          Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
          Ama merak etmeyin, büyüme formülümüz hala burada!
        </motion.p>

        <motion.a
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          href="/"
          aria-label="Ana Sayfaya Dön"
          className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 group"
        >
          Ana Sayfaya Dön
          <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
        </motion.a>
      </motion.div>
    </div>
  );
};

export default NotFound;
