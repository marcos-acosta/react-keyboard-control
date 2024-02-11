import React, { useCallback, useEffect } from "react";

const KEYDOWN = "keydown";
const KEYUP = "keyup";
const KEYPRESS = "keypress";

const INPUT_TAG = "input";
const TEXTAREA_TAG = "textarea";
const TEXT_INPUT_TAGS = [INPUT_TAG, TEXTAREA_TAG];

type KeypressCallbackFunction = () => void;

export interface KeypressHook {
  keyboardEvent: Partial<KeyboardEvent>;
  callback: KeypressCallbackFunction;
  allowOnTextInput?: boolean;
  preventTyping?: boolean;
}

interface ReactKeyboardNavProps {
  keypressHooks: KeypressHook[];
  eventType?: typeof KEYDOWN | typeof KEYUP | typeof KEYPRESS;
}

type KeyboardEventKey = keyof KeyboardEvent;

const partialKeyboardEventMatch = (
  o: KeyboardEvent,
  p: Partial<KeyboardEvent>
) =>
  Object.keys(p).every(
    (k) => p[k as KeyboardEventKey] === o[k as KeyboardEventKey]
  );

const keyboardEventTargetHasTag = (e: KeyboardEvent, tags: string[]) =>
  tags.some(
    (tag) => (e.target as Element).tagName.toUpperCase() === tag.toUpperCase()
  );

const hookMatch = (
  event: KeyboardEvent,
  hook: Partial<KeyboardEvent>,
  invalidTags: string[] | null
) =>
  partialKeyboardEventMatch(event, hook) &&
  !(invalidTags && keyboardEventTargetHasTag(event, invalidTags));

export default function ReactKeyboardNav(props: ReactKeyboardNavProps) {
  const keypressHooks = props.keypressHooks;
  const eventType = props.eventType || KEYDOWN;

  const handleKeypressEvent = useCallback(
    (e: KeyboardEvent) => {
      let targetElement = e.target as Element;
      keypressHooks.forEach((keypressHook) => {
        if (
          hookMatch(
            e,
            keypressHook.keyboardEvent,
            keypressHook.allowOnTextInput ? null : TEXT_INPUT_TAGS
          )
        ) {
          keypressHook.callback();
          if (keypressHook.preventTyping) {
            e.preventDefault();
          }
        }
      });
    },
    [keypressHooks]
  );

  useEffect(() => {
    addEventListener(eventType, handleKeypressEvent);
    return () => removeEventListener(eventType, handleKeypressEvent);
  }, [handleKeypressEvent, eventType]);

  return null;
}
