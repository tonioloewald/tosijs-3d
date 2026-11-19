# Changelog

<!--{ "parent": "upgrading", "order": 20 }-->

All notable changes to **tosijs-3d**, one page per version: each lives in
`changelog/v<version>.md` (on the site at `/v<version>/`), and this page is the
index: the latest release below, then every version, newest first (that list is
generated from each page's `parent`). This project is pre-1.0 (`0.x`), so minor
versions may carry breaking peer-dependency changes. Each is called out in a
**⚠️ Breaking** block on its version's page, with what a consumer must do.
Upgrading across a minor? Start with [Migration](/Migration/).

## Unreleased

- **Added:** `playback3d` has a backwards button at the end of its row (the character builder's clip transport): the speed's sign is the direction, so backwards at ×0.5 is `handleSpeed(-0.5)`, and a negative speed from `read()` lights it.
- **Fixed:** a menu in a scene panel (any select) could not be chosen from while the camera was more than 10 km away, as the rig tool's orthographic views put it: every press on the menu counted as outside it and closed it. A select's menu now ticks the current option, and the rig tool's `dragging` is **drag moves**: joint + descendants, joint alone, turns descendants.
- **Changed:** character builder: while rigging, **Pause** (Animation, on the bar) holds the clip where it is, in perspective; **Rest pose** is its own item (pause used to stand the body at rest in an orthographic view). A manipulator turned on while rigging pauses the rig tool's clip (it paused only the builder's). The builder's settings panel drops the scene Pause, which read as the clip's. `<tosi-b3d panel-pause="off">` leaves it out of any scene's panel; the rig tool's API has `frozen`.
- **Added:** a class can be worn somewhere other than its own place: the character builder's held item has **worn** (hand, forearm) beside **side**, kept per class with the character's grips (`place:<class>`), with a grip of its own for that place (`gripKey`, starting from `PLACE_GRIPS`). `placeIn(name, kept)`; `holdMount` and `holdGrip` take a `place`. The Biped Playground follows it for the left hand (a buckler gripped in the fist).
- **Fixed:** Biped Playground: a character from the builder holds and wears things where the builder placed them (its per-class grips, its shield and the places on its back); every hero used the defaults. The mannequin still does.
- **Added:** held things go on either side. A hold class rides in the hand or on the forearm (`holdPlace`), on its own side unless told (`holdSide`: the right hand; a bow's left hand; a shield's and the new `wrist` class's left forearm), and `holdGrip(name, adjusted, classes, side)` mirrors a grip set for one side to the other (`mirrorGrip` in `hand-socket`; `ownSideGrip` stores an adjustment made on the other side). Each forearm has an anatomical socket like the hands' (`forearmSocket`; on UAL it is the lower arm bone, so a shield's numbers mean what they did); `mountNode(skeleton, holdMount(class, side))` gives the node to hang a thing from. The character builder's held item has a **side** (auto, right, left); the Biped Playground draws whatever is in the left hand (a dagger in the off hand, a shield on the forearm).
- **Fixed:** a manipulator grabs only with its own handles, and none while hidden: with two on a page (the character builder's item and hair handles), a press to orbit the view could start a move of the hidden one, whose invisible handles stayed at the scene's middle.
- **Changed:** things stowed on the back sit as they should: a long gun is slung barrel up over the right shoulder, flat against the back (it pointed forward through the chest); a spear rides point up (it hung point down), a bow upright. The spear has its own hold class, `pole` (it was `melee2h`): a character's `melee2h` grip adjustment no longer applies to it.
- **Fixed:** inventory dock: a drop whose swap is refused sends what it displaced to the list (a shield moved from the off hand onto a back holding a two-handed spear, with a sword in the other hand). `inventoryPanel` takes `spill`.
- **Fixed:** the character builder's JSON export of an unnamed character is `character.json` (it was `character.character.json`).
- **Changed:** tooltips and info cards in a scene are their own surfaces: a panel's tooltip (an icon button's name) and the inventory's and trade panel's info card (shown on hover or D-pad focus) open in front of every panel and popup, beside or under what they describe, so the panel's edge no longer cuts them off, and they are never picked (a ray or click passes through). `showTipSurface(root, sheet, anchor, side)` in `panel-layer`; `openPopup({ tip: true })`. A panel only on the page draws them in itself, as before.

- **Added:** focus in panels, for a gamepad and the keyboard. When a panel opens its default control takes the focus (`button3d({ default: true })`, `asDefault(widget)` for any widget; else the first), and a popup inside it does the same. Up and down, and **Tab** / shift-Tab, step through the controls and cycle; left and right move a slider, change a choice, move a text box's caret, else go to the control beside it. The keyboard's ring shows from the first Tab until the mouse is used. Gamepad UI mode, flat: hold D-pad up to reach the system bar, left and right step along it, **B** presses, down goes into the open panel; hold up in a panel to close it (focus goes back to its button on the bar), and on the bar to go back to playing. A panel that pops up while the pad was the last thing used takes the pad, and gives it back when it closes (hold up closes it). A modal (the pause, a respawn panel) takes the focus from what it covers, on its first button, so **B** answers it. While the mode is on the D-pad and B belong to the UI (`padUiOwns`; `HardwareGamepadSource.poll(true)` reads them anyway). `b3d.padUiActive`, `b3d.setPadUi(on)`; pure in `pad-ui` (`padNavigator`); widget semantics gain `isDefault` and `nudge`; `createFocusPulse` takes `repeat`. The inventory and the trade panel are reachable too: in the inventory **B** picks a thing up and **B** on a slot or the bag puts it down (while you carry it the D-pad skips the places that will not take it; a focused thing shows its info); in a trade **B** moves the thing straight across, the next one takes the focus, and a chest opens on **take all**. `inventoryPanel`, `inventoryDock` and `tradePanel` gain `controls()`; widget semantics gain `focus(on)`; a box gains `focusTo(i, { ring })` and `visibleRect(i)`.
- **Added:** a conversation's replies can be chosen on a gamepad: the D-pad steps through them (cycling), **B** picks. The pad's choice wears the panels' focus ring and is its own, apart from the mouse's hover; it starts on the first reply, and a first press (D-pad or B) only shows it. `gamepadFocus` takes `activate` and `back` (which buttons confirm and back out; the defaults are unchanged).
- **Changed:** ⚠️ the D-pad no longer zooms the biped's camera (it is for UI navigation; XR controllers have none). The mouse wheel still zooms, through a new optional `VirtualGamepad.zoom` axis, not the d-pad.
- **Fixed:** City Drive's cars: some drew black and mangled, others as nothing but their lamps. Babylon's `Mesh.MergeMeshes` appends into the first part's index array in place, and the parts shared their geometry with the library's, so each merge grew the library's wheel and every car built after it was corrupt. `<tosi-b3d-city>` gives each part its own geometry before merging.
- **Changed:** ⚠️ the biped's gamepad layout. **A** attacks (fires with the weapon raised, the right trigger still does; swings a melee weapon), **B** uses (doors, chests, lifts, pickups, talking) and, with the weapon raised, ducks instead, so it can never fire; clicking the **right stick** jumps (it toggled the weapon; the right bumper still does); **X** is a use alias. In a car **B** gets out as well as X. The keyboard is unchanged (space jumps, E uses, F attacks): a mapping's `keyboard` transform moves the keys. Pure in `bipedMapping`; labels in `bipedMappingDescriptor`.
- **Changed:** a chest's trade panel closes itself 0.7 s after **take all** takes everything.
- **Fixed:** a biped's nameplate is hidden while it is in a conversation (it sat behind the balloon).
- **Fixed:** rig tool: a marker joint (elbow, wrist, knee) dragged with `dragging` set to move the joint alone, by its joint dot or its marker, no longer carries what hangs from it (the joints below stay where they are drawn), and a joint drag that moves markers too (a collar carrying the elbow and wrist) is one undo step, not two.
- **Added:** aiming is finer and sticky. While a biped aims, the sticks follow a response curve (`aimCurve`, default 2), the aim slows as it crosses something that can be hurt (`aimAssist`, default 0.5; 0 turns all of this off), and a sweep near a target with the stick below `aimBreakout` (default 0.7) LOCKS onto it: the aim eases onto its body and follows it as it or you move, a lighter stick slides the aim slowly across it (onto the head), and a push past the breakout lets go. Targets behind something solid are not locked. Pure helpers in `aim-assist` (`stickCurve`, `aimFriction`, `stickyAim`).
- **Fixed:** a launcher finds who is holding it at each shot (it cached the first answer, so after a respawn the new hero's own shots hit him).
- **Fixed:** in a headset, a system panel pinned by a percentage of the screen (`left: '50%'`, `top: '50%'`, a centred `anchor`) goes that far across the view in front of you; it hung under the system bar, 66° up (the trade panel was in the sky). The biped's third-person camera in a headset stays this side of walls, as the flat one does.
- **Changed:** Biped Playground: the HUD is smaller, at the bottom middle, translucent, and can be dragged anywhere. In a headset a `bottom`/`right` percentage pin places a system panel as `top`/`left` do.
- **Added:** `<tosi-b3d-launcher sound="pistol|rifle|heavy|bow">` plays a synthesised shot at the muzzle on every `fire()` (`gunshot(scene, at, kind)` in `gun-sound`; no files). The Biped Playground's guns have them.

- **Changed:** a shop's trade panel no longer shows their purse. Yours is under your list, and the line under both reads `you'll pay 12 gold`, `you'll receive 6 gold`, or, when they cannot pay what yours fetch, `you'll receive 200 gold (all he can offer)` with `he can't offer more than 200 gold`. Deal then takes all they have. New option `they` (how the other side is named in a sentence, default `'they'`).
- **Added:** `trade.offer(currency)` (what changes hands, and whether they are short) and `trade.deal(currency, { upTo: true })` (one payment of what it comes to, capped at what they have). An inventory move with `pay` and `amount` and no item is a payment alone; `pay.holder: ''` is money from outside the world (a reward, coins found).
- **Added:** in the Biped Playground, a pile of 50 gold by the gate chest, and the shopkeeper says "Please, take a look." before the shop opens, in the middle of the view.

- **Fixed:** `pickup.toss(to)` called before the pickup has joined the scene (just appended) waits for it instead of doing nothing (a dropped item hung in mid-air), and without a `to.y` it lands on whatever is under the spot, not at y 0.
- **Fixed:** a tossed pickup stops at the foot of a wall in its way, and lands on what is under its arc, never on top of a wall higher than it flew. The Biped Playground throws a dropped item 3 m to the right front, low.
- **Fixed:** the biped's follow camera in doorways and small rooms: its wall check runs from what it looks at to where the camera really sits (it ran from the waist, through the doorway, while the camera sat over the wall), ignores invisible hulls, and when a wall pulls it in, or stands between it and you, the camera goes straight there instead of easing through the wall.

- **Fixed:** an open flat system panel follows a new active camera (it is opened again on it). One opened at scene start, before a biped's follow camera, was never drawn.
- **Changed:** the Biped Playground shows health, ammo and messages in a panel at the top right (flat and in a headset) instead of a line of text under the scene; what each enemy is doing is in Perf Stats (`#debug`).

- **Fixed:** a biped killed by damage or a fall stays down. When the death clip ended, the loop it died in stood the body back up. Killed with a gun up, its upper-body aim layer kept looping over the corpse; it is dropped too.
- **Fixed:** in the Biped Playground, Respawn brings the hero back; before, it removed him and added nobody. The line under the scene now says how to draw and fire. The enemies see 25 m (was 50) and the guard stands beyond the cover line, so neither notices you at the start, the shop or the things lying about.

- **Added:** the default AR session (`xr-passthrough`) scales you to the scene: you arrive with what the flat view showed a step ahead, one grip drags the scene, both grips resize and turn it, and the sticks walk at your scale. `b3d.xrFrame(centre, radius)` puts any point in front of you at a chosen size; `b3d.xrSupport` says whether the device offers VR and AR. Pure maths in `xr-grab`. In the Solar System, **look at** brings a body in front of you, and the passthrough toggle shows only where AR exists, outside a session.
- **Fixed:** in a scaled XR session a controller's ray reaches the system bar (it stopped 1000 units out).
- **Added:** `<tosi-b3d xr-passthrough="on">`: Enter VR starts an AR session where the device has passthrough (a Quest): the room shows behind the scene, with no sky and no floor grid. Elsewhere it enters VR. The scene dispatches `xrenter` (`detail.passthrough`) and `xrexit`. The Solar System demo has a **passthrough (AR)** toggle: the system stands a metre and a half across in your room.
- **Fixed:** in a session with a WebXR `worldScalingFactor`, panels on the head-following frames (the system bar, the settings panel) keep their size (`XrFrames` takes `worldScale`).
- **Added:** the Biped Playground's shopkeeper speaks his lines (`speech/shopkeeper-*.mp3`, voiced locally with Qwen3-TTS, a direction per line; deploy static-assets first). Their manifest is `bin/speech-shopkeeper.json`.
- **Added:** `<tosi-b3d-conversation>`: nest it in a biped, give it a `script` and a `host` (the game's inventory), and `start(player)`. The speaker turns to face you and talks or gestures (`talk`, `yes`, `no`, `give`, `show`, `surprise`, `foldArms` in `ualAnimationStates`); its line and your replies are in a speech balloon over its head (click, a controller, or the reply's number key), your line in one over you; a line's `audio` plays; a `trade` effect opens the game's shop and the talk resumes when it closes; walking away ends it. `B3dBiped.perform(state, seconds)` holds a clip that long (a loop loops), and `endPerform()` stops it. In the Biped Playground, E at the counter talks to the shopkeeper: he sells, and pays rifle rounds for the potion in the gate chest. `UAL1_core.glb` carries the talking and gesture clips (10.9 MB, was 9.0) once static-assets is deployed.
- **Fixed:** closing the Biped Playground's chest or shop panel with its × ends the trade (a chest no longer stays open).
- **Added:** `startConversation(script, host)`: a conversation as data and a clock. Nodes of lines (speaker, text, audio, gesture, interruptible) and replies (a label, the player's spoken line, a `when` on what they carry or flags, a `then` of effects: goto, end, give, take, trade, set a flag). Replies appear as the last line nears its end, a pick cuts an interruptible line, a trade pauses the talk until it closes, and every line goes in `transcript`. Effects go through the host (the game's inventory). Pure; the 3D staging comes next.
- **Added:** Tonio's Bow and Kite Shield in `tonio/weapons-classic` (library `?v=3`, once static-assets is deployed). A bow is held in the LEFT hand (`holdMount('bow')` is `hand_l`'s socket; a launcher takes `socket: 'left-hand'`), upright along the aim; the kite shield is a shield. The character builder holds a bow in the left hand (its row is now **in hand**). In the Biped Playground a bow lies by the start, arrows are in the gate chest and the shop, the shop sells the kite shield, and with the bow up the hero plays UAL's bow clips. The bow is untextured and its string does not draw yet.
- **Changed:** `UAL1_core.glb` is asked for as `?v=5` (the bow clips), so deploy static-assets before loading a page.
- **Added:** a biped in gunplay SHOULDERS a long gun (a `rifle` by `holdClassOf`, or a model with a `_foregrip` node): the shoulders blade, the stock goes to the right shoulder with the barrel along the aim, and the left palm cradles the foregrip. It plays the pistol aim corrected by arm IK, since no CC0 set has rifle clips; `_stock` and `_foregrip` nodes place it exactly, else it is read off the model's shape. New: `twoBoneIk` (pure; the retargeter's leg IK now uses it), and `reachLimb`, `setWorldRotation`, `turnAbout` in aim-ik.
- **Added:** `B3dBiped.setAimClips(AIM_CLIPS.bow)` switches the gunplay states (stance, aim up/level/down, shoot, reload) to UAL2's bow set; `AIM_CLIPS.pistol` is the default. `UAL1_core.glb` carries the bow clips once static-assets is deployed.
- **Fixed:** scene panels and modals work by touch on a phone. The screen-reader copies laid over them took every tap, so a menu opened Android's own picker instead of the drawn one. They now take touches only once a screen reader is in use (`ariaMirror`'s new `touchable` option), and a long press no longer counts as a screen reader.
- **Fixed:** a `barMenu` submenu (the character builder's Select and Delete, the Animation menu's groups) opens and stays open. The list it replaced still answered the panel's last `leave` and repainted itself over the new one, so a submenu flashed and vanished or never appeared.
- **Fixed:** typing in a text field on a scene modal (the character builder's save and rename prompts) shows each key as it is typed. The modal's screen-reader copy holds focus, and its typing reached the drawn field only on Enter or blur; it now passes every keystroke through, Enter is the field's Enter, and the old text is selected so a new name replaces it.
- **Changed:** the character builder's clips include UAL's zombie idle, walk, run, scratch and bite (once static-assets is deployed).

- **Added:** mounts beyond the right hand. A shield is strapped to the LEFT FOREARM (`holdMount(class)`: `lowerarm_l`, in the bone's frame), and anything stowed rides on the BACK across the shoulders (`STOW_MOUNT`, the upper spine; `stowGrip(name)`, blades hilt up, long guns barrel up). The character builder's Hold section has **on the back** beside **right hand**, each with its manipulator and per-class numbers (a character keeps stowed places as `stow:<class>` in `grips`, and a new `stowed` setting). In the Biped Playground the buckler goes in the left hand (not the right) and is drawn on the forearm, and whatever is on the back is drawn there.

- **Added:** a shopkeeper in the Biped Playground: a stand-in mannequin behind a counter; E at the counter opens a priced trade (ammo by the box, buy at value, sell at half). `tradePanel` takes `moveFor`, and `trade` counts what crossed by kind and quantity, so stacks split and joined in a trade are paid for correctly (`TradeChange` is now `{ kind, qty, from, to }`).
- **Added:** the rig tool's `dragging` has **moves the joint alone**: a shoulder moved without carrying its elbow and wrist. `RigToolApi.skeleton` is the model's skeleton now.
- **Changed:** in the character builder, the grip and hair manipulators turn off when the clip plays or changes, and the held item stays in hand while rigging (on the rig tool's body), so arm space can be judged with it.

- **Added:** magazines and reloading. `<tosi-b3d-launcher reload-time>` gives a launcher a magazine of `ammo` rounds, refilled from `ammoSource` (`count()`, `take(n)`: the game's, an inventory) after `reloadTime` seconds; `reload()`, `loaded`, `reloading`, and `empty` / `reloading` / `reloaded` events. An empty gun reloads when the trigger is pulled. Without `reloadTime` a launcher regenerates as before. `magazine` is the pure model. `ControlInput.reload` (d-pad left, J on a keyboard) makes a biped reload what it holds.
- **Added:** `B3dBiped.heal(amount)`. `<tosi-b3d-pickup>` gains `qty` (a box of 30 rounds is one pickup) and `refuse(by)` (a reason it can't be taken now: a potion at full health), with `whenRefused` and a `refused` event.
- **Added:** `currency`: how money is written, `formatMoney(amount, { id, label, position })` (`€12`, `12 gold`, `12 gp`). An inventory takes `currencies`, and its panel's purse line, an item's value in the info floater and a trade's `you pay …` are written with them.
- **Changed:** the Biped Playground's guns have magazines (pistol 12, SMG and rifle 30, rocket launcher 1) loaded from ammo in the bag; ammo boxes, a potion and a heart lie about; the hero has a purse and the weapons have values.

- **Added:** `<tosi-b3d-door>` and `<tosi-b3d-chest>`. A door swings open away from whoever opens it (interact or a click), is solid shut and blocks sight; a chest's lid lifts while the player plays `chestOpen` (UAL's `Chest_Open`). Either can have a `lock` (a key kind); `hasKey(key, by)` is the game's answer, a refusal comes back with its reason, a key unlocks it for good. `tradePanel` (inventory-trade) is the take-and-leave panel a chest opens, and a shop's: with a `price` it shows which way the money goes (`you pay 12 gold`, `you receive 6 gold`) and settles through the inventory's rules (`trade`, pure). The demo loadout takes extra `holders`, a `purse` and a `price`. The Biped Playground has a walled yard behind the start: the key is in the chest by its locked door, and the chest inside holds the rocket launcher.

- **Added:** hit locations. `<tosi-b3d-launcher direct-hit="on">` makes a round damage what it hits and say where (`Cause.at`); a biped places it with `hitRegion(point)` (head round the head bone, trunk near the hips-to-neck axis, limbs elsewhere, moving with a crouch) and scales it by `hitScale` (head 2.5, trunk 1, limb 0.5), playing `hitHead`, `hitChest`/`hitStomach` or `hitShoulderL`/`R`. `DestroyableBehavior.damageScale` is the hook. The Biped Playground's guns hit directly (the rocket launcher still bursts). `UAL1_core` also carries `Hit_Shoulder_L`/`R`.

- **Added:** `<tosi-b3d-npc>`: nest it in a biped and the biped is an enemy. It stands guard (or wanders, or walks a `patrol` route), oblivious until it notices the player: in front within 50 m with a clear line, behind within 10 m, a third of each when the player crouches; a noise sends it to look where the noise was. Then it chases (to where you were, between thoughts), attacks within reach, loses you, searches, and goes back. `npc-brain` (the decisions) and `sensorium` (the senses) are pure and seeded; `noise` (`makeNoise`) records shots, blasts and tossed things. `<tosi-b3d-pickup>` gains `toss(to)` and `noise`. A biped dispatches `hurt` when damaged and stands where its attributes say from its first frame. The Biped Playground has a guard and a patroller, and dropping an item throws it.

- **Added:** `<tosi-b3d-pickup item>`: a library model lying in the world that the player picks up with interact (or a click). The biped kneels for it, it leaves at the moment the hand reaches it, and `whenPickedUp({ item, by })` and a bubbling `pickedup` event hand it to the game. `B3dBiped.perform(state)` plays a one-off clip and holds still (pickups, chests, hits). The demo loadout's `handleDrop` puts a dropped item in the world. In the Biped Playground a rifle, a sword and a buckler lie by the start, and what you drop lands at your feet.

- **Added:** `<tosi-b3d-biped health>`: hit points (0, the default, means it can't be hurt). A hurt biped is a target for warheads like any destroyable; each hit plays a hit clip (chest, stomach and head in turn, a knockback for a blast) and holds it still; at 0 it plays `death` and dispatches `destroyed`, which `<tosi-b3d-death>` answers without exploding it. `healthRegen` heals after `healthRegenDelay`. `hp`, `damage()` and `aimTarget` (a chest-height node for turrets and AI). `DestroyableBehavior` gains `whenDamaged` and `flash: false`. The Biped Playground has a turret past the cover line and a health readout.

- **Added:** falls on `<tosi-b3d-biped>`. Walking off a ledge plays the air loop; a landing from more than `hardLanding` metres (auto: 1.5 body heights) plays `hardLand` (UAL's `Roll`) and holds you still; `lethalFall` (metres, off by default) kills on landing: the `death` clip where you land and a bubbling `crash` event (`detail: { cause: 'fall', drop }`). `<tosi-b3d-death>` answers it without an explosion for an entity that shows its own death (`diesInPlace`). The Biped Playground's tower kills, and Respawn puts you back at the start. `fall` holds the rules.
- **Changed:** `quaternius/UAL1_core.glb` carries `Death01`, `Death02`, `Roll`, `Hit_Chest`, `Hit_Head`, `Hit_Stomach`, `PickUp_Kneeling`, `NinjaJump_Land`, `Hit_Knockback` and `Chest_Open` (8.0 MB, was 6.9); the library asks for it as `?v=4`.

- **Added:** `mirror` on `bakeClip`, `retargetClip`, `retargetSourceClip` and retargeting: the clip played left to right, each bone moving as its partner on the other side did, reflected. In the character builder it is **Mirrored** in the Animation menu, and an exported clip carries it as "<clip> (mirrored)".

## 0.13.1

The latest release. Retargeted legs that hold still and walk cleanly, a foot-turn dial for splay-footed bodies, fingertip handles in the rig tool, and a character builder whose rig panel follows the bar's menus. See [0.13.1](/v0.13.1/).

## Every version

<!-- toc -->
- [0.13.0](/v0.13.0/)
- [0.12.2](/v0.12.2/)
- [0.12.1](/v0.12.1/)
- [0.12.0](/v0.12.0/)
- [0.11.6](/v0.11.6/)
- [0.11.5](/v0.11.5/)
- [0.11.4](/v0.11.4/)
- [0.11.3](/v0.11.3/)
- [0.11.2](/v0.11.2/)
- [0.11.1](/v0.11.1/)
- [0.11.0](/v0.11.0/)
- [0.10.20](/v0.10.20/)
- [0.10.19](/v0.10.19/)
- [0.10.18](/v0.10.18/)
- [0.10.17](/v0.10.17/)
- [0.10.16](/v0.10.16/)
- [0.10.15](/v0.10.15/)
- [0.10.14](/v0.10.14/)
- [0.10.13](/v0.10.13/)
- [0.10.12](/v0.10.12/)
- [0.10.11](/v0.10.11/)
- [0.10.10](/v0.10.10/)
- [0.10.9](/v0.10.9/)
- [0.10.8](/v0.10.8/)
- [0.10.7](/v0.10.7/)
- [0.10.6](/v0.10.6/)
- [0.10.5](/v0.10.5/)
- [0.10.4](/v0.10.4/)
- [0.10.3](/v0.10.3/)
- [0.10.2](/v0.10.2/)
- [0.10.1](/v0.10.1/)
- [0.10.0](/v0.10.0/)
- [0.9.0](/v0.9.0/)
- [0.8.15](/v0.8.15/)
- [0.8.14](/v0.8.14/)
- [0.8.13](/v0.8.13/)
- [0.8.12](/v0.8.12/)
- [0.8.11](/v0.8.11/)
- [0.8.10](/v0.8.10/)
- [0.8.9](/v0.8.9/)
- [0.8.8](/v0.8.8/)
- [0.8.7](/v0.8.7/)
- [0.8.6](/v0.8.6/)
- [0.8.5](/v0.8.5/)
- [0.8.4](/v0.8.4/)
- [0.8.3](/v0.8.3/)
- [0.8.2](/v0.8.2/)
- [0.8.1](/v0.8.1/)
- [0.8.0](/v0.8.0/)
- [0.7.8](/v0.7.8/)
- [0.7.7](/v0.7.7/)
- [0.7.6](/v0.7.6/)
- [0.7.5](/v0.7.5/)
- [0.7.4](/v0.7.4/)
- [0.7.3](/v0.7.3/)
- [0.7.2](/v0.7.2/)
- [0.7.1](/v0.7.1/)
- [0.7.0](/v0.7.0/)
- [0.7.0-rc.1](/v0.7.0-rc.1/)
- [0.6.2](/v0.6.2/)
- [0.6.1](/v0.6.1/)
- [0.6.0](/v0.6.0/)
- [0.5.2](/v0.5.2/)
- [0.5.1](/v0.5.1/)
- [0.5.0](/v0.5.0/)
<!-- /toc -->
