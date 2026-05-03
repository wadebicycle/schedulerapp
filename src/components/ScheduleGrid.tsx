import * as React from 'react';
import { 
  format, 
  addDays, 
  isSameDay 
} from 'date-fns';
import { Plan, PlanColor, Language, Theme } from '../types';
import { cn } from '@/lib/utils';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';
import { translations } from '../lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLOR_MAP: Record<PlanColor, string> = {
  default: 'bg-white grayscale dark:bg-slate-800',
  green: 'bg-[#92D050] text-[#000]',
  yellow: 'bg-[#FFFF00] text-[#000]',
  gray: 'bg-[#7F7F7F] text-[#fff]',
  red: 'bg-[#FF0000] text-[#fff]',
  blue: 'bg-[#0070C0] text-[#fff]',
};

interface ScheduleGridProps {
  currentWeekStart: Date;
  plans: Plan[];
  onAddPlan: (plan: Plan) => void;
  onUpdatePlan: (plan: Plan) => void;
  onDeletePlan: (id: string) => void;
  onPlanTurnGreen?: (plan: Plan) => void;
  language: Language;
  theme: Theme;
  startHour: number;
  endHour: number;
}

export function ScheduleGrid({ 
  currentWeekStart, 
  plans, 
  onAddPlan, 
  onUpdatePlan, 
  onDeletePlan,
  onPlanTurnGreen,
  language,
  theme,
  startHour,
  endHour,
}: ScheduleGridProps) {

  const t = (key: keyof typeof translations.en) => translations[language][key];
  const dayLabels = [t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday'), t('sunday')];
  const dayShortLabels = [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')];

  const HOURS = React.useMemo(
    () => Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour),
    [startHour, endHour]
  );

  const [editingPlan, setEditingPlan] = React.useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newColor, setNewColor] = React.useState<PlanColor>('yellow');
  const [newDuration, setNewDuration] = React.useState(1);
  const [newNotes, setNewNotes] = React.useState('');

  const daysOfCurrentWeek = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const clickCount = React.useRef(0);
  const clickTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleUnifiedClick = (date: Date, hour: number) => {
    const existing = plans.find(p => isSameDay(new Date(p.date), date) && p.startHour === hour);

    if (!existing || existing.title === '') {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        clickCount.current = 0;
      }
      
      if (existing) {
        setEditingPlan(existing);
        setNewTitle(existing.title);
        setNewColor(existing.color);
        setNewDuration(existing.duration);
        setNewNotes(existing.notes || '');
      } else {
        setEditingPlan({
          id: crypto.randomUUID(),
          title: '',
          date: date.toISOString(),
          startHour: hour,
          duration: 1,
          color: 'yellow'
        } as Plan);
        setNewTitle('');
        setNewColor('yellow');
        setNewDuration(1);
        setNewNotes('');
      }
      setIsDialogOpen(true);
      return;
    }

    clickCount.current += 1;

    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
    }

    clickTimer.current = setTimeout(() => {
      if (clickCount.current === 1) {
        const updated = { ...existing, color: 'yellow' as PlanColor };
        onUpdatePlan(updated);
      } else if (clickCount.current === 2) {
        const updated = { ...existing, color: 'green' as PlanColor };
        onUpdatePlan(updated);
        if (existing.color !== 'green') {
          onPlanTurnGreen?.(updated);
        }
      } else if (clickCount.current >= 3) {
        onUpdatePlan({ ...existing, color: 'default' as PlanColor });
      }
      clickCount.current = 0;
      clickTimer.current = null;
    }, 300);
  };

  const handleOpenEdit = (plan: Plan, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlan(plan);
    setNewTitle(plan.title);
    setNewColor(plan.color);
    setNewDuration(plan.duration);
    setNewNotes(plan.notes || '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingPlan) return;
    const planToSave = { ...editingPlan, title: newTitle, color: newColor, duration: newDuration, notes: newNotes || undefined };
    const wasGreen = plans.find(p => p.id === editingPlan.id)?.color === 'green';
    
    if (plans.some(p => p.id === planToSave.id)) {
      await onUpdatePlan(planToSave);
      if (!wasGreen && newColor === 'green') {
        onPlanTurnGreen?.(planToSave);
      }
    } else {
      await onAddPlan(planToSave);
      if (newColor === 'green') {
        onPlanTurnGreen?.(planToSave);
      }
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (editingPlan) {
      onDeletePlan(editingPlan.id);
      setIsDialogOpen(false);
    }
  };

  const maxDuration = (hour: number) => Math.min(12, endHour - hour + 1);

  return (
    <div className={cn(
      "w-full overflow-x-auto rounded-xl border transition-colors",
      theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
    )}>
      <table className="w-full border-collapse table-fixed min-w-[600px]">
        <thead className="sticky top-0 z-30">
          <tr className={theme === 'dark' ? "bg-slate-800/95 backdrop-blur" : "bg-slate-50/95 backdrop-blur"}>
            <th className={cn(
              "w-14 md:w-20 border p-2 text-[10px] font-black uppercase tracking-wider sticky left-0 z-30",
              theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-300 text-slate-500"
            )}>
              <Clock className="w-3 h-3 mx-auto" />
            </th>
            {daysOfCurrentWeek.map((day, i) => (
              <th key={i} className={cn(
                "border p-2 text-[10px] md:text-xs font-black uppercase tracking-tight",
                theme === 'dark' ? "border-slate-800 text-slate-300 bg-slate-800/95" : "border-slate-300 text-slate-800 bg-slate-50/95",
                isSameDay(day, new Date()) && "bg-[#107C41]/10 text-[#107C41]"
              )}>
                <span className="hidden md:inline">{dayLabels[i]}</span>
                <span className="md:hidden">{dayShortLabels[i]}</span>
                <div className="text-[10px] opacity-50">{format(day, 'd/M')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map(hour => (
            <tr key={hour} className="h-10 md:h-12">
              <td className={cn(
                "border text-center font-bold text-[10px] md:text-xs sticky left-0 z-20",
                theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-600" : "bg-slate-50 border-slate-300 text-slate-400"
              )}>
                {hour}:00
              </td>
              {daysOfCurrentWeek.map((day, dayIndex) => {
                const plan = plans.find(p => isSameDay(new Date(p.date), day) && p.startHour === hour);
                const isPartofPreviousPlan = plans.some(p => 
                  isSameDay(new Date(p.date), day) && 
                  hour > p.startHour && 
                  hour < p.startHour + p.duration
                );

                if (isPartofPreviousPlan) return null;

                return (
                  <td 
                    key={dayIndex} 
                    rowSpan={plan?.duration || 1}
                    className={cn(
                      "border p-0 relative group cursor-pointer transition-all duration-200",
                      theme === 'dark' ? "border-slate-800" : "border-slate-300",
                      plan ? COLOR_MAP[plan.color] : (theme === 'dark' ? "bg-slate-900/50 hover:bg-slate-800" : "bg-white hover:bg-slate-50")
                    )}
                    onClick={() => handleUnifiedClick(day, hour)}
                  >
                    {plan ? (
                      <div className="w-full h-full p-1.5 text-[10px] md:text-xs font-bold flex flex-col items-center justify-center text-center relative leading-tight gap-0.5">
                        <span className={cn(plan.title === '' && "italic opacity-30")}>
                          {plan.title || t('enterTask')}
                        </span>
                        {plan.duration > 1 && (
                          <span className="text-[9px] opacity-50">{plan.duration}{t('hours_suffix')}</span>
                        )}
                        {plan.notes && (
                          <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-current opacity-40" title={plan.notes} />
                        )}
                        <button 
                          onClick={(e) => handleOpenEdit(plan, e)}
                          className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 p-1 rounded hover:bg-black/20"
                        >
                          <Edit2 className="w-2 md:w-3 h-2 md:h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity">
                        <Plus className="w-4 md:w-5 h-4 md:h-5 text-slate-400" />
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={cn("sm:rounded-2xl border-none max-w-sm", theme === 'dark' ? "bg-slate-900" : "bg-white")}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? "text-white" : "text-green-800"}>
              {plans.some(p => p.id === editingPlan?.id) ? t('editPlan') : t('addPlan')}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editingPlan && `${editingPlan.startHour}:00 — ${format(new Date(editingPlan.date), 'EEE, d/M')}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Title */}
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="title" className={cn("text-right text-xs font-bold", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                {t('title')}
              </Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className={cn("col-span-3 font-semibold", theme === 'dark' ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200")}
                placeholder={t('enterTask')}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              />
            </div>

            {/* Duration */}
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className={cn("text-right text-xs font-bold", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                {t('duration')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Select
                  value={String(newDuration)}
                  onValueChange={(v) => setNewDuration(Number(v))}
                >
                  <SelectTrigger className={cn("w-28", theme === 'dark' ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: editingPlan ? maxDuration(editingPlan.startHour) : 8 }, (_, i) => i + 1).map(h => (
                      <SelectItem key={h} value={String(h)}>{h} {h === 1 ? 'giờ' : 'giờ'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className={cn("text-xs", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                  → {editingPlan ? editingPlan.startHour + newDuration : ''}:00
                </span>
              </div>
            </div>

            {/* Color */}
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className={cn("text-right text-xs font-bold", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                {t('color')}
              </Label>
              <div className="col-span-3 flex gap-2 flex-wrap">
                {(Object.keys(COLOR_MAP) as PlanColor[]).map(color => (
                  <button
                    key={color}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                      COLOR_MAP[color],
                      theme === 'dark' ? "border-slate-700" : "border-slate-300",
                      newColor === color && "ring-2 ring-[#107C41] ring-offset-2 dark:ring-offset-slate-900 scale-110"
                    )}
                    onClick={() => setNewColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-4 items-start gap-3">
              <Label className={cn("text-right text-xs font-bold pt-2", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                {t('notes')}
              </Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                rows={2}
                className={cn(
                  "col-span-3 text-xs resize-none",
                  theme === 'dark' ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-slate-50 border-slate-200"
                )}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between w-full flex-row gap-2">
            {plans.some(p => p.id === editingPlan?.id) && (
              <Button variant="destructive" size="sm" onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                <Trash2 className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">{t('delete')}</span>
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className={theme === 'dark' ? "text-slate-400" : ""}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSave} size="sm" className="bg-[#107C41] hover:bg-[#0d6435] text-white">
                {t('save')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
