import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, RefreshCw, CheckCircle, Clock, Coffee, Edit3, X } from 'lucide-react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { minutesToTimeString, formatBalance, getTodayDateString, timeStringToMinutes } from '../../src/utils/time';
import { getCycleForDate } from '../../src/engine/cycle';
import { calculateCycleSummary } from '../../src/engine/summary';
import { DayRecord, DayType } from '../../src/types';

export default function MonthScreen() {
  const { days, settings, updateDayType, updateDayPunches, generateOrRebalanceMonth } = useAppStore();
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null);

  // Estados do formulário de edição de batidas
  const [entryInput, setEntryInput] = useState('');
  const [lunchOutInput, setLunchOutInput] = useState('12:00');
  const [lunchInInput, setLunchInInput] = useState('13:00');
  const [exitInput, setExitInput] = useState('');
  const [activeTab, setActiveTab] = useState<'punches' | 'dayType'>('punches');

  const cycle = getCycleForDate(new Date(), settings.cycleCutoffDay);
  const cycleDays = days.filter(
    d => d.date >= cycle.startDate && d.date <= cycle.endDate
  );

  const summary = calculateCycleSummary(days, settings, cycle);
  const balanceInfo = formatBalance(summary.currentBalanceMinutes);
  const todayStr = getTodayDateString();

  const handleOpenDayModal = (day: DayRecord) => {
    setSelectedDay(day);
    setActiveTab('punches');
    // Preenche campos com valores reais se houver, ou planejados como sugestão
    setEntryInput(
      day.actualEntry !== null
        ? minutesToTimeString(day.actualEntry)
        : minutesToTimeString(day.plannedEntry)
    );
    setLunchOutInput(
      day.actualLunchOut !== null
        ? minutesToTimeString(day.actualLunchOut)
        : minutesToTimeString(day.plannedLunchOut || 12 * 60)
    );
    setLunchInInput(
      day.actualLunchIn !== null
        ? minutesToTimeString(day.actualLunchIn)
        : minutesToTimeString(day.plannedLunchIn || 13 * 60)
    );
    setExitInput(
      day.actualExit !== null
        ? minutesToTimeString(day.actualExit)
        : minutesToTimeString(day.plannedExit)
    );
  };

  const handleSavePunches = async () => {
    if (!selectedDay) return;

    const pEntry = timeStringToMinutes(entryInput);
    const pLunchOut = timeStringToMinutes(lunchOutInput);
    const pLunchIn = timeStringToMinutes(lunchInInput);
    const pExit = timeStringToMinutes(exitInput);

    if (pEntry === null || pExit === null) {
      Alert.alert('Horários obrigatórios', 'Por favor preencha ao menos Entrada e Saída (HH:MM).');
      return;
    }

    if (pEntry >= pExit) {
      Alert.alert('Erro', 'A saída precisa ser posterior à entrada.');
      return;
    }

    await updateDayPunches(selectedDay.date, {
      actualEntry: pEntry,
      actualExit: pExit,
      actualLunchOut: pLunchOut ?? 12 * 60,
      actualLunchIn: pLunchIn ?? 13 * 60,
    });

    setSelectedDay(null);
  };

  const handleSelectDayType = async (type: DayType) => {
    if (!selectedDay) return;
    await updateDayType(selectedDay.date, type);
    setSelectedDay(null);
  };

  const renderDayItem = ({ item }: { item: DayRecord }) => {
    const isToday = item.date === todayStr;
    const isWeekend = item.dayType === 'weekend';
    const isHoliday = item.dayType === 'holiday';
    const isTimeOff = item.dayType === 'time_off';
    const isWorkday = item.dayType === 'workday';

    const [y, m, d] = item.date.split('-');
    const dayOfWeekShort = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', {
      weekday: 'short',
    });

    return (
      <TouchableOpacity
        style={[
          styles.dayRow,
          isToday && styles.todayRow,
          !isWorkday && styles.nonWorkdayRow,
        ]}
        onPress={() => handleOpenDayModal(item)}
      >
        <View style={styles.dateCol}>
          <Text style={[styles.dayNumber, isToday && styles.todayText]}>
            {d}/{m}
          </Text>
          <Text style={styles.weekdayText}>{dayOfWeekShort.toUpperCase()}</Text>
        </View>

        <View style={styles.infoCol}>
          {isWorkday ? (
            <View>
              {item.isCompleted ? (
                <Text style={styles.actualTimeText}>
                  {minutesToTimeString(item.actualEntry)} → {minutesToTimeString(item.actualExit)}
                </Text>
              ) : (
                <Text style={styles.scheduleText}>
                  {minutesToTimeString(item.plannedEntry)} → {minutesToTimeString(item.plannedExit)}
                </Text>
              )}
              <Text style={styles.metaText}>
                {item.isCompleted ? 'Realizado: ' : 'Planejado: '}
                {item.actualDurationMinutes !== null
                  ? `${Math.floor(item.actualDurationMinutes / 60)}h ${(item.actualDurationMinutes % 60).toString().padStart(2, '0')}m`
                  : `${Math.floor(item.plannedDurationMinutes / 60)}h ${(item.plannedDurationMinutes % 60).toString().padStart(2, '0')}m`}
              </Text>
            </View>
          ) : (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {isHoliday
                  ? `Feriado: ${item.holidayName || 'Nacional'}`
                  : isTimeOff
                  ? 'Folga / Férias / Atestado'
                  : 'Fim de Semana'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statusCol}>
          {item.isCompleted ? (
            <View style={styles.doneBadge}>
              <CheckCircle size={15} color="#10B981" />
              <Text style={styles.doneBadgeText}>OK</Text>
            </View>
          ) : isWorkday ? (
            <Clock size={16} color="#64748B" />
          ) : (
            <Coffee size={16} color="#475569" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Calendário do Ciclo</Text>
            <Text style={styles.subtitle}>
              {cycle.startDate} até {cycle.endDate} (Toque no dia para editar)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.rebalanceBtn}
            onPress={() => {
              Alert.alert(
                'Rebalancear Mês',
                'Deseja recalcular e redistribuir os horários dos dias futuros restantes mantendo seus dias já feitos?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Sim, Rebalancear', onPress: () => generateOrRebalanceMonth() },
                ]
              );
            }}
          >
            <RefreshCw size={16} color="#38BDF8" />
            <Text style={styles.rebalanceBtnText}>Rebalancear</Text>
          </TouchableOpacity>
        </View>

        {/* Resumo da Soma */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Dias Feitos</Text>
            <Text style={styles.summaryValue}>
              {summary.completedWorkdays} / {summary.totalWorkdays}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Saldo Atual</Text>
            <Text
              style={[
                styles.summaryValue,
                balanceInfo.isPositive ? styles.textPositive : styles.textNegative,
              ]}
            >
              {balanceInfo.text}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Meta Total</Text>
            <Text style={styles.summaryValue}>{summary.targetTotalMinutes / 60}h</Text>
          </View>
        </View>

        {/* Lista de Dias */}
        <FlatList
          data={cycleDays}
          keyExtractor={item => item.id}
          renderItem={renderDayItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Modal Completo de Edição do Dia */}
      <Modal
        visible={selectedDay !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Editar Dia {selectedDay?.date}</Text>
                <Text style={styles.modalSub}>
                  {selectedDay?.isCompleted
                    ? 'Dia com batidas já concluídas'
                    : 'Informe os horários reais que você fez'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <X size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Abas do Modal */}
            <View style={styles.tabHeader}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'punches' && styles.tabButtonActive]}
                onPress={() => setActiveTab('punches')}
              >
                <Text style={[styles.tabText, activeTab === 'punches' && styles.tabTextActive]}>
                  Lançar Batidas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'dayType' && styles.tabButtonActive]}
                onPress={() => setActiveTab('dayType')}
              >
                <Text style={[styles.tabText, activeTab === 'dayType' && styles.tabTextActive]}>
                  Tipo (Folga / Feriado)
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'punches' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>Entrada</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={entryInput}
                      onChangeText={setEntryInput}
                      placeholder="08:52"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>Saída</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={exitInput}
                      onChangeText={setExitInput}
                      placeholder="17:55"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>Saída Almoço</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={lunchOutInput}
                      onChangeText={setLunchOutInput}
                      placeholder="12:00"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.inputLabel}>Volta Almoço</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={lunchInInput}
                      onChangeText={setLunchInInput}
                      placeholder="13:00"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <Text style={styles.helperTip}>
                  💡 Ao salvar, o saldo deste dia será computado e os dias futuros restantes do mês serão automaticamente rebalanceados para fechar em zero!
                </Text>

                <TouchableOpacity style={styles.savePunchesBtn} onPress={handleSavePunches}>
                  <Text style={styles.savePunchesBtnText}>Salvar Batidas do Dia</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View>
                <Text style={styles.modalDesc}>
                  Se você não trabalhou neste dia (ou é feriado local), altere o tipo abaixo:
                </Text>

                <TouchableOpacity
                  style={styles.typeButton}
                  onPress={() => handleSelectDayType('workday')}
                >
                  <Text style={styles.typeButtonText}>💼 Dia Útil de Trabalho</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.typeButton}
                  onPress={() => handleSelectDayType('time_off')}
                >
                  <Text style={styles.typeButtonText}>🏖️ Folga / Férias / Compensação</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.typeButton}
                  onPress={() => handleSelectDayType('holiday')}
                >
                  <Text style={styles.typeButtonText}>🎉 Feriado Local / Ponto Facultativo</Text>
                </TouchableOpacity>
              </View>
            )}
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
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  rebalanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#38BDF844',
  },
  rebalanceBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  textPositive: {
    color: '#10B981',
  },
  textNegative: {
    color: '#F59E0B',
  },
  listContainer: {
    paddingBottom: 20,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  todayRow: {
    borderColor: '#38BDF8',
    backgroundColor: '#0369A122',
  },
  nonWorkdayRow: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    opacity: 0.7,
  },
  dateCol: {
    width: 55,
  },
  dayNumber: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  todayText: {
    color: '#38BDF8',
  },
  weekdayText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  infoCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  scheduleText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  actualTimeText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  metaText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#1E293B',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  statusCol: {
    width: 50,
    alignItems: 'flex-end',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doneBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#1E293B',
  },
  tabText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#38BDF8',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formCol: {
    flex: 1,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  timeInput: {
    backgroundColor: '#0B0F19',
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  helperTip: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  savePunchesBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  savePunchesBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalDesc: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  typeButton: {
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
});
