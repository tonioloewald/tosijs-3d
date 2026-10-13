# bone-mask

**Which bones a layered animation drives, and how much.** Pure — a bone
hierarchy is names and parents, so none of this needs a skeleton, a renderer or
a GLB.

The problem it exists for: a character who walks and aims at the same time. The
legs play locomotion, the arms and head play the aim, and they have to look like
one person.

## The hard part is not the masking

Tonio, who did this in Unity years ago: *"Technically not hard, but having it not
look terrible is a whole other thing."* That is the design constraint, so it is
worth naming the specific ways it looks terrible before the API takes a shape
that guarantees them.

**A hard boundary is a mannequin sawn in half.** If `spine_02` takes its
rotation from the aim clip and `spine_01` from the walk, the torso kinks at one
joint. Real rigs distribute a twist over the whole chain, and so must this — the
mask is therefore a WEIGHT PER BONE, ramped along the chain, and never a set.
`falloff` is how many bones it takes to reach full authority.

**Counter-rotation is what makes legs look attached.** A walk cycle swings the
torso against the hips; that is most of why it reads as a body walking rather
than legs moving. Override the upper body wholesale and you delete it — the legs
swing under a dead trunk, which is the single most recognisable "layered
animation" failure.

That is why `MaskMode` defaults to **additive**: an aim clip applied as a
DELTA from its own reference pose preserves whatever the locomotion was doing
underneath, so the counter-rotation survives and the aim rides on top. Override
is offered because sometimes you genuinely want to replace — a reload that must
look identical whatever the legs are doing — but it is the sharper tool.

**A mask whose root cannot be found must SAY so.** Rigs disagree about bone
names, and this repo already carries that scar: `b3d-biped` finds bones with
`/^head$/i` regexes and `biped-mapping.test.ts` exists because of it. A missing
split root silently produces an all-zero mask, which animates nothing and looks
exactly like a clip that failed to load.
