import {useEffect, useState} from 'react';

type useDebouncer = (v: string, t: number) => [string, (v: string) => void, string];

export const useDebouncer: useDebouncer = (initialValue = '', time = 500) => {
  const [value, setValue] = useState(initialValue);
  const [debounced, setDebounced] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), time);
    return () => clearTimeout(handler);
  }, [value, time]);

  return [value, setValue, debounced];
};
