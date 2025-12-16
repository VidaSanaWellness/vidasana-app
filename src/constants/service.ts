import {LanguageCode, WeekDay} from '@/types/service';

export const LANGUAGES: {code: LanguageCode; label: string}[] = [
  {code: 'en', label: 'English'},
  {code: 'es', label: 'Spanish'},
  {code: 'fr', label: 'French'},
];

export const getDays = (t: any): {label: string; value: WeekDay}[] => [
  {label: t('days.mon') || 'Mon', value: 'mon'},
  {label: t('days.tue') || 'Tue', value: 'tue'},
  {label: t('days.wed') || 'Wed', value: 'wed'},
  {label: t('days.thu') || 'Thu', value: 'thu'},
  {label: t('days.fri') || 'Fri', value: 'fri'},
  {label: t('days.sat') || 'Sat', value: 'sat'},
  {label: t('days.sun') || 'Sun', value: 'sun'},
];
