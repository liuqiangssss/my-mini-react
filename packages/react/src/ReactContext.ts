import type { ReactContext } from "shared/ReactTypes";
import {
  REACT_CONSUMER_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_PROVIDER_TYPE,
} from "shared/ReactSymbols";

export function createContext<T>(defaultValue: T): ReactContext<T> {
  const context: ReactContext<T> = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    // These are circular
    Provider: null as any,
    Consumer: null as any,
  };

  context.Provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context,
  };
  context.Consumer = context.Consumer = {
    $$typeof: REACT_CONSUMER_TYPE,
    _context: context,
  };

  return context;
}
