"use client";

const USER_COLORS = ["#00E054","#40BCF4","#FF8000","#E879F9","#FB7185","#FACC15","#34D399","#F97316"];
export const userColor = (i: number) => USER_COLORS[i % USER_COLORS.length];

interface Props {
  usernames: string[];        // all usernames in session (for index lookup)
  foundInUsers: string[];     // on watchlist of these users
  watchedByUsers?: string[];  // already watched by these users
  size?: "sm" | "md";
}

export default function UserBadges({ usernames, foundInUsers, watchedByUsers = [], size = "sm" }: Props) {
  const uniqueFound   = Array.from(new Set(foundInUsers));
  const uniqueWatched = Array.from(new Set(watchedByUsers));

  if (!uniqueFound.length && !uniqueWatched.length) return null;

  const dim = size === "md" ? "w-5 h-5 text-[10px]" : "w-4 h-4 text-[9px]";

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {uniqueFound.map((u) => {
        const idx = usernames.indexOf(u);
        if (idx === -1) return null;
        const color   = userColor(idx);
        const watched = uniqueWatched.includes(u);
        return (
          <span
            key={`found-${u}`}
            title={watched ? `@${u} · watched` : `@${u} · on watchlist`}
            className={`inline-flex items-center justify-center rounded-full font-bold flex-shrink-0 ${dim}`}
            style={
              watched
                ? { background: color, color: "#0d1014", border: `1.5px solid ${color}` }          // solid = watched
                : { background: `${color}22`, color, border: `1.5px solid ${color}70` }            // hollow = watchlist
            }
          >
            {watched ? "✓" : idx + 1}
          </span>
        );
      })}

      {/* Users who watched but aren't in the watchlist pool */}
      {uniqueWatched
        .filter((u) => !uniqueFound.includes(u))
        .map((u) => {
          const idx = usernames.indexOf(u);
          if (idx === -1) return null;
          const color = userColor(idx);
          return (
            <span
              key={`watched-${u}`}
              title={`@${u} · watched`}
              className={`inline-flex items-center justify-center rounded-full font-bold flex-shrink-0 ${dim}`}
              style={{ background: color, color: "#0d1014", border: `1.5px solid ${color}` }}
            >
              ✓
            </span>
          );
        })}
    </div>
  );
}
