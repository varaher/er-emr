import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Triage from "@/pages/Triage";
import CaseSheetForm from "@/pages/CaseSheetForm";
import DischargeSummaryNew from "@/pages/DischargeSummaryNew";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import "@/App.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/triage"
              element={
                <ProtectedRoute>
                  <Triage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/case/new"
              element={
                <ProtectedRoute>
                  <CaseSheetForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/case/:id"
              element={
                <ProtectedRoute>
                  <CaseSheetForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/discharge/:caseId"
              element={
                <ProtectedRoute>
                  <DischargeSummaryNew />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;