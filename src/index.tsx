import { useCallback, useEffect, useState } from "react";

const KEYDOWN = "keydown";
const KEYUP = "keyup";
const KEYPRESS = "keypress";

const META = "Meta";
const ALT = "Alt";
const CONTROL = "Control";
const MODIFIERS = [META, ALT, CONTROL];

const INPUT_TAG = "input";
const TEXTAREA_TAG = "textarea";
const TEXT_INPUT_TAGS = [INPUT_TAG, TEXTAREA_TAG];

const MODIFIER_SYMBOLS = {
  META: "⌘",
  ALT: "⌥",
  CONTROL: "^",
  SHIFT: "⇧",
};

type Keystrokes = Partial<KeyboardEvent> | Partial<KeyboardEvent>[];

export interface KeyboardHook {
  keyboardEvent: Keystrokes;
  callback: () => void;
  allowOnTextInput?: boolean | null | undefined;
  preventDefault?: boolean | null | undefined;
  allowWhen?: boolean | null | undefined;
}

export interface TypedKey {
  event: KeyboardEvent;
  basicRepresentation: string;
}

type KeyboardEventKey = keyof KeyboardEvent;

const partialKeyboardEventMatch = (
  o: KeyboardEvent,
  p: Partial<KeyboardEvent>
) =>
  Object.keys(p).every(
    (k) =>
      k === "contextName" ||
      p[k as KeyboardEventKey] === o[k as KeyboardEventKey]
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

const executeKeyboardHook = (
  keyboardHook: KeyboardHook,
  event: KeyboardEvent
) => {
  keyboardHook.callback();
  if (keyboardHook.preventDefault) {
    event.preventDefault();
  }
};

const basicFormatKey = (e: KeyboardEvent) => {
  let symbols = [];
  if (e.metaKey) {
    symbols.push(MODIFIER_SYMBOLS.META);
  }
  if (e.altKey) {
    symbols.push(MODIFIER_SYMBOLS.ALT);
  }
  if (e.ctrlKey) {
    symbols.push(MODIFIER_SYMBOLS.CONTROL);
  }
  if (e.shiftKey) {
    symbols.push(MODIFIER_SYMBOLS.SHIFT);
  }
  symbols.push(e.key);
  return symbols.join("");
};

const keyboardEventToTypedKey = (keyboardEvent: KeyboardEvent): TypedKey => ({
  event: keyboardEvent,
  basicRepresentation: basicFormatKey(keyboardEvent),
});

const removeFirstKeyboardEventInHook = (
  keyboardHook: KeyboardHook
): [KeyboardHook, boolean, boolean] => {
  const keyboardEvent = keyboardHook.keyboardEvent;
  let wasLastMatch = false;
  let newKeyboardEvent = [] as Partial<KeyboardEvent>[];
  if (Array.isArray(keyboardEvent)) {
    if (keyboardEvent.length === 0) {
      newKeyboardEvent = [];
    } else if (keyboardEvent.length === 1) {
      newKeyboardEvent = [];
      wasLastMatch = true;
    } else {
      newKeyboardEvent = keyboardEvent.slice(1);
    }
  } else {
    newKeyboardEvent = [];
    wasLastMatch = true;
  }
  return [
    { ...keyboardHook, keyboardEvent: newKeyboardEvent },
    wasLastMatch,
    newKeyboardEvent.length > 0,
  ];
};

const orDefault = <T,>(param: undefined | T, default_value: T) =>
  param === undefined ? default_value : param;

/**
 * Creates an event listener to match keyboard events with callback functions.
 * @param initialKeyboardHooks - The list of KeyboardHooks to manage
 * @param eventType - (default: `keydown`) Which event to listen for (`keydown`, `keyup`, or `keypress`)
 * @returns A list of typed keys in the current (unresolved sequence)
 */
export default function useKeyboardControl(
  keyboardHooks: KeyboardHook[],
  eventType: typeof KEYDOWN | typeof KEYUP | typeof KEYPRESS = KEYDOWN
) {
  const [candidateHooks, setCandidateHooks] = useState(keyboardHooks);
  const [currentSequence, setCurrentSequence] = useState([] as TypedKey[]);

  const updateCandidatesAndMaybeExecuteHooks = useCallback(
    (localCandidateHooks: KeyboardHook[], e: KeyboardEvent) => {
      let newCandidates = [] as KeyboardHook[];
      for (const candidateHook of localCandidateHooks) {
        const [updatedHook, wasLastMatch, keep] =
          removeFirstKeyboardEventInHook(candidateHook);
        if (keep) {
          newCandidates.push(updatedHook);
        }
        if (wasLastMatch) {
          executeKeyboardHook(candidateHook, e);
          setCurrentSequence([]);
          return;
        }
      }
      // If we're here, then we didn't execute anything
      setCurrentSequence([...currentSequence, keyboardEventToTypedKey(e)]);
      setCandidateHooks(newCandidates);
    },
    [
      removeFirstKeyboardEventInHook,
      setCandidateHooks,
      currentSequence,
      setCurrentSequence,
    ]
  );

  const handleKeyboardEvent = useCallback(
    (e: KeyboardEvent) => {
      if (MODIFIERS.includes(e.key)) {
        return;
      }
      const localCandidateHooks: KeyboardHook[] = (
        currentSequence.length > 0 ? candidateHooks : keyboardHooks
      ).filter((keyboardHook) => {
        let expectedKeystroke: Partial<KeyboardEvent> | null =
          getFirstFromArrayOrItem(keyboardHook.keyboardEvent);
        return (
          orDefault(keyboardHook.allowWhen, true) &&
          expectedKeystroke &&
          hookMatch(
            e,
            expectedKeystroke,
            keyboardHook.allowOnTextInput ? null : TEXT_INPUT_TAGS
          )
        );
      });
      // No matches, clear the current sequence
      if (localCandidateHooks.length === 0) {
        setCurrentSequence([]);
      } else {
        updateCandidatesAndMaybeExecuteHooks(localCandidateHooks, e);
      }
    },
    [
      keyboardHooks,
      candidateHooks,
      currentSequence,
      setCandidateHooks,
      setCurrentSequence,
      updateCandidatesAndMaybeExecuteHooks,
    ]
  );

  useEffect(() => {
    addEventListener(eventType, handleKeyboardEvent);
    return () => removeEventListener(eventType, handleKeyboardEvent);
  }, [handleKeyboardEvent, eventType]);

  return currentSequence;
}
