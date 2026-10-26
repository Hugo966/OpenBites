import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './db'
import FoodsPage from './pages/Foods'
import GoalsPage from './pages/Goals'
import MenuPage from './pages/Menu'
import { Icon } from './ui'

const SECTIONS = [
  { id: 'menu', label: 'Menú', icon: 'menu', Page: MenuPage },
  { id: 'foods', label: 'Alimentos', icon: 'foods', Page: FoodsPage },
  { id: 'goals', label: 'Objetivos', icon: 'goals', Page: GoalsPage },
] as const
type Section = (typeof SECTIONS)[number]['id']

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [section, setSection] = useState<Section>('menu')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />

  const current = SECTIONS.find(s => s.id === section)!
  return (
    <div className="app">
      <nav className="nav" aria-label="Secciones">
        <div className="brand"><img src="/favicon.svg" alt="" width="28" height="28" /> OpenBites</div>
        {SECTIONS.map(s => (
          <button key={s.id} aria-current={s.id === section ? 'page' : undefined} onClick={() => setSection(s.id)}>
            <Icon n={s.icon} /> <span>{s.label}</span>
          </button>
        ))}
        <button className="logout" onClick={() => supabase.auth.signOut()}>
          <Icon n="logout" /> <span>Salir</span>
        </button>
      </nav>
      <main className={current.id}>
        <current.Page />
      </main>
    </div>
  )
}

function Login() {
  const [status, setStatus] = useState('')
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('email') as string
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } })
    setStatus(error ? error.message : 'Revisa tu correo y abre el enlace.')
  }
  return (
    <main className="login">
      <img src="/favicon.svg" alt="" width="56" height="56" />
      <h1>OpenBites</h1>
      <p className="muted">Tu menú, tus macros.</p>
      <form onSubmit={submit} className="card">
        <label>Email <input name="email" type="email" required autoComplete="email" /></label>
        <button className="primary">Enviar enlace</button>
      </form>
      <p role="status">{status}</p>
    </main>
  )
}
