import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFBF4] p-4 text-center">
      <div className="max-w-md w-full">
        {/* Animated illustration area */}
        <div className="mb-8 relative flex justify-center">
          <div className="w-48 h-48 bg-orange-100 rounded-full flex items-center justify-center animate-bounce-subtle">
            <span className="text-8xl select-none">🔍</span>
          </div>
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center animate-wiggle">
            <span className="text-2xl">✨</span>
          </div>
        </div>

        <h1 className="text-6xl font-black text-neutral-900 mb-4 tracking-tight">404</h1>
        <h2 className="text-2xl font-bold text-neutral-800 mb-4">{t("errors.page_not_found") || "Sayfa Bulunamadı"}</h2>
        <p className="text-neutral-500 mb-8 leading-relaxed">
          Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir. Ama merak etmeyin, büyüme formülümüz hala burada!
        </p>

        <a
          href="/"
          aria-label="Ana Sayfaya Dön"
          className="inline-flex items-center justify-center px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-full shadow-[0_10px_30px_rgba(238,64,54,0.3)] transition-all active:scale-95 group"
        >
          Ana Sayfaya Dön
          <span className="ml-2 group-hover:translate-x-1 transition-transform">➜</span>
        </a>
      </div>
    </div>
  );
};

export default NotFound;
