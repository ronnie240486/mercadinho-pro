import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Cash from "./pages/Cash";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Pdv from "./pages/Pdv";
import Products from "./pages/Products";
import Registrations from "./pages/Registrations";
import Reports from "./pages/Reports";
import Stock from "./pages/Stock";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/pdv" component={Pdv} />
        <Route path="/produtos" component={Products} />
        <Route path="/estoque" component={Stock} />
        <Route path="/caixa" component={Cash} />
        <Route path="/cadastros" component={Registrations} />
        <Route path="/relatorios" component={Reports} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
