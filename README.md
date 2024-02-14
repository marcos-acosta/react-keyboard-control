# react-keyboard-control

This library is meant to provide a simple React hook `useKeyboardControl()` which can be used to manage a list of keyboard hooks (keyboard inputs and associated callbacks). Features supported by `react-keyboard-control`:

- Assign a callback function for a given keyboard event
- Use any available field in the `KeyboardEvent` type (see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing)) to match the user input
- Match a _sequence_ of keyboard events
- Disable keyboard hooks when used in a text field (`input` and `textarea`)
- Prevent matched keyboard events from being typed in a text field
- Return the list of keyboard events being tracked in the current sequence
- Set the keyboard event type (`keypress`, `keydown`, `keyup`)

## Example

```js
"use client";

import useKeyboardControl from "react-keyboard-control";
import { KeypressHook, TypedKey } from "react-keyboard-control";
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

  const keypressHooks: KeypressHook[] = [
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
    // When l, o, n, g is typed, send alert
    {
      keyboardEvent: [{ key: "l" }, { key: "o" }, { key: "n" }, { key: "g" }],
      callback: () => alert("that was a long key sequence"),
    },
    // When control o (ø) is typed, send alert
    {
      keyboardEvent: [{ key: "ø" }, { key: "Enter" }],
      callback: () => alert("entered null"),
    },
  ];
  const currentSequence: TypedKey[] = useKeyboardControl(keypressHooks);

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

## Limitations

Keyboards are a bit weird. Note that control-o actually sends the "ø" key (at least on my Mac). Similarly, shift-t sends the "T" key (somewhat obviously). Also, certain command sequences get picked up by the browser (e.g. command-T opens a new tab on most browsers), which I don't believe can be prevented (and probably shouldn't).

If this library doesn't support your use case (or doesn't work with your keyboard), please create an issue so we can generalize!
