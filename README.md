# react-keyboard-control

This library is meant to provide a simple React hook `useKeyboardControl()` which can be used to manage a list of keyboard hooks (keyboard inputs and associated callbacks). Features supported by `react-keyboard-control`:

- Assign a callback function for a given keyboard event
- Use any available field in the `KeyboardEvent` type (see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing)) to match the user input
- Match a _sequence_ of keyboard events
- Disable keyboard hooks when used in a text field (`input` and `textarea`)
- Prevent matched keyboard events from being typed in a text field
- Return the list of keyboard events being tracked in the current sequence
- Filter certain keyboard hooks depending on state
- Set the keyboard event type (`keypress`, `keydown`, `keyup`)

## Install

```
npm install react-keyboard-control
```

## Notes

- `{key: "t", shiftKey: true}` will **not** match a capital T, because the actual `key` recorded will be `"T"`, not `"t"`. This applies for other keystrokes too, like `option-o` produces `ø` on my keyboard.
  - Note that keyboards can be a bit weird; users may have a Mac or Windows keyboard, and further use different layouts e.g. Dvorak. Since `ø` is the `key` recorded by the `KeyboardEvent` when I press `option-o`, that's how I would register the keyboard hook. But it might be possible that `option-o` produces a different `key` on a different keyboard.
- `KeyboardEvent`s that are only meta keys (e.g. command, option) are discarded immediately, since we usually only care about the non-meta key that eventually follows. In other words, you can match for `⌘;` but not `⌘` alone.
- If a key event occurs which doesn't match any candidate keyboard hooks, the current key sequence will be discarded (think of hitting "escape")

## Example

```js
"use client";

import useKeyboardControl from "react-keyboard-control";
import { KeyboardHook, TypedKey } from "react-keyboard-control";
import { useCallback, useEffect, useState } from "react";

enum ColorThemes {
  LIGHT,
  DARK,
}

const LIGHT_COLOR_THEME = {
  color: "black",
  backgroundColor: "white",
};
const DARK_COLOR_THEME = {
  color: "white",
  backgroundColor: "black",
};

export default function Home() {
  const [colorTheme, setColorTheme] = useState(ColorThemes.LIGHT);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null as Date | null);
  const [timesPressedQ, setTimesPressedQ] = useState(0);

  // This is necessary to ensure time is fetched on client
  useEffect(() => setLastUpdatedTime(new Date()), []);

  const updateTime = () => {
    setLastUpdatedTime(new Date());
  };

  const incrementTimesPressedQ = useCallback(
    () => setTimesPressedQ(timesPressedQ + 1),
    [timesPressedQ]
  );

  const keyboardHooks: KeyboardHook[] = [
    // When command ;, l is pressed, set theme to light
    {
      keyboardEvent: [{ key: ";", metaKey: true }, { key: "l" }],
      callback: () => setColorTheme(ColorThemes.LIGHT),
    },
    // When command ;, d is pressed, set theme to dark
    {
      keyboardEvent: [{ key: ";", metaKey: true }, { key: "d" }],
      callback: () => setColorTheme(ColorThemes.DARK),
    },
    // When q is pressed, increment counter (even in text area)
    {
      keyboardEvent: { key: "q" },
      callback: incrementTimesPressedQ,
      allowOnTextInput: true,
    },
    // When @ is pressed, update time (prevented from being typed)
    {
      keyboardEvent: { key: "@" },
      callback: updateTime,
      allowOnTextInput: true,
      preventDefault: true,
    },
    // When l, o, n, g is typed in dark mode, send alert
    {
      keyboardEvent: [{ key: "l" }, { key: "o" }, { key: "n" }, { key: "g" }],
      callback: () => alert("that was a long key sequence"),
      allowWhen: colorTheme === ColorThemes.DARK,
    },
    // When control o (ø) is typed, send alert
    {
      keyboardEvent: [{ key: "ø" }, { key: "Enter" }],
      callback: () => alert("entered null"),
    },
  ];
  const currentSequence: TypedKey[] = useKeyboardControl(keyboardHooks);

  return (
    <>
      <div
        style={
          colorTheme === ColorThemes.LIGHT
            ? LIGHT_COLOR_THEME
            : DARK_COLOR_THEME
        }
      >
        <div>
          The current input sequence is:{" "}
          {currentSequence.map((k) => k.basicRepresentation).join(", ")}
        </div>
        <input defaultValue="You can type in here!" />
        <div>
          The last updated time was:{" "}
          {lastUpdatedTime && lastUpdatedTime.toTimeString()}
        </div>
        <div>You have pressed the letter q {timesPressedQ} times.</div>
      </div>
    </>
  );
}
```

## Reference

### `useKeyboardControl(...)`

- `keyboardHooks`: A list of `KeyboardHook` objects, describing all the keyboard events to track and their associated callback functions.
- `eventType`: Which of the keyboard events (`"keydown"`, `"keypress"`, `"keyup"`) to track; defaults to `"keydown"`.
- `allowEarlyCompletion`: If set to true, then a KeyboardHook will be resolved as soon as it is the only remaining candidate for the current keystroke sequence; defaults to `false` (you can just shorten your key sequence).

### `KeyboardHook` interface

A `KeyboardHook` is an object with the following:

- `keyboardEvent`: This can be a single `Partial<KeyboardEvent>` or a list of them, if there are multiple keyboard events in the sequence. You can set any property of `KeyboardEvent` in order to match with the user's keyboard input (typically, just `key` will suffice).
- `callback`: A function to execute when the keyboard hook is matched.
- `allowOnTextInput`: If set to true, then this keyboard hook can still be triggered even if the `target` of the `KeyboardEvent` is an `<input>` or `<textarea>`. Defaults to `false`.
- `preventDefault`: Whether to prevent the `KeyboardEvent`'s default action, if it could be part of a key sequence. This can be used to prevent typing in a text input. Defaults to `false`.
- `allowWhen`: If set, this can be used to filter out certain keyboard hooks based on state. For example, if `;w` is a hook that saves your work, you may want to only allow it when the user is doing something save-able. The advantage of using this instead of inside the callback (e.g. `() => isEditing() && save()`) is that the hook won't think the user is in the middle of a sequence if they press `;` in a non-saveable state.

### `TypedKey` interface

This hook returns a list of `TypedKey`s as the list of keys being used in the current key sequence. A `TypedKey` contains two things: an `event` (the `KeyboardEvent` itself) and a `basicRepresentation`, which is a simple string representation of the keyboard event (e.g. `"⇧T"`). This output can be used to show the user what keystrokes are currently being considered by the keyboard control (similar to other editors like vi).
