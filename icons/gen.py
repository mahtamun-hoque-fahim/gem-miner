"""
Gem Miner icon generator.
Produces icon16, icon32, icon48, icon128 PNGs.
Design: dark rounded-square bg (#070807) + faceted gem in mint (#3DF49A).
"""

from PIL import Image, ImageDraw
import math, os

OUT = os.path.dirname(os.path.abspath(__file__))

BG       = (7,   8,   7,  255)
MINT     = (61,  244, 154, 255)
MINT_MID = (30,  160,  85, 255)   # pavilion — darker facet
MINT_LO  = (18,  110,  55, 255)   # deepest shadow facet
MINT_HI  = (180, 255, 210, 220)   # highlight glint


def gem(size: int) -> Image.Image:
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    s = size
    pad = max(1, round(s * 0.06))
    r   = max(2, round(s * 0.22))   # corner radius

    # ── Background rounded square ────────────────────────────
    draw.rounded_rectangle([pad, pad, s - 1 - pad, s - 1 - pad],
                           radius=r, fill=BG)

    # ── Gem geometry ─────────────────────────────────────────
    cx, cy = s / 2, s / 2

    # Key y-positions
    top   = s * 0.17   # crown apex
    gird  = s * 0.46   # girdle (widest horizontal band)
    bot   = s * 0.84   # culet (bottom point)

    # Key x-positions at the girdle
    gw    = s * 0.62   # total gem width at girdle
    gl    = cx - gw / 2          # girdle left
    gr    = cx + gw / 2          # girdle right
    gl_in = cx - gw * 0.22       # inner girdle left
    gr_in = cx + gw * 0.22       # inner girdle right

    # Crown facets: left table, right table, top point
    crown_left  = [gl,   gird,   cx - gw*0.07, top,    cx,  gird - s*0.10]
    crown_right = [gr,   gird,   cx + gw*0.07, top,    cx,  gird - s*0.10]
    crown_top   = [cx - gw*0.07, top,  cx + gw*0.07, top,  cx, top]

    # Full crown outline (for base fill)
    crown = [
        (gl,  gird),
        (cx - gw*0.20, top + (gird - top)*0.18),
        (cx,  top),
        (cx + gw*0.20, top + (gird - top)*0.18),
        (gr,  gird),
    ]

    # Pavilion (below girdle → culet)
    pavilion = [
        (gl,    gird),
        (gr,    gird),
        (cx + gw*0.18, gird + (bot - gird)*0.55),
        (cx,    bot),
        (cx - gw*0.18, gird + (bot - gird)*0.55),
    ]

    # Left pavilion facet (lighter)
    pav_left = [
        (gl,  gird),
        (cx,  bot),
        (cx - gw*0.18, gird + (bot - gird)*0.55),
    ]

    # Right pavilion facet (darker)
    pav_right = [
        (gr,  gird),
        (cx,  bot),
        (cx + gw*0.18, gird + (bot - gird)*0.55),
    ]

    # ── Draw (back to front) ─────────────────────────────────

    # Pavilion base
    draw.polygon([(x, y) for x, y in pavilion], fill=MINT_LO)

    # Pavilion left facet (slightly lighter)
    draw.polygon([(x, y) for x, y in pav_left],  fill=MINT_MID)

    # Crown base
    draw.polygon([(x, y) for x, y in crown], fill=MINT)

    # Crown left facet (slightly dimmer)
    left_facet = [
        (gl,  gird),
        (cx - gw*0.20, top + (gird - top)*0.18),
        (cx,  top),
        (cx,  gird - s*0.09),
    ]
    draw.polygon([(x, y) for x, y in left_facet], fill=(*MINT[:3], 200))

    # Highlight glint — upper-right crown facet
    if size >= 32:
        glint = [
            (cx + gw*0.05, top + (gird - top)*0.10),
            (cx + gw*0.20, top + (gird - top)*0.20),
            (cx + gw*0.10, top + (gird - top)*0.42),
            (cx + gw*0.02, top + (gird - top)*0.22),
        ]
        draw.polygon([(x, y) for x, y in glint], fill=MINT_HI)

    return img


for sz in (16, 32, 48, 128):
    icon = gem(sz)
    path = os.path.join(OUT, f"icon{sz}.png")
    icon.save(path, "PNG")
    print(f"  saved {path}")

print("Done.")
