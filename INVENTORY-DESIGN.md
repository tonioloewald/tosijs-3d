# Inventory — design, for review

Board #3290. Tonio, 2026-10-14: *"A general purpose inventory system including
the ability to move things between an inventory and a schematic (such as a
character equipment display or an aircraft loadout) — the three use cases in
mind are general rpg (including say equipping a companion or mount), assigning
a load out to a manta, and designing / customizing a spacecraft in SFB."*

Status: **design, not built** (revised with Tonio's SFB, spell and crafting notes). Nothing here is code yet. The questions at the
end are the ones only you can answer.

## The three users, and what each one needs

| | RPG | Manta loadout | SFB ship |
| --- | --- | --- | --- |
| **Holder** | a character, a companion, a mount, a chest | a craft | a ship |
| **Schematic** | a paper doll: head, hands, body, rings | a top view: hardpoints, internal bays | the SSD: a hull of boxes |
| **The other side** | bags (which are items too) | the carrier's armoury | the parts catalogue |
| **Rules** | two-handed takes both hands; a mount takes saddle and barding only | weight, type per hardpoint, left and right must match | point budget, power balance, what fits where on the hull |
| **What it adds up to** | armour, damage, encumbrance | mass, drag, range, what you can shoot | BPV, power, firing arcs |
| **During play** | swap a weapon mid-fight | spend missiles | boxes are destroyed one at a time |

The last row matters most. An SSD is not only a design surface: in play its
boxes are crossed off. So the thing in a slot can be **damaged**, which is the
role-carrying destroyable MINIATURES-DESIGN asks for ("the radio operator died"
becomes "the forward phaser is gone").

## What SFB adds, and why it makes the model general

Tonio, 2026-10-14: *"I'd look at SFB to see what its requirements are but
not be too concerned with matching it exactly. The big difference with SFB is
that your inventory is essentially a bottomless pit but you build up a cost
for the design and derivative values. SFB is nice because it has requirements
that make a general solution interesting. Eg it could be used for a magic
spell system or a crafting system (and a crafting system with or without
recipes is worth considering too)."*

What Star Fleet Battles' ship design actually asks of a model (from its
rules as I know them; the demo follows the shape, not the letter):

- **The source is a catalogue, not a stock.** Phasers, photon torpedoes,
  shields, warp engines, impulse, batteries, labs, shuttle bays: you take as
  many as the rules allow. What builds up is a COST (BPV, the battle point
  value) and DERIVED values (power, movement cost, firing arcs).
- **Where a thing is mounted changes what it does.** A phaser's firing arc
  is a property of its mounting position, not of the phaser. So what an item
  contributes is a function of the item AND its slot.
- **The holder has a template.** The hull (a size class, its mounting
  positions, its base systems and limits) is chosen first; changing it
  re-checks everything fitted.
- **Rules compare totals.** Power generated must cover power used; shields
  and weapons draw on the same budget. A rule can read the derived values,
  not only the slots.
- **A system is a number of boxes, each destroyed on its own** in play, and
  damage goes to the first undamaged box of a type (the damage allocation
  chart is the game's rule; "first undamaged box of this type" is the
  model's query).
- **Variants are designs derived from designs** (refits): a design is a
  document, and a refit is that document with changes.

The same shape is a **spell builder** (a form, an element, a range and an
area from a catalogue; mana is the cost; damage and reach are derived; some
components exclude others) and a **crafting system**, in two modes:

- **Without recipes:** a design. Components go into a schematic (a blade, a
  guard, a grip; a hull and its systems), the result's properties are
  derived from them, and a finished design is **compiled into a new kind** in
  the catalogue: a ship class, a learned spell, a crafted sword you can now
  make or own.
- **With recipes:** a recipe is a transformation. It names inputs by kind or
  tag and quantity, tools that must be present but are not used up, perhaps
  a station; applied to a holder it consumes the inputs and produces the
  outputs, as one transaction like any move.

So the model grows four ideas beyond the five below: a **catalogue source**
(unlimited, priced) beside a counted stock; **contributions that depend on
the slot** as well as the item; a **holder template** (a hull, a body, a
spell form) that supplies its containers and limits; and **designs that
compile to kinds**, with **recipes** as transactions that consume and
produce.

## One model under all three

Five ideas, nothing else:

1. **An item** is an instance of a kind from a catalogue: `{ id, kind, qty }`,
   plus anything that differs from its kind (damage, charges, a name). The
   kind carries the facts: tags (`weapon`, `two-handed`, `missile`,
   `phaser`), size, mass, cost, and what it contributes.
2. **A holder** owns containers: a character, a craft, a ship, a chest, and
   also a bag, because a bag is an item that is also a holder. Nesting is
   free.
3. **A container** is one of three shapes, and they are the same idea at
   different strictness:
   - **slots**: named sockets, each accepting by tag (`head`, `left-wing-outer`,
     `phaser-mount-1`). A paper doll and a hardpoint list.
   - **a list**: a bag, with optional caps on count, mass or volume.
   - **a grid**: cells, and an item covers a footprint (Diablo's bag; the SSD's
     hull, where a warp engine is six boxes).
4. **A rule** is a pure function from a proposed state to reasons it is
   wrong: `(state) => string[]`. Per-slot accepts, per-holder budgets (mass,
   points, power), and relations (two-handed fills both hands; the wings
   match; no more than one cloak). Reasons, not booleans, because the
   interface has to say WHY something will not go there.
5. **A move** is a transaction: take this from there and put it here (with a
   swap if the place is full and the swap is allowed). It is checked against
   every rule it touches, and either all of it happens or none of it does. It
   emits a COMMITMENT event (`equipped`, `unequipped`, `transferred`,
   `damaged`) in world-contract's sense: an act, never a proximity.

Everything a loadout ADDS UP TO is derived, never stored: a reducer over what
is fitted (`mass`, `armour`, `bpv`, `range`). Each game writes its own; the
library ships the plumbing and a sum of numeric contributions.

**Pure and Babylon-free**, in the world-store tradition: deterministic, unit
tested, runs headless (a server can validate a loadout, a driver can reason
about one). **The state is a plain JSON document** with a JSON Schema and a
validator, like `light-settings`, so loadouts save, load, share and diff.

world-store's `InventoryEntry` (an item id and a count on an actor) stays as
the simple case; the store gains an adapter rather than a second model.

## The interface: one UI, flat and in a headset

Two panels side by side, on the SVG surface (so the same UI works on a
monitor, a phone and in VR):

- **The schematic** is a picture with sockets on it. It is authored as SVG:
  any element with `data-slot="left-hand"` (or a grid's cells) becomes a
  socket, so the art is a designer's, and `svg-to-code` already turns an SVG
  into a parameterised builder. A paper doll, a craft from above, an SSD.
- **The inventory** is a list or a grid (`table.ts` / a grid box), filtered
  and sorted.

Moving things, three ways, all one model:

- **Drag** from one to the other (pointer, touch, a controller ray).
- **Two taps**: pick the thing, then pick where it goes. This is the path for
  a gamepad and the one that works best in a headset, where dragging at arm's
  length is tiring.
- **Context menu** on a thing: Equip, Unequip, Give to…, Drop.

While something is held, every place it could go lights, and every place it
cannot is dimmed, with the rule's reason on hover. A second holder opens as
a second schematic beside the first: that is "equip the companion", "fit the
horse" and "give it to someone" in one gesture.

## In the world

A slot can name WHERE it is on the model: a bone (`hand.R`) or a node by
naming convention (a `_hardpoint` suffix, in the tradition of
`_centerOfGravity`). What is fitted there is shown there, by the spatial
attachment SPATIAL-DESIGN describes: the sword in the hand, the missiles
under the wing, the phaser on the hull. That is phase 4, and optional: a
loadout is useful long before it is visible.

## What this library builds, and what it leaves room for

Tonio, 2026-10-14: *"Inventory system goes here in this library. We don't
build specific stuff here but leave space (plugins, callbacks) for it. But
this leaves us with other general functionality (drag and drop for example
and socketed targets)."*

**Here:** the general model and its interface, plus two pieces of interface
that are not inventory at all and are wanted everywhere.

**Left to each game, through plug-in points:**

| plug-in | what the game supplies | an example |
| --- | --- | --- |
| the catalogue | its kinds: tags, size, mass, cost, contributions | a phaser, a longsword, a fire glyph |
| rules | `(proposed state) => reasons[]` | two-handed, power balance, wings match |
| contributions | `(item, slot) => numbers`, so mounting can matter | a phaser's arc from its mount |
| totals | reducers over what is fitted | BPV, encumbrance, mana |
| damage | which box a hit takes (the model answers "first undamaged box of this type") | SFB's damage allocation chart |
| recipes | inputs, tools, outputs | three iron and a hammer at a forge |
| compile | a finished design to a new kind | a ship class, a learned spell |
| the schematic | its SVG art with `data-slot` sockets | a paper doll, an SSD |

No game's rules ship in the library. The demos are small worked examples of
the plug-in points (a party, a loadout, a ship), sized to prove the model,
not to be anyone's game.

**General functionality this surfaces**, built first because inventory is
only one of its users:

- **Drag and drop across all three surfaces** (the DOM, a panel in a flat 3D
  scene, a panel in a headset): pick up a thing, carry it, and drop it on a
  target, including from one panel to another and from a panel into the
  world. What exists today is pieces: `widget-box`'s pointer capture (a
  slider survives leaving its track), `popup-surface`'s title-bar drag, the
  XR pointer's ray. A drag in a headset starts at the hand, not the eye (the
  asymmetry CLAUDE.md records), and the two-tap path is the same gesture
  without the carry.
- **Socketed targets**: a place that accepts some things and not others,
  says why, and shows it while something is held (lit, dimmed, a reason on
  hover). A slot on a paper doll, a hardpoint, a cell of a grid; also a
  keyhole, a puzzle socket, a holster, a drop zone in an editor. In a scene as
  well as on a panel: a socket can be a node on a model (a hand bone, a
  `_hardpoint`), which is how a fitted thing appears in the world.

## Order

1. **Drag and drop, and socketed targets**, as general UI: one model of a
   carry (what is held, from where, by which pointer), sockets with
   accepts-functions and reasons, the lit/dimmed/why states, drag and two-tap
   on all three surfaces, and sockets on panels and on nodes in the scene.
2. **The inventory model** (`inventory.ts`, pure), built with its plug-in
   points from the start: items, holders and templates, the three container
   shapes, catalogue and counted sources, rules with reasons, moves (and
   recipes) as transactions, slot-dependent contributions, totals, boxes and
   damage, designs that compile to kinds, the JSON schema.
3. **The inventory interface**: a schematic from SVG and the inventory list
   and grid, made of the pieces in step 1.
4. **Worked examples**: a party, a loadout, a ship; later a spell builder
   and a crafting bench.
5. **In the world**: fitted things shown on the model through scene sockets.

## What would show this is wrong

- If the SSD needs rules a reasons-function cannot express (an order-
  dependent build, a rule that reads the whole fleet), the rule shape is too
  small.
- If the two-tap path feels second-class in a headset, the interface is a
  mouse UI with VR bolted on, and the order of the two paths should flip.
- If Manta's loadout wants a single dropdown per hardpoint and nothing more,
  the schematic is overbuilt for it; it should then be a skin over the same
  model, not a reason to change the model.

## Questions for you

1. ~~SFB~~ Answered: follow its shape (catalogue, cost, derived values,
   mounting-dependent arcs, boxes, power balance, refits), not its letter.
   The demo is a generic starship designer; spells and crafting are the same
   model and get a demo each later.
2. ~~Manta~~ Answered: yes, a counted stock the carrier holds; missiles
   spent in a mission are gone from it.
3. ~~RPG depth~~ Answered: things like durability, quality and random stats
   are the consumer's, added through the plug-in points (an item carries
   whatever overrides it is given; contributions and totals read them). What
   the library owes them is a way to SHOW them: an item's view takes
   DECORATIONS: small status bars (durability, charge, ammo), an outline
   state (damaged, broken, a destroyed system), a badge (a count, a quality
   mark). The consumer says what each item shows; the interface draws it the
   same way on every surface.
4. ~~Where it lives~~ Answered: here, general only, with plug-in points;
   drag and drop and socketed targets come out of it as general UI.
