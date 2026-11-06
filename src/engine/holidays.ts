/**
 * Feriados Nacionais Brasileiros (Fixos e Móveis calculados com algoritmo de Meeus/Jones/Butcher para Páscoa)
 */

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getBrazilianHolidays(year: number): Holiday[] {
  const easter = calculateEasterSunday(year);

  // Feriados móveis baseados na Páscoa
  const carnavalSegunda = addDays(easter, -48);
  const carnavalTerca = addDays(easter, -47);
  const sextaFeiraSanta = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  const holidays: Holiday[] = [
    { date: `${year}-01-01`, name: 'Confraternização Universal' },
    { date: formatDate(carnavalSegunda), name: 'Carnaval (Segunda)' },
    { date: formatDate(carnavalTerca), name: 'Carnaval (Terça)' },
    { date: formatDate(sextaFeiraSanta), name: 'Sexta-feira Santa' },
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho' },
    { date: formatDate(corpusChristi), name: 'Corpus Christi' },
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-11-20`, name: 'Dia da Consciência Negra' },
    { date: `${year}-12-25`, name: 'Natal' },
  ];

  return holidays;
}

export function getHolidayForDate(dateStr: string): string | null {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const holidays = getBrazilianHolidays(year);
  const match = holidays.find(h => h.date === dateStr);
  return match ? match.name : null;
}

