Right now, React Flow forces lines to snap to hardcoded dots (handles) on the top/bottom/left/right of your tables. If 3 lines try to go to the left side, they crash into each other.

To fix this, we remove the handles completely. Instead, we use Intersection Geometry:

We draw an invisible "laser" from the exact center of Table A to the exact center of Table B.

We calculate the exact mathematical coordinate where that laser hits the outer boundary (bounding box) of the tables.

We draw the visible line exactly between those two outer boundary coordinates.

When you drag the tables, the line seamlessly slides around the perimeter, never crossing or overlapping.