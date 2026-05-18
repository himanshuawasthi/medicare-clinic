// MFA enrollment page — TOTP via Supabase Auth (Constitution Security: MFA for Doctor/Pharmacist)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const OtpSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code'),
});
type OtpForm = z.infer<typeof OtpSchema>;

interface EnrollData {
  id: string;
  totp: { qr_code: string; secret: string; uri: string };
}

export default function MfaEnroll() {
  const navigate = useNavigate();
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [step, setStep] = useState<'qr' | 'verify'>('qr');
  const { register, handleSubmit, formState: { errors } } = useForm<OtpForm>({
    resolver: zodResolver(OtpSchema),
  });

  useEffect(() => {
    void supabase.auth.mfa.enroll({ factorType: 'totp' }).then(({ data, error }) => {
      if (error || !data) {
        toast.error('Failed to start MFA enrollment');
        return;
      }
      setEnrollData(data as EnrollData);
      setStep('qr');
    });
  }, []);

  const onSubmit = handleSubmit(async ({ code }) => {
    if (!enrollData) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollData.id,
      code,
    });
    if (error) {
      toast.error('Invalid code — try again');
      return;
    }
    toast.success('MFA enabled successfully');
    void navigate('/');
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-bold">Set Up Two-Factor Authentication</h1>
        <p className="text-sm text-muted-foreground">
          Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </p>

        {step === 'qr' && enrollData && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img
                src={enrollData.totp.qr_code}
                alt="TOTP QR Code"
                className="h-48 w-48 rounded-md border"
              />
            </div>
            <p className="break-all rounded-md bg-muted p-2 text-center font-mono text-xs">
              {enrollData.totp.secret}
            </p>
            <button
              onClick={() => setStep('verify')}
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              I've scanned it — Enter Code
            </button>
          </div>
        )}

        {step === 'verify' && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                6-digit code from your authenticator
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                {...register('code')}
                className="w-full rounded-md border bg-background px-3 py-2 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="000000"
                autoFocus
              />
              {errors.code && (
                <p className="mt-1 text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Verify and Enable MFA
            </button>
          </form>
        )}
      </div>
    </div>
  );
}