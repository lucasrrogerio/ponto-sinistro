import { DayRecord, UserSettings, CycleSummary } from '../types';

export function calculateCycleSummary(
  days: DayRecord[],
  settings: UserSettings,
  cycleRange: { startDate: string; endDate: string }
): CycleSummary {
  const periodDays = days.filter(
    d => d.date >= cycleRange.startDate && d.date <= cycleRange.endDate
  );

  const workdays = periodDays.filter(d => d.dayType === 'workday');
  const totalWorkdays = workdays.length;
  const targetTotalMinutes = totalWorkdays * settings.targetDailyMinutes;

  let completedWorkdays = 0;
  let actualWorkedMinutes = 0;

  workdays.forEach(d => {
    if (d.isCompleted && d.actualDurationMinutes !== null) {
      completedWorkdays++;
      actualWorkedMinutes += d.actualDurationMinutes;
    }
  });

  const remainingWorkdays = totalWorkdays - completedWorkdays;
  
  // Saldo até o momento = (Trabalhado nos dias fechados) - (Meta esperada para esses dias fechados)
  const expectedForCompleted = completedWorkdays * settings.targetDailyMinutes;
  const currentBalanceMinutes = actualWorkedMinutes - expectedForCompleted;

  return {
    startDate: cycleRange.startDate,
    endDate: cycleRange.endDate,
    totalWorkdays,
    completedWorkdays,
    remainingWorkdays,
    targetTotalMinutes,
    actualWorkedMinutes,
    currentBalanceMinutes,
  };
}

