import type { AppProps } from 'next/app';
import '@livekit/components-styles';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
