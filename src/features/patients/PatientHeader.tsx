import { AlertTriangle } from 'lucide-react';
import { ageFromDOB } from '@/lib/date';

interface PatientHeaderProps {
  fullName: string;
  mobile: string;
  gender: 'M' | 'F' | 'O' | string;
  dob?: string | null;
  allergies?: string | null;
}

const GENDER_LABEL: Record<string, string> = { M: 'Male', F: 'Female', O: 'Other' };

export function PatientHeader({
  fullName,
  mobile,
  gender,
  dob,
  allergies,
}: PatientHeaderProps) {
  const age = dob ? ageFromDOB(new Date(dob)) : null;
  // Mask last 4 digits of mobile (PHI: show only first 6)
  const maskedMobile = mobile.replace(/(\d{6})(\d{4})/, '$1XXXX');

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex-1 min-w-0">
        <h2 className="truncate text-lg font-semibold leading-tight">{fullName}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {age !== null && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              {age}y · {GENDER_LABEL[gender] ?? gender}
            </span>
          )}
          <span>{maskedMobile}</span>
        </div>
      </div>
      {allergies && (
        <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="max-w-[200px] truncate">{allergies}</span>
        </div>
      )}
    </div>
  );
}