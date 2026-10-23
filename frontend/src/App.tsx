import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { VisaoGeralPage } from './pages/VisaoGeralPage';
import { PlaybookPipelinePage } from './pages/PlaybookPipelinePage';
import { MetasPage } from './pages/MetasPage';
import { ResultadosPage } from './pages/ResultadosPage';
import { EquipePage } from './pages/EquipePage';
import { RituaisPage } from './pages/RituaisPage';
import { PlaybookInboundPage } from './pages/PlaybookInboundPage';
import { AssistenteIaPage } from './pages/AssistenteIaPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requireGestor?: boolean;
}> = ({ children, requireGestor = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] text-[#111111]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF5A00] text-white font-extrabold flex items-center justify-center animate-pulse">
            Q
          </div>
          <span className="text-sm font-semibold text-[#333333]">
            Carregando Playbook de Vendas Quest...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireGestor && user.role !== 'GESTOR') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<VisaoGeralPage />} />
        <Route path="playbook" element={<PlaybookPipelinePage />} />
        <Route path="metas" element={<MetasPage />} />
        <Route path="resultados" element={<ResultadosPage />} />
        <Route
          path="equipe"
          element={
            <ProtectedRoute requireGestor>
              <EquipePage />
            </ProtectedRoute>
          }
        />
        <Route path="rituais" element={<RituaisPage />} />
        <Route path="playbook-inbound" element={<PlaybookInboundPage />} />
        <Route path="assistente" element={<AssistenteIaPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

