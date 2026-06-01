import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isAdmin, accountType, initialLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Destination to redirect to after successful login
  const from = location.state?.from || (isAdmin ? '/admin/dashboard' : '/dashboard');

  // Redirect logged-in users away from the login page
  useEffect(() => {
    if (!initialLoading && isAuthenticated) {
      const destination = location.state?.from || (isAdmin || accountType === 'Admin' ? '/admin/dashboard' : '/dashboard');
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, initialLoading, navigate, from, isAdmin, accountType, location.state]);

  const validateForm = () => {
    if (!email.trim() || !password.trim()) {
      setError('Both email and password are required.');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address format.');
      return false;
    }
    
    return true;
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      await login(email.trim(), password);
      toast.success('Successfully logged in!');
      // Redirection is handled by the useEffect above once auth state updates
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Do not render login form if already authenticated
  if (isAuthenticated && !initialLoading) return null;

  return (
    <>
      <Helmet>
        <title>Sign In - Sri Siththi Vinayagar Temple</title>
        <meta name="description" content="Sign in to your temple account to manage bookings, donations, and access premium services." />
      </Helmet>
      <div className="min-h-[100dvh] flex flex-col bg-muted/30">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md shadow-xl border-border/50 rounded-2xl overflow-hidden">
            <CardHeader className="text-center space-y-3 pb-6 bg-muted/10 border-b border-border/50">
              <img 
                src="https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/fe1754409466f2095ee1c609007711a1.png"
                alt="Sri Siththi Vinayagar Temple Logo"
                className="h-16 w-auto object-contain mx-auto drop-shadow-sm"
              />
              <CardTitle className="text-2xl font-bold text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                Welcome Back
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign in to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 bg-card">
              <form onSubmit={handleEmailLogin} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      required
                      className={`pl-10 bg-background text-foreground h-12 rounded-xl ${error && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline transition-all">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      required
                      className="pl-10 bg-background text-foreground h-12 rounded-xl"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold shadow-sm rounded-xl active:scale-[0.98] transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    'Sign In'
                  )}
            </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border/50">
                <p>Don't have an account yet?</p>
                <Link 
                  to="/signup" 
                  className="inline-block mt-2 text-primary font-semibold hover:text-primary/80 hover:underline transition-colors"
                >
                  Create a new account
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default LoginPage;