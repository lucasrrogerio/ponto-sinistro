import { DayRecord, UserSettings } from '../types';
import { getHolidayForDate } from './holidays';

/**
 * Gera um inteiro aleatório entre min e max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Cria a estrutura inicial para uma lista de datas, identificando fins de semana e feriados
 */
export function initializeDaysForDates(dates: string[]): DayRecord[] {
  return dates.map(dateStr => {
    // dateStr no formato YYYY-MM-DD
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 6 = Sábado

    const holidayName = getHolidayForDate(dateStr);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let dayType: DayRecord['dayType'] = 'workday';
    if (holidayName) {
      dayType = 'holiday';
    } else if (isWeekend) {
      dayType = 'weekend';
    }

    return {
      id: dateStr,
      date: dateStr,
      dayType,
      holidayName: holidayName || undefined,
      plannedEntry: null,
      plannedLunchOut: null,
      plannedLunchIn: null,
      plannedExit: null,
      plannedDurationMinutes: dayType === 'workday' ? 480 : 0,
      actualEntry: null,
      actualLunchOut: null,
      actualLunchIn: null,
      actualExit: null,
      actualDurationMinutes: null,
      isCompleted: false,
    };
  });
}

/**
 * Algoritmo Zero-Sum: Sorteia e rebalanceia os horários para que a soma dos dias úteis
 * resulte exatamente na meta necessária (8h * total de dias úteis do período).
 * 
 * Preserva os dias já concluídos ou passados com registros reais, e distribui o saldo
 * estritamente entre os dias pendentes.
 */
export function randomizeSchedule(
  days: DayRecord[],
  settings: UserSettings,
  options?: { preserveCompleted?: boolean }
): DayRecord[] {
  const preserve = options?.preserveCompleted !== false;

  // 1. Separar dias que são dias úteis
  const workdays = days.filter(d => d.dayType === 'workday');
  if (workdays.length === 0) return days;

  // Meta total do período em minutos (ex: 22 dias * 480 = 10.560 min)
  const totalTargetMinutes = workdays.length * settings.targetDailyMinutes;

  // 2. Identificar dias já concluídos / fixados
  let pastMinutesWorked = 0;
  const pendingIndices: number[] = [];

  workdays.forEach((day, idx) => {
    if (preserve && day.isCompleted && day.actualDurationMinutes !== null) {
      pastMinutesWorked += day.actualDurationMinutes;
    } else {
      pendingIndices.push(idx);
    }
  });

  if (pendingIndices.length === 0) {
    return days; // Nada a sortear
  }

  // Minutos restantes que precisam ser divididos entre os dias pendentes
  const remainingTarget = totalTargetMinutes - pastMinutesWorked;
  const numPending = pendingIndices.length;

  // Limites por dia
  const minDur = settings.workMinMinutes; // ex: 450 (7h30)
  const maxDur = settings.workMaxMinutes; // ex: 510 (8h30)

  // 3. Sortear durações iniciais aleatórias dentro da faixa permitida
  const durations: number[] = [];
  let currentSum = 0;

  for (let i = 0; i < numPending; i++) {
    const d = randomInt(minDur, maxDur);
    durations.push(d);
    currentSum += d;
  }

  // 4. Fechamento de soma exata (Zero-Sum Adjustment)
  // Adiciona ou remove minutos 1 a 1 de dias aleatórios até fechar exatamente o target
  let delta = remainingTarget - currentSum;
  let safetyLoop = 0;
  const maxIterations = 50000;

  while (delta !== 0 && safetyLoop < maxIterations) {
    safetyLoop++;
    const randIdx = randomInt(0, numPending - 1);

    if (delta > 0) {
      // Precisamos aumentar a duração de algum dia
      if (durations[randIdx] < maxDur || safetyLoop > 20000) {
        durations[randIdx] += 1;
        delta -= 1;
      }
    } else {
      // Precisamos diminuir a duração de algum dia
      if (durations[randIdx] > minDur || safetyLoop > 20000) {
        durations[randIdx] -= 1;
        delta += 1;
      }
    }
  }

  // Se mesmo assim sobrou delta por margem muito estreita em poucos dias, aplica no primeiro pendente
  if (delta !== 0 && durations.length > 0) {
    durations[0] += delta;
  }

  // 5. Atribuir os horários específicos de Entrada e Saída
  const updatedWorkdays = [...workdays];

  pendingIndices.forEach((workdayIdx, i) => {
    const duration = durations[i];
    const targetDay = { ...updatedWorkdays[workdayIdx] };

    // Sorteia Entrada dentro da janela (ex: 08:45 a 09:15)
    const entryMin = randomInt(settings.entryMinMinutes, settings.entryMaxMinutes);
    targetDay.plannedEntry = entryMin;
    targetDay.plannedDurationMinutes = duration;

    if (settings.punchesPerDay === 2) {
      // 2 batidas: Almoço automático pré-assinalado de 1h (12h-13h)
      // Saída = Entrada + Duração de trabalho + 60m de almoço
      targetDay.plannedLunchOut = 12 * 60; // 12:00
      targetDay.plannedLunchIn = 13 * 60; // 13:00
      targetDay.plannedExit = entryMin + duration + settings.lunchDurationMinutes;
    } else {
      // 4 batidas: Sorteia almoço em torno de 12:00 com ~1h a 1h15
      const lunchOutMin = randomInt(11 * 60 + 50, 12 * 60 + 20); // 11:50 a 12:20
      const lunchDuration = randomInt(settings.lunchDurationMinutes, settings.lunchDurationMinutes + 10);
      const lunchInMin = lunchOutMin + lunchDuration;

      targetDay.plannedLunchOut = lunchOutMin;
      targetDay.plannedLunchIn = lunchInMin;
      targetDay.plannedExit = entryMin + duration + lunchDuration;
    }

    updatedWorkdays[workdayIdx] = targetDay;
  });

  // Mapear de volta para o array geral
  const workdayMap = new Map(updatedWorkdays.map(d => [d.id, d]));
  return days.map(d => workdayMap.get(d.id) || d);
}

/**
 * Rebalanceamento quando o usuário bate a entrada com diferença
 */
export function rebalanceOnEntryPunch(
  day: DayRecord,
  actualEntryMinutes: number,
  mode: 'today' | 'month',
  allDays: DayRecord[],
  settings: UserSettings
): { updatedDay: DayRecord; updatedAllDays: DayRecord[] } {
  const updatedDay: DayRecord = {
    ...day,
    actualEntry: actualEntryMinutes,
  };

  if (mode === 'today') {
    // Mantém a mesma duração planejada de hoje, apenas desloca a saída planejada
    const plannedDuration = day.plannedDurationMinutes || settings.targetDailyMinutes;
    const lunchDuration = settings.lunchDurationMinutes;
    updatedDay.plannedExit = actualEntryMinutes + plannedDuration + lunchDuration;

    const newAllDays = allDays.map(d => (d.id === day.id ? updatedDay : d));
    return { updatedDay, updatedAllDays: newAllDays };
  } else {
    // Modo 'month': Mantém a saída de hoje como estava planejada
    // e o saldo de minutos restante é rebalanceado nos dias úteis futuros
    const newAllDays = allDays.map(d => (d.id === day.id ? updatedDay : d));
    const rebalanced = randomizeSchedule(newAllDays, settings, { preserveCompleted: true });
    const finalDay = rebalanced.find(d => d.id === day.id) || updatedDay;
    return { updatedDay: finalDay, updatedAllDays: rebalanced };
  }
}

/**
 * Rebalanceamento ao concluir a saída do dia
 */
export function completeDayPunch(
  day: DayRecord,
  actualExitMinutes: number,
  allDays: DayRecord[],
  settings: UserSettings
): { updatedDay: DayRecord; updatedAllDays: DayRecord[] } {
  const entry = day.actualEntry ?? day.plannedEntry ?? (9 * 60);
  const lunchDuration = settings.lunchDurationMinutes;
  
  // Duração líquida trabalhada = (Saída - Entrada) - Almoço
  const grossMinutes = actualExitMinutes - entry;
  const netMinutes = Math.max(0, grossMinutes - lunchDuration);

  const updatedDay: DayRecord = {
    ...day,
    actualExit: actualExitMinutes,
    actualDurationMinutes: netMinutes,
    isCompleted: true,
  };

  const newAllDays = allDays.map(d => (d.id === day.id ? updatedDay : d));
  // Rebalanceia automaticamente todos os dias futuros do período
  const rebalanced = randomizeSchedule(newAllDays, settings, { preserveCompleted: true });
  const finalDay = rebalanced.find(d => d.id === day.id) || updatedDay;

  return { updatedDay: finalDay, updatedAllDays: rebalanced };
}

