import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Pools from "./pages/Pools";
import PoolDetail from "./pages/PoolDetail";
import PoolManage from "./pages/PoolManage";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import MestreDoBolao from "./pages/MestreDoBolao";
import Quiz10 from "./pages/Quiz10";
import QuizDetail from "./pages/QuizDetail";
import QuizManage from "./pages/QuizManage";
import TorcidaMestre from "./pages/TorcidaMestre";
import TorcidaMestreDetail from "./pages/TorcidaMestreDetail";
import TorcidaMestreManage from "./pages/TorcidaMestreManage";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import FAQ from "./pages/FAQ";
import QuemSomos from "./pages/QuemSomos";
import NotFound from "./pages/NotFound";
import MyPredictions from "./pages/MyPredictions";
import AprendaAJogar from "./pages/AprendaAJogar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/pools" element={<Pools />} />
              <Route path="/pools/:id" element={<PoolDetail />} />
              <Route path="/pools/:id/manage" element={<PoolManage />} />
              <Route path="/quiz" element={<Quiz10 />} />
              <Route path="/quiz/:id" element={<QuizDetail />} />
              <Route path="/quiz/:id/manage" element={<QuizManage />} />
              <Route path="/torcida-mestre" element={<TorcidaMestre />} />
              <Route path="/torcida-mestre/:id" element={<TorcidaMestreDetail />} />
              <Route path="/torcida-mestre/:id/manage" element={<TorcidaMestreManage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/mestre-do-bolao" element={<MestreDoBolao />} />
              <Route path="/termos-de-uso" element={<TermsOfUse />} />
              <Route path="/privacidade" element={<PrivacyPolicy />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/quem-somos" element={<QuemSomos />} />
              <Route path="/my-predictions" element={<MyPredictions />} />
              <Route path="/aprenda-a-jogar" element={<AprendaAJogar />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
