import {create} from 'zustand';
import {storage} from '@/utils';
import {Session} from '@supabase/supabase-js';
import {persist, createJSONStorage} from 'zustand/middleware';

type AppStore = {
  session: Session | null;
  setSession: (v: AppStore['session']) => void;
};

export const useAppStore = create<AppStore>()(
  persist((set) => ({session: null, setSession: (session) => set({session})}), {name: 'STORE', storage: createJSONStorage(() => storage as any)})
);
