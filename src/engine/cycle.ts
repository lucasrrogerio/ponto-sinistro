/**
 * Lógica do Ciclo/Período de Ponto (Mês civil 1-31 ou dia de corte personalizado, ex: 21 a 20)
 */

export interface CycleRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  allDates: string[];
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getCycleForDate(referenceDate: Date, cutoffDay: number = 1): CycleRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed
  const day = referenceDate.getDate();

  let startDate: Date;
  let endDate: Date;

  if (cutoffDay === 1) {
    // Mês civil clássico: dia 1 ao último dia do mês corrente
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0);
  } else {
    // Corte personalizado (ex: 21 ao 20 do mês seguinte)
    if (day >= cutoffDay) {
      startDate = new Date(year, month, cutoffDay);
      endDate = new Date(year, month + 1, cutoffDay - 1);
    } else {
      startDate = new Date(year, month - 1, cutoffDay);
      endDate = new Date(year, month, cutoffDay - 1);
    }
  }

  const allDates: string[] = [];
  const curr = new Date(startDate);
  while (curr <= endDate) {
    allDates.push(formatDate(curr));
    curr.setDate(curr.getDate() + 1);
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    allDates,
  };
}

