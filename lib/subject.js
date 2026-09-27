// Icono y color según la materia que sugiere el título de la clase.
export function getSubject(title) {
  const t = (title || "").toLowerCase();
  if (t.match(/machine.?learn|neural|deep.?learn|\bml\b|\bia\b|intelig/)) return { icon: "sparkles",   color: "#60A5FA", tone: "blue" };
  if (t.match(/cálculo|calculo|ecuaci|integr|derivad|serie|taylor|álgebra|algebra|matem/)) return { icon: "sigma", color: "#A78BFA", tone: "violet" };
  if (t.match(/base.*dato|sql|database|datos|normaliz/)) return { icon: "archive", color: "#22C55E", tone: "green" };
  if (t.match(/program|código|codigo|oop|objeto|herencia|polimorf/)) return { icon: "zap", color: "#FBBF24", tone: "orange" };
  if (t.match(/biolog|fotos|célula|celula|quím|quim|físic|fisic|mitosis/)) return { icon: "microscope", color: "#2DD4BF", tone: "teal" };
  if (t.match(/histor|guerra|imperio|revoluc/)) return { icon: "landmark", color: "#F97316", tone: "orange" };
  if (t.match(/lengua|literat|gramát|gramat|idioma|inglés|ingles/)) return { icon: "book-open", color: "#F472B6", tone: "pink" };
  return { icon: "book-open", color: "#60A5FA", tone: "blue" };
}
