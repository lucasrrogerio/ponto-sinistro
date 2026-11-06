import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayRecord, UserSettings } from '../types';
import { getTodayDateString } from '../utils/time';
import { getCycleForDate } from '../engine/cycle';
import {
  initializeDaysForDates,
  randomizeSchedule,
  rebalanceOnEntryPunch,
  completeDayPunch,
} from '../engine/scheduler';
import { syncTodayNotifications } from '../services/notifications';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const STORAGE_KEY_SETTINGS = '@ponto_sinistro_settings';
const STORAGE_KEY_DAYS = '@ponto_sinistro_days';

export const DEFAULT_SETTINGS: UserSettings = {
  punchesPerDay: 2,
  entryMinMinutes: 525, // 08:45
  entryMaxMinutes: 555, // 09:15
  workMinMinutes: 450, // 07:30
  workMaxMinutes: 510, // 08:30
  targetDailyMinutes: 480, // 08:00
  cycleCutoffDay: 1, // Mês civil dia 1
  lunchDurationMinutes: 60, // 1h
  compensationPreference: 'ask',
  insistentNotificationEnabled: true,
};

interface AppState {
  settings: UserSettings;
  days: DayRecord[];
  isLoaded: boolean;
  userEmail: string | null;

  // Ações
  loadData: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  generateOrRebalanceMonth: () => Promise<void>;
  recordEntry: (dateStr: string, actualMinutes: number, mode: 'today' | 'month') => Promise<void>;
  recordExit: (dateStr: string, actualMinutes: number) => Promise<void>;
  updateDayType: (dateStr: string, dayType: DayRecord['dayType']) => Promise<void>;
  updateDayPunches: (
    dateStr: string,
    punches: {
      actualEntry: number | null;
      actualExit: number | null;
      actualLunchOut?: number | null;
      actualLunchIn?: number | null;
    }
  ) => Promise<void>;
  resetToday: (dateStr: string) => Promise<void>;
  setUserEmail: (email: string | null) => void;
  syncWithCloud: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  days: [],
  isLoaded: false,
  userEmail: null,

  setUserEmail: (email) => set({ userEmail: email }),

  loadData: async () => {
    try {
      const savedSettingsStr = await AsyncStorage.getItem(STORAGE_KEY_SETTINGS);
      const savedDaysStr = await AsyncStorage.getItem(STORAGE_KEY_DAYS);

      let settings = DEFAULT_SETTINGS;
      if (savedSettingsStr) {
        settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettingsStr) };
      }

      let days: DayRecord[] = [];
      if (savedDaysStr) {
        days = JSON.parse(savedDaysStr);
      }

      // Se a lista de dias estiver vazia, gera para o ciclo do mês atual
      const todayStr = getTodayDateString();
      const todayDate = new Date();
      const cycle = getCycleForDate(todayDate, settings.cycleCutoffDay);

      const hasCurrentCycle = days.some(d => d.date >= cycle.startDate && d.date <= cycle.endDate);

      if (!hasCurrentCycle) {
        const initDays = initializeDaysForDates(cycle.allDates);
        days = randomizeSchedule(initDays, settings);
        await AsyncStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(days));
      }

      set({ settings, days, isLoaded: true });

      // Agendar notificações do dia atual
      const todayRecord = days.find(d => d.date === todayStr);
      if (todayRecord) {
        syncTodayNotifications(todayRecord, settings);
      }

      // Se estiver configurado Supabase e logado, sincroniza
      if (isSupabaseConfigured) {
        get().syncWithCloud();
      }
    } catch (err) {
      console.warn('Erro ao carregar dados locais:', err);
      set({ isLoaded: true });
    }
  },

  updateSettings: async (newSettings) => {
    const prevCutoff = get().settings.cycleCutoffDay;
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    await AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));

    // Se o dia de corte mudou, recalcula e expande o ciclo automaticamente
    if (newSettings.cycleCutoffDay !== undefined && newSettings.cycleCutoffDay !== prevCutoff) {
      await get().generateOrRebalanceMonth();
    } else {
      // Se mudou apenas horários, atualiza notificações
      const todayStr = getTodayDateString();
      const todayRecord = get().days.find(d => d.date === todayStr);
      if (todayRecord) {
        syncTodayNotifications(todayRecord, updated);
      }
    }
  },

  generateOrRebalanceMonth: async () => {
    const { settings, days } = get();
    const todayDate = new Date();
    const cycle = getCycleForDate(todayDate, settings.cycleCutoffDay);

    // Cria os dias do ciclo se não existirem
    const existingMap = new Map(days.map(d => [d.id, d]));
    const cycleDays = cycle.allDates.map(dateStr => {
      if (existingMap.has(dateStr)) {
        return existingMap.get(dateStr)!;
      }
      return initializeDaysForDates([dateStr])[0];
    });

    const rebalanced = randomizeSchedule(cycleDays, settings, { preserveCompleted: true });

    // Mesclar com outros dias fora desse ciclo se existirem
    const otherDays = days.filter(d => !cycle.allDates.includes(d.id));
    const finalDays = [...otherDays, ...rebalanced].sort((a, b) => a.date.localeCompare(b.date));

    set({ days: finalDays });
    await AsyncStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(finalDays));

    const todayStr = getTodayDateString();
    const todayRecord = finalDays.find(d => d.date === todayStr);
    if (todayRecord) {
      syncTodayNotifications(todayRecord, settings);
    }

    get().syncWithCloud();
  },

  recordEntry: async (dateStr, actualMinutes, mode) => {
    const { days, settings } = get();
    const targetDay = days.find(d => d.date === dateStr);
    if (!targetDay) return;

    const { updatedAllDays } = rebalanceOnEntryPunch(targetDay, actualMinutes, mode, days, settings);

    set({ days: updatedAllDays });
    await AsyncStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(updatedAllDays));

    const todayRecord = updatedAllDays.find(d => d.date === dateStr);
    if (todayRecord) {
      syncTodayNotifications(todayRecord, settings);
    }

    get().syncWithCloud();
  },

  recordExit: async (dateStr, actualMinutes) => {
    const { days, settings } = get();
    const targetDay = days.find(d => d.date === dateStr);
    if (!targetDay) return;

    const { updatedAllDays } = completeDayPunch(targetDay, actualMinutes, days, settings);

    set({ days: updatedAllDays });
    await AsyncStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(updatedAllDays));

    const todayRecord = updatedAllDays.find(d => d.date === dateStr);
    if (todayRecord) {
      syncTodayNotifications(todayRecord, settings);
    }

    get().syncWithCloud();
  },

  updateDayType: async (dateStr, dayType) => {
    const { days, settings } = get();
    const updated = days.map(d => {
      if (d.date === dateStr) {
        return {
          ...d,
          dayType,
          plannedDurationMinutes: dayType === 'workday' ? 480 : 0,
        };
      }
      return d;
    });

    // Rebalanceia os dias úteis restantes para absorver a folga/feriado
    const rebalanced = randomizeSchedule(updated, settings, { preserveCompleted: true });

    set({ days: rebalanced });
    await AsyncStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(rebalanced));

    const todayStr = getTodayDateString();
    const todayRecord = rebalanced.find(d => d.date === todayStr);
    if (todayRecord) {
      syncTodayNotifications(todayRecord, settings);
    }

    get().syncWithCloud();
  },

  updateDayPunches: async (dateStr, punches) => {
    const { days, settings } = get();

    const updated = days.map(d => {
      if (d.date === dateStr) {
        const entry = punches.actualEntry;
        const exit = punches.actualExit;
        const lunchOut = punches.actualLunchOut ?? (12 * 60);
        const lunchIn = punches.actualLunchIn ?? (13 * 60);

        let actualDurationMinutes: number | null = null;
        let isCompleted = false;

        if (entry !== null && exit !== null) {
          const gross = exit - entry;
          const lunchTime = Math.max(0, lunchIn - lunchOut);
          actualDurationMinutes = Math.max(0, gross - lunchTime);
          isCompleted = true;
        }

        return {
          ...d,
          dayType: 'workday' as const,
          actualEntry: entry,
          actualExit: exit,
          actualLunchOut: lunchOut,
          actualLunchIn: lunchIn,
          actualDurationMinutes,
          isCompleted,
        };
      }
      return d;
    });

    // Rebalanceia os dias úteis restantes com o novo saldo real informado
    const rebalanced = randomizeSchedule(updated, settings, { preserveCompleted: true });

    set({ days: rebalanced });
    await AsyncStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(rebalanced));

    const todayStr = getTodayDateString();
    const todayRecord = rebalanced.find(d => d.date === todayStr);
    if (todayRecord) {
      syncTodayNotifications(todayRecord, settings);
    }

    get().syncWithCloud();
  },

  resetToday: async (dateStr) => {
    const { days, settings } = get();
    const updated = days.map(d => {
      if (d.date === dateStr) {
        return {
          ...d,
          actualEntry: null,
          actualExit: null,
          actualDurationMinutes: null,
          isCompleted: false,
        };
      }
      return d;
    });

    const rebalanced = randomizeSchedule(updated, settings, { preserveCompleted: true });

    set({ days: rebalanced });
    await AsyncStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(rebalanced));

    const todayRecord = rebalanced.find(d => d.date === dateStr);
    if (todayRecord) {
      syncTodayNotifications(todayRecord, settings);
    }

    get().syncWithCloud();
  },

  syncWithCloud: async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;
      const { days, settings } = get();

      // Upsert settings
      await supabase.from('user_settings').upsert({
        user_id: userId,
        punches_per_day: settings.punchesPerDay,
        entry_min_minutes: settings.entryMinMinutes,
        entry_max_minutes: settings.entryMaxMinutes,
        work_min_minutes: settings.workMinMinutes,
        work_max_minutes: settings.workMaxMinutes,
        target_daily_minutes: settings.targetDailyMinutes,
        cycle_cutoff_day: settings.cycleCutoffDay,
        compensation_preference: settings.compensationPreference,
        updated_at: new Date().toISOString(),
      });

      // Upsert work days do ciclo recente
      const daysPayload = days.map(d => ({
        user_id: userId,
        date: d.date,
        day_type: d.dayType,
        holiday_name: d.holidayName || null,
        planned_entry: d.plannedEntry,
        planned_exit: d.plannedExit,
        actual_entry: d.actualEntry,
        actual_exit: d.actualExit,
        planned_duration: d.plannedDurationMinutes,
        actual_duration: d.actualDurationMinutes,
        is_completed: d.isCompleted,
        updated_at: new Date().toISOString(),
      }));

      if (daysPayload.length > 0) {
        await supabase.from('work_days').upsert(daysPayload, { onConflict: 'user_id,date' });
      }
    } catch (err) {
      console.warn('Sync com Supabase falhou (modo offline preservado):', err);
    }
  },
}));

