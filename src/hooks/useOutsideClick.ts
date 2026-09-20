import { useEffect, useRef, type RefObject } from 'react';

/**
 * Closes a modal when the mouse is pressed outside the referenced dialog
 * element, so every modal in the app dismisses on outside click like
 * GlobalLocationSelector.
 */
export const useOutsideClick = <T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutsideClick: () => void,
) => {
  const callbackRef = useRef(onOutsideClick);
  callbackRef.current = onOutsideClick;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callbackRef.current();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [ref]);
};
