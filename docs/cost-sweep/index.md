# Cost sweep

Where a frame goes, **measured on the device it runs on**. The sweep switches
one thing off at a time (a group of meshes, the render targets, the shadows),
or turns a resolution lever (hardware scaling flat; in a headset it puts the
viewport scale and the foveation back to full, so the row is what each is
saving), holds it for a couple of seconds, and records the frame
time. What comes back is a ranked list: the things whose absence bought the
most.

It exists because a headset has no GPU timer and no profiler, and guesses about
its fill cost made on a desktop are wrong in both directions. It is a button in
the Perf Stats panel (**Cost sweep**), so it runs inside the session.

```javascript
const rows = await document.querySelector('tosi-b3d').costSweep()
// [{ name: 'baseline', ms: 71.4, p95: 83.3, saved: 0 }, { name: '- water', ms: 55.6, saved: 15.8 }, …]
```

## Reading it

- **`ms`** is the median interval between frames; **`saved`** is the baseline
  minus that.
- **A headset's frame time moves in steps.** The compositor shows a frame on a
  refresh or the one after, so at 72 Hz the readings are 13.9, 27.8, 41.7,
  55.6 ms and so on. A saving smaller than a step can read as zero, and two
  small savings can add up to a step that neither shows alone.
- **`- everything`** is the floor: what the session costs with nothing drawn.
  If it is close to the baseline, the scene is not the problem.
- **`baseline again`** is the first measurement repeated at the end. If it
  differs from the first, the device drifted during the sweep (heat, a
  background task) and the rows are that much in doubt: run it again.
- Groups are meshes sharing a material, named after it. The sweep takes the
  twelve that could cover most of the view and lumps the rest as `other`.

Each experiment is restored before the next. A sweep changes nothing for good.

**Shader sweep**, the button beside it, measures the ground shader's other
forms (`costSweep(2, 'shaders')`). It is separate because each row recompiles
every ground and decoration shader twice, which is the heaviest thing either
sweep does.

## If it hangs the device

A sweep can hang a headset. So it writes what it has measured, and the
name of the experiment it is about to start, to `localStorage` before each
one, once as it switches the experiment on and once as it starts measuring.
Reload the page and Perf Stats shows the rows it got and **STOPPED** with the
experiment that never finished. Runs are numbered and the last four are kept:
a run that hangs at once does not replace the rows of the one before it. The two headset levers run last for that
reason: they are the part no emulator can exercise.
