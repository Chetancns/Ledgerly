// src/pages/_app.tsx
import '../index.css'; // or wherever your Tailwind CSS lives
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { OnboardingProvider } from '@/context/OnboardingContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <OnboardingProvider>
          <Toaster position="top-center" />
          <Component {...pageProps} />
        </OnboardingProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
