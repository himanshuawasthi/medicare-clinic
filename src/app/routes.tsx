import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { Layout } from '@/components/Layout';

// Auth pages (not lazy — needed before app loads)
const Login = lazy(() => import('@/pages/Login'));
const MfaEnroll = lazy(() => import('@/pages/MfaEnroll'));
const MfaChallenge = lazy(() => import('@/pages/MfaChallenge'));
const PatientSearch = lazy(() => import('@/pages/PatientSearch'));
const PatientRegister = lazy(() => import('@/pages/PatientRegister'));
const DoctorConsultation = lazy(() => import('@/pages/DoctorConsultation'));
const PatientDetail = lazy(() => import('@/pages/PatientDetail'));
const PrescriptionDetailPage = lazy(() => import('@/pages/PrescriptionDetailPage'));
const MedicalStore = lazy(() => import('@/pages/MedicalStore'));
const DispensePrescription = lazy(() => import('@/pages/DispensePrescription'));
const Inventory = lazy(() => import('@/pages/Inventory'));

// Lazy-loaded heavy route (Recharts bundle)
const Reports = lazy(() => import('@/pages/Reports'));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/mfa-enroll" element={<MfaEnroll />} />
          <Route path="/mfa-challenge" element={<MfaChallenge />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/patients" replace />} />
              <Route path="/patients" element={<PatientSearch />} />
              <Route path="/patients/new" element={<PatientRegister />} />
              <Route path="/patients/:id" element={<PatientDetail />} />
              <Route path="/rx/:id" element={<PrescriptionDetailPage />} />
              <Route path="/consult/:patientId" element={<DoctorConsultation />} />
              <Route path="/store" element={<MedicalStore />} />
              <Route path="/dispense/:rxId" element={<DispensePrescription />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/reports" element={<Reports />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/patients" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}