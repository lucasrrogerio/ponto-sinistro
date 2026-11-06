import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sliders, Bell, Cloud, LogIn, LogOut, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { minutesToTimeString, timeStringToMinutes } from '../../src/utils/time';
import { isSupabaseConfigured, supabase } from '../../src/services/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings, generateOrRebalanceMonth, userEmail, setUserEmail } = useAppStore();

  const [entryMin, setEntryMin] = useState(minutesToTimeString(settings.entryMinMinutes));
  const [entryMax, setEntryMax] = useState(minutesToTimeString(settings.entryMaxMinutes));
  const [workMin, setWorkMin] = useState(minutesToTimeString(settings.workMinMinutes));
  const [workMax, setWorkMax] = useState(minutesToTimeString(settings.workMaxMinutes));
  const [cutoffDay, setCutoffDay] = useState(settings.cycleCutoffDay.toString());

  const handleSaveRanges = async () => {
    const pEntryMin = timeStringToMinutes(entryMin);
    const pEntryMax = timeStringToMinutes(entryMax);
    const pWorkMin = timeStringToMinutes(workMin);
    const pWorkMax = timeStringToMinutes(workMax);
    const pCutoff = parseInt(cutoffDay, 10);

    if (
      pEntryMin === null ||
      pEntryMax === null ||
      pWorkMin === null ||
      pWorkMax === null ||
      isNaN(pCutoff)
    ) {
      Alert.alert('Erro', 'Por favor preencha horários válidos no formato HH:MM');
      return;
    }

    if (pEntryMin >= pEntryMax) {
      Alert.alert('Erro', 'O início da janela de entrada deve ser menor que o fim');
      return;
    }

    if (pWorkMin >= pWorkMax) {
      Alert.alert('Erro', 'A carga mínima diária deve ser menor que a máxima');
      return;
    }

    await updateSettings({
      entryMinMinutes: pEntryMin,
      entryMaxMinutes: pEntryMax,
      workMinMinutes: pWorkMin,
      workMaxMinutes: pWorkMax,
      cycleCutoffDay: pCutoff,
    });

    Alert.alert('Sucesso', 'Configurações salvas e ciclo atualizado!');
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUserEmail(null);
    Alert.alert('Desconectado', 'Sua sessão foi encerrada.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ajustes do App</Text>
          <Text style={styles.subtitle}>Configure sua rotina e preferências de ponto</Text>
        </View>

        {/* Seção Batidas Diárias */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Modo de Batidas</Text>
          <Text style={styles.cardSub}>
            Você mencionou que o almoço das 12h às 13h é registrado automaticamente.
          </Text>

          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                settings.punchesPerDay === 2 && styles.modeButtonActive,
              ]}
              onPress={() => updateSettings({ punchesPerDay: 2 })}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  settings.punchesPerDay === 2 && styles.modeButtonTextActive,
                ]}
              >
                2 Batidas (Entrada / Saída)
              </Text>
              <Text style={styles.modeDesc}>Almoço 1h automático pré-assinalado</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                settings.punchesPerDay === 4 && styles.modeButtonActive,
              ]}
              onPress={() => updateSettings({ punchesPerDay: 4 })}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  settings.punchesPerDay === 4 && styles.modeButtonTextActive,
                ]}
              >
                4 Batidas (CLT Completo)
              </Text>
              <Text style={styles.modeDesc}>Entrada, Saída Almoço, Volta, Saída</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seção Janelas de Horários e Duração */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Janelas Anti-Britânico</Text>
          <Text style={styles.cardSub}>
            O gerador sorteia aleatoriamente valores estritamente dentro destas faixas:
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Entrada Mínima</Text>
              <TextInput
                style={styles.textInput}
                value={entryMin}
                onChangeText={setEntryMin}
                placeholder="08:45"
                placeholderTextColor="#64748B"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Entrada Máxima</Text>
              <TextInput
                style={styles.textInput}
                value={entryMax}
                onChangeText={setEntryMax}
                placeholder="09:15"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Carga Diária Mínima</Text>
              <TextInput
                style={styles.textInput}
                value={workMin}
                onChangeText={setWorkMin}
                placeholder="07:30"
                placeholderTextColor="#64748B"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Carga Diária Máxima</Text>
              <TextInput
                style={styles.textInput}
                value={workMax}
                onChangeText={setWorkMax}
                placeholder="08:30"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          <View style={styles.singleInputRow}>
            <Text style={styles.inputLabel}>Dia de Corte do Mês (1 = mês civil)</Text>
            <TextInput
              style={styles.textInput}
              value={cutoffDay}
              onChangeText={setCutoffDay}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#64748B"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRanges}>
            <Text style={styles.saveBtnText}>Salvar Parâmetros</Text>
          </TouchableOpacity>
        </View>

        {/* Seção Notificações */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.sectionTitle}>Modo Insistente</Text>
              <Text style={styles.cardSub}>
                Notifica 5 min antes, na hora exata, e repete a cada 2 min (até 5 vezes) até confirmar a batida.
              </Text>
            </View>
            <Switch
              value={settings.insistentNotificationEnabled}
              onValueChange={val => updateSettings({ insistentNotificationEnabled: val })}
              trackColor={{ false: '#334155', true: '#0284C7' }}
              thumbColor={settings.insistentNotificationEnabled ? '#38BDF8' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Seção Conta e Nuvem */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nuvem e Sincronização</Text>
          <Text style={styles.cardSub}>
            {isSupabaseConfigured
              ? userEmail
                ? `Conectado como: ${userEmail}`
                : 'Supabase pronto. Faça login para sincronizar entre Android e iPhone.'
              : 'Rodando 100% Local (Offline-first). Para ativar nuvem, adicione as chaves no .env.'}
          </Text>

          {isSupabaseConfigured ? (
            userEmail ? (
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut size={16} color="#EF4444" />
                <Text style={styles.logoutBtnText}>Desconectar Conta</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => router.push('/login')}
              >
                <LogIn size={16} color="#FFF" />
                <Text style={styles.loginBtnText}>Entrar com E-mail / Senha</Text>
              </TouchableOpacity>
            )
          ) : null}
        </View>
      </ScrollView>
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
    marginBottom: 20,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 17,
  },
  modeToggleRow: {
    gap: 10,
  },
  modeButton: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeButtonActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#0284C722',
  },
  modeButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#38BDF8',
  },
  modeDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  singleInputRow: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0B0F19',
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loginBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#7F1D1D33',
    borderWidth: 1,
    borderColor: '#EF444455',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});

