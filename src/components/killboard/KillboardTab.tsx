import React, { useEffect, useMemo, useState } from "react";
import { KillmailProvider, useKillmailStore } from "../../hooks/useKillmailStore";
import { useSolarSystemsIndex } from "../../hooks/useSolarSystemsIndex";

type KillboardSubTab = "recent" | "most-kills" | "most-losses";

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
  "flex gap-3 items-center border border-primary rounded-md px-3 py-2";

interface RecentListProps {
  items: Killmail[];
  getSystemName: (id: number) => string | undefined;
}

const RecentList = ({ items, getSystemName }: RecentListProps) => {
  return (
    <div className="flex flex-col gap-px">
      <div className="flex gap-3 text-sm font-semibold border-b border-primary pb-1 mb-px">
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

interface PlayerRow {
  playerId: string;
  name: string;
  address?: string;
  total: number;
  ids: number[];
}
interface PlayersListProps {
  rows: PlayerRow[];
  getSystemName: (id: number) => string;
  title: string;
}

const PlayersList = ({ rows, getSystemName, title }: PlayersListProps) => {
  const { killmails } = useKillmailStore();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
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
            className="border border-primary rounded-md"
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
        <div className="opacity-75 text-sm">No data found.</div>
      )}
    </div>
  );
};

const KillboardTabInner: React.FC = () => {
  const {
    killmails,
    byPlayer,
    lastUpdated,
    loading,
    error,
    refresh,
  } = useKillmailStore();
  const systems = useSolarSystemsIndex();

  const [subTab, setSubTab] = useState<KillboardSubTab>("recent");
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

  const killersList = useMemo<PlayerRow[]>(() => {
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
    rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return rows;
  }, [byPlayer]);

  // For losses, we need to aggregate by victim instead of killer
  const lossesList = useMemo<PlayerRow[]>(() => {
    const victimMap = new Map<string, { name: string; address: string; ids: number[] }>();

    for (const km of killmails as Killmail[]) {
      const victimId = km.victim?.id || km.victim?.address || "Unknown";
      const victimName = km.victim?.name || victimId;
      const victimAddress = km.victim?.address || "";

      if (!victimMap.has(victimId)) {
        victimMap.set(victimId, { name: victimName, address: victimAddress, ids: [] });
      }
      victimMap.get(victimId)!.ids.push(km.id);
    }

    const rows: PlayerRow[] = Array.from(victimMap.entries()).map(([id, v]) => ({
      playerId: id,
      name: v.name,
      address: v.address,
      total: v.ids.length,
      ids: v.ids,
    }));

    rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return rows;
  }, [killmails]);

  return (
    <div className="p-6 border-2 border-primary bg-background">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-4 text-primary">Killboard</h2>

        {/* Subtab Navigation */}
        <div className="flex items-center gap-2 mb-4">
          <button
            className={
              subTab === "recent"
                ? "border-2 border-primary px-3 py-1 rounded-md text-white bg-primary"
                : "border-2 border-background-light px-3 py-1 rounded-md hover:border-primary-lighter"
            }
            onClick={() => setSubTab("recent")}
          >
            Recent
          </button>
          <button
            className={
              subTab === "most-kills"
                ? "border-2 border-primary px-3 py-1 rounded-md text-white bg-primary"
                : "border-2 border-background-light px-3 py-1 rounded-md hover:border-primary-lighter"
            }
            onClick={() => setSubTab("most-kills")}
          >
            Most Kills
          </button>
          <button
            className={
              subTab === "most-losses"
                ? "border-2 border-primary px-3 py-1 rounded-md text-white bg-primary"
                : "border-2 border-background-light px-3 py-1 rounded-md hover:border-primary-lighter"
            }
            onClick={() => setSubTab("most-losses")}
          >
            Most Losses
          </button>
        </div>

        {/* Refresh & Status */}
        <div className="flex items-center justify-between mb-4">
          <button
            className="border-2 border-primary px-3 py-1 rounded-md text-white hover:bg-primary-light disabled:opacity-50"
            onClick={() => refresh()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          <div className="text-xs opacity-80">
            {error ? (
              <span className="text-error">Error: {error}</span>
            ) : lastUpdated ? (
              `Last updated: ${new Date(lastUpdated).toLocaleString()}`
            ) : loading ? (
              "Loading..."
            ) : (
              "Ready"
            )}
          </div>
        </div>

        {/* Filter (only for Recent tab) */}
        {subTab === "recent" && (
          <div className="mb-4">
            <input
              className="h-8 min-w-64 border-2 border-primary rounded px-2 bg-background text-foreground"
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
          </div>
        )}
      </div>

      {/* Tab Content */}
      {subTab === "recent" && (
        <RecentList items={recentList} getSystemName={systems.getNameById} />
      )}

      {subTab === "most-kills" && (
        <PlayersList
          rows={killersList}
          getSystemName={systems.getNameById}
          title="Top Killers"
        />
      )}

      {subTab === "most-losses" && (
        <PlayersList
          rows={lossesList}
          getSystemName={systems.getNameById}
          title="Most Losses"
        />
      )}
    </div>
  );
};

export const KillboardTab: React.FC = () => {
  return (
    <KillmailProvider>
      <KillboardTabInner />
    </KillmailProvider>
  );
};

export default React.memo(KillboardTab);
