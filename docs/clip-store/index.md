# clip-store

The clips this browser keeps: motion of your own (a BVH capture, a Mixamo or
Meshy GLB's animations), kept by name as the files they came from, so any
character on the site can play them on its next visit. Captures are like
garments of your own, and this is their wardrobe beside `tosijs-garments`
(IndexedDB `tosijs-clips`).

A kept clip is its FILE's bytes with its kind (`bvh` or `glb`), so it is read
again exactly as it was read the first time ([bvh](/bvh/),
[glb-clips](/glb-clips/)), and a newer reader reads it better.
