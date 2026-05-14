import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { GuestShell } from './components/GuestShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RouteFallback } from './components/RouteFallback'

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })),
)
const ConfirmEmail = lazy(() =>
  import('./pages/ConfirmEmail').then((m) => ({ default: m.ConfirmEmail })),
)
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const Forum = lazy(() => import('./pages/Forum').then((m) => ({ default: m.Forum })))
const Catalog = lazy(() => import('./pages/Catalog').then((m) => ({ default: m.Catalog })))
const CourseDetail = lazy(() =>
  import('./pages/CourseDetail').then((m) => ({ default: m.CourseDetail })),
)
const Cart = lazy(() => import('./pages/Cart').then((m) => ({ default: m.Cart })))
const Checkout = lazy(() => import('./pages/Checkout').then((m) => ({ default: m.Checkout })))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<GuestShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/confirm" element={<ConfirmEmail />} />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/catalog/:courseId" element={<CourseDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/forum/:courseId" element={<Forum />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
