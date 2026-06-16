import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Challenge { id: string; title: string; description?: string; endsAt?: string; }
interface Submission { id: string; title: string; description?: string; voteCount?: number; displayName?: string; }

export default function ChallengesTab() {
  const qc = useQueryClient();

  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ['community/challenges'],
    queryFn: () => fetch('/api/community/challenges').then(r => r.json()),
    staleTime: 30_000,
  });

  const vote = useMutation({
    mutationFn: (subId: string) => fetch(`/api/community/challenges/submissions/${subId}/vote`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community/challenges'] }); toast.success('Vote cast!'); },
  });

  return (
    <div className="space-y-4">
      {challenges.map(c => (
        <div key={c.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold">{c.title}</h3>
            <Badge variant="success">Active</Badge>
          </div>
          {c.description && <p className="text-sm text-[var(--muted-foreground)] mb-2">{c.description}</p>}
          {c.endsAt && <p className="text-xs text-[var(--muted-foreground)]">Ends {c.endsAt}</p>}
        </div>
      ))}
      {challenges.length === 0 && (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <div className="text-4xl mb-2">🏆</div>
          <p>No active challenges right now. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
