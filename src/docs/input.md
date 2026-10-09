# Input

<!--{"order": 80}-->

Whether you're driving a 3d scene with keyboard and mouse, a touchscreen, a game controller, or VR controllers, the goal is to build your controller code once and have it work as broadly as possible.

**Which one do I want?** To drive a character or vehicle the library already
has, wrap it in a [b3d-input-focus](/b3d-input-focus/): every device works, and
so does getting in and out. For your own thing, a
[b3d-controller](/b3d-controller/) hands you the merged input each frame. Add
a [glass gamepad](/glass-gamepad/) for touch screens. Everything else is under
[How input works](/input-internals/), for when you need a new device or want
to know why.

<!-- toc -->
- [b3d-controller](/b3d-controller/)
- [b3d-input-focus](/b3d-input-focus/)
- [glass-gamepad (b3dGamepad)](/glass-gamepad/)
- [touch-orbit](/touch-orbit/)
- [game-controller](/game-controller/)
- [How input works](/input-internals/)
<!-- /toc -->
