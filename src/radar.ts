/*#
# radar.ts

The **pure, deterministic radar model** — range + detection cone + lock acquisition,
Babylon-free (plain `{x, y, z}`, time only via `dt`, no `Date.now`/`Math.random`), so
it unit-tests headless like `fly-by-wire` / `world-store`. `b3d-radar.ts` bridges it to
the scene (enumerates `RadarBlip`s, supplies the platform pose, plots the HUD).

A `Radar` detects contacts within **range · profile** AND inside its **cone** (dot of
the platform's forward with the bearing to the contact ≥ `coneDot`; ±90° → `coneDot 0`).
Detected, **lockable** contacts build a lock over `lockTime` seconds; up to `maxLocks`
of the **nearest** ones hold locks at once. Losing detection decays the lock back down.
#*/

export type Vec3 = { x: number; y: number; z: number }

export interface RadarParams {
  /** Nominal range: a `profile 1` contact is detected within this distance. */
  range: number
  /** Minimum `dot(forward, dirToContact)` to be in the cone — `cos(halfAngle)`.
   * ±90° (front hemisphere) → 0; ±45° → ~0.707; full sphere → -1. This is the
   * MAINTENANCE envelope: a lock is HELD while the contact stays within it. */
  coneDot: number
  /** Seconds of continuous detection to acquire a full lock (≤ 0 = instant). */
  lockTime: number
  /** Max simultaneous lock slots (the nearest lockable contacts get them). */
  maxLocks: number
  /** ACQUISITION cone (`cos(halfAngle)`) — the narrower cone a contact must be in to
   * START a lock. Wider `coneDot` still holds a completed lock. (e.g. cos 60° = 0.5.) */
  acquireConeDot: number
  /** ACQUISITION range as a fraction of the detection range — a contact must be this
   * much closer to START a lock (e.g. 0.5 = half range). Holding uses the full range. */
  acquireRangeFraction: number
}

/** A candidate the platform offers the radar this frame. `id` is any stable key
 * (the bridge passes the `RadarBlip` itself, so a track maps back to its mesh). */
export interface RadarContact<Id = unknown> {
  id: Id
  pos: Vec3
  /** Detectability multiplier; negative = always detectable (e.g. waypoints). */
  profile: number
  /** Whether this contact can be LOCKED (a hostile/neutral target — not a friendly
   * blip or a waypoint). Non-lockable contacts still appear as tracks. */
  lockable: boolean
}

/** The radar's per-contact output — detection + lock state, for HUD + weapons. */
export interface RadarTrack<Id = unknown> {
  id: Id
  pos: Vec3
  distance: number
  /** In range·profile AND in the cone this frame. */
  detected: boolean
  /** 0..1 lock build-up. */
  lockProgress: number
  /** Fully locked (progress ≥ 1) and holding. */
  locked: boolean
}

const sq = (n: number) => n * n

export class Radar<Id = unknown> {
  params: RadarParams
  // Lock build-up per contact id (0..1). Absent = 0. Deterministic: advanced only
  // by dt, keyed by the caller's stable id.
  private _progress = new Map<Id, number>()
  private _lastTracks: RadarTrack<Id>[] = []

  constructor(params: RadarParams) {
    this.params = params
  }

  /**
   * Advance the radar one step and return this frame's tracks, NEAREST FIRST.
   * `forward` should be unit length (the platform's nose/boresight direction).
   */
  update(
    viewer: Vec3,
    forward: Vec3,
    contacts: RadarContact<Id>[],
    dt: number
  ): RadarTrack<Id>[] {
    const {
      range,
      coneDot,
      lockTime,
      maxLocks,
      acquireConeDot,
      acquireRangeFraction,
    } = this.params

    // 1. Classify each contact against BOTH envelopes:
    //    - detected / canMaintain: radar range·profile + radar cone (holds a lock).
    //    - inAcquire: the tighter acquire range + cone (STARTS a lock).
    type Row = {
      c: RadarContact<Id>
      distance: number
      detected: boolean
      canMaintain: boolean
      inAcquire: boolean
    }
    const rows: Row[] = []
    for (const c of contacts) {
      const dx = c.pos.x - viewer.x
      const dy = c.pos.y - viewer.y
      const dz = c.pos.z - viewer.z
      const distance = Math.sqrt(sq(dx) + sq(dy) + sq(dz))
      const effRange = c.profile < 0 ? Infinity : range * c.profile
      const inv = distance > 1e-6 ? 1 / distance : 0
      const dot = (dx * forward.x + dy * forward.y + dz * forward.z) * inv
      const detected = c.profile !== 0 && distance <= effRange && dot >= coneDot
      const canMaintain = c.lockable && detected
      const inAcquire =
        c.lockable &&
        distance <= effRange * acquireRangeFraction &&
        dot >= acquireConeDot
      rows.push({ c, distance, detected, canMaintain, inAcquire })
    }

    // 2. Lock slots (up to maxLocks): HELD locks keep priority (nearest first) so a new
    //    acquisition can't bump an existing lock; then the nearest fresh acquirers.
    const prevOf = (id: Id) => this._progress.get(id) ?? 0
    const byDist = (a: Row, b: Row) => a.distance - b.distance
    const held = rows
      .filter((r) => prevOf(r.c.id) >= 1 && r.canMaintain)
      .sort(byDist)
    const acquiring = rows
      .filter((r) => prevOf(r.c.id) < 1 && r.inAcquire)
      .sort(byDist)
    const slots = new Set<Id>()
    for (const r of [...held, ...acquiring]) {
      if (slots.size >= Math.max(0, maxLocks)) break
      slots.add(r.c.id)
    }

    // 3. Advance progress. Build ONLY inside the acquire envelope; a completed lock
    //    HOLDS while it can be maintained (wider radar cone) and is LOST the moment it
    //    leaves — no lingering decay: out of envelope / out of slot ⇒ 0.
    const gain = lockTime > 0 ? dt / lockTime : 1
    const alive = new Set<Id>()
    const tracks: RadarTrack<Id>[] = []
    for (const { c, distance, detected, canMaintain, inAcquire } of rows) {
      const prev = prevOf(c.id)
      let p = 0
      if (slots.has(c.id)) {
        if (prev >= 1) p = canMaintain ? 1 : 0
        else p = inAcquire ? Math.min(1, prev + gain) : 0
      }
      if (p > 0) {
        this._progress.set(c.id, p)
        alive.add(c.id)
      }
      tracks.push({
        id: c.id,
        pos: c.pos,
        distance,
        detected,
        lockProgress: p,
        locked: p >= 1,
      })
    }
    // Forget contacts that dropped to 0 or vanished this frame.
    for (const id of this._progress.keys()) {
      if (!alive.has(id)) this._progress.delete(id)
    }

    tracks.sort((a, b) => a.distance - b.distance)
    this._lastTracks = tracks
    return tracks
  }

  /** Tracks from the last `update`, nearest first. */
  get tracks(): RadarTrack<Id>[] {
    return this._lastTracks
  }

  /** Locked tracks only, nearest first — `[0]` is the missile's target. */
  get locks(): RadarTrack<Id>[] {
    return this._lastTracks.filter((t) => t.locked)
  }

  /** The nearest full lock, or null. */
  get nearestLock(): RadarTrack<Id> | null {
    for (const t of this._lastTracks) if (t.locked) return t
    return null
  }
}

/** Convenience: cone half-angle in DEGREES → the `coneDot` (cos) the model wants. */
export const coneDotFromDegrees = (halfAngleDeg: number): number =>
  Math.cos((halfAngleDeg * Math.PI) / 180)

/**
 * Faction opposition — who a radar treats as a lock target. `friendly` and `hostile`
 * are mutual enemies; `neutral` and `waypoint` are never targets (they still show as
 * tracks). A radar's own `alignment` decides: a `friendly` platform (the player) locks
 * `hostile`s; a `hostile` platform (an enemy turret) locks `friendly`s (i.e. the player).
 * This is the `lockable` flag the bridge passes per contact. Kept here (plain strings)
 * so the model stays self-contained and testable.
 */
export function isOpposed(selfFaction: string, other: string): boolean {
  return (
    (selfFaction === 'friendly' && other === 'hostile') ||
    (selfFaction === 'hostile' && other === 'friendly')
  )
}
