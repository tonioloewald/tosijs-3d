/*#
# character settings

**What a character is, as plain data**: every setting a character has with its
default (`DEFAULT_CHARACTER`), the slots it can wear (`CHARACTER_SLOTS`), the
hair colour presets (`HAIR_COLOURS`), and where MakeHuman's body pack lives
(`hm08PackUrl()`, versioned by `HM08_PACK_VERSION`). No engine and no DOM, so
an exporter or another engine reads the same defaults the builder starts from;
[character](/character/) and [character-file](/character-file/) use them.
*/
/*{ "parent": "character-core", "order": 10 }*/

import { DEFAULT_HUMAN_BODY } from './human-morph.js'
import { assetUrl } from './asset-url.js'

/** MakeHuman's hm08 body pack, under the asset base. */
export const HM08_PACK_PATH = 'makehuman/hm08/hm08.json'
/** Its version: bumped whenever the pack is rebaked, so caches let go. */
export const HM08_PACK_VERSION = 18

/** The pack's URL, resolved against the asset base when asked (set it first). */
export function hm08PackUrl(): string {
  return assetUrl(HM08_PACK_PATH, HM08_PACK_VERSION)
}

/** Hair colour presets: a base and its usual highlight, sRGB hex. */
export const HAIR_COLOURS: Readonly<
  Record<string, { base: string; highlight: string }>
> = Object.freeze({
  black: { base: '#17130f', highlight: '#3a4152' },
  'dark brown': { base: '#2c1f17', highlight: '#6b4a32' },
  brown: { base: '#4a3122', highlight: '#9a6b43' },
  chestnut: { base: '#5c321d', highlight: '#a5603a' },
  auburn: { base: '#6a2b1a', highlight: '#b2552e' },
  copper: { base: '#9c4622', highlight: '#df8f52' },
  'golden blonde': { base: '#a8814b', highlight: '#e8cb90' },
  'ash blonde': { base: '#9c937c', highlight: '#dcd5c2' },
  platinum: { base: '#d6ccb8', highlight: '#f6f1e6' },
  grey: { base: '#86837f', highlight: '#cfcfd2' },
  white: { base: '#dedbd5', highlight: '#ffffff' },
  'pastel pink': { base: '#d494a8', highlight: '#f6d4df' },
  lavender: { base: '#9a84c0', highlight: '#d8caf0' },
  'electric blue': { base: '#2f56b8', highlight: '#8fb0ff' },
  teal: { base: '#2a7f7b', highlight: '#86dcd5' },
  'cherry red': { base: '#7f1a25', highlight: '#d84a55' },
})

/** What can be worn, one of each at a time. */
export const CHARACTER_SLOTS = [
  'outfit',
  'bodysuit',
  'armour',
  'top',
  'bottom',
  'shoes',
  'gloves',
  'hat',
  'mask',
  'glasses',
] as const

/** Every setting a character has, with its default. */
export const DEFAULT_CHARACTER: Record<string, any> = {
  ...DEFAULT_HUMAN_BODY,
  gender: 1,
  tone: 0.3,
  redness: 0.5,
  iris: 0.2,
  irisColour: '#5a3519',
  eyeStyle: 'basic',
  hair: 'short02',
  beard: 'none',
  moustache: 'none',
  brows: 'eyebrow001',
  hairBase: HAIR_COLOURS.brown.base,
  hairHighlight: HAIR_COLOURS.brown.highlight,
  hairUp: 0,
  hairForward: 0,
  hairSize: 1,
  outfit: 'male_casualsuit02',
  bodysuit: 'none',
  armour: 'none',
  top: 'none',
  bottom: 'none',
  shoes: 'shoes01',
  hat: 'none',
  glasses: 'none',
  gloves: 'none',
  mask: 'none',
  stubble: 0,
  blink: true,
  talk: false,
  smile: 0,
  browsUp: 0,
  frown: 0,
  hideClothes: false,
  rigs: {},
  surfaces: {},
  /** The item in the right hand (a weapon library's name), or `none`. */
  held: 'none',
  /**
   * Each item's grip, by name: where its grip point goes, `{ x, y, z }`
   * metres from the hand's socket, turned `{ rx, ry, rz }` degrees, and
   * `scale`. A launcher with `socket: 'right-hand'` (its grip `auto`) takes
   * the same numbers.
   */
  grips: {},
  source: 'MakeHuman',
  /**
   * How much of MakeHuman's body is drawn: a lighter skin bound over it
   * (`low` 741 vertices, `medium` about 1,600, `high` about 13,800) or the
   * base mesh itself (`full`). See human-rig's `bodyDetailProxy`.
   */
  bodyDetail: 'medium',
}
