import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# Recorta las poses de MASCOTA.png (raíz del repo) y las guarda en public/mascot/.
# Uso: python scripts/extract-mascot.py   (requiere Pillow, numpy y scipy)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, ".mascot-preview")   # hojas de muestra para revisar el recorte
os.makedirs(os.path.join(S, "shots"), exist_ok=True)
OUT = os.path.join(ROOT, "public", "mascot")
os.makedirs(OUT, exist_ok=True)

NAMES = [
    ["hola", "menu", "grabando", "procesando", "reproduciendo", "repasar"],
    ["tu-puedes", "logro", "notificacion", "enfoque", "descanso", "ayuda"],
    ["cargando", "completado", "calendario", "biblioteca", "perfil", "despedida"],
]
ROW_BANDS = [(178, 388), (474, 674), (768, 960)]
COL_W = 1536 / 6

A = np.asarray(Image.open(os.path.join(ROOT, "MASCOTA.png")).convert("RGB")).astype(np.int16)

BARRIER = 7

def extract(cell):
    mn = cell.min(axis=2); mx = cell.max(axis=2)
    # Fondo candidato: claro y poco saturado (incluye las sombras lavanda del suelo)
    light = (mn > 180) & ((mx - mn) < 62)
    fg = ~light
    # Quitar fragmentos sueltos (líneas de las etiquetas, texto residual)
    lab, n = ndi.label(fg)
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 120])
    # Barrera: silueta engrosada 3px (tapa huecos de hasta ~6px en el contorno)
    barrier = ndi.binary_dilation(keep, iterations=BARRIER)
    lab2, _ = ndi.label(~barrier)
    border_labels = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]]))) - {0}
    bg = np.isin(lab2, list(border_labels))
    # Devolver el fondo a su tamaño real, solo sobre píxeles claros
    for _ in range(BARRIER + 1):
        bg = bg | (ndi.binary_dilation(bg) & light)
    solid = ~bg
    alpha = (solid * 255).astype(np.uint8)
    # Borde suave
    alpha = ndi.gaussian_filter(alpha.astype(float), 0.7)
    alpha = np.clip(alpha * 1.15, 0, 255).astype(np.uint8)
    ys, xs = np.where(solid)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([cell.astype(np.uint8), alpha])[y0:y1, x0:x1]
    return Image.fromarray(rgba, "RGBA")

sheet = Image.new("RGBA", (6 * 180, 3 * 200), (32, 32, 48, 255))
sheet_light = Image.new("RGBA", (6 * 180, 3 * 200), (238, 236, 252, 255))
for r, (y0, y1) in enumerate(ROW_BANDS):
    for c in range(6):
        x0, x1 = int(c * COL_W) + 8, int((c + 1) * COL_W) - 8
        img = extract(A[y0:y1, x0:x1])
        img.thumbnail((320, 320), Image.LANCZOS)
        img.save(os.path.join(OUT, f"{NAMES[r][c]}.png"), optimize=True)
        t = img.copy(); t.thumbnail((170, 170))
        pos = (c * 180 + (180 - t.width) // 2, r * 200 + 5)
        sheet.alpha_composite(t, pos); sheet_light.alpha_composite(t, pos)
sheet.save(os.path.join(S, "shots", "mascot_sheet.png"))
sheet_light.save(os.path.join(S, "shots", "mascot_sheet_light.png"))
print("peso total KB:", round(sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) / 1024))
