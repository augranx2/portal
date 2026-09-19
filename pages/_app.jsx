import Head from "next/head";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Portal REMS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Portal aplikasi PT. Rama Emerald Multi Sukses" />
        <meta name="theme-color" content="#0b2545" />
        <link rel="icon" href="/logo-rama.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
