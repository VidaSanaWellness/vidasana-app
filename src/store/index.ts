import {create} from 'zustand';
import {storage, supabase} from '@/utils';
import {Session} from '@supabase/supabase-js';
import {persist, createJSONStorage} from 'zustand/middleware';

interface AppState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  hasSeenMoodModal: boolean;
  setHasSeenMoodModal: (seen: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({session}),
      signOut: async () => {
        await supabase.auth.signOut();
        set({session: null, hasSeenMoodModal: false});
      },
      hasSeenMoodModal: false,
      setHasSeenMoodModal: (seen) => set({hasSeenMoodModal: seen}),
    }),
    {
      name: 'vida-sana-storage',
      storage: createJSONStorage(() => storage as any),
    }
  )
);
