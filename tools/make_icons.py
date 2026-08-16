#!/usr/bin/env python3
"""Génère les icônes PNG de Forge sans dépendance externe.

Un haltère orange sur fond charbon. Encodeur PNG minimal (zlib + struct) :
pas de Pillow, pas de pip install, ça tourne partout.

Usage :  python tools/make_icons.py
Sortie :  docs/icon-192.png, docs/icon-512.png, docs/icon-maskable-512.png
"""

import os
import struct
import zlib

BG = (0x14, 0x11, 0x0F)
FG = (0xFF, 0x7A, 0x18)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs")


def write_png(path, size, pixels):
    """pixels : bytearray RGB de size*size*3."""
    raw = bytearray()
    stride = size * 3
    for y in range(size):
        raw.append(0)  # filtre "None"
        raw += pixels[y * stride:(y + 1) * stride]

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def dumbbell(size, scale=1.0):
    """Trame RGB : fond plein + haltère centré. `scale` réduit le dessin
    pour tenir dans la zone sûre d'une icône maskable (80 %)."""
    px = bytearray(BG * (size * size))

    def rect(x0, y0, x1, y1, radius=0):
        xa, xb = int(x0 * size), int(x1 * size)
        ya, yb = int(y0 * size), int(y1 * size)
        r = radius * size
        for y in range(max(0, ya), min(size, yb)):
            for x in range(max(0, xa), min(size, xb)):
                if r > 1:
                    # coins arrondis
                    dx = max(xa + r - x, x - (xb - r), 0)
                    dy = max(ya + r - y, y - (yb - r), 0)
                    if dx and dy and dx * dx + dy * dy > r * r:
                        continue
                i = (y * size + x) * 3
                px[i:i + 3] = bytes(FG)

    def c(v):
        """Recentre et met à l'échelle une coordonnée relative."""
        return 0.5 + (v - 0.5) * scale

    # barre centrale
    rect(c(0.27), c(0.455), c(0.73), c(0.545), 0.012 * scale)
    # disques intérieurs
    rect(c(0.185), c(0.325), c(0.275), c(0.675), 0.022 * scale)
    rect(c(0.725), c(0.325), c(0.815), c(0.675), 0.022 * scale)
    # disques extérieurs
    rect(c(0.115), c(0.385), c(0.185), c(0.615), 0.018 * scale)
    rect(c(0.815), c(0.385), c(0.885), c(0.615), 0.018 * scale)
    return px


def main():
    os.makedirs(OUT, exist_ok=True)
    for size in (192, 512):
        write_png(os.path.join(OUT, "icon-%d.png" % size), size, dumbbell(size))
        print("écrit docs/icon-%d.png" % size)
    write_png(os.path.join(OUT, "icon-maskable-512.png"), 512, dumbbell(512, scale=0.72))
    print("écrit docs/icon-maskable-512.png")


if __name__ == "__main__":
    main()
