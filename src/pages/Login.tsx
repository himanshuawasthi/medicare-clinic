import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Activity } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof LoginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);
  const [showMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setIsPending(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Role-based redirect
      const userId = data.user.id;
      const { data: userData } = await supabase
        .from('users')
        .select('roles')
        .eq('id', userId)
        .single();
      const roles = (userData?.roles as string[]) ?? [];

      if (roles.includes('Admin')) void navigate('/reports');
      else if (roles.includes('Pharmacist')) void navigate('/store');
      else void navigate('/patients');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsPending(false);
    }
  });

  async function handleMagicLink() {
    const email = getValues('email');
    if (!email || !z.string().email().safeParse(email).success) {
      toast.error('Enter your email address first');
      return;
    }
    setIsPending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setMagicLinkSent(true);
      toast.success(`Magic link sent to ${email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">MediCare</span>
          </div>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {magicLinkSent ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-center text-sm text-green-800">
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-xs">We sent a magic link to your email address.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="doctor@clinic.example"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {!showMagicLink && (
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Signing in…' : 'Sign In'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={isPending}
                className="text-xs text-primary hover:underline"
              >
                Forgot password? Send magic link
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}