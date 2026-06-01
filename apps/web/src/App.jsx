import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

// Contexts & Providers
import { AuthProvider } from "@/contexts/AuthContext.jsx";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext.jsx";
import { LanguageProvider } from "@/hooks/useLanguage.jsx";
import { ErrorProvider } from "@/contexts/ErrorContext.jsx";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import ErrorBoundary from "@/components/ErrorBoundary.jsx";
import GlobalOfflineBanner from "@/components/GlobalOfflineBanner.jsx";
import NotFoundPage from "@/components/NotFoundPage.jsx";
import ScrollToTop from "@/components/ScrollToTop.jsx";

// Lazy Loaded Public & User Pages
const HomePage = lazy(() => import("@/pages/HomePage.jsx"));
const HomeDashboard = lazy(() => import("@/pages/Home.jsx"));
const AboutPage = lazy(() => import("@/pages/AboutPage.jsx"));
const ContactPage = lazy(() => import("@/pages/ContactPage.jsx"));
const GalleryPage = lazy(() => import("@/pages/GalleryPage.jsx"));
const LoginPage = lazy(() => import("@/pages/LoginPage.jsx"));
const SignupPage = lazy(() => import("@/pages/SignupPage.jsx"));
const MembershipPage = lazy(() => import("@/pages/MembershipPage.jsx"));
const MembershipSelectionPage = lazy(() => import("@/pages/MembershipSelectionPage.jsx"));
const PaymentSubscriptionPage = lazy(() => import("@/pages/PaymentSubscriptionPage.jsx"));
const FreeMembershipPage = lazy(() => import("@/pages/FreeMembershipPage.jsx"));
const PremiumMembershipPage = lazy(() => import("@/pages/PremiumMembershipPage.jsx"));
const DashboardRouter = lazy(() => import("@/components/DashboardRouter.jsx"));
const FreeMemberDashboard = lazy(() => import("@/pages/FreeMemberDashboard.jsx"));
const PremiumMemberDashboard = lazy(() => import("@/pages/PremiumMemberDashboard.jsx"));
const TempleDonatePage = lazy(() => import("@/pages/TempleDonatePage.jsx"));

// Pooja Routes
const PoojaOfferingsPage = lazy(() => import("@/pages/PoojaOfferingsPage.jsx"));
const PoojaDetailPage = lazy(() => import("@/pages/PoojaDetailPage.jsx"));
const PoojaCheckoutPage = lazy(() => import("@/pages/PoojaCheckoutPage.jsx"));
const BookingConfirmationPage = lazy(() => import("@/pages/BookingConfirmationPage.jsx"));

const UpcomingFestivals = lazy(() => import("@/pages/UpcomingFestivals.jsx"));
const MyProfile = lazy(() => import("@/pages/MyProfile.jsx"));
const MyBookingsPage = lazy(() => import("@/pages/MyBookingsPage.jsx"));
const UserMessagesPage = lazy(() => import("@/pages/UserMessagesPage.jsx"));
const Notifications = lazy(() => import("@/pages/Notifications.jsx"));
const SanthaHistoryPage = lazy(() => import("@/pages/SanthaHistoryPage.jsx"));
const FinancialTransparency = lazy(() => import("@/pages/FinancialTransparency.jsx"));
const DonationTracker = lazy(() => import("@/pages/DonationTracker.jsx"));

// Lazy Loaded Admin Pages
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard.jsx"));
const AdminSubscriptionManagement = lazy(() => import("@/pages/AdminSubscriptionManagement.jsx"));
const AdminPaymentsPage = lazy(() => import("@/pages/AdminPaymentsPage.jsx"));
const AdminRoleManagement = lazy(() => import("@/pages/AdminRoleManagement.jsx"));
const AdminGalleryManagement = lazy(() => import("@/pages/AdminGalleryManagement.jsx"));
const AdminPoojaApprovals = lazy(() => import("@/pages/AdminPoojaApprovals.jsx"));
const AdminPoojaCreate = lazy(() => import("@/pages/AdminPoojaCreate.jsx"));
const AdminPoojaArchive = lazy(() => import("@/pages/AdminPoojaArchive.jsx"));
const AdminDonationApprovalPage = lazy(() => import("@/pages/AdminDonationApprovalPage.jsx"));
const AdminTempleAccounts = lazy(() => import("@/pages/AdminTempleAccounts.jsx"));
const AdminMonthlyDetailReport = lazy(() => import("@/pages/AdminMonthlyDetailReport.jsx"));
const AdminMessages = lazy(() => import("@/pages/AdminMessages.jsx"));
const AdminPaymentAccountPage = lazy(() => import("@/pages/AdminPaymentAccountPage.jsx"));
const AdminTemplePaymentAccounts = lazy(() => import("@/pages/AdminTemplePaymentAccounts.jsx"));
const CategoryMasterPage = lazy(() => import("@/pages/CategoryMasterPage.jsx"));
const FestivalManager = lazy(() => import("@/pages/FestivalManager.jsx"));
const ExpenseManagerPage = lazy(() => import("@/pages/ExpenseManagerPage.jsx"));
const UserPageManagement = lazy(() => import("@/pages/UserPageManagement.jsx"));
const UserManagement = lazy(() => import("@/pages/UserManagement.jsx"));
const UserAccountAssignmentPage = lazy(() => import("@/pages/UserAccountAssignmentPage.jsx"));
const AccountTypeSettings = lazy(() => import("@/pages/AccountTypeSettings.jsx"));
const AdminDiagnosticPage = lazy(() => import("@/pages/AdminDiagnosticPage.jsx"));
const AdminAuditLogs = lazy(() => import("@/pages/AdminAuditLogs.jsx"));

const PageTitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'Home - Sri Siththi Vinayagar Temple',
      '/about': 'About Us - Sri Siththi Vinayagar Temple',
      '/poojas': 'Pooja Offerings - Sri Siththi Vinayagar Temple',
      '/festivals': 'Upcoming Festivals - Sri Siththi Vinayagar Temple',
      '/gallery': 'Gallery - Sri Siththi Vinayagar Temple',
      '/contact': 'Contact Us - Sri Siththi Vinayagar Temple',
      '/login': 'Login - Sri Siththi Vinayagar Temple',
      '/signup': 'Sign Up - Sri Siththi Vinayagar Temple',
      '/my-profile': 'My Profile - Dashboard',
    };
    const title = titles[location.pathname] || 'Sri Siththi Vinayagar Temple';
    document.title = title;
  }, [location]);

  return null;
};

const LoadingScreen = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-muted-foreground font-medium">Loading...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <ErrorBoundary fullPage>
      <AuthProvider>
        <ErrorProvider>
          <AccessibilityProvider>
            <LanguageProvider>
              <Router>
                <ScrollToTop />
                <PageTitleUpdater />
                <GlobalOfflineBanner />
                <Helmet>
                  <title>Sri Sitthi Vinayagar Temple</title>
                  <meta name="description" content="Welcome to the Sri Sitthi Vinayagar Temple platform." />
                </Helmet>
                <Toaster position="top-right" richColors />
                
                <Suspense fallback={<LoadingScreen />}>
                  <ErrorBoundary>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/home" element={<HomePage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/gallery" element={<GalleryPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/membership" element={<MembershipPage />} />
<Route path="/membership/select" element={<MembershipSelectionPage />} />
<Route path="/membership-payment" element={<PaymentSubscriptionPage />} />
<Route path="/membership/free" element={<FreeMembershipPage />} />
                      <Route path="/membership/premium" element={<PremiumMembershipPage />} />
                      <Route path="/donate" element={<TempleDonatePage />} />
                      <Route path="/donation-tracker" element={<DonationTracker />} />
                      
                      {/* Pooja Routes */}
                      <Route path="/poojas" element={<PoojaOfferingsPage />} />
                      <Route path="/poojas/:id" element={<PoojaDetailPage />} />
                      <Route 
                        path="/checkout/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['user', 'admin']}>
                            <PoojaCheckoutPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/booking-confirmation/:bookingId" element={<BookingConfirmationPage />} />
                      
                      <Route path="/festivals" element={<UpcomingFestivals />} />
                      <Route path="/financial-transparency" element={<FinancialTransparency />} />

                      {/* Dashboard Routes */}
                      <Route 
                        path="/dashboard" 
                        element={
                          <ProtectedRoute allowedRoles={['user', 'admin']}>
                            <Outlet />
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<DashboardRouter />} />
                        <Route path="home" element={<HomeDashboard />} />
                        <Route path="free-member" element={<FreeMemberDashboard />} />
                        <Route path="premium-member" element={<PremiumMemberDashboard />} />
                        <Route path="my-profile" element={<MyProfile />} />
                        <Route path="my-bookings" element={<MyBookingsPage />} />
                        <Route path="user-messages" element={<UserMessagesPage />} />
                        <Route path="notifications" element={<Notifications />} />
                        <Route path="santha-history" element={<SanthaHistoryPage />} />
                      </Route>

                      {/* Legacy Redirects */}
                      <Route path="/my-profile" element={<Navigate to="/dashboard/my-profile" replace />} />
                      <Route path="/my-bookings" element={<Navigate to="/dashboard/my-bookings" replace />} />
                      <Route path="/user-messages" element={<Navigate to="/dashboard/user-messages" replace />} />
                      <Route path="/notifications" element={<Navigate to="/dashboard/notifications" replace />} />

                      {/* Admin Routes */}
                      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                      <Route path="/admin/santha-management" element={<ProtectedRoute allowedRoles={['admin']}><SanthaHistoryPage /></ProtectedRoute>} />
                      <Route path="/admin/pooja-approvals" element={<ProtectedRoute allowedRoles={['admin']}><AdminPoojaApprovals /></ProtectedRoute>} />
                      <Route path="/admin/poojas/create" element={<ProtectedRoute allowedRoles={['admin']}><AdminPoojaCreate /></ProtectedRoute>} />
                      <Route path="/admin/pooja-archive" element={<ProtectedRoute allowedRoles={['admin']}><AdminPoojaArchive /></ProtectedRoute>} />
                      <Route path="/admin/donation-approvals" element={<ProtectedRoute allowedRoles={['admin']}><AdminDonationApprovalPage /></ProtectedRoute>} />
                      <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={['admin']}><AdminPaymentsPage /></ProtectedRoute>} />
                      <Route path="/admin/gallery-management" element={<ProtectedRoute allowedRoles={['admin']}><AdminGalleryManagement /></ProtectedRoute>} />
                      <Route path="/admin/subscriptions" element={<ProtectedRoute allowedRoles={['admin']}><AdminSubscriptionManagement /></ProtectedRoute>} />
                      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
                      <Route path="/admin/roles" element={<ProtectedRoute allowedRoles={['admin']}><AdminRoleManagement /></ProtectedRoute>} />
                      <Route path="/admin/messages" element={<ProtectedRoute allowedRoles={['admin']}><AdminMessages /></ProtectedRoute>} />
                      <Route path="/admin/temple-accounts" element={<ProtectedRoute allowedRoles={['admin']}><AdminTempleAccounts /></ProtectedRoute>} />
                      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminMonthlyDetailReport /></ProtectedRoute>} />
                      <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={['admin']}><CategoryMasterPage /></ProtectedRoute>} />
                      <Route path="/admin/festivals" element={<ProtectedRoute allowedRoles={['admin']}><FestivalManager /></ProtectedRoute>} />
                      <Route path="/admin/expenses" element={<ProtectedRoute allowedRoles={['admin']}><ExpenseManagerPage /></ProtectedRoute>} />
                      <Route path="/admin/financial-transparency" element={<ProtectedRoute allowedRoles={['admin']}><FinancialTransparency /></ProtectedRoute>} />
                      <Route path="/admin/account-types" element={<ProtectedRoute allowedRoles={['admin']}><AccountTypeSettings /></ProtectedRoute>} />
                      <Route path="/admin/payment-accounts" element={<ProtectedRoute allowedRoles={['admin']}><AdminPaymentAccountPage /></ProtectedRoute>} />
                      <Route path="/admin/temple-payment-accounts" element={<ProtectedRoute allowedRoles={['admin']}><AdminTemplePaymentAccounts /></ProtectedRoute>} />
                      <Route path="/admin/page-management" element={<ProtectedRoute allowedRoles={['admin']}><UserPageManagement /></ProtectedRoute>} />
                      <Route path="/admin/user-account-assignment" element={<ProtectedRoute allowedRoles={['admin']}><UserAccountAssignmentPage /></ProtectedRoute>} />
                      <Route path="/admin/diagnostic" element={<ProtectedRoute allowedRoles={['admin']}><AdminDiagnosticPage /></ProtectedRoute>} />
                      <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AdminAuditLogs /></ProtectedRoute>} />

                      {/* Fallback 404 Route */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </ErrorBoundary>
                </Suspense>
              </Router>
            </LanguageProvider>
          </AccessibilityProvider>
        </ErrorProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;