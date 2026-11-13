/*
A page-wide mute shared by several holders (one per loading scene), as a
pure function over a getter and a setter.
*/
/**
 * A page-wide mute shared by everyone who holds it: the volume is read when
 * the first hold is taken and put back when the last is released, unless
 * something else changed it meanwhile. Pure; `<tosi-b3d>` uses it for
 * Babylon's own sounds while a scene is behind its spinner.
 */
export function sharedMute(get, set) {
    const held = new Set();
    let saved = 1;
    return () => {
        const key = Symbol('mute');
        if (held.size === 0) {
            saved = get();
            set(0);
        }
        held.add(key);
        return () => {
            if (!held.delete(key) || held.size > 0)
                return;
            // Someone set a volume while it was held: theirs stands.
            if (get() === 0)
                set(saved);
        };
    };
}
//# sourceMappingURL=shared-mute.js.map