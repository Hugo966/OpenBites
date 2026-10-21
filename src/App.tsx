import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './db'
import AlimentosPage from './pages/Alimentos'
import { Icono } from './ui'

const SECCIONES = [
  { id: 'alimentos', nombre: 'Alimentos', icono: 'alimentos', Page: AlimentosPage },
] as const
type Seccion = (typeof SECCIONES)[number]['id']

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

  const actual = SECCIONES.find(s => s.id === seccion)!
  return (
    <div className="app">
      <nav className="nav" aria-label="Secciones">
        <div className="marca"><img src="/favicon.svg" alt="" width="28" height="28" /> OpenBites</div>
        {SECCIONES.map(s => (
          <button key={s.id} aria-current={s.id === seccion ? 'page' : undefined} onClick={() => setSeccion(s.id)}>
            <Icono n={s.icono} /> <span>{s.nombre}</span>
          </button>
        ))}
        <button className="salir" onClick={() => supabase.auth.signOut()}>
          <Icono n="salir" /> <span>Salir</span>
        </button>
      </nav>
      <main>
        <h1>{actual.nombre}</h1>
        <actual.Page />
      </main>
    </div>
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
      <img src="/favicon.svg" alt="" width="56" height="56" />
      <h1>OpenBites</h1>
      <p className="tenue">Tu menú, tus macros.</p>
      <form onSubmit={enviar} className="tarjeta">
        <label>Email <input name="email" type="email" required autoComplete="email" /></label>
        <button className="primario">Enviar enlace</button>
      </form>
      <p role="status">{estado}</p>
    </main>
  )
}
