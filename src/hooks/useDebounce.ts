import {useEffect, useState} from 'react';

export const useDebouncer = <T>(initialValue: T, time = 500): [T, React.Dispatch<React.SetStateAction<T>>, T] => {
  const [value, setValue] = useState<T>(initialValue);
  const [debounced, setDebounced] = useState<T>(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), time);
    return () => clearTimeout(handler);
  }, [value, time]);

  return [value, setValue, debounced];
};
