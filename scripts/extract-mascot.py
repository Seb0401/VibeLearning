# Recorta las poses de MASCOTA.png (raíz del repo, fondo transparente, cuadrícula 5×4)
# y las guarda en public/mascot/<pose>.png.
# Uso: python scripts/extract-mascot.py   (requiere Pillow, numpy y scipy)
#
# Cada pieza (mascota, burbujas, confeti, "zzz"…) se asigna a la pose cuya celda contiene
# su centro, así los elementos que cruzan la línea entre filas no se cortan.
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "mascot")
PREVIEW = os.path.join(ROOT, ".mascot-preview")
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREVIEW, exist_ok=True)

NAMES = [
    ["hola",      "menu",        "amor",       "procesando", "musica"],
    ["tu-puedes", "logro",       "notificacion", "enfoque",  "descanso"],
    ["cargando",  "completado",  "calendario", "biblioteca", "perfil"],
    ["despedida", "ayuda",       "idea",       "dormido",    "celebrando"],
]
# Límites de filas y columnas (detectados a partir del canal alfa)
ROWS = [0, 300, 567, 812, 1024]
COLS = [0, 305, 602, 910, 1223, 1536]
MAX_SIDE = 360

img = Image.open(os.path.join(ROOT, "MASCOTA.png")).convert("RGBA")
A = np.asarray(img).copy()
A[..., 3] = np.where(A[..., 3] <= 8, 0, A[..., 3])   # limpia el halo casi invisible
solid = A[..., 3] > 0
# Une piezas muy cercanas (antialias, pelo) antes de etiquetar
lab, n = ndi.label(ndi.binary_dilation(solid, iterations=2))
centers = ndi.center_of_mass(solid, lab, range(1, n + 1))
sizes = ndi.sum(solid, lab, range(1, n + 1))

def cell_of(cy, cx):
    r = next(i for i in range(4) if ROWS[i] <= cy < ROWS[i + 1])
    c = next(i for i in range(5) if COLS[i] <= cx < COLS[i + 1])
    return r, c

groups = {}
for idx, ((cy, cx), size) in enumerate(zip(centers, sizes), start=1):
    if size < 25:  # motas sueltas
        continue
    groups.setdefault(cell_of(cy, cx), []).append(idx)

preview_dark = Image.new("RGBA", (5 * 200, 4 * 200), (24, 24, 36, 255))
preview_light = Image.new("RGBA", (5 * 200, 4 * 200), (238, 236, 252, 255))
for (r, c), ids in sorted(groups.items()):
    mask = np.isin(lab, ids) & solid
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = A[y0:y1, x0:x1].copy()
    rgba[..., 3] = np.where(mask[y0:y1, x0:x1], rgba[..., 3], 0)
    pose = Image.fromarray(rgba, "RGBA")
    pose.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    pose.save(os.path.join(OUT, f"{NAMES[r][c]}.png"), optimize=True)
    t = pose.copy(); t.thumbnail((185, 185))
    pos = (c * 200 + (200 - t.width) // 2, r * 200 + (200 - t.height) // 2)
    preview_dark.alpha_composite(t, pos); preview_light.alpha_composite(t, pos)

preview_dark.save(os.path.join(PREVIEW, "dark.png"))
preview_light.save(os.path.join(PREVIEW, "light.png"))
print("poses:", len(groups), "| peso KB:", round(sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) / 1024))
