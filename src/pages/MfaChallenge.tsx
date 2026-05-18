// MFA challenge page — TOTP verification on login (Constitution Security)
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const OtpSchema = z.object({ code: z.string().length(6) });
type OtpForm = z.infer<typeof OtpSchema>;

interface LocationState { factorId?: string }

export default function MfaChallenge() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [isPending, setIsPending] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<OtpForm>({
    resolver: zodResolver(OtpSchema),
  });

  const onSubmit = handleSubmit(async ({ code }) => {
    if (!state?.factorId) {
      toast.error('MFA session expired — please sign in again');
      void navigate('/login');
      return;
    }
    setIsPending(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: state.factorId,
        code,
      });
      if (error) throw error;
      void navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsPending(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-bold">Two-Factor Authentication</h1>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            {...register('code')}
            className="w-full rounded-md border bg-background px-3 py-2 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="000000"
            autoFocus
          />
          {errors.code && (
            <p className="text-xs text-destructive">{errors.code.message}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}