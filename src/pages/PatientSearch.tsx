import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import { usePatientSearch } from '@/features/patients/queries';
import { ageFromDOB } from '@/lib/date';

const GENDER_LABEL: Record<string, string> = { M: 'Male', F: 'Female', O: 'Other' };

export default function PatientSearch() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // 300 ms debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data: results = [], isFetching } = usePatientSearch(debouncedTerm);

  const showEmpty =
    debouncedTerm.trim().length >= 2 && results.length === 0 && !isFetching;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Find Patient</h1>
        <button
          onClick={() => navigate('/patients/new')}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          New Patient
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or mobile number…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full rounded-md border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        {isFetching && (
          <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <ul className="overflow-hidden rounded-md border bg-card shadow-sm">
          {results.map((patient) => {
            const age = patient.dob ? ageFromDOB(new Date(patient.dob)) : null;
            return (
              <li key={patient.id}>
                <button
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{patient.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {patient.mobile}
                      {age !== null && ` · ${age}y`}
                      {patient.gender &&
                        ` · ${GENDER_LABEL[patient.gender] ?? patient.gender}`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Empty state */}
      {showEmpty && (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No patient found for &ldquo;{debouncedTerm}&rdquo;
          </p>
          <button
            onClick={() => navigate('/patients/new')}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <UserPlus className="h-4 w-4" />
            Register as new patient
          </button>
        </div>
      )}

      {/* Hint */}
      {debouncedTerm.trim().length < 2 && (
        <p className="text-center text-sm text-muted-foreground">
          Enter at least 2 characters to search
        </p>
      )}
    </div>
  );
}