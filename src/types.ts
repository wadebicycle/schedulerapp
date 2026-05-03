export type PlanColor = 'default' | 'green' | 'yellow' | 'gray' | 'red' | 'blue';

export interface Plan {
  id: string;
  title: string;
  date: string;
  startHour: number;
  duration: number;
  color: PlanColor;
  notes?: string;
}

export interface WeekMetadata {
  weekStarting: string;
  color?: string;
  note?: string;
  isImportant?: boolean;
}

export type Language = 'en' | 'vi';
export type Theme = 'light' | 'dark';
export type NotificationSound = 'bird' | 'wind' | 'bell' | 'chime';

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  isCustom?: boolean;
}

export interface AppSettings {
  language: Language;
  theme: Theme;
  musicEnabled: boolean;
  musicVolume: number;
  musicTrackId: string;
  customMusicDataUrl: string;
  customMusicName: string;
  notificationsEnabled: boolean;
  notificationSound: NotificationSound;
  startHour: number;
  endHour: number;
}

export interface WeeklySchedule {
  weekStarting: string;
  plans: Plan[];
}
