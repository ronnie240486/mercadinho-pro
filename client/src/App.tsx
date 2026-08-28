import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Cash from "./pages/Cash";
import AccountsPayable from "./pages/AccountsPayable";
import Alerts from "./pages/Alerts";
import Utilities from "./pages/Utilities";
import Loyalty from "./pages/Loyalty";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import NotFound from "./pages/NotFound";
import Pdv from "./pages/Pdv";
import PriceCheck from "./pages/PriceCheck";
import Pricing from "./pages/Pricing";
import Products from "./pages/Products";
import Purchases from "./pages/Purchases";
import Registrations from "./pages/Registrations";
import Reports from "./pages/Reports";
import Stock from "./pages/Stock";
import ShelfLife from "./pages/ShelfLife";
import SalesHistory from "./pages/SalesHistory";
import SalesGoals from "./pages/SalesGoals";
import LossPrevention from "./pages/LossPrevention";
import "./brand.css";
import "./dark.css";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/pdv" component={Pdv} />
        <Route path="/vendas" component={SalesHistory} />
        <Route path="/precos" component={Pricing} />
        <Route path="/conferir-preco" component={PriceCheck} />
        <Route path="/produtos" component={Products} />
        <Route path="/compras" component={Purchases} />
        <Route path="/estoque" component={Stock} />
        <Route path="/inventario" component={Inventory} />
        <Route path="/validade" component={ShelfLife} />
        <Route path="/caixa" component={Cash} />
        <Route path="/contas-a-pagar" component={AccountsPayable} />
        <Route path="/alertas" component={Alerts} />
        <Route path="/prevencao-perdas" component={LossPrevention} />
        <Route path="/ferramentas" component={Utilities} />
        <Route path="/fidelidade" component={Loyalty} />
        <Route path="/metas" component={SalesGoals} />
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
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
