# character settings

**What a character is, as plain data**: every setting a character has with its
default (`DEFAULT_CHARACTER`), the slots it can wear (`CHARACTER_SLOTS`), the
hair colour presets (`HAIR_COLOURS`), and where MakeHuman's body pack lives
(`hm08PackUrl()`, versioned by `HM08_PACK_VERSION`). No engine and no DOM, so
an exporter or another engine reads the same defaults the builder starts from;
[character](/character/) and [character-file](/character-file/) use them.
