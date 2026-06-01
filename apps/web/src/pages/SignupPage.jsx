import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, AlertCircle } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  passwordConfirm: z.string()
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"],
});

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated, initialLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Redirect logged-in users away from the signup page
  useEffect(() => {
    if (!initialLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, initialLoading, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      passwordConfirm: ''
    }
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError('');
    try {
      await signup(data.email, data.password, data.fullName);
      toast.success('Account created successfully!');
      // AuthContext handles auto-login which sets isAuthenticated, 
      // triggering the useEffect redirect to /dashboard
    } catch (error) {
      console.error('Error during signup:', error);
      setServerError(error.message || 'An error occurred during signup. Please try again.');
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Do not render signup form if already authenticated
  if (isAuthenticated && !initialLoading) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/30">
      <Helmet>
        <title>Sign Up | Temple Portal</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md shadow-xl border-border/50 bg-card rounded-2xl overflow-hidden">
          <CardHeader className="space-y-2 text-center pb-6 bg-muted/10 border-b border-border/50">
            <CardTitle className="text-3xl font-bold tracking-tight text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
              Create Account
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Join our community to access free temple services
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="fullName" 
                    placeholder="Maya Chen" 
                    className={`pl-10 h-12 rounded-xl bg-background text-foreground transition-all ${errors.fullName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    {...register('fullName')} 
                  />
                </div>
                {errors.fullName && <p className="text-sm text-destructive font-medium">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="maya@example.com" 
                    className={`pl-10 h-12 rounded-xl bg-background text-foreground transition-all ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    {...register('email')} 
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive font-medium">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className={`pl-10 h-12 rounded-xl bg-background text-foreground transition-all ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    {...register('password')} 
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive font-medium">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="passwordConfirm" 
                    type="password" 
                    placeholder="••••••••" 
                    className={`pl-10 h-12 rounded-xl bg-background text-foreground transition-all ${errors.passwordConfirm ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    {...register('passwordConfirm')} 
                  />
                </div>
                {errors.passwordConfirm && <p className="text-sm text-destructive font-medium">{errors.passwordConfirm.message}</p>}
              </div>

              {serverError && (
                <div className="flex items-start gap-2 text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{serverError}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold mt-4 shadow-sm rounded-xl active:scale-[0.98] transition-all" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground border-t border-border/50 pt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline hover:text-primary/80 transition-all">
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default SignupPage;