// Tarjeta compartida con los tokens de la app.
//   padding: "none" | "sm" | "md" | "lg"
//   interactive: añade el efecto de elevación al pasar el mouse
//   title / action: encabezado opcional (título a la izquierda, acción a la derecha)
export default function Card({ children, padding = "md", interactive = false, title, action, className = "", style, as: Tag = "div", ...rest }) {
  const cls = `ui-card ui-card--${padding}${interactive ? " card-lift" : ""}${className ? ` ${className}` : ""}`;
  return (
    <Tag className={cls} style={style} {...rest}>
      {(title || action) && (
        <div className="ui-card__header">
          {title && <h2 className="ui-card__title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}
