import React, { useCallback, useEffect, useState } from "react";

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

type KeypressCallbackFunction = () => void;
type Keystrokes = Partial<KeyboardEvent> | Partial<KeyboardEvent>[];

export interface KeypressHook {
  keyboardEvent: Keystrokes;
  callback: KeypressCallbackFunction;
  allowOnTextInput?: boolean;
  preventDefault?: boolean;
}

interface ReactKeyboardNavProps {
  keypressHooks: KeypressHook[];
  eventType?: typeof KEYDOWN | typeof KEYUP | typeof KEYPRESS;
  setSequence?: (keyboardEvents: KeyboardEvent[]) => void;
  allowEarlyCompletion?: boolean;
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
  if (keypressHook.preventDefault) {
    e.preventDefault();
  }
};

const removeFirstKeypressEventInHook = (
  keypressHook: KeypressHook
): [KeypressHook, boolean, boolean] => {
  const keyboardEvent = keypressHook.keyboardEvent;
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
    { ...keypressHook, keyboardEvent: newKeyboardEvent },
    wasLastMatch,
    newKeyboardEvent.length > 0,
  ];
};

const orDefault = <T,>(param: undefined | T, default_value: T) =>
  param === undefined ? default_value : param;

export default function ReactKeyboardNav(props: ReactKeyboardNavProps) {
  const [candidateHooks, setCandidateHooks] = useState(props.keypressHooks);
  const [currentSequence, setCurrentSequence] = useState([] as KeyboardEvent[]);
  const keypressHooks = props.keypressHooks;
  const eventType = orDefault(props.eventType, KEYDOWN);
  const allowEarlyCompletion = orDefault(props.allowEarlyCompletion, false);

  const addKeyboardEventToCurrentSequence = useCallback(
    (keyboardEvent: KeyboardEvent) => {
      const newCurrentSequence = [...currentSequence, keyboardEvent];
      setCurrentSequence(newCurrentSequence);
      if (props.setSequence) {
        props.setSequence(newCurrentSequence);
      }
    },
    [currentSequence, setCurrentSequence, props.setSequence]
  );

  const clearCurrentSequence = useCallback(() => {
    setCurrentSequence([]);
    if (props.setSequence) {
      props.setSequence([]);
    }
  }, [setCurrentSequence, props.setSequence]);

  const updateCandidatesAndMaybeExecuteHooks = useCallback(
    (localCandidateHooks: KeypressHook[], e: KeyboardEvent) => {
      let newCandidates = [] as KeypressHook[];
      for (const candidateHook of localCandidateHooks) {
        const [updatedHook, wasLastMatch, keep] =
          removeFirstKeypressEventInHook(candidateHook);
        if (keep) {
          newCandidates.push(updatedHook);
        }
        if (wasLastMatch) {
          executeKeypressHook(candidateHook, e);
          clearCurrentSequence();
          return;
        }
      }
      // If we're here, then we didn't execute anything
      addKeyboardEventToCurrentSequence(e);
      setCandidateHooks(newCandidates);
    },
    [
      removeFirstKeypressEventInHook,
      clearCurrentSequence,
      addKeyboardEventToCurrentSequence,
      setCandidateHooks,
    ]
  );

  const handleKeypressEvent = useCallback(
    (e: KeyboardEvent) => {
      console.log(e);
      if (MODIFIERS.includes(e.key)) {
        return;
      }
      const localCandidateHooks: KeypressHook[] = (
        currentSequence.length > 0 ? candidateHooks : props.keypressHooks
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
      // No matches, clear the current sequence
      if (localCandidateHooks.length === 0) {
        clearCurrentSequence();
      }
      // If only one match and early completion allowed, complete it
      else if (allowEarlyCompletion && localCandidateHooks.length === 1) {
        executeKeypressHook(localCandidateHooks[0], e);
        clearCurrentSequence();
      } else {
        updateCandidatesAndMaybeExecuteHooks(localCandidateHooks, e);
      }
    },
    [
      keypressHooks,
      candidateHooks,
      setCandidateHooks,
      clearCurrentSequence,
      updateCandidatesAndMaybeExecuteHooks,
    ]
  );

  useEffect(() => {
    addEventListener(eventType, handleKeypressEvent);
    return () => removeEventListener(eventType, handleKeypressEvent);
  }, [handleKeypressEvent, eventType]);

  return null;
}
