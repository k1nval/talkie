import type { AppProps } from 'next/app';
import '@livekit/components-styles';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
