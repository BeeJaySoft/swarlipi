# Symbols

Every form the renderer draws, live, with the geometry explained. The controls
apply to the whole page. For the character that produces each one, see
[What to type](/notation/keymap).
The sample set is exported as `swarlipi/samples`, so what you see here is what
the package's own tests and the notation app's checks use.

<SheetControls />

## Sizes

The marks are CSS and SVG, not glyphs, so they scale with the letters instead
of being drawn once at one size. 18px is the notation grid's beat cell.

<SizeWaterfall />

## Letters

`s r g m p d n` are the seven swaras. Re and Ni carry their vowel signs in the
Indic scripts, ਰੇ and ਨੀ, which is why the mark lines sit where they do: the
dot line clears the tallest letter in each script.

<SampleSheet group="Letters" />

## Komal and tivra

Capitals flatten: `R G D N` draw komal Re, Ga, Dha and Ni with a line under
the whole letter, vowel sign included. `M` is tivra Ma, a bar above. The
underline and the bar share one stroke weight.

<SampleSheet group="Komal + tivra" />

## Octaves

An octave marker follows its note. `u` puts one dot above for taar, `U` two
for ati-taar; `l` and `L` do the same below for mandra and ati-mandra. Every
dot in a script sits on the same line, whatever the letter under it.

<SampleSheet group="Octaves" />

## Kan

Braces make a kan: `{m}s` is a grace Ma into Sa, drawn as a superscript before
the note. A kan can hold more than one note, and a note can carry a kan and an
octave dot at once.

<SampleSheet group="Kan" />

## Chhand

A chhand symbol groups the slots that follow it under one arc: `@` two, `#`
three, `$` four, `%` five, `^` six, `&` seven, `*` eight. Notes and dashes
count as slots; a kan does not. `` ` ``, `!` and `~` are the four-, six- and
eight-slot groups drawn lower, so a group can sit inside another for layakari.

<SampleSheet group="Chhand" />

## Dashes

`-` sustains the previous note for a slot. It takes part in a chhand group
like a note does.

<SampleSheet group="Dashes" />

## Meend and ghaseet

`q` opens a meend and `e` closes it; the glide runs from the note after `q` to
the note before `e`. `Q` and `E` do the same for a ghaseet, drawn as a square
bracket. A pair closed within the beat spans its notes. When a glide crosses
beats, each beat gets a fragment and the host joins them, see
[Cross-beat glides](/notation/cross-beat).

<SampleSheet group="Meend + ghaseet" />

## Strokes, murki and digits

`;` `'` `[` `]` `\` are the mizrab bols da, ra, daa, raa and dir, set in the
script. Parentheses mark a murki. Digits come out in the script's numerals.

<SampleSheet group="Strokes + murki + digits" />

## Half-finished entries

What an editor shows while a beat is being typed. Turn on **Editing mode**
above to see the markers drawn over empty slots; a read view leaves them out.

<SampleSheet group="Half-finished entries" />

## Crowded beats

The spacing case a monospaced notation font could never win: many letters in
one beat, set as text.

<SampleSheet group="Crowded (spacing showcase)" />

## Real beats

<SampleSheet group="Real beats" />

## Everything at once

<SampleSheet group="Kitchen sink (everything in one beat)" />
