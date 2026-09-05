# Cross-beat glides

A meend or ghaseet often starts in one beat and ends in another. The renderer
only ever sees one beat, so it draws what that beat knows: an opening hook on
the note the glide leaves, a bar through a beat it passes, a closing hook on
the note it arrives at. Joining those fragments into one line is the host's
job, because only the host knows where the beat cells land on the page. The
samples below show the fragments as the renderer emits them, cell by cell,
without a bridge.

<SheetControls />

<CrossBeat />

## Which beats pair

That is the host's rule too. The notation app pairs an opener with a closer
when the beats are adjacent, or when every beat between them carries a
dangling `w` or `W` continuation; an unmarked gap does not pair, so a stray
marker forty beats away cannot connect. A later opener replaces a pending one.
A beat can close one glide and open the next, in which case both bridges meet
on that beat and must read as two unbroken lines.

## Drawing the bridge

Bridge from the right edge of the opening zone to the left edge of the closing
zone, at the zone's height, with the band's thickness taken from
`MEEND_BAR_RATIO`. The [Integration](/guide/integration#cross-beat-glides)
page has the details, including why the bridge's box must be the whole zone
and not just the band.
