import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MealPlan { id: string; date: string; mealSlot: string; mealType?: string; customName?: string; servings?: number; isCooked?: boolean; }

const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function weekDays(baseDate: Date) {
  const days = [];
  const monday = new Date(baseDate);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MealPlanPage() {
  const qc = useQueryClient();
  const [weekBase, setWeekBase] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [addDay, setAddDay] = useState('');
  const [addSlot, setAddSlot] = useState('Dinner');
  const [form, setForm] = useState({ customName: '', servings: 1 });

  const days = weekDays(weekBase);

  const { data: plans = [] } = useQuery<MealPlan[]>({
    queryKey: ['meal-plan'],
    queryFn: () => fetch('/api/meal-plan').then(r => r.json()),
    staleTime: 30_000,
  });

  const addPlan = useMutation({
    mutationFn: (data: object) =>
      fetch('/api/meal-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-plan'] }); toast.success('Meal added!'); setAddOpen(false); },
    onError: () => toast.error('Failed to add meal'),
  });

  const deletePlan = useMutation({
    mutationFn: (id: string) => fetch(`/api/meal-plan/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan'] }),
  });

  const generateShopping = useMutation({
    mutationFn: () => fetch('/api/meal-plan/generate-shopping', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: days[0], endDate: days[6] }),
    }).then(r => r.json()),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['shopping'] }); toast.success(`${d.added?.length ?? 0} items added to shopping list`); },
    onError: () => toast.error('Failed to generate shopping list'),
  });

  function mealsForDay(day: string, slot: string) {
    return plans.filter(p => p.date === day && p.mealSlot.toLowerCase() === slot.toLowerCase());
  }

  function prevWeek() { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); }
  function nextWeek() { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); }

  return (
    <Layout>
      <div className="p-4 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h1 className="text-2xl font-black">Meal Plan</h1>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={prevWeek}><ChevronLeft size={16} /></Button>
            <span className="text-sm font-medium">{days[0]} – {days[6]}</span>
            <Button variant="outline" size="sm" onClick={nextWeek}><ChevronRight size={16} /></Button>
            <Button size="sm" variant="outline" onClick={() => generateShopping.mutate()}>Add Missing to List</Button>
          </div>
        </div>

        {/* Week grid */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 gap-1 min-w-[700px]">
            {/* Header */}
            <div className="p-2" />
            {days.map((day, i) => (
              <div key={day} className="p-2 text-center">
                <div className="text-xs text-[var(--muted-foreground)]">{DAY_LABELS[i]}</div>
                <div className="text-sm font-medium">{day.slice(8)}</div>
              </div>
            ))}

            {/* Slots */}
            {SLOTS.map(slot => (
              <>
                <div key={slot} className="p-2 text-xs font-semibold text-[var(--muted-foreground)] flex items-center">{slot}</div>
                {days.map(day => {
                  const meals = mealsForDay(day, slot);
                  return (
                    <div key={`${day}-${slot}`} className="border border-[var(--border)] rounded-lg p-1 min-h-[60px]">
                      {meals.map(m => (
                        <div key={m.id} className="text-xs p-1 rounded bg-[var(--primary)] bg-opacity-10 text-[var(--primary)] mb-0.5 flex justify-between items-center gap-1">
                          <span className="truncate">{m.customName ?? 'Meal'}</span>
                          <button className="shrink-0 opacity-60 hover:opacity-100" onClick={() => deletePlan.mutate(m.id)}>✕</button>
                        </div>
                      ))}
                      <button
                        className="w-full h-6 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                        onClick={() => { setAddDay(day); setAddSlot(slot); setAddOpen(true); }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Add meal dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Meal — {addDay} {addSlot}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1"><Label>Meal Name</Label><Input value={form.customName} onChange={e => setForm(f => ({ ...f, customName: e.target.value }))} placeholder="e.g. Chicken Stir-Fry" /></div>
              <div className="space-y-1">
                <Label>Slot</Label>
                <Select value={addSlot} onValueChange={setAddSlot}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Servings</Label><Input type="number" value={form.servings} min={1} onChange={e => setForm(f => ({ ...f, servings: Number(e.target.value) }))} /></div>
              <Button className="w-full" disabled={!form.customName || addPlan.isPending} onClick={() => addPlan.mutate({ date: addDay, mealSlot: addSlot, customName: form.customName, servings: form.servings, mealType: 'custom' })}>
                {addPlan.isPending ? 'Adding...' : 'Add Meal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
