# aim IK

**Point what is held where the aim goes**, by turning the spine after the
clips have posed the body. An aim pose is drawn standing; laid over a crouch it
leans with the crouch's hips, and the gun points at the floor. This measures
where the held thing actually points and turns the spine bones, a share each,
until it points along the aim.

```javascript
import { aimSpine } from 'tosijs-3d'

// Each frame, after the animations (scene.onAfterAnimationsObservable):
aimSpine([spine01, spine02, spine03], gun, aimDirection, { weight: 1, maxDeg: 70 })
```

- `chain`: the bones to turn, root first (their TransformNodes, which a glTF
  skeleton's bones are linked to)
- `held`: a node below the chain whose `forward` (its +Z) is the barrel
- `target`: the world direction to point along
- `weight` 0..1 eases it in and out; `maxDeg` caps the turn, so a target
  behind the body turns the spine only so far

It works on directions in each bone's parent's frame, so a glTF root's
handedness mirror and a uniform scale make no difference. `<tosi-b3d-biped>`
runs it on its spine while it holds a weapon in `gunplay`.
