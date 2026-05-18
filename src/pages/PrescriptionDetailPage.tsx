import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PrescriptionDetail } from '@/features/prescriptions/PrescriptionDetail';

export default function PrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-xl font-bold">Prescription</h1>
      {id && <PrescriptionDetail prescriptionId={id} />}
    </div>
  );
}