"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Scoreboard } from "@/types";
import Link from "next/link";
import Flag from "@/components/Flag";

type SortConfig = {
  key: "TOTAL" | string;
  direction: "desc" | "asc";
};

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "TOTAL", direction: "desc" });

  useEffect(() => {
    fetch("/api/scoreboards")
      .then((res) => res.json())
      .then((data: Scoreboard[]) => {
        const found = data.find((s) => s.id === params.id);
        if (found) setScoreboard(found);
        else router.push("/");
      });
  }, [params.id, router]);

  if (!scoreboard) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Ładowanie...</div>;

  // --- PODZIAŁ JURORÓW ---
  // Filtrujemy aktywnych (mających głosy) oraz tych do pominięcia
  const validJuries = scoreboard.juries.filter(j => j.votes && Object.keys(j.votes).length > 0);
  const emptyJuries = scoreboard.juries.filter(j => !j.votes || Object.keys(j.votes).length === 0);

  // --- LOGIKA OBLICZANIA WYNIKÓW I REMISÓW ---
  
  const pointScaleSorted = [...scoreboard.pointScale].sort((a, b) => b - a);

  const getParticipantStats = (participantId: string) => {
    let total = 0;
    let votersCount = 0;
    const pointsBreakdown: Record<number, number> = {};
    pointScaleSorted.forEach(pt => pointsBreakdown[pt] = 0);

    // Zliczamy statystyki OPIERAJĄC SIĘ TYLKO NA AKTYWNYCH JURORACH
    validJuries.forEach(jury => {
      const pts = jury.votes?.[participantId] || 0;
      if (pts > 0) {
        total += pts;
        votersCount += 1;
        if (pointsBreakdown[pts] !== undefined) {
          pointsBreakdown[pts]++;
        }
      }
    });

    return { total, votersCount, pointsBreakdown };
  };

  const sortedParticipants = [...scoreboard.participants].sort((a, b) => {
    if (sortConfig.key !== "TOTAL") {
      const jury = validJuries.find(j => j.id === sortConfig.key);
      const aPts = jury?.votes?.[a.id] || 0;
      const bPts = jury?.votes?.[b.id] || 0;
      return sortConfig.direction === "desc" ? bPts - aPts : aPts - bPts;
    }

    const statsA = getParticipantStats(a.id);
    const statsB = getParticipantStats(b.id);

    if (statsA.total !== statsB.total) {
      return sortConfig.direction === "desc" ? statsB.total - statsA.total : statsA.total - statsB.total;
    }

    if (sortConfig.direction === "desc") {
      if (statsA.votersCount !== statsB.votersCount) {
        return statsB.votersCount - statsA.votersCount;
      }
      
      for (const pt of pointScaleSorted) {
        if (statsA.pointsBreakdown[pt] !== statsB.pointsBreakdown[pt]) {
          return statsB.pointsBreakdown[pt] - statsA.pointsBreakdown[pt];
        }
      }
    }

    const indexA = scoreboard.participants.findIndex(p => p.id === a.id);
    const indexB = scoreboard.participants.findIndex(p => p.id === b.id);
    return sortConfig.direction === "desc" ? indexA - indexB : indexB - indexA;
  });

  const handleSort = (key: string) => {
    if (sortConfig.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === "desc" ? "asc" : "desc" });
    } else {
      setSortConfig({ key, direction: "desc" });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-end border-b border-neutral-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-orange-500">Pełna Tabela Wyników</h1>
          <p className="text-neutral-400 mt-1">{scoreboard.title}</p>
        </div>
        <div className="flex gap-4">
          <Link href={`/scoreboard/${scoreboard.id}`} className="text-neutral-400 hover:text-white px-4 py-2 transition-colors">
            Wróć do menu
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="bg-neutral-800 rounded-lg border border-neutral-700 overflow-x-auto shadow-2xl">
          
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-neutral-400 bg-neutral-900 border-b border-neutral-700 uppercase">
              <tr>
                <th className="px-4 py-4 text-center w-10">Msc</th>
                <th className="px-4 py-4">Uczestnik</th>
                
                {/* WIDZIMY TYLKO TYCH JURORÓW, KTÓRZY ZAGŁOSOWALI */}
                {validJuries.map((jury) => (
                  <th 
                    key={jury.id} 
                    onClick={() => handleSort(jury.id)}
                    className={`px-2 py-3 text-center cursor-pointer hover:bg-neutral-700 transition-colors border-l border-neutral-700/50 ${sortConfig.key === jury.id ? "bg-neutral-800 text-orange-400" : ""}`}
                    title={jury.name}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Flag code={jury.flagCode} />
                      <span className="text-[10px] mt-1 font-bold text-neutral-500 tracking-wider">
                        {jury.name.substring(0, 3).toUpperCase()}
                      </span>
                    </div>
                  </th>
                ))}
                
                <th 
                  onClick={() => handleSort("TOTAL")}
                  className={`px-4 py-4 text-center cursor-pointer hover:bg-neutral-700 transition-colors border-l border-neutral-700 font-bold text-base ${sortConfig.key === "TOTAL" ? "text-orange-500 bg-neutral-800" : ""}`}
                >
                  SUMA
                  {sortConfig.key === "TOTAL" && (sortConfig.direction === "desc" ? " ↓" : " ↑")}
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedParticipants.map((participant, index) => {
                const stats = getParticipantStats(participant.id);
                
                return (
                  <tr key={participant.id} className="border-b border-neutral-700/50 hover:bg-neutral-700/50 transition-colors">
                    <td className="px-4 py-3 text-center text-neutral-500 font-mono font-bold">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-base">
                      <div className="flex items-center gap-3">
                        <Flag code={participant.flagCode} />
                        {participant.name}
                      </div>
                    </td>
                    
                    {/* PUNKTY WYŚWIETLANE TYLKO DLA AKTYWNYCH JURORÓW */}
                    {validJuries.map(jury => {
                      const points = jury.votes?.[participant.id];
                      return (
                        <td 
                          key={jury.id} 
                          className={`px-2 py-3 text-center font-mono border-l border-neutral-700/50 ${points === Math.max(...scoreboard.pointScale) ? "text-orange-400 font-bold bg-orange-900/20" : "text-neutral-300"}`}
                        >
                          {points || "-"}
                        </td>
                      );
                    })}
                    
                    <td className="px-4 py-3 text-center font-bold text-lg text-orange-400 border-l border-neutral-700 bg-neutral-900/30">
                      {stats.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>
        
        <p className="text-neutral-500 text-xs mt-4 text-right">
          * Kliknij na flagę jurora lub nagłówek "SUMA", aby posortować tabelę. Remisy rozwiązywane wg. standardu EBU.
        </p>

        {/* NOWA SEKCJA: INFO O POMINIĘTYCH JURORACH */}
        {emptyJuries.length > 0 && (
          <div className="mt-8 bg-neutral-800/50 p-5 rounded-lg border border-neutral-700">
            <h3 className="text-sm font-bold text-neutral-400 mb-3 uppercase tracking-wider">
              Brakujące głosy (pominięci w tabeli)
            </h3>
            <div className="flex flex-wrap gap-4">
              {emptyJuries.map(jury => (
                <div key={jury.id} className="flex items-center gap-2 text-sm text-neutral-500 bg-neutral-900/50 px-3 py-1.5 rounded border border-neutral-800">
                  <Flag code={jury.flagCode} />
                  <span>{jury.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}