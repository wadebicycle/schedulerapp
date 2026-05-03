/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { 
  format, 
  startOfWeek, 
  addWeeks, 
  subWeeks, 
  isSameDay,
  isSameWeek 
} from 'date-fns';
import { Plan, NotificationSound } from './types';
import { storage } from './lib/storage';
import { signInWithGoogle, resolveRedirectResult, signOutUser, clearAuthState, onAuthChanged, cloudStorage, subscribePlans } from './lib/firebase';
import { PRESET_TRACKS } from './lib/musicTracks';
import { playNotificationSound } from './lib/sounds';
import { User } from 'firebase/auth';
import { ScheduleGrid } from './components/ScheduleGrid';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Trophy, 
  CheckCircle2,
  Settings,
  Moon,
  Sun,
  Volume2,
  LogIn,
  LogOut,
  CloudIcon,
  HardDrive,
  Loader2,
  Bell,
  BellOff,
  Music,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  X,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { translations } from './lib/i18n';
import { AppSettings, Language, Theme } from './types';

import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MOTIVATIONAL = [
  'motivate1',
  'motivate2',
  'motivate3',
  'motivate4',
  'motivate5',
] as const;

function WeekNoteEditor({ weekStart, initialNote, theme, placeholder, onSave }: {
  weekStart: Date;
  initialNote: string;
  theme: Theme;
  placeholder: string;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = React.useState(initialNote);
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => { setNote(initialNote); }, [weekStart.toISOString()]);
  const handleSave = () => {
    onSave(note);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div className="space-y-1.5">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={cn(
          "text-xs resize-none w-full",
          theme === 'dark' ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" : "bg-slate-50 border-slate-200"
        )}
      />
      <Button
        size="sm"
        className={cn("w-full h-6 text-[10px]", saved ? "bg-[#107C41]" : "bg-slate-500 hover:bg-slate-600")}
        onClick={handleSave}
      >
        {saved ? '✓ Saved' : 'Save note'}
      </Button>
    </div>
  );
}

export default function App() {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [weekMetas, setWeekMetas] = React.useState<Record<string, any>>({});
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isSummaryOpen, setIsSummaryOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [authStatus, setAuthStatus] = React.useState<'loading' | 'guest' | 'signed-in'>('loading');
  const [authError, setAuthError] = React.useState('');
  const [customUrlInput, setCustomUrlInput] = React.useState('');
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  // ── Pomodoro ──────────────────────────────────────────────
  type PomodoroMode = 'work' | 'short' | 'long';
  const POMODORO_DURATIONS: Record<PomodoroMode, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const [isPomodoroOpen, setIsPomodoroOpen] = React.useState(false);
  const [pomodoroMode, setPomodoroMode] = React.useState<PomodoroMode>('work');
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = React.useState(POMODORO_DURATIONS.work);
  const [pomodoroRunning, setPomodoroRunning] = React.useState(false);
  const [pomodoroSessions, setPomodoroSessions] = React.useState(0);

  const weekTabsContainerRef = React.useRef<HTMLDivElement>(null);
  const plansUnsubscribeRef = React.useRef<(() => void) | null>(null);

  const [settings, setSettings] = React.useState<AppSettings>(() => storage.getSettings());
  const t = (key: keyof typeof translations.en, params: Record<string, string> = {}) => {
    let text = translations[settings.language][key];
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
    return text;
  };

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const notifiedTasksRef = React.useRef<Set<string>>(new Set());
  
  const [selectedWeekStart, setSelectedWeekStart] = React.useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // All tracks = presets + custom (if set)
  const allTracks = React.useMemo(() => {
    if (settings.customMusicUrl) {
      return [...PRESET_TRACKS, { id: 'custom', name: '🎵 Custom', url: settings.customMusicUrl, isCustom: true }];
    }
    return PRESET_TRACKS;
  }, [settings.customMusicUrl]);

  const currentTrack = allTracks.find(t => t.id === settings.musicTrackId) || PRESET_TRACKS[0];
  const currentStorageUid = user?.uid ?? null;

  // Auth listener
  React.useEffect(() => {
    resolveRedirectResult().then((result) => {
      if (result?.user) {
        setAuthError('');
      }
    }).catch((e: any) => {
      console.error('Redirect auth failed', e?.code, e);
      setAuthError(e?.code || 'unknown');
    });
    const unsubscribe = onAuthChanged(async (firebaseUser) => {
      // Tear down any existing plan subscription
      if (plansUnsubscribeRef.current) {
        plansUnsubscribeRef.current();
        plansUnsubscribeRef.current = null;
      }

      setUser(firebaseUser);
      setAuthLoading(false);
      setAuthStatus(firebaseUser ? 'signed-in' : 'guest');

      if (firebaseUser) {
        setSyncing(true);
        try {
          // Real-time subscription — Firestore is now the source of truth for plans
          let firstSnapshot = true;
          plansUnsubscribeRef.current = subscribePlans(
            firebaseUser.uid,
            (plans) => {
              setPlans(plans);
              if (firstSnapshot) {
                firstSnapshot = false;
                setSyncing(false);
                toast.success(t('dataSynced'));
              }
            },
            () => {
              setSyncing(false);
              toast.error(t('syncError'));
            }
          );
          const [cloudWeekMetas, cloudSettings] = await Promise.all([
            cloudStorage.getWeekMetas(firebaseUser.uid),
            cloudStorage.getSettings(firebaseUser.uid),
          ]);
          setWeekMetas(cloudWeekMetas);
          setSettings({
            ...storage.getSettings(firebaseUser.uid),
            ...cloudSettings,
          } as AppSettings);
        } catch (e) {
          console.error('Cloud sync failed', e);
          toast.error(t('syncError'));
          setPlans(storage.getPlans(firebaseUser.uid));
          setWeekMetas(storage.getWeekMetas(firebaseUser.uid));
          setSyncing(false);
        }
      } else {
        // Guest: blank state only
        setPlans([]);
        setWeekMetas({});
        setSettings(storage.getSettings(null));
        setSyncing(false);
      }
    });
    return () => {
      unsubscribe();
      if (plansUnsubscribeRef.current) {
        plansUnsubscribeRef.current();
        plansUnsubscribeRef.current = null;
      }
    };
  }, []);

  // Online / offline detection
  React.useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Pomodoro countdown tick
  React.useEffect(() => {
    if (!pomodoroRunning) return;
    const id = setInterval(() => {
      setPomodoroSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          setPomodoroRunning(false);
          playNotificationSound(settings.notificationSound ?? 'bell');
          if (pomodoroMode === 'work') {
            setPomodoroSessions(n => n + 1);
            toast.success('🍅 Pomodoro xong! Nghỉ một chút nhé.', { duration: 5000 });
            const nextMode: PomodoroMode = (pomodoroSessions + 1) % 4 === 0 ? 'long' : 'short';
            setPomodoroMode(nextMode);
            setPomodoroSecondsLeft(POMODORO_DURATIONS[nextMode]);
          } else {
            toast.success('⏰ Nghỉ xong! Tiếp tục học thôi.', { duration: 5000 });
            setPomodoroMode('work');
            setPomodoroSecondsLeft(POMODORO_DURATIONS.work);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [pomodoroRunning, pomodoroMode, pomodoroSessions, settings.notificationSound]);

  const switchPomodoroMode = (mode: PomodoroMode) => {
    setPomodoroMode(mode);
    setPomodoroRunning(false);
    setPomodoroSecondsLeft(POMODORO_DURATIONS[mode]);
  };

  // Center active week tab when week changes
  React.useEffect(() => {
    const container = weekTabsContainerRef.current;
    if (!container) return;
    const activeTab = container.querySelector('[data-active="true"]') as HTMLElement | null;
    if (!activeTab) return;
    const containerWidth = container.clientWidth;
    const tabLeft = activeTab.offsetLeft;
    const tabWidth = activeTab.clientWidth;
    container.scrollTo({ left: tabLeft - containerWidth / 2 + tabWidth / 2, behavior: 'smooth' });
  }, [selectedWeekStart]);

  // Clock + theme
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return () => clearInterval(timer);
  }, [settings.theme]);

  // Music player
  React.useEffect(() => {
    if (settings.musicEnabled) {
      if (!audioRef.current || audioRef.current.src !== currentTrack.url) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(currentTrack.url);
        audioRef.current.loop = true;
      }
      audioRef.current.volume = settings.musicVolume;
      audioRef.current.play().catch(e => console.log('Music play blocked by browser', e));
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [settings.musicEnabled, settings.musicVolume, settings.musicTrackId, settings.customMusicUrl]);

  // Notification checker — runs every minute
  React.useEffect(() => {
    if (!settings.notificationsEnabled) return;

    const checkNotifications = () => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      plans.forEach(plan => {
        const planDate = new Date(plan.date);
        const isToday = isSameDay(planDate, now);
        if (!isToday) return;

        const planStartMinutes = plan.startHour * 60;
        const diff = planStartMinutes - nowMinutes;

        if (diff > 13 && diff <= 15) {
          const key = `${plan.id}-${plan.startHour}`;
          if (!notifiedTasksRef.current.has(key)) {
            notifiedTasksRef.current.add(key);
            playNotificationSound(settings.notificationSound);
            toast.info(`🔔 ${t('upcomingTask')}: "${plan.title || '...'}" (${plan.startHour}:00)`, {
              duration: 6000,
            });
          }
        }
      });
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, [settings.notificationsEnabled, settings.notificationSound, plans]);

  // Handle plan turned green — show motivational message
  const handlePlanTurnGreen = React.useCallback((plan: Plan) => {
    const msgs = MOTIVATIONAL;
    const msg = t(msgs[Math.floor(Math.random() * msgs.length)]);
    toast.success(`🌟 ${msg}`, { duration: 4000 });
  }, [settings.language]);

  const handleSignIn = async () => {
    if (!isOnline) {
      toast.error('Không có kết nối internet. Đăng nhập cần có mạng.');
      return;
    }
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch (e: any) {
      console.error('Sign in failed', e?.code, e);
      const code = e?.code || 'unknown';
      setAuthError(code);
      if (e?.code === 'auth/network-request-failed') {
        toast.error('Lỗi mạng. Kiểm tra kết nối internet và thử lại.');
      } else if (e?.code === 'auth/unauthorized-domain') {
        toast.error('Domain chưa được whitelist trong Firebase Authentication.');
      } else if (
        e?.code === 'auth/popup-blocked' ||
        e?.code === 'auth/cancelled-popup-request' ||
        e?.code === 'auth/popup-closed-by-user'
      ) {
        toast.error(`Popup đăng nhập bị chặn: ${code}`);
      } else if (e?.code === 'auth/user-cancelled') {
        toast.info('Đăng nhập bị huỷ.');
      } else {
        toast.error(`Đăng nhập thất bại: ${code}`);
      }
    }
  };

  const handleSignOut = async () => {
    if (plansUnsubscribeRef.current) {
      plansUnsubscribeRef.current();
      plansUnsubscribeRef.current = null;
    }
    try {
      await signOutUser();
      setUser(null);
      setPlans([]);
      setWeekMetas({});
      toast.info(t('signOut'));
    } catch (e) {
      console.error('Sign out failed', e);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (!user) {
      storage.saveSettings(newSettings, currentStorageUid);
    }
    if (user) {
      await cloudStorage.saveSettings(user.uid, newSettings).catch(console.error);
    }
  };

  const handleWeekMetaChange = async (weekStart: string, color: string) => {
    const updatedMetas = { ...weekMetas, [weekStart]: { ...(weekMetas[weekStart] || {}), color } };
    setWeekMetas(updatedMetas);
    if (user) {
      await cloudStorage.saveWeekMeta(user.uid, weekStart, { color }).catch(console.error);
    } else {
      return;
    }
    toast.success('Đã cập nhật trạng thái tuần');
  };

  const handleWeekNoteChange = async (weekStart: string, note: string) => {
    const updatedMetas = { ...weekMetas, [weekStart]: { ...(weekMetas[weekStart] || {}), note } };
    setWeekMetas(updatedMetas);
    if (user) {
      await cloudStorage.saveWeekMeta(user.uid, weekStart, { note }).catch(console.error);
    } else {
      return;
    }
  };

  const handleAddPlan = async (plan: Plan) => {
    if (user) {
      // Firestore is source of truth — onSnapshot will update state
      await cloudStorage.savePlan(user.uid, plan).catch(console.error);
    } else {
      return;
    }
    toast.success('Đã thêm công việc');
  };

  const handleUpdatePlan = async (updatedPlan: Plan) => {
    if (user) {
      await cloudStorage.savePlan(user.uid, updatedPlan).catch(console.error);
    } else {
      return;
    }
    toast.success('Đã cập nhật công việc');
  };

  const handleDeletePlan = async (id: string) => {
    if (user) {
      await cloudStorage.deletePlan(user.uid, id).catch(console.error);
    } else {
      return;
    }
    toast.info('Đã xóa công việc');
  };

  const handleAddCustomMusic = () => {
    if (!customUrlInput.trim()) return;
    handleUpdateSettings({ customMusicUrl: customUrlInput.trim(), musicTrackId: 'custom', musicEnabled: true });
    setCustomUrlInput('');
    toast.success('Đã thêm nhạc tùy chỉnh');
  };

  const handleRemoveCustomMusic = () => {
    handleUpdateSettings({ customMusicUrl: '', musicTrackId: 'lofi1' });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeekStart(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const goToToday = () => {
    setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const weekTabs = React.useMemo(() => {
    const today = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 21 }, (_, i) => addWeeks(today, i - 10));
  }, []);

  const currentWeekPlans = React.useMemo(() => {
    return plans.filter(p => isSameWeek(new Date(p.date), selectedWeekStart, { weekStartsOn: 1 }));
  }, [plans, selectedWeekStart]);

  const completedPlansCount = currentWeekPlans.filter(p => p.color === 'green').length;
  const totalPlansCount = currentWeekPlans.length;



  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300",
      settings.theme === 'dark' ? "bg-slate-950 text-slate-100" : "bg-[#F0F2F5] text-slate-900"
    )}>
      {/* HEADER */}
      <header className={cn(
        "border-b border-slate-200 sticky top-0 z-50",
        settings.theme === 'dark' ? "bg-slate-900/80 backdrop-blur border-slate-800" : "bg-white/80 backdrop-blur"
      )}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="-rotate-3 hover:rotate-0 transition-transform shrink-0">
              <img src="/favicon.svg" alt="Scheduler logo" className="w-9 h-9" />
            </div>
            <div>
              <h1 className={cn(
                "text-lg font-black tracking-tight",
                settings.theme === 'dark' ? "text-white" : "text-[#107C41]"
              )}>{t('appName')}</h1>
              <p className={cn(
                "text-[9px] font-bold uppercase tracking-widest hidden sm:block",
                settings.theme === 'dark' ? "text-slate-500" : "text-slate-400"
              )}>Professional Scheduler</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync indicator */}
            {syncing && (
              <div className="flex items-center gap-1.5 text-xs text-[#107C41]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">{t('syncingData')}</span>
              </div>
            )}

            {/* Notification toggle quick button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn("rounded-full w-8 h-8", settings.notificationsEnabled ? "text-[#107C41]" : (settings.theme === 'dark' ? "text-slate-500" : "text-slate-400"))}
              onClick={() => handleUpdateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
              title={t('notificationsLabel')}
            >
              {settings.notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>

            {/* Auth button */}
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full focus:outline-none">
                    <img 
                      src={user.photoURL || ''} 
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full border-2 border-[#107C41] object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={cn("w-56 border-none shadow-xl", settings.theme === 'dark' ? "bg-slate-800" : "bg-white")}>
                  <DropdownMenuLabel>
                    <p className="text-xs text-slate-500">{t('signedInAs')}</p>
                    <p className={cn("font-bold text-sm truncate", settings.theme === 'dark' ? "text-white" : "text-slate-900")}>{user.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {authStatus === 'signed-in' ? 'Firebase auth ok' : 'Auth pending'}
                    </p>
                    {authError ? <p className="text-[10px] text-red-500 mt-1 truncate">Auth lỗi: {authError}</p> : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs text-[#107C41] font-medium gap-2 cursor-default">
                    <CloudIcon className="w-3.5 h-3.5" />
                    {t('cloudSync')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className={cn("gap-2 cursor-pointer text-red-500 focus:text-red-500", settings.theme === 'dark' ? "focus:bg-slate-700" : "")}
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4" />
                    {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1.5 text-xs font-bold border-[#107C41] text-[#107C41] hover:bg-[#107C41] hover:text-white transition-colors h-8",
                  settings.theme === 'dark' ? "bg-slate-800 border-[#107C41]" : ""
                )}
                onClick={handleSignIn}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('signIn')}</span>
                <span className="sm:hidden">Google</span>
              </Button>
            )}

            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-full w-8 h-8",
                settings.theme === 'dark' ? "text-slate-300 hover:text-white" : "text-slate-600"
              )}
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "hidden lg:flex gap-2 h-8",
                settings.theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 text-slate-600"
              )}
              onClick={() => setIsSummaryOpen(true)}
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-600" />
              {t('summaryButton')}
            </Button>

            <div className={cn(
              "hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
              settings.theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
            )}>
              <Clock className="w-3.5 h-3.5 text-[#107C41]" />
              <span className="text-xs font-mono font-bold tabular-nums text-[#107C41]">
                {format(currentTime, 'HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* OFFLINE BANNER */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-bold text-center py-1.5 px-4 flex items-center justify-center gap-2 z-50">
          <span>📵</span>
          <span>Đang ngoại tuyến — dữ liệu được lưu cục bộ, sẽ đồng bộ khi có mạng trở lại</span>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 overflow-auto p-3 md:p-6 lg:p-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-4 flex flex-row items-center justify-between gap-3">
            <div>
              <h2 className={cn(
                "text-2xl font-black tracking-tight",
                settings.theme === 'dark' ? "text-white" : "text-slate-900"
              )}>
                {t('weekOf')} {format(selectedWeekStart, 'w')}
              </h2>
              <p className={cn(
                "text-sm font-medium",
                settings.theme === 'dark' ? "text-slate-400" : "text-slate-500"
              )}>
                {t('fromTo', { 
                  start: format(selectedWeekStart, 'd MMMM'),
                  end: format(addWeeks(selectedWeekStart, 1), 'd MMMM, yyyy')
                })}
              </p>
            </div>
            {/* Right-side controls */}
            <div className="flex items-center gap-3 shrink-0">
              {completedPlansCount > 0 && (
                <div className={cn(
                  "p-3 rounded-xl border shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-right-4",
                  settings.theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                )}>
                  <div className="bg-yellow-500/10 p-2 rounded-full">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('weeklyProgress')}</p>
                    <p className={cn("text-sm font-medium", settings.theme === 'dark' ? "text-slate-200" : "text-slate-900")}>
                      {completedPlansCount} {t('tasksCompleted')}
                    </p>
                  </div>
                </div>
              )}
              {/* Pomodoro toggle button */}
              <button
                onClick={() => setIsPomodoroOpen(v => !v)}
                title="Pomodoro Timer"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                  isPomodoroOpen
                    ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200"
                    : (settings.theme === 'dark'
                        ? "bg-slate-800 text-slate-400 border-slate-700 hover:border-orange-500 hover:text-orange-400"
                        : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-500"),
                  pomodoroRunning && !isPomodoroOpen && "animate-pulse border-orange-400 text-orange-500"
                )}
              >
                <Timer className="w-4 h-4" />
                <span>Pomodoro</span>
                {pomodoroRunning && (
                  <span className={cn("font-mono text-[10px]", isPomodoroOpen ? "text-white/80" : "text-orange-500")}>
                    {String(Math.floor(pomodoroSecondsLeft / 60)).padStart(2,'0')}:{String(pomodoroSecondsLeft % 60).padStart(2,'0')}
                  </span>
                )}
                {pomodoroSessions > 0 && (
                  <span className={cn("text-[10px]", isPomodoroOpen ? "text-white/80" : "text-orange-400")}>
                    {'🍅'.repeat(Math.min(pomodoroSessions, 4))}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Login prompt for guests */}
          {!user && !authLoading && (
            <div className={cn(
              "mb-4 p-3 rounded-xl border flex items-center justify-between gap-3",
              settings.theme === 'dark' ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            )}>
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-500/10 p-1.5 rounded-lg">
                  <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div>
                  <p className={cn("text-xs font-bold", settings.theme === 'dark' ? "text-slate-200" : "text-slate-700")}>{t('localOnly')}</p>
                  <p className="text-[11px] text-slate-500">{t('loginToSync')}</p>
                </div>
              </div>
              <Button size="sm" className="bg-[#107C41] hover:bg-[#0d6535] text-white gap-1.5 h-7 text-xs shrink-0" onClick={handleSignIn}>
                <LogIn className="w-3 h-3" />
                {t('signIn')}
              </Button>
            </div>
          )}
          {authError && !user && !authLoading ? <div className="mb-4 text-xs text-red-500">Auth lỗi: {authError}</div> : null}

          {/* Schedule Grid */}
          <div className={cn(
            "shadow-2xl mb-6 overflow-hidden rounded-xl border transition-all",
            settings.theme === 'dark' ? "shadow-slate-900/50 border-slate-800" : "shadow-slate-200/50 border-slate-200"
          )}>
            <ScheduleGrid 
              currentWeekStart={selectedWeekStart}
              plans={plans}
              onAddPlan={handleAddPlan}
              onUpdatePlan={handleUpdatePlan}
              onDeletePlan={handleDeletePlan}
              onPlanTurnGreen={handlePlanTurnGreen}
              language={settings.language}
              theme={settings.theme}
              startHour={settings.startHour}
              endHour={settings.endHour}
            />
          </div>

          {/* Bottom cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={cn("border-none shadow-sm", settings.theme === 'dark' ? "bg-slate-900" : "bg-white")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={cn("font-bold text-sm", settings.theme === 'dark' ? "text-slate-300" : "text-slate-700")}>{t('weeklyProgress')}</h3>
                  <Badge className="bg-[#107C41] text-white hover:bg-[#107C41] text-xs">{completedPlansCount}/{totalPlansCount || 0}</Badge>
                </div>
                <div className={cn("w-full h-2 rounded-full overflow-hidden", settings.theme === 'dark' ? "bg-slate-800" : "bg-slate-100")}>
                  <div 
                    className="bg-[#107C41] h-full transition-all duration-1000" 
                    style={{ width: `${totalPlansCount > 0 ? (completedPlansCount / totalPlansCount) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-none shadow-sm bg-[#107C41] text-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold mb-1">{t('stayFocused')}</h3>
                  <p className="text-white/70 text-sm">{t('planStepByStep')}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-white/20 shrink-0" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* FOOTER — sticky on mobile */}
      <footer className={cn(
        "transition-colors border-t sticky bottom-0 z-40",
        settings.theme === 'dark' ? "bg-slate-900/95 backdrop-blur border-slate-800" : "bg-white/95 backdrop-blur border-slate-200"
      )}>
        <div className="container mx-auto px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Prev button */}
            <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')} className="h-6 w-6 shrink-0">
              <ChevronLeft className="w-3 h-3" />
            </Button>

            {/* Week tabs — centered, horizontal scroll */}
            <div
              ref={weekTabsContainerRef}
              className="flex items-center gap-0.5 overflow-x-auto flex-1 pb-1 hide-scrollbar"
            >
              {weekTabs.map((weekStart, i) => {
                const isActive = isSameDay(weekStart, selectedWeekStart);
                const isTodayWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));
                const meta = weekMetas[weekStart.toISOString()];
                
                return (
                  <div key={i}>
                    <Popover>
                      <PopoverTrigger
                        data-active={isActive ? "true" : "false"}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-medium border rounded-t-sm whitespace-nowrap transition-all relative",
                          isActive 
                            ? "bg-[#107C41] text-white border-[#107C41] shadow-sm -translate-y-0.5" 
                            : (settings.theme === 'dark' ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"),
                          isTodayWeek && !isActive && "border-b-2 border-b-[#107C41]"
                        )}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedWeekStart(weekStart);
                        }}
                        onClick={() => setSelectedWeekStart(weekStart)}
                      >
                        {t('week')} {format(weekStart, 'w')}
                        {meta?.color && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: meta.color }} />
                        )}
                      </PopoverTrigger>
                      <PopoverContent className={cn("w-48 p-3 border-none shadow-xl space-y-3", settings.theme === 'dark' ? "bg-slate-800" : "bg-white")}>
                        <div>
                          <p className={cn("text-[10px] font-bold uppercase mb-2", settings.theme === 'dark' ? "text-slate-500" : "text-slate-400")}>{t('markWeek')}</p>
                          <div className="grid grid-cols-4 gap-1">
                            {['#FF0000', '#FFFF00', '#92D050', '#0070C0', '#7F7F7F', '#FFFFFF'].map(color => (
                              <button
                                key={color}
                                className="w-full aspect-square rounded border border-slate-200"
                                style={{ backgroundColor: color }}
                                onClick={() => handleWeekMetaChange(weekStart.toISOString(), color)}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className={cn("text-[10px] font-bold uppercase mb-1.5", settings.theme === 'dark' ? "text-slate-500" : "text-slate-400")}>{t('weekNote')}</p>
                          <WeekNoteEditor
                            weekStart={weekStart}
                            initialNote={weekMetas[weekStart.toISOString()]?.note || ''}
                            theme={settings.theme}
                            placeholder={t('weekNotePlaceholder')}
                            onSave={(note) => handleWeekNoteChange(weekStart.toISOString(), note)}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })}
            </div>

            {/* Next + Today (opens calendar) */}
            <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')} className="h-6 w-6 shrink-0">
              <ChevronRight className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCalendarOpen(true)}
              className={cn(
                "h-6 text-[10px] font-bold px-2 shrink-0",
                settings.theme === 'dark' ? "text-slate-300" : "text-slate-600"
              )}
            >
              {t('today')}
            </Button>
          </div>
        </div>
      </footer>

      <Toaster position="bottom-right" />

      {/* POMODORO FLOATING PANEL */}
      {isPomodoroOpen && (() => {
        const total = POMODORO_DURATIONS[pomodoroMode];
        const elapsed = total - pomodoroSecondsLeft;
        const R = 54;
        const CIRC = 2 * Math.PI * R;
        const progress = CIRC * (1 - elapsed / total);
        const mins = String(Math.floor(pomodoroSecondsLeft / 60)).padStart(2, '0');
        const secs = String(pomodoroSecondsLeft % 60).padStart(2, '0');
        const modeColor = pomodoroMode === 'work' ? '#f97316' : pomodoroMode === 'short' ? '#22c55e' : '#8b5cf6';
        const modeBg   = pomodoroMode === 'work' ? 'bg-orange-500' : pomodoroMode === 'short' ? 'bg-green-500' : 'bg-violet-500';
        const modeLabel = pomodoroMode === 'work' ? 'Tập trung' : pomodoroMode === 'short' ? 'Nghỉ ngắn' : 'Nghỉ dài';
        return (
          <div className={cn(
            "fixed bottom-16 left-4 z-50 w-64 rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200",
            settings.theme === 'dark' ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
          )}>
            {/* Header */}
            <div className={cn("flex items-center justify-between px-4 py-2.5", modeBg)}>
              <div className="flex items-center gap-2 text-white">
                <Timer className="w-3.5 h-3.5" />
                <span className="text-xs font-black uppercase tracking-wide">Pomodoro</span>
                {pomodoroSessions > 0 && (
                  <span className="text-[11px] text-white/80">{'🍅'.repeat(Math.min(pomodoroSessions, 8))}</span>
                )}
              </div>
              <button onClick={() => setIsPomodoroOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className={cn("flex border-b", settings.theme === 'dark' ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-slate-50")}>
              {(['work', 'short', 'long'] as PomodoroMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => switchPomodoroMode(m)}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all",
                    pomodoroMode === m
                      ? (m === 'work' ? "text-orange-500 border-b-2 border-orange-500" : m === 'short' ? "text-green-500 border-b-2 border-green-500" : "text-violet-500 border-b-2 border-violet-500")
                      : (settings.theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                  )}
                >
                  {m === 'work' ? 'Focus' : m === 'short' ? 'Short' : 'Long'}
                </button>
              ))}
            </div>

            {/* Circle timer */}
            <div className="flex flex-col items-center py-5 gap-1">
              <div className="relative w-32 h-32">
                <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
                  <circle cx="64" cy="64" r={R} fill="none" stroke={settings.theme === 'dark' ? '#1e293b' : '#f1f5f9'} strokeWidth="8" />
                  <circle
                    cx="64" cy="64" r={R}
                    fill="none"
                    stroke={modeColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={progress}
                    style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-3xl font-black font-mono tabular-nums", settings.theme === 'dark' ? "text-white" : "text-slate-800")}>
                    {mins}:{secs}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: modeColor }}>{modeLabel}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => { setPomodoroSecondsLeft(POMODORO_DURATIONS[pomodoroMode]); setPomodoroRunning(false); }}
                  className={cn("p-2 rounded-full transition-colors", settings.theme === 'dark' ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500")}
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPomodoroRunning(r => !r)}
                  className="w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                  style={{ backgroundColor: modeColor }}
                >
                  {pomodoroRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <button
                  onClick={() => { const next = pomodoroMode === 'work' ? 'short' : 'work'; switchPomodoroMode(next); }}
                  className={cn("p-2 rounded-full transition-colors text-[10px] font-bold", settings.theme === 'dark' ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500")}
                  title="Skip"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Session count */}
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={cn("w-3 h-3 rounded-full border-2 transition-all",
                    i < (pomodoroSessions % 4)
                      ? "bg-orange-400 border-orange-400"
                      : (settings.theme === 'dark' ? "border-slate-600" : "border-slate-300")
                  )} />
                ))}
                <span className={cn("text-[10px] ml-1", settings.theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                  {pomodoroSessions} session{pomodoroSessions !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MONTH CALENDAR PICKER DIALOG */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className={cn(
          "max-w-sm border-none p-0",
          settings.theme === 'dark' ? "bg-slate-900" : "bg-white"
        )}>
          <DialogHeader className={cn(
            "px-5 pt-5 pb-3 border-b",
            settings.theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
          )}>
            <DialogTitle className={cn(
              "text-base font-black flex items-center gap-2",
              settings.theme === 'dark' ? "text-white" : "text-slate-900"
            )}>
              <Calendar className="w-4 h-4 text-[#107C41]" />
              {t('today')}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">{format(new Date(), 'MMMM yyyy')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center p-4 gap-3">
            <CalendarPicker
              mode="single"
              selected={selectedWeekStart}
              defaultMonth={selectedWeekStart}
              onSelect={(day) => {
                if (!day) return;
                const ws = startOfWeek(day, { weekStartsOn: 1 });
                setSelectedWeekStart(ws);
                setIsCalendarOpen(false);
              }}
              className={cn(
                "[--cell-size:--spacing(8)]",
                settings.theme === 'dark' ? "text-slate-200" : ""
              )}
            />
            <Button
              size="sm"
              className="w-full bg-[#107C41] hover:bg-[#0E6B37] text-white text-xs h-8"
              onClick={() => {
                goToToday();
                setIsCalendarOpen(false);
              }}
            >
              {t('today')} (current week)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* YEAR SUMMARY DIALOG */}
      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className={cn(
          "max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border-none p-0",
          settings.theme === 'dark' ? "bg-slate-900" : "bg-[#F0F2F5]"
        )}>
          <DialogHeader className={cn(
            "p-6 border-b",
            settings.theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          )}>
            <DialogTitle className={cn(
              "text-xl font-black flex items-center gap-3",
              settings.theme === 'dark' ? "text-white" : "text-slate-900"
            )}>
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
              {t('summaryYear', { year: format(currentTime, 'yyyy') })}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 52 }, (_, i) => {
                const yearStart = startOfWeek(new Date(new Date().getFullYear(), 0, 1), { weekStartsOn: 1 });
                const weekStart = addWeeks(yearStart, i);
                const weekIso = weekStart.toISOString();
                const meta = weekMetas[weekIso];
                const weekPlans = plans.filter(p => isSameWeek(new Date(p.date), weekStart, { weekStartsOn: 1 }));
                const completed = weekPlans.filter(p => p.color === 'green').length;
                const total = weekPlans.length;
                const isCurrent = isSameWeek(new Date(), weekStart, { weekStartsOn: 1 });

                return (
                  <div 
                    key={i}
                    onClick={() => {
                      setSelectedWeekStart(weekStart);
                      setIsSummaryOpen(false);
                    }}
                    className={cn(
                      "rounded-xl p-3 border-2 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02]",
                      "group relative overflow-hidden",
                      settings.theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-transparent",
                      isCurrent && "border-[#107C41]"
                    )}
                  >
                    {meta?.color && (
                      <div className="absolute top-0 right-0 w-8 h-8 -mr-4 -mt-4 rotate-45" style={{ backgroundColor: meta.color }} />
                    )}
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t('week')} {i + 1}</div>
                    <div className={cn("text-xs font-bold mb-2", settings.theme === 'dark' ? "text-slate-300" : "text-slate-700")}>
                      {format(weekStart, 'd/M')} - {format(addWeeks(weekStart, 1), 'd/M')}
                    </div>
                    {total > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] items-center">
                          <span className="text-slate-500">{completed}/{total}</span>
                          <span className="text-[#107C41] font-bold">{Math.round((completed/total)*100)}%</span>
                        </div>
                        <div className={cn("w-full h-1 rounded-full overflow-hidden", settings.theme === 'dark' ? "bg-slate-700" : "bg-slate-100")}>
                          <div className="bg-[#107C41] h-full transition-all" style={{ width: `${(completed/total)*100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SETTINGS DIALOG */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className={cn(
          "max-w-md border-none sm:rounded-2xl max-h-[90vh] overflow-y-auto",
          settings.theme === 'dark' ? "bg-slate-900" : "bg-white"
        )}>
          <DialogHeader>
            <DialogTitle className={cn("text-xl font-black", settings.theme === 'dark' ? "text-white" : "text-[#107C41]")}>
              {t('settings')}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Customize your experience with the planner.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Language */}
            <div className="flex items-center justify-between">
              <div>
                <Label className={cn("font-bold text-sm", settings.theme === 'dark' ? "text-slate-300" : "text-slate-700")}>{t('language')}</Label>
              </div>
              <Select value={settings.language} onValueChange={(val: Language) => handleUpdateSettings({ language: val })}>
                <SelectTrigger className="w-32 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between">
              <Label className={cn("font-bold text-sm", settings.theme === 'dark' ? "text-slate-300" : "text-slate-700")}>{t('theme')}</Label>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <Button variant={settings.theme === 'light' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => handleUpdateSettings({ theme: 'light' })}>
                  <Sun className="h-3.5 w-3.5" />
                </Button>
                <Button variant={settings.theme === 'dark' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => handleUpdateSettings({ theme: 'dark' })}>
                  <Moon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Notifications */}
            <div className={cn("p-3 rounded-xl space-y-3", settings.theme === 'dark' ? "bg-slate-800" : "bg-slate-50")}>
              <div className="flex items-center justify-between">
                <Label className={cn("font-bold text-sm flex items-center gap-2", settings.theme === 'dark' ? "text-slate-300" : "text-slate-700")}>
                  <Bell className="w-3.5 h-3.5 text-[#107C41]" />
                  {t('notificationsLabel')}
                </Label>
                <Switch checked={settings.notificationsEnabled} onCheckedChange={(val) => handleUpdateSettings({ notificationsEnabled: val })} />
              </div>
              {settings.notificationsEnabled && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-2">{t('notificationSound')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['bird', 'wind', 'bell', 'chime'] as NotificationSound[]).map(sound => (
                      <button
                        key={sound}
                        onClick={() => handleUpdateSettings({ notificationSound: sound })}
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all",
                          settings.notificationSound === sound
                            ? "bg-[#107C41] text-white border-[#107C41]"
                            : (settings.theme === 'dark' ? "bg-slate-700 border-slate-600 text-slate-300" : "bg-white border-slate-200 text-slate-600")
                        )}
                      >
                        {t(sound as keyof typeof translations.en)}
                      </button>
                    ))}
                    <button
                      onClick={() => playNotificationSound(settings.notificationSound)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all",
                        settings.theme === 'dark' ? "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      ▶ {t('testSound')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Music */}
            <div className={cn("p-3 rounded-xl space-y-3", settings.theme === 'dark' ? "bg-slate-800" : "bg-slate-50")}>
              <div className="flex items-center justify-between">
                <Label className={cn("font-bold text-sm flex items-center gap-2", settings.theme === 'dark' ? "text-slate-300" : "text-slate-700")}>
                  <Music className="w-3.5 h-3.5 text-indigo-500" />
                  {t('music')}
                </Label>
                <Switch checked={settings.musicEnabled} onCheckedChange={(val) => handleUpdateSettings({ musicEnabled: val })} />
              </div>

              {/* Track select */}
              <div>
                <p className="text-[10px] text-slate-500 mb-1.5">{t('musicTrack')}</p>
                <Select
                  value={settings.musicTrackId}
                  onValueChange={(val) => handleUpdateSettings({ musicTrackId: val, musicEnabled: true })}
                >
                  <SelectTrigger className={cn("text-xs h-8", settings.theme === 'dark' ? "bg-slate-700 border-slate-600" : "bg-white")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allTracks.map(track => (
                      <SelectItem key={track.id} value={track.id} className="text-xs">{track.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Volume */}
              {settings.musicEnabled && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-1.5"><Volume2 className="w-3 h-3 inline mr-1" />{Math.round(settings.musicVolume * 100)}%</p>
                  <Slider
                    value={[settings.musicVolume * 100]}
                    max={100}
                    step={1}
                    onValueChange={(val) => {
                      const value = Array.isArray(val) ? val[0] : val;
                      handleUpdateSettings({ musicVolume: value / 100 });
                    }}
                    className="cursor-pointer"
                  />
                </div>
              )}

              {/* Custom music URL */}
              <div>
                <p className="text-[10px] text-slate-500 mb-1.5">{t('customMusic')}</p>
                {settings.customMusicUrl ? (
                  <div className="flex items-center gap-2">
                    <p className={cn("text-xs flex-1 truncate font-mono", settings.theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                      {settings.customMusicUrl}
                    </p>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-500 shrink-0" onClick={handleRemoveCustomMusic}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder={t('customMusicPlaceholder')}
                      className={cn("text-xs h-8 flex-1", settings.theme === 'dark' ? "bg-slate-700 border-slate-600 text-white" : "bg-white")}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomMusic(); }}
                    />
                    <Button onClick={handleAddCustomMusic} size="sm" className="h-8 w-8 p-0 bg-[#107C41] hover:bg-[#0d6435] text-white shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Hour range */}
            <div className={cn("p-3 rounded-xl space-y-3", settings.theme === 'dark' ? "bg-slate-800" : "bg-slate-50")}>
              <Label className={cn("font-bold text-sm flex items-center gap-2", settings.theme === 'dark' ? "text-slate-300" : "text-slate-700")}>
                <Clock className="w-3.5 h-3.5 text-[#107C41]" />
                {t('hours')}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">{t('startHour')}</p>
                  <Select
                    value={String(settings.startHour)}
                    onValueChange={(v) => handleUpdateSettings({ startHour: Number(v) })}
                  >
                    <SelectTrigger className={cn("h-8 text-xs", settings.theme === 'dark' ? "bg-slate-700 border-slate-600 text-white" : "bg-white")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i).map(h => (
                        <SelectItem key={h} value={String(h)} className="text-xs">{h}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">{t('endHour')}</p>
                  <Select
                    value={String(settings.endHour)}
                    onValueChange={(v) => handleUpdateSettings({ endHour: Number(v) })}
                  >
                    <SelectTrigger className={cn("h-8 text-xs", settings.theme === 'dark' ? "bg-slate-700 border-slate-600 text-white" : "bg-white")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i).filter(h => h > settings.startHour).map(h => (
                        <SelectItem key={h} value={String(h)} className="text-xs">{h}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Account */}
            <div className={cn("p-3 rounded-xl space-y-2", settings.theme === 'dark' ? "bg-slate-800" : "bg-slate-50")}>
              <Label className={cn("font-bold text-sm", settings.theme === 'dark' ? "text-slate-300" : "text-slate-700")}>Tài khoản</Label>
              {user ? (
                <div className="flex items-center gap-3">
                  <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border-2 border-[#107C41]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold truncate", settings.theme === 'dark' ? "text-white" : "text-slate-900")}>{user.displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 text-xs h-7 shrink-0" onClick={handleSignOut}>
                    <LogOut className="w-3 h-3 mr-1" />
                    {t('signOut')}
                  </Button>
                </div>
              ) : (
                <Button className="w-full bg-[#107C41] hover:bg-[#0d6535] text-white gap-2 h-9 text-sm" onClick={() => { setIsSettingsOpen(false); handleSignIn(); }}>
                  <LogIn className="w-4 h-4" />
                  {t('signIn')}
                </Button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", settings.theme === 'dark' ? "text-slate-600" : "text-slate-300")}>
              Created by <span className="text-[#107C41]">ThanhBicycle</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
