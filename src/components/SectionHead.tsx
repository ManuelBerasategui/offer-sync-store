/** Título de sección de la home: rayita naranja + título en la letra de display + bajada. */
export function SectionHead({
  title,
  sub,
  icon,
  align = "left",
}: {
  title: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
  align?: "left" | "center";
}) {
  const center = align === "center";
  return (
    <div className={`mb-7 ${center ? "text-center" : ""}`}>
      <div className={`mb-3 flex items-center gap-2 ${center ? "justify-center" : ""}`}>
        <div className="h-1 w-10 rounded-full bg-primary" />
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <h2 className="text-[clamp(24px,7vw,40px)]">{title}</h2>
      {sub && (
        <p className={`mt-2 max-w-md text-sm text-muted-foreground ${center ? "mx-auto" : ""}`}>
          {sub}
        </p>
      )}
    </div>
  );
}
