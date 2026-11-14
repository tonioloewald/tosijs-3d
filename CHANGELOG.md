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
