import Head from 'next/head'
import Editor from '../components/Editor'


export default function Home() {
  return (
    <>
      <Head>
        <title>Realtime Editor</title>
      </Head>
      <main>
        <Editor />
      </main>
    </>
  )
}
