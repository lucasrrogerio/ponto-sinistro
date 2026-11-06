export type DayType = 'workday' | 'weekend' | 'holiday' | 'time_off';

export type PunchType = 'entry' | 'lunch_out' | 'lunch_in' | 'exit';

export interface DayRecord {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  dayType: DayType;
  holidayName?: string;
  notes?: string;

  // Planejados (em minutos desde 00:00, ex: 525 = 08:45)
  plannedEntry: number | null;
  plannedLunchOut: number | null;
  plannedLunchIn: number | null;
  plannedExit: number | null;
  plannedDurationMinutes: number; // Meta líquida trabalhada

  // Reais batidos
  actualEntry: number | null;
  actualLunchOut: number | null;
  actualLunchIn: number | null;
  actualExit: number | null;
  actualDurationMinutes: number | null;

  isCompleted: boolean;
}

export type CompensationPreference = 'ask' | 'today' | 'month';

export interface UserSettings {
  punchesPerDay: 2 | 4; // 2 = Entrada/Saída (almoço 1h automático pré-assinalado)
  entryMinMinutes: number; // ex: 525 (08:45)
  entryMaxMinutes: number; // ex: 555 (09:15)
  workMinMinutes: number; // ex: 450 (07:30)
  workMaxMinutes: number; // ex: 510 (08:30)
  targetDailyMinutes: number; // ex: 480 (08:00)
  cycleCutoffDay: number; // ex: 1 (mês civil 1 a 31) ou 21 (21 a 20)
  lunchDurationMinutes: number; // 60 min
  compensationPreference: CompensationPreference;
  insistentNotificationEnabled: boolean;
}

export interface CycleSummary {
  startDate: string;
  endDate: string;
  totalWorkdays: number;
  completedWorkdays: number;
  remainingWorkdays: number;
  targetTotalMinutes: number;
  actualWorkedMinutes: number;
  currentBalanceMinutes: number; // Saldo até o momento (positivo = hora extra, negativo = devendo)
}

