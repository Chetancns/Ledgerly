// src/pages/_app.tsx
import '../index.css'; // or wherever your Tailwind CSS lives
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Toaster position="top-center" />
      <Component {...pageProps} />
    </>
  );
}
