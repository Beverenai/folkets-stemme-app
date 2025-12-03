import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Saker from "./pages/Saker";
import SakDetalj from "./pages/SakDetalj";
import Voteringer from "./pages/Voteringer";
import VoteringDetalj from "./pages/VoteringDetalj";
import Representanter from "./pages/Representanter";
import RepresentantDetalj from "./pages/RepresentantDetalj";
import PartiDetalj from "./pages/PartiDetalj";
import Lovbibliotek from "./pages/Lovbibliotek";
import Statistikk from "./pages/Statistikk";
import Profil from "./pages/Profil";
import Onboarding from "./pages/Onboarding";
import Resultater from "./pages/Resultater";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/saker" element={<Saker />} />
            <Route path="/sak/:id" element={<SakDetalj />} />
            <Route path="/voteringer" element={<Voteringer />} />
            <Route path="/votering/:id" element={<VoteringDetalj />} />
            <Route path="/representanter" element={<Representanter />} />
            <Route path="/representant/:id" element={<RepresentantDetalj />} />
            <Route path="/parti/:forkortelse" element={<PartiDetalj />} />
            <Route path="/lovbibliotek" element={<Lovbibliotek />} />
            <Route path="/statistikk" element={<Statistikk />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/resultater" element={<Resultater />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
