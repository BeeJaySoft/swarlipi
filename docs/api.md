# API

```ts
import {
  renderSwarlipi,
  swarlipiWrapperClass,
  toUnicodeNotation,
  escapeHtml,
  MEEND_BAR_RATIO,
  type SwarlipiScript,
  type SwarlipiRenderOptions,
} from 'swarlipi';
import 'swarlipi/style.css';
import { SAMPLE_GROUPS, CROSS_BEAT_SAMPLES } from 'swarlipi/samples';
import { SYMBOL_GROUPS } from 'swarlipi/reference';
```

## `renderSwarlipi(notes, script, options?)`

Renders one beat's notation as an HTML string. Never touches the DOM.

- `notes: string`: the beat, in the [Omenad keymap](/guide/compatibility).
- `script: SwarlipiScript`: `'punjabi' | 'hindi' | 'bangla' | 'english'`. An
  unknown value degrades to `'english'` rather than throwing, since the value
  often comes from a cookie.
- `options.noteClass?: (swara: string, octave?: string) => string | undefined`:
  extra class(es) for a note's `.sl-n`.
- `options.editing?: boolean`: draw half-typed markers over empty slots.

Returns `''` for an empty string.

## `swarlipiWrapperClass(script)`

The class list the receiving element must carry: `"sl-wrap sl-<script>"`.

## `toUnicodeNotation(notes, script)`

The plain-text form: letters in the script plus Unicode combining marks for
the octave dots, the komal line and the tivra bar. Kan becomes parentheses;
chhand and meend markers are left out; bols and digits use their script forms.
Marks are placed after the whole letter cluster, never between a consonant
and its vowel sign.

## `MEEND_BAR_RATIO`

The thickness of a meend or ghaseet line as a fraction of its mark zone's
height. The one number a host uses to draw cross-beat bridges that match the
fragments. `--sl-bar-ratio` in the stylesheet mirrors it.

## `escapeHtml(value)`

The escaper the renderer uses for text it passes through. Exported for hosts
that build markup around the output.

## `swarlipi/style.css`

The stylesheet the markup needs. Prefixed `sl-`; see the
[hooks table](/guide/integration#the-stylesheets-hooks).

## `swarlipi/samples`

`SAMPLE_GROUPS`: single-beat samples grouped by feature, each `{ title, note?,
samples }`. `CROSS_BEAT_SAMPLES`: runs of consecutive beats,
`{ title, note?, beats }`. The source of the [Symbol reference](/notation/).

## `swarlipi/reference`

`SYMBOL_GROUPS`: the symbol mapping as data, grouped `{ id, title, entries }`
with each entry `{ key, name, example }`. The source of the
[mapping table](/guide/compatibility#the-mapping) and of the notation app's
in-editor guide sheet.
