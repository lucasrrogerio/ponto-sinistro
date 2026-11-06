import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DayRecord, UserSettings } from '../types';
import { minutesToTimeString } from '../utils/time';

// Configuração padrão do handler em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ponto-channel', {
      name: 'Lembretes de Ponto',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: 'default',
    });
  }

  return true;
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Agenda o pacote insistente para uma batida:
 * - T - 5 min (aviso antecipado)
 * - T + 0 min (hora exata)
 * - T + 2m, +4m, +6m, +8m, +10m (repetições insistentes)
 */
export async function schedulePunchAlertSequence(
  title: string,
  targetDate: string, // YYYY-MM-DD
  targetMinutes: number, // minutos desde 00:00
  punchType: 'entry' | 'exit' | 'lunch_out' | 'lunch_in'
): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  const [y, m, d] = targetDate.split('-').map(Number);
  const targetHour = Math.floor(targetMinutes / 60);
  const targetMin = targetMinutes % 60;

  const baseDate = new Date(y, m - 1, d, targetHour, targetMin, 0, 0);
  const now = new Date();

  const formattedTime = minutesToTimeString(targetMinutes);

  // 1. T - 5 min
  const minus5Date = new Date(baseDate.getTime() - 5 * 60 * 1000);
  if (minus5Date > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Em 5 minutos: ${title}`,
        body: `Seu ponto está planejado para às ${formattedTime}. Prepare-se!`,
        data: { punchType, targetDate, kind: 'pre_alert' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: minus5Date,
        channelId: 'ponto-channel',
      },
    });
  }

  // 2. T + 0 min (Hora exata)
  if (baseDate > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚨 HORA DO PONTO: ${title}`,
        body: `Agora são ${formattedTime}! Abra o app para confirmar sua batida.`,
        data: { punchType, targetDate, kind: 'exact_alert' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: baseDate,
        channelId: 'ponto-channel',
      },
    });
  }

  // 3. T + 2, 4, 6, 8, 10 min (Modo insistente)
  const repeatOffsets = [2, 4, 6, 8, 10];
  for (const offset of repeatOffsets) {
    const repeatDate = new Date(baseDate.getTime() + offset * 60 * 1000);
    if (repeatDate > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚠️ Não esqueceu do ponto? (+${offset}m)`,
          body: `Planejado para ${formattedTime}. Se já bateu, confirme no app para recalibrar!`,
          data: { punchType, targetDate, kind: 'insistent_alert', offsetMinutes: offset },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: repeatDate,
          channelId: 'ponto-channel',
        },
      });
    }
  }
}

/**
 * Atualiza todas as notificações locais agendadas para o dia de hoje
 */
export async function syncTodayNotifications(todayRecord: DayRecord, settings: UserSettings): Promise<void> {
  await cancelAllScheduledNotifications();

  if (todayRecord.dayType !== 'workday' || !settings.insistentNotificationEnabled) {
    return;
  }

  // Se a entrada ainda não foi batida
  if (todayRecord.actualEntry === null && todayRecord.plannedEntry !== null) {
    await schedulePunchAlertSequence(
      'Entrada da Manhã',
      todayRecord.date,
      todayRecord.plannedEntry,
      'entry'
    );
  }

  // Se a saída ainda não foi batida
  if (todayRecord.actualExit === null && todayRecord.plannedExit !== null) {
    await schedulePunchAlertSequence(
      'Saída do Trabalho',
      todayRecord.date,
      todayRecord.plannedExit,
      'exit'
    );
  }
}

