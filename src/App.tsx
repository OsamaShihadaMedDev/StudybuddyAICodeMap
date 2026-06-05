import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { QBankProvider } from "./contexts/QBankContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Library from "./pages/Library.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Sheets from "./pages/Sheets.tsx";
import Flashcards from "./pages/Flashcards.tsx";
import QBank from "./pages/QBank.tsx";
import QBankSession from "./pages/QBankSession.tsx";
import QBankSummary from "./pages/QBankSummary.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SidebarProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sheets" element={<Sheets />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route element={<QBankProvider><Outlet /></QBankProvider>}>
            <Route path="/qbank" element={<QBank />} />
            <Route path="/qbank/session" element={<QBankSession />} />
            <Route path="/qbank/summary" element={<QBankSummary />} />
          </Route>
          <Route path="/library" element={<Library />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Analytics />
      </SidebarProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
