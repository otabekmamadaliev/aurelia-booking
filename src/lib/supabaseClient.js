import { createClient } from '@supabase/supabase-js'
import { supabaseCredentials } from './backend'

/**
 * The Supabase client.
 *
 * This module pulls in the Supabase library, so nothing may import it
 * statically from a path the guest bundle reaches — ask `backend.js` whether a
 * project is configured, and import this only once the answer is yes.
 */
const { url, anonKey } = supabaseCredentials

export const supabase = createClient(url, anonKey, {
  auth: {
    // Staff sessions should survive a reload; guests never sign in at all.
    persistSession: true,
    autoRefreshToken: true,
  },
})
