import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth'
import { supabase } from '../supabaseClient'
import { ADMIN_EMAILS } from '../config/constants'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadSession() {
      const { data } = await supabase.auth.getSession()
      if (active) {
        setUser(data.session?.user ?? null)
        setLoading(false)
      }
    }

    loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => {
    const email = (user?.email ?? '').toLowerCase()
    const isAdmin = ADMIN_EMAILS.includes(email)

    return {
      user,
      isAdmin,
      loading,
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signOut: () => supabase.auth.signOut(),
    }
  }, [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
