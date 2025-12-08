import {Database} from './database';

export * from './database';

type TList = keyof Database['public']['Tables'];
type TFieldView = keyof Database['public']['Tables']['profile'];

export type TField<T extends TList, V extends TFieldView> = Database['public']['Tables'][T][V];
