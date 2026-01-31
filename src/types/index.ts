import {Database} from './supabase';
export * from './supabase';
export * from './events';

type TList = keyof Database['public']['Tables'];
type TFieldView = keyof Database['public']['Tables']['profile'];

export type TField<T extends TList, V extends TFieldView> = Database['public']['Tables'][T][V];
