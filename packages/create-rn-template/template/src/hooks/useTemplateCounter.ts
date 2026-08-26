import { useEffect } from 'react';
import { useTemplateStore } from '@/stores/templateStore';

export function useTemplateCounter() {
  const count = useTemplateStore((state) => state.count);
  const increment = useTemplateStore((state) => state.increment);
  const hydrate = useTemplateStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return { count, increment };
}
