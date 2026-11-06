# 🕒 Ponto Sinistro (Anti-Ponto Britânico)

Aplicativo nativo para Android e iOS desenvolvido em **React Native + Expo (TypeScript)** com sincronização opcional no **Supabase** e arquitetura **Offline-First**.

---

## 🚀 Como Executar no Celular (Android / iOS)

Você não precisa de Mac nem de publicar nas lojas para usar no seu celular pessoal:

1. Instale o app **Expo Go** na [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) (Android) ou na [App Store](https://apps.apple.com/app/expo-go/id982107779) (iPhone).
2. Na pasta do projeto, inicie o servidor de desenvolvimento:
   ```bash
   npx expo start
   ```
3. Aponte a câmera do celular para o QR Code exibido no terminal. O app abrirá instantaneamente como um app nativo no seu aparelho.

---

## ⚡ Funcionalidades Implementadas

- **Anti-Ponto Britânico (Zero-Sum Randomizer)**:
  - Sorteia os horários de entrada e saída com minutos variados (ex: `08:47`, `18:03`).
  - Permite dias com durações menores (ex: `7h 35m`) e maiores (ex: `8h 25m`).
  - Garante matematicamente que a soma do mês feche **exatamente em 8h/dia útil** (saldo zero).
- **Feriados Brasileiros Automáticos**:
  - Reconhece feriados nacionais fixos e móveis (Carnaval, Sexta-Feira Santa, Corpus Christi).
  - Permite tocar em qualquer dia para marcar folgas, férias ou atestados, rebalanceando os dias restantes.
- **Rebalanceamento Dinâmico**:
  - Se você bater a entrada com atraso ou adiantado, escolha entre **"Compensar hoje"** (desloca a saída) ou **"Diluir no restante do mês"**.
- **Modo Insistente de Notificações**:
  - Alerta prévio (5 min antes).
  - Alerta na hora exata.
  - Repetições a cada 2 minutos até você confirmar.
- **Offline-First + Supabase**:
  - Funciona 100% offline no celular com `AsyncStorage` + `zustand`.
  - Para sincronizar entre múltiplos aparelhos, basta configurar as chaves do Supabase.

---

## ☁️ Configuração do Supabase (Opcional)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Abra a aba **SQL Editor** no painel do Supabase e cole o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql).
3. Crie um arquivo `.env` na raiz do projeto com:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   ```
4. Na aba **Ajustes** do app, toque em **Entrar com E-mail / Senha**.

