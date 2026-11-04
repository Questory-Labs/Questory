import { cn } from "../cn";

const hash = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const DotCover = ({
  seed,
  tint = "rgba(255,255,255,0.12)",
  className,
}: {
  seed: string;
  tint?: string;
  className?: string;
}) => {
  const h = hash(seed);
  const x = 20 + (h % 60);
  const y = 20 + ((h >>> 8) % 60);
  const spread = 45 + ((h >>> 16) % 30);
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden bg-[#0d0d0f]", className)}
      style={{
        backgroundImage: `radial-gradient(circle at ${x}% ${y}%, ${tint}, transparent 70%)`,
      }}
    >
      <div
        className="dot-matrix absolute inset-0"
        style={{
          WebkitMaskImage: `radial-gradient(circle at ${x}% ${y}%, #000 0%, transparent ${spread}%)`,
          maskImage: `radial-gradient(circle at ${x}% ${y}%, #000 0%, transparent ${spread}%)`,
        }}
      />
    </div>
  );
};
