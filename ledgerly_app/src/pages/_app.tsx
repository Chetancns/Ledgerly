// src/pages/_app.tsx
import '../index.css'; // or wherever your Tailwind CSS lives
import type { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
