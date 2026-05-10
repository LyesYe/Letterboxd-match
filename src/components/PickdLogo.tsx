"use client";

interface Props {
  size?: number;
  className?: string;
}

export function PickdMark({ size = 36, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Green film-frame background */}
      <rect width="36" height="36" rx="9" fill="#00E054" />

      {/* Four corner perforations (film holes) */}
      <rect x="3.5" y="3.5" width="5" height="5" rx="1.5" fill="#0d1014" />
      <rect x="27.5" y="3.5" width="5" height="5" rx="1.5" fill="#0d1014" />
      <rect x="3.5" y="27.5" width="5" height="5" rx="1.5" fill="#0d1014" />
      <rect x="27.5" y="27.5" width="5" height="5" rx="1.5" fill="#0d1014" />

      {/* Checkmark — the "pick" */}
      <path
        d="M10.5 18.5l5 5 10-10"
        stroke="#0d1014"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LogoProps {
  markSize?: number;
  textSize?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  className?: string;
}

export default function PickdLogo({ markSize = 36, textSize = "2xl", className = "" }: LogoProps) {
  const sizeClass = `text-${textSize}`;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <PickdMark size={markSize} />
      <span className={`${sizeClass} font-bold tracking-tight text-[#e8ecf0]`}>
        Pick<span className="text-[#00E054]">d</span>
      </span>
    </div>
  );
}
