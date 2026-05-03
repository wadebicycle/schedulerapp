import { Plan, AppSettings } from '../types';

const defaultSettings: AppSettings = {
  language: 'en',
  theme: 'light',
  musicEnabled: false,
  musicVolume: 0.3,
  musicTrackId: 'lofi1',
  customMusicDataUrl: '',
  customMusicName: '',
  notificationsEnabled: false,
  notificationSound: 'bird',
  startHour: 7,
  endHour: 22,
};

const keyFor = (key: string, uid?: string | null) => uid ? `${key}_${uid}` : key;

export const storage = {
  getPlans: (uid?: string | null): Plan[] => {
    try {
      const data = localStorage.getItem(keyFor('chronos_excel_plans', uid));
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load plans', e);
      return [];
    }
  },
  savePlans: (plans: Plan[], uid?: string | null) => {
    localStorage.setItem(keyFor('chronos_excel_plans', uid), JSON.stringify(plans));
  },
  getWeekMetas: (uid?: string | null): Record<string, any> => {
    try {
      const data = localStorage.getItem(keyFor('chronos_week_meta', uid));
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },
  saveWeekMeta: (weekStart: string, meta: any, uid?: string | null) => {
    const metas = storage.getWeekMetas(uid);
    metas[weekStart] = { ...metas[weekStart], ...meta };
    localStorage.setItem(keyFor('chronos_week_meta', uid), JSON.stringify(metas));
  },
  getSettings: (uid?: string | null): AppSettings => {
    try {
      const data = localStorage.getItem(keyFor('chronos_settings', uid));
      return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  },
  saveSettings: (settings: Partial<AppSettings>, uid?: string | null) => {
    const current = storage.getSettings(uid);
    localStorage.setItem(keyFor('chronos_settings', uid), JSON.stringify({ ...current, ...settings }));
  },
  addPlan: (plan: Plan, uid?: string | null) => {
    const plans = storage.getPlans(uid);
    storage.savePlans([...plans, plan], uid);
  },
  updatePlan: (updatedPlan: Plan, uid?: string | null) => {
    const plans = storage.getPlans(uid);
    storage.savePlans(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p), uid);
  },
  deletePlan: (id: string, uid?: string | null) => {
    const plans = storage.getPlans(uid);
    storage.savePlans(plans.filter(p => p.id !== id), uid);
  }
};
