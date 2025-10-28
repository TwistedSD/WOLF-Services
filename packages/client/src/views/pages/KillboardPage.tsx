import React, { useEffect, useMemo, useState } from "react";
import { KillmailProvider, useKillmailStore } from "@/hooks/useKillmailStore";
import { useSolarSystemsIndex } from "@/hooks/useSolarSystemsIndex";

type Mode = "recent" | "systems" | "players";

type Killmail = {
  id: number;
  time: string | number | Date;
  solarSystemId: number;
  killer?: { name?: string; id?: string; address?: string };
  victim?: { name?: string; id?: string; address?: string };
};

const Col = {
  time: "w-[12rem] whitespace-nowrap truncate",
  system: "w-[14rem] whitespace-nowrap truncate",
  player: "w-[16rem] whitespace-nowrap truncate",
};
const rowClass =
  "flex gap-3 items-center border border-[var(--primary)] rounded-md px-3 py-2";

interface RecentListProps {
  items: Killmail[];
  getSystemName: (id: number) => string | undefined;
}

const RecentList = ({ items, getSystemName }: RecentListProps) => {
  return (
    <div className="flex flex-col gap-px">
      <div className="flex gap-3 text-sm font-semibold border-b border-[var(--primary)] pb-1 mb-px">
        <div className={Col.time}>Time</div>
        <div className={Col.system}>System</div>
        <div className={Col.player}>Killer</div>
        <div className={Col.player}>Victim</div>
      </div>
      {items.map((km) => (
        <div key={km.id} className={rowClass}>
          <div className={Col.time}>{new Date(km.time).toLocaleString()}</div>
          <div className={Col.system}>
            {getSystemName(km.solarSystemId) ?? `#${km.solarSystemId}`}
          </div>
          <div className={Col.player}>
            {km.killer?.name ?? km.killer?.id ?? km.killer?.address}
          </div>
          <div className={Col.player}>
            {km.victim?.name ?? km.victim?.id ?? km.victim?.address}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="opacity-75 text-sm mt-2">No killmails found.</div>
      )}
    </div>
  );
};

interface SystemRow {
  sysId: number;
  name: string;
  total: number;
  ids: number[];
}
interface SystemsAccordionProps {
  rows: SystemRow[];
  getSystemName: (id: number) => string;
}

const SystemsAccordion = ({ rows, getSystemName }: SystemsAccordionProps) => {
  const { killmails } = useKillmailStore();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const expanded = open === r.sysId;
        const items = expanded
          ? r.ids
              .map((id) => killmails.find((k) => k.id === id)!)
              .filter(Boolean)
          : [];
        return (
          <div
            key={r.sysId}
            className="border border-[var(--primary)] rounded-md"
          >
            <button
              className="w-full px-3 py-2 flex justify-between items-center"
              onClick={() => setOpen(expanded ? null : r.sysId)}
            >
              <div className="font-semibold">{getSystemName(r.sysId)}</div>
              <div className="text-sm opacity-80">Total: {r.total}</div>
            </button>
            {expanded && (
              <div className="px-3 pb-3 flex flex-col gap-px">
                {items.map((km) => (
                  <div key={km.id} className={rowClass}>
                    <div className={Col.time}>
                      {new Date(km.time).toLocaleString()}
                    </div>
                    <div className={Col.player}>
                      {km.killer?.name ?? km.killer?.id ?? km.killer?.address}
                    </div>
                    <div className={Col.player}>
                      {km.victim?.name ?? km.victim?.id ?? km.victim?.address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {rows.length === 0 && (
        <div className="opacity-75 text-sm">No systems found.</div>
      )}
    </div>
  );
};

interface PlayerRow {
  playerId: string;
  name: string;
  address?: string;
  total: number;
  ids: number[];
}
interface PlayersAccordionProps {
  rows: PlayerRow[];
  getSystemName: (id: number) => string;
}

const PlayersAccordion = ({ rows, getSystemName }: PlayersAccordionProps) => {
  const { killmails } = useKillmailStore();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const expanded = open === r.playerId;
        const items = expanded
          ? r.ids
              .map((id) => killmails.find((k) => k.id === id)!)
              .filter(Boolean)
          : [];
        return (
          <div
            key={r.playerId}
            className="border border-[var(--primary)] rounded-md"
          >
            <button
              className="w-full px-3 py-2 flex justify-between items-center"
              onClick={() => setOpen(expanded ? null : r.playerId)}
            >
              <div className="font-semibold">{r.name || r.playerId}</div>
              <div className="text-sm opacity-80">Total: {r.total}</div>
            </button>
            {expanded && (
              <div className="px-3 pb-3 flex flex-col gap-px">
                {items.map((km) => (
                  <div key={km.id} className={rowClass}>
                    <div className={Col.time}>
                      {new Date(km.time).toLocaleString()}
                    </div>
                    <div className={Col.system}>
                      {getSystemName(km.solarSystemId)}
                    </div>
                    <div className={Col.player}>
                      {km.victim?.name ?? km.victim?.id ?? km.victim?.address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {rows.length === 0 && (
        <div className="opacity-75 text-sm">No players found.</div>
      )}
    </div>
  );
};

const KillboardInner: React.FC = () => {
  const {
    killmails,
    bySystem,
    byPlayer,
    lastUpdated,
    loading,
    error,
    refresh,
  } = useKillmailStore();
  const systems = useSolarSystemsIndex();

  const [mode, setMode] = useState<Mode>("recent");
  const [filter, setFilter] = useState("");

  const suggestions = useMemo(() => {
    const s = (systems as any).search(filter, 5).map((x: any) => ({
      kind: "system" as const,
      label: `${x.name} (#${x.id})`,
      value: String(x.id),
    }));
    const p = Array.from(byPlayer.entries())
      .filter(
        ([pid, v]) =>
          (v.name || pid).toLowerCase().includes(filter.toLowerCase()) ||
          (v.address || "").toLowerCase().includes(filter.toLowerCase())
      )
      .slice(0, 5)
      .map(([id, v]) => ({
        kind: "player" as const,
        label: `${v.name || id}`,
        value: id,
      }));
    return [...s, ...p];
  }, [filter, systems, byPlayer]);

  const recentList = useMemo(() => {
    if (!filter.trim()) return killmails as Killmail[];
    const q = filter.toLowerCase();
    const sysIdNum = Number(filter);
    return (killmails as Killmail[]).filter((km) => {
      const sysName = (
        systems.getNameById(km.solarSystemId) || String(km.solarSystemId)
      ).toLowerCase();
      const sysMatch =
        sysName.includes(q) ||
        (Number.isFinite(sysIdNum) && km.solarSystemId === sysIdNum);
      const killer = `${km.killer?.name || ""}|${
        km.killer?.address || ""
      }`.toLowerCase();
      const victim = `${km.victim?.name || ""}|${
        km.victim?.address || ""
      }`.toLowerCase();
      const plyMatch = killer.includes(q) || victim.includes(q);
      return sysMatch || plyMatch;
    });
  }, [killmails, filter, systems]);

  // Proactively resolve missing system names for visible items
  useEffect(() => {
    const ids = new Set<number>();
    // Gather from recent visible list (bounded by UI pagination / scroll)
    for (const km of recentList) ids.add(km.solarSystemId);
    // Also gather from systems index keys
    for (const [sid] of bySystem.entries() as Iterable<
      [number, { total: number; ids: number[] }]
    >) {
      ids.add(sid);
    }
    // Filter missing
    const missing = Array.from(ids).filter((id) => !systems.getNameById(id));
    if (missing.length > 0 && (systems as any).ensureNames) {
      // Limit batch size to avoid spamming
      (systems as any).ensureNames(missing.slice(0, 100));
    }
  }, [recentList, bySystem, systems]);

  const systemsList = useMemo<SystemRow[]>(() => {
    const rows: SystemRow[] = [];
    for (const [sysId, v] of bySystem.entries() as Iterable<
      [number, { total: number; ids: number[] }]
    >) {
      rows.push({
        sysId,
        name: systems.getNameById(sysId) ?? `#${String(sysId)}`,
        total: v.total,
        ids: v.ids,
      });
    }
    rows.sort((a, b) => {
      const nameA = a.name || "";
      const nameB = b.name || "";
      return b.total - a.total || nameA.localeCompare(nameB);
    });
    return rows;
  }, [bySystem, systems]);

  const playersList = useMemo<PlayerRow[]>(() => {
    const rows: PlayerRow[] = [];
    for (const [pid, v] of byPlayer.entries() as Iterable<
      [string, { name: string; address: string; total: number; ids: number[] }]
    >) {
      rows.push({
        playerId: String(pid || ""),
        name: String((v && v.name) || pid || ""),
        address: v?.address,
        total: Number(v?.total || 0),
        ids: Array.isArray(v?.ids) ? v.ids : [],
      });
    }
    rows.sort((a, b) => {
      const nameA = a.name || "";
      const nameB = b.name || "";
      return b.total - a.total || nameA.localeCompare(nameB);
    });
    return rows;
  }, [byPlayer]);

  return (
    <div className="px-3">
      <div className="mb-3">
        <h2 className="text-xl font-semibold">Killboard</h2>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className={
                mode === "recent"
                  ? "border-2 border-[var(--primary)] px-3 py-1 rounded-md text-white"
                  : "border px-3 py-1 rounded-md"
              }
              onClick={() => setMode("recent")}
            >
              Recent
            </button>
            <button
              className={
                mode === "systems"
                  ? "border-2 border-[var(--primary)] px-3 py-1 rounded-md text-white"
                  : "border px-3 py-1 rounded-md"
              }
              onClick={() => setMode("systems")}
            >
              By Solar System
            </button>
            <button
              className={
                mode === "players"
                  ? "border-2 border-[var(--primary)] px-3 py-1 rounded-md text-white"
                  : "border px-3 py-1 rounded-md"
              }
              onClick={() => setMode("players")}
            >
              By Player
            </button>
          </div>
          <div className="text-xs opacity-80">
            {error ? (
              <span className="text-red-400">Error: {error}</span>
            ) : lastUpdated ? (
              `Cache: ${new Date(lastUpdated).toLocaleString()}`
            ) : loading ? (
              "Cache warming…"
            ) : (
              "Cache idle"
            )}
          </div>
        </div>
        {mode === "recent" && (
          <div className="mt-2">
            <input
              className="h-8 min-w-64 border-2 border-[var(--primary)] rounded px-2"
              list="kb-suggestions"
              placeholder="Filter by player or solar system…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <datalist id="kb-suggestions">
              {suggestions.map((s) => (
                <option key={`${s.kind}:${s.value}`} value={s.label} />
              ))}
            </datalist>
            <div className="mt-2">
              <button
                className="border-2 border-[var(--primary)] px-3 py-1 rounded-md text-white"
                onClick={() => refresh()}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>
        )}
        {mode !== "recent" && (
          <div className="mt-2">
            <button
              className="border-2 border-[var(--primary)] px-3 py-1 rounded-md text-white"
              onClick={() => refresh()}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {mode === "recent" && (
        <RecentList items={recentList} getSystemName={systems.getNameById} />
      )}

      {mode === "systems" && (
        <SystemsAccordion
          rows={systemsList}
          getSystemName={systems.getNameById}
        />
      )}

      {mode === "players" && (
        <PlayersAccordion
          rows={playersList}
          getSystemName={systems.getNameById}
        />
      )}
    </div>
  );
};

const KillboardPage: React.FC = () => {
  return (
    <KillmailProvider>
      <KillboardInner />
    </KillmailProvider>
  );
};

export default KillboardPage;
