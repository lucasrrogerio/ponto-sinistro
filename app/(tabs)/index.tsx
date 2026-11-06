import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, CheckCircle2, AlertCircle, RefreshCw, Sparkles, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { minutesToTimeString, formatBalance, getTodayDateString, timeStringToMinutes } from '../../src/utils/time';
import { getCycleForDate } from '../../src/engine/cycle';
import { calculateCycleSummary } from '../../src/engine/summary';

export default function TodayScreen() {
  const { days, settings, recordEntry, recordExit, resetToday, generateOrRebalanceMonth } = useAppStore();

  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [modalType, setModalType] = useState<'entry' | 'exit' | null>(null);
  const [inputTime, setInputTime] = useState('');
  const [compensationMode, setCompensationMode] = useState<'today' | 'month'>('today');

  const todayStr = getTodayDateString();
  const todayRecord = days.find(d => d.date === todayStr);

  // Relógio em tempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}:${s}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const cycle = getCycleForDate(new Date(), settings.cycleCutoffDay);
  const summary = calculateCycleSummary(days, settings, cycle);
  const balanceInfo = formatBalance(summary.currentBalanceMinutes);

  const isEntryDone = todayRecord?.actualEntry !== null && todayRecord?.actualEntry !== undefined;
  const isExitDone = todayRecord?.actualExit !== null && todayRecord?.actualExit !== undefined;

  // Próxima batida planejada
  const nextTarget = !isEntryDone
    ? { title: 'Entrada Planejada', time: todayRecord?.plannedEntry }
    : !isExitDone
    ? { title: 'Saída Planejada', time: todayRecord?.plannedExit }
    : { title: 'Jornada Concluída!', time: null };

  const handleOpenPunchModal = (type: 'entry' | 'exit') => {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    setInputTime(minutesToTimeString(currentMin));
    setModalType(type);
  };

  const handleConfirmPunch = async () => {
    const parsedMinutes = timeStringToMinutes(inputTime);
    if (parsedMinutes === null) {
      Alert.alert('Erro', 'Formato de hora inválido. Use HH:MM');
      return;
    }

    if (modalType === 'entry') {
      await recordEntry(todayStr, parsedMinutes, compensationMode);
    } else if (modalType === 'exit') {
      await recordExit(todayStr, parsedMinutes);
    }
    setModalType(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>Ponto Sinistro</Text>
            <Text style={styles.currentClock}>{currentTimeStr}</Text>
          </View>
          <TouchableOpacity
            style={styles.rebalanceButton}
            onPress={() => generateOrRebalanceMonth()}
          >
            <Sparkles size={16} color="#38BDF8" />
            <Text style={styles.rebalanceText}>Sortear</Text>
          </TouchableOpacity>
        </View>

        {/* Card Saldo do Ciclo */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Saldo do Mês (até hoje)</Text>
              <Text
                style={[
                  styles.balanceValue,
                  balanceInfo.isPositive ? styles.balancePositive : styles.balanceNegative,
                ]}
              >
                {balanceInfo.text}
              </Text>
            </View>
            {balanceInfo.isPositive ? (
              <TrendingUp size={28} color="#10B981" />
            ) : (
              <TrendingDown size={28} color="#F59E0B" />
            )}
          </View>
          <Text style={styles.balanceSubtext}>
            Meta fechada com soma exata em {summary.totalWorkdays} dias úteis ({summary.targetTotalMinutes / 60}h totais).
          </Text>
        </View>

        {/* Card Principal de Hoje */}
        <View style={styles.heroCard}>
          <Text style={styles.heroSub}>{todayRecord?.dayType === 'workday' ? 'Hoje é dia útil' : 'Folga / Feriado'}</Text>
          <Text style={styles.nextTargetTitle}>{nextTarget.title}</Text>
          <Text style={styles.nextTargetTime}>
            {nextTarget.time !== null ? minutesToTimeString(nextTarget.time) : 'Feito'}
          </Text>

          {/* Duração Planejada do dia */}
          {todayRecord?.plannedDurationMinutes ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                Meta de Hoje: {Math.floor(todayRecord.plannedDurationMinutes / 60)}h{' '}
                {(todayRecord.plannedDurationMinutes % 60).toString().padStart(2, '0')}m (Anti-Britânico)
              </Text>
            </View>
          ) : null}

          {/* Botões de Ação */}
          <View style={styles.actionButtonsContainer}>
            {!isEntryDone ? (
              <TouchableOpacity
                style={[styles.punchButton, styles.entryButton]}
                onPress={() => handleOpenPunchModal('entry')}
              >
                <Play size={20} color="#FFF" />
                <Text style={styles.punchButtonText}>Bater Entrada Agora</Text>
              </TouchableOpacity>
            ) : !isExitDone ? (
              <TouchableOpacity
                style={[styles.punchButton, styles.exitButton]}
                onPress={() => handleOpenPunchModal('exit')}
              >
                <CheckCircle2 size={20} color="#FFF" />
                <Text style={styles.punchButtonText}>Bater Saída Agora</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.punchButton, styles.completedButton]}
                onPress={() => resetToday(todayStr)}
              >
                <RefreshCw size={18} color="#94A3B8" />
                <Text style={styles.completedButtonText}>Reiniciar Batidas de Hoje</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Detalhes das batidas do dia */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Batidas de Hoje</Text>

          <View style={styles.punchRow}>
            <Text style={styles.punchLabel}>1. Entrada:</Text>
            <Text style={styles.punchPlanned}>
              Planejado: {minutesToTimeString(todayRecord?.plannedEntry)}
            </Text>
            <Text style={[styles.punchActual, isEntryDone && styles.punchDone]}>
              {todayRecord?.actualEntry !== null && todayRecord?.actualEntry !== undefined
                ? `${minutesToTimeString(todayRecord.actualEntry)} (OK)`
                : 'Pendente'}
            </Text>
          </View>

          <View style={styles.punchRow}>
            <Text style={styles.punchLabel}>2. Almoço:</Text>
            <Text style={styles.punchPlanned}>
              {settings.punchesPerDay === 2
                ? 'Automático 12:00 - 13:00'
                : `${minutesToTimeString(todayRecord?.plannedLunchOut)} - ${minutesToTimeString(todayRecord?.plannedLunchIn)}`}
            </Text>
            <Text style={styles.punchSub}>Pré-assinalado</Text>
          </View>

          <View style={styles.punchRow}>
            <Text style={styles.punchLabel}>3. Saída:</Text>
            <Text style={styles.punchPlanned}>
              Planejado: {minutesToTimeString(todayRecord?.plannedExit)}
            </Text>
            <Text style={[styles.punchActual, isExitDone && styles.punchDone]}>
              {todayRecord?.actualExit !== null && todayRecord?.actualExit !== undefined
                ? `${minutesToTimeString(todayRecord.actualExit)} (OK)`
                : 'Pendente'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal para registrar/confirmar batida */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Confirmar {modalType === 'entry' ? 'Entrada' : 'Saída'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Informe o minuto real que você bateu o ponto na empresa:
            </Text>

            <TextInput
              style={styles.timeInput}
              value={inputTime}
              onChangeText={setInputTime}
              placeholder="08:52"
              placeholderTextColor="#64748B"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            {modalType === 'entry' && (
              <View style={styles.compensationBox}>
                <Text style={styles.compLabel}>Se houver diferença de minutos:</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      compensationMode === 'today' && styles.toggleActive,
                    ]}
                    onPress={() => setCompensationMode('today')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        compensationMode === 'today' && styles.toggleTextActive,
                      ]}
                    >
                      Compensar hoje (deslocar saída)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      compensationMode === 'month' && styles.toggleActive,
                    ]}
                    onPress={() => setCompensationMode('month')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        compensationMode === 'month' && styles.toggleTextActive,
                      ]}
                    >
                      Diluir no restante do mês
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalType(null)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmPunch}
              >
                <Text style={styles.confirmBtnText}>Salvar Batida</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  currentClock: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  rebalanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#38BDF844',
  },
  rebalanceText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  balancePositive: {
    color: '#10B981',
  },
  balanceNegative: {
    color: '#F59E0B',
  },
  balanceSubtext: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 8,
  },
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  heroSub: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextTargetTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  nextTargetTime: {
    color: '#38BDF8',
    fontSize: 52,
    fontWeight: '900',
    marginVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  metaBadge: {
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  metaBadgeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    width: '100%',
    marginTop: 20,
  },
  punchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  entryButton: {
    backgroundColor: '#2563EB',
  },
  exitButton: {
    backgroundColor: '#059669',
  },
  completedButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
  },
  punchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  completedButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  punchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  punchLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    width: 80,
  },
  punchPlanned: {
    color: '#94A3B8',
    fontSize: 13,
    flex: 1,
  },
  punchActual: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
  },
  punchDone: {
    color: '#10B981',
  },
  punchSub: {
    color: '#64748B',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    width: '100%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  timeInput: {
    backgroundColor: '#0B0F19',
    color: '#38BDF8',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38BDF855',
    marginBottom: 16,
  },
  compensationBox: {
    marginBottom: 16,
  },
  compLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  toggleRow: {
    gap: 8,
  },
  toggleOption: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#0284C722',
  },
  toggleText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  toggleTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});

