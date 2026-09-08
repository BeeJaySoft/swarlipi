# Cross-beat glides

A meend or ghaseet often starts in one beat and ends in another. The renderer
only ever sees one beat, so it draws what that beat knows: an opening hook on
the note the glide leaves, a bar through a beat it passes, a closing hook on
the note it arrives at. `swarlipi/bridge` joins those fragments into one line
once the host says where the beat cells are and which beats pair. The samples
below are bridged by that module, live, from the spans each sample declares —
uncheck **Join the fragments** to see what the renderer emitted on its own.

<SheetControls />

<CrossBeat />

## Which beats pair

That is the host's rule. The notation app pairs an opener with a closer
when the beats are adjacent, or when every beat between them carries a
dangling `w` or `W` continuation; an unmarked gap does not pair, so a stray
marker forty beats away cannot connect. A later opener replaces a pending one.
A beat can close one glide and open the next, in which case both bridges meet
on that beat and must read as two unbroken lines.

## Drawing the bridge

`measureBridges` runs a bar from the right edge of each zone to the left edge
of the next along the span, at the zone's height, with the band's thickness
from `MEEND_BAR_RATIO`, and anchor-pins it to both zones so print re-derives
the geometry. The [Integration](/guide/integration#cross-beat-glides) page
shows the call.
