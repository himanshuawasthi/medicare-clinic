// T046-T047 (US-6): Full implementation in Phase 5
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Stethoscope } from 'lucide-react';
import { usePatient } from '@/features/patients/queries';
import { PatientHeader } from '@/features/patients/PatientHeader';
import { HistoryList } from '@/features/prescriptions/HistoryList';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading } = usePatient(id);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        onClick={() => navigate('/patients')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </button>

      <PatientHeader
        fullName={patient.full_name}
        mobile={patient.mobile}
        gender={patient.gender}
        dob={patient.dob}
        allergies={patient.allergies}
      />

      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/consult/${patient.id}`)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Stethoscope className="h-4 w-4" />
          New Consultation
        </button>
      </div>

      <HistoryList patientId={patient.id} />
    </div>
  );
}