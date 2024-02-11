import React, { ReactNode, useCallback, useEffect } from "react";

type KeypressCallbackFunction = () => void;

export interface KeypressHook {
  keyboardEvent: Partial<KeyboardEvent>;
  callback: KeypressCallbackFunction;
}

interface ReactKeyboardNavProps {
  keypressHooks: KeypressHook[];
  children?: ReactNode | ReactNode[];
  eventType?: "keydown" | "keyup" | "keypress";
}

type KeyboardEventKey = keyof KeyboardEvent;

const partialKeyboardEventMatch = (
  o: KeyboardEvent,
  p: Partial<KeyboardEvent>
) =>
  Object.keys(p).every(
    (k) =>
      p[k as KeyboardEventKey] &&
      o[k as KeyboardEventKey] &&
      p[k as KeyboardEventKey] === o[k as KeyboardEventKey]
  );

export default function ReactKeyboardNav(props: ReactKeyboardNavProps) {
  const keypressHooks = props.keypressHooks;
  const eventType = props.eventType || "keydown";
  const handleKeypressEvent = useCallback(
    (e: KeyboardEvent) => {
      console.log(e);
      keypressHooks.forEach((keypressHook) => {
        if (partialKeyboardEventMatch(e, keypressHook.keyboardEvent)) {
          keypressHook.callback();
        }
      });
    },
    [keypressHooks]
  );

  useEffect(() => {
    addEventListener(eventType, handleKeypressEvent);
    return () => removeEventListener(eventType, handleKeypressEvent);
  }, [handleKeypressEvent, eventType]);

  return props.children;
}
