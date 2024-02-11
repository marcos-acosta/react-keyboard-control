import React, { useCallback, useEffect, useState } from "react";

const KEYDOWN = "keydown";
const KEYUP = "keyup";
const KEYPRESS = "keypress";

const INPUT_TAG = "input";
const TEXTAREA_TAG = "textarea";
const TEXT_INPUT_TAGS = [INPUT_TAG, TEXTAREA_TAG];

type KeypressCallbackFunction = () => void;

export interface KeypressHook {
  keyboardEvent: Partial<KeyboardEvent> | Partial<KeyboardEvent>[];
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

const getFirstFromArrayOrItem = (arrayOrItem: any | any[]) =>
  arrayOrItem
    ? Array.isArray(arrayOrItem)
      ? arrayOrItem.length === 0
        ? null
        : arrayOrItem[0]
      : arrayOrItem
    : null;

const executeKeypressHook = (keypressHook: KeypressHook, e: KeyboardEvent) => {
  keypressHook.callback();
  if (keypressHook.preventTyping) {
    e.preventDefault();
  }
};

const removeFirstKeypressEventInHook = (keypressHook: KeypressHook) => ({
  ...keypressHook,
  keyboardEvent: Array.isArray(keypressHook.keyboardEvent)
    ? keypressHook.keyboardEvent.length > 0
      ? keypressHook.keyboardEvent.slice(1)
      : []
    : [],
});

export default function ReactKeyboardNav(props: ReactKeyboardNavProps) {
  const [candidateHooks, setCandidateHooks] = useState(props.keypressHooks);
  const [inSequence, setInSequence] = useState(false);
  const keypressHooks = props.keypressHooks;
  const eventType = props.eventType || KEYDOWN;

  const handleKeypressEvent = useCallback(
    (e: KeyboardEvent) => {
      const localCandidateHooks: KeypressHook[] = (
        inSequence ? candidateHooks : props.keypressHooks
      ).filter((keypressHook) => {
        let expectedKeypress: Partial<KeyboardEvent> | null =
          getFirstFromArrayOrItem(keypressHook.keyboardEvent);
        return (
          expectedKeypress &&
          hookMatch(
            e,
            expectedKeypress,
            keypressHook.allowOnTextInput ? null : TEXT_INPUT_TAGS
          )
        );
      });
      if (localCandidateHooks.length === 1) {
        executeKeypressHook(localCandidateHooks[0], e);
        setInSequence(false);
      } else if (localCandidateHooks.length > 1) {
        setCandidateHooks(
          localCandidateHooks.map(removeFirstKeypressEventInHook)
        );
        setInSequence(true);
      }
    },
    [
      keypressHooks,
      inSequence,
      setInSequence,
      candidateHooks,
      setCandidateHooks,
    ]
  );

  useEffect(() => {
    addEventListener(eventType, handleKeypressEvent);
    return () => removeEventListener(eventType, handleKeypressEvent);
  }, [handleKeypressEvent, eventType]);

  return null;
}
