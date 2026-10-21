# How input works

<!--{"order": 900, "parent": "input"}-->

**One interface, many devices.** Every source (keyboard and mouse, a hardware
pad, touch, VR controllers, an AI) produces the same `ControlInput`, and every
drivable thing consumes it. These pages are the layers: the interface, the
base class for drivable things, and the virtual gamepad that every device fills
in (its page covers keyboard, hardware pads, XR controllers and touch).

<!-- toc -->
- [control-input](/control-input/)
- [b3d-controllable](/b3d-controllable/)
- [virtual-gamepad](/virtual-gamepad/)
- [touch-gamepad](/touch-gamepad/)
<!-- /toc -->
