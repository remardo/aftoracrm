import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import KnowledgeBase from './pages/KnowledgeBase';
import Assistant from './pages/Assistant';
import Orders from './pages/Orders';
import OrderWizard from './pages/OrderWizard';
import OrderDetail from './pages/OrderDetail';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Claims from './pages/Claims';
import Dealers from './pages/Dealers';
import DealerDetail from './pages/DealerDetail';
import Training from './pages/Training';
import Statistics from './pages/Statistics';
import Activity from './pages/Activity';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="catalog/:id" element={<ProductDetail />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/new" element={<OrderWizard />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="claims" element={<Claims />} />
            <Route path="dealers" element={<ProtectedRoute factoryOnly><Dealers /></ProtectedRoute>} />
            <Route path="dealers/:id" element={<ProtectedRoute factoryOnly><DealerDetail /></ProtectedRoute>} />
            <Route path="training" element={<Training />} />
            <Route path="statistics" element={<ProtectedRoute factoryOnly><Statistics /></ProtectedRoute>} />
            <Route path="activity" element={<ProtectedRoute factoryOnly><Activity /></ProtectedRoute>} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
