import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './db'
import AlimentosPage from './pages/Alimentos'

const SECCIONES = { alimentos: 'Alimentos' } as const
type Seccion = keyof typeof SECCIONES

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [seccion, setSeccion] = useState<Seccion>('alimentos')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <>
      <header>
        <strong>OpenBites</strong>
        <nav>
          {(Object.keys(SECCIONES) as Seccion[]).map(s => (
            <button key={s} aria-current={s === seccion} onClick={() => setSeccion(s)}>{SECCIONES[s]}</button>
          ))}
        </nav>
        <button className="secundario" onClick={() => supabase.auth.signOut()}>Salir</button>
      </header>
      <main>{seccion === 'alimentos' && <AlimentosPage />}</main>
    </>
  )
}

function Login() {
  const [estado, setEstado] = useState('')
  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('email') as string
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } })
    setEstado(error ? error.message : 'Revisa tu correo y abre el enlace.')
  }
  return (
    <main className="login">
      <h1>OpenBites</h1>
      <form onSubmit={enviar}>
        <label>Email <input name="email" type="email" required autoComplete="email" /></label>
        <button>Enviar enlace</button>
      </form>
      <p role="status">{estado}</p>
    </main>
  )
}
