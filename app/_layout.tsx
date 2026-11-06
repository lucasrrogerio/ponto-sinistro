import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '../src/store/useAppStore';
import { requestNotificationPermissions } from '../src/services/notifications';
import { supabase, isSupabaseConfigured } from '../src/services/supabase';

export default function RootLayout() {
  const loadData = useAppStore(state => state.loadData);
  const setUserEmail = useAppStore(state => state.setUserEmail);
  const syncWithCloud = useAppStore(state => state.syncWithCloud);

  useEffect(() => {
    loadData();
    requestNotificationPermissions();

    if (isSupabaseConfigured) {
      // 1. Pega sessão inicial persistida
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          setUserEmail(session.user.email);
          syncWithCloud();
        }
      });

      // 2. Ouve mudanças de estado de autenticação (Login, Logout, Refresh)
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user?.email) {
            setUserEmail(session.user.email);
            syncWithCloud();
          } else {
            setUserEmail(null);
          }
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0F19' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

