import { Plan, AppSettings } from '../types';

const STORAGE_KEY = 'chronos_excel_plans';
const WEEK_META_KEY = 'chronos_week_meta';
const SETTINGS_KEY = 'chronos_settings';

const defaultSettings: AppSettings = {
  language: 'en',
  theme: 'light',
  musicEnabled: false,
  musicVolume: 0.3,
  musicTrackId: 'lofi1',
  customMusicUrl: '',
  notificationsEnabled: false,
  notificationSound: 'bird',
  startHour: 7,
  endHour: 22,
};

export const storage = {
  getPlans: (): Plan[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load plans', e);
      return [];
    }
  },
  savePlans: (plans: Plan[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  },
  getWeekMetas: (): Record<string, any> => {
    try {
      const data = localStorage.getItem(WEEK_META_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },
  saveWeekMeta: (weekStart: string, meta: any) => {
    const metas = storage.getWeekMetas();
    metas[weekStart] = { ...metas[weekStart], ...meta };
    localStorage.setItem(WEEK_META_KEY, JSON.stringify(metas));
  },
  getSettings: (): AppSettings => {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  },
  saveSettings: (settings: Partial<AppSettings>) => {
    const current = storage.getSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  },
  addPlan: (plan: Plan) => {
    const plans = storage.getPlans();
    storage.savePlans([...plans, plan]);
  },
  updatePlan: (updatedPlan: Plan) => {
    const plans = storage.getPlans();
    storage.savePlans(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p));
  },
  deletePlan: (id: string) => {
    const plans = storage.getPlans();
    storage.savePlans(plans.filter(p => p.id !== id));
  }
};
