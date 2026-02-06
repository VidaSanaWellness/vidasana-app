import {create} from 'zustand';
import {storage, supabase} from '@/utils';
import {Session} from '@supabase/supabase-js';
import {persist, createJSONStorage} from 'zustand/middleware';

interface AppState {
  isSOSOpen: boolean;
  session: Session | null;
  hasSeenMoodModal: boolean;
  signOut: () => Promise<void>;
  setSOSOpen: (isOpen: boolean) => void;
  setHasSeenMoodModal: (seen: boolean) => void;
  setSession: (session: Session | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      isSOSOpen: false,
      hasSeenMoodModal: false,
      setSession: (session) => set({session}),
      setSOSOpen: (isOpen) => set({isSOSOpen: isOpen}),
      setHasSeenMoodModal: (seen) => set({hasSeenMoodModal: seen}),
      signOut: async () => {
        await supabase.auth.signOut();
        set({session: null, hasSeenMoodModal: false});
      },
    }),
    {name: 'ROOT_STORAGE', storage: createJSONStorage(() => storage as any)}
  )
);
