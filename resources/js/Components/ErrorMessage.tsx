import { AlertTriangle } from 'lucide-react';

export function ErrorMessage({ message }: { message?: string | null }) {
    if (!message) {
        return null;
    }

    return (
        <div className="flex gap-3 rounded-lg border border-signal-coral/25 bg-signal-coral/10 px-4 py-3 text-sm text-signal-coral">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}
