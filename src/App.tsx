import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PeriodicGif from "@/components/PeriodicGif";
import "@/i18n/config"; // Ensure i18n is initialized


import alpacaGif from "@/assets/alpaca.gif";
const GIF_URL = alpacaGif; // assets klasöründeki alpaca.gif

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      
      {/* Her 1 dakikada bir sol altta görünen GIF */}
      <PeriodicGif
        gifSrc={GIF_URL}
        intervalMs={60000} // 1 dakika = 60000ms
        alt="Periodic animation"
      />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
