"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Scoreboard } from "@/types";
import Flag from "@/components/Flag";

export default function PresentationPage() {
  const params = useParams();
  const router = useRouter();
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);

  // Stany animacji
  const [activeJuryIndex, setActiveJuryIndex] = useState<number>(0);
  const [revealedPoints, setRevealedPoints] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(2500);
  const [isFinished, setIsFinished] = useState(false);
  const [isFullMode, setIsFullMode] = useState(false);
  const [totalJuries, setTotalJuries] = useState(0); 
  
  // Stan dla okienka z tabelą
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/presentation/${params.id}/${params.juryId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: any) => {
        setScoreboard(data);
        setIsFullMode(data.isFullMode);
        setTotalJuries(data.totalJuries || data.juries.length); 
        
        if (!data.isFullMode) {
          setActiveJuryIndex(data.juries.length - 1);
        } else {
          setActiveJuryIndex(0);
        }
      })
      .catch(() => router.push("/"));
  }, [params.id, params.juryId, router]);

  const currentStats = useMemo(() => {
    if (!scoreboard) return new Map();

    const statsMap = new Map();
    scoreboard.participants.forEach(p => {
      statsMap.set(p.id, { total: 0, votersCount: 0, pointsBreakdown: {} as Record<number, number> });
      scoreboard.pointScale.forEach(pt => statsMap.get(p.id).pointsBreakdown[pt] = 0);
    });

    scoreboard.juries.forEach((jury, index) => {
      if (index < activeJuryIndex) {
        Object.entries(jury.votes || {}).forEach(([pId, pts]) => {
          if (pts > 0) {
            const s = statsMap.get(pId);
            s.total += pts;
            s.votersCount++;
            s.pointsBreakdown[pts]++;
          }
        });
      } 
      else if (index === activeJuryIndex) {
        Object.entries(jury.votes || {}).forEach(([pId, pts]) => {
          if (pts > 0 && revealedPoints.includes(pts)) {
            const s = statsMap.get(pId);
            s.total += pts;
            s.votersCount++;
            s.pointsBreakdown[pts]++;
          }
        });
      }
    });

    return statsMap;
  }, [scoreboard, activeJuryIndex, revealedPoints]);

  const sortedParticipants = useMemo(() => {
    if (!scoreboard) return [];
    const scaleAsc = [...scoreboard.pointScale].sort((a, b) => a - b);
    
    return [...scoreboard.participants].sort((a, b) => {
      const statsA = currentStats.get(a.id);
      const statsB = currentStats.get(b.id);

      if (statsA.total !== statsB.total) return statsB.total - statsA.total;
      if (statsA.votersCount !== statsB.votersCount) return statsB.votersCount - statsA.votersCount;
      
      for (let i = scaleAsc.length - 1; i >= 0; i--) {
        const pt = scaleAsc[i];
        if (statsA.pointsBreakdown[pt] !== statsB.pointsBreakdown[pt]) {
          return statsB.pointsBreakdown[pt] - statsA.pointsBreakdown[pt];
        }
      }
      return 0;
    });
  }, [scoreboard, currentStats]);

  useEffect(() => {
    if (!isPlaying || isFinished || !scoreboard) return;

    const timer = setTimeout(() => {
      const scaleAsc = [...scoreboard.pointScale].sort((a, b) => a - b);
      const mode = scoreboard.presentationMode || "top-separated";

      if (revealedPoints.length === scaleAsc.length) {
        if (activeJuryIndex >= scoreboard.juries.length - 1) {
          setIsFinished(true);
          setIsPlaying(false);
        } else {
          setActiveJuryIndex(prev => prev + 1);
          setRevealedPoints([]);
        }
        return;
      }

      const unrevealed = scaleAsc.filter(p => !revealedPoints.includes(p));

      if (mode === "all-together") {
        setRevealedPoints(scaleAsc);
      } 
      else if (mode === "one-by-one") {
        setRevealedPoints(prev => [...prev, unrevealed[0]]);
      } 
      else if (mode === "top-separated") {
        const top3 = scaleAsc.slice(-3);
        if (!top3.includes(unrevealed[0])) {
          const lowerPoints = unrevealed.filter(p => !top3.includes(p));
          setRevealedPoints(prev => [...prev, ...lowerPoints]);
        } else {
          setRevealedPoints(prev => [...prev, unrevealed[0]]);
        }
      }
    }, speedMs);

    return () => clearTimeout(timer);
  }, [isPlaying, isFinished, scoreboard, revealedPoints, activeJuryIndex, speedMs]);

  // --- POPRAWIONA NAWIGACJA ---
  const handlePrevJury = () => {
    if (!scoreboard) return;

    // 1. Z ekranu "Zakończono" wracamy do punktacji ostatniego jurora
    if (isFinished) {
      setIsFinished(false);
      setRevealedPoints([]);
      return;
    }

    // 2. Jeśli jesteśmy głębiej na liście, wracamy indeks do tyłu
    if (activeJuryIndex > 0) {
      setActiveJuryIndex(prev => prev - 1);
      setRevealedPoints([]);
      setIsFinished(false);
    } 
    // 3. Jeśli jesteśmy na pierwszym, tylko czyścimy
    else {
      setRevealedPoints([]);
    }
  };

  const handleNextJury = () => {
    if (!scoreboard) return;
    if (activeJuryIndex < scoreboard.juries.length - 1) {
      setActiveJuryIndex(prev => prev + 1);
      setRevealedPoints([]);
      setIsFinished(false);
    } else {
      skipToEnd();
    }
  };

  const skipToEnd = () => {
    if (!scoreboard) return;
    setActiveJuryIndex(scoreboard.juries.length - 1);
    setRevealedPoints([...scoreboard.pointScale]);
    setIsFinished(true);
    setIsPlaying(false);
  };

  if (!scoreboard) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Wczytywanie prezentacji...</div>;

  const currentJury = scoreboard.juries[activeJuryIndex];
  const scaleDesc = [...scoreboard.pointScale].sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col relative">
      
      <div className="bg-neutral-900 border-b border-neutral-700 p-3 flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity absolute w-full z-40 shadow-md">
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            disabled={isFinished}
            className={`px-4 py-1 rounded font-bold ${isPlaying ? 'bg-red-900/50 text-red-500' : 'bg-green-900/50 text-green-500'} ${isFinished ? 'opacity-30' : ''}`}
          >
            {isPlaying ? "⏸ PAUZA" : "▶ START / WZNÓW"}
          </button>
          
          <select 
            value={speedMs} 
            onChange={(e) => setSpeedMs(Number(e.target.value))}
            className="bg-neutral-800 text-white text-sm p-1 rounded border border-neutral-700"
          >
            <option value={4000}>Wolno (4s)</option>
            <option value={2500}>Normalnie (2.5s)</option>
            <option value={1000}>Szybko (1s)</option>
          </select>

          <button onClick={skipToEnd} disabled={isFinished} className="text-neutral-500 hover:text-white text-sm">
            ⏭ Pomiń do końca
          </button>

          {isFullMode && (
            <div className="flex gap-2 border-l border-neutral-700 pl-4 ml-2">
              <button
                onClick={handlePrevJury}
                // Blokada gdy jesteśmy na 1. jurorze, ma on 0 pkt i głosowanie trwa
                disabled={activeJuryIndex === 0 && revealedPoints.length === 0 && !isFinished}
                className="bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded text-sm text-neutral-300 disabled:opacity-30 transition-colors"
                title="Cofa do tabeli sprzed rozpoczęcia głosowania aktualnego jurora"
              >
                ⏪ Poprzedni
              </button>
              <button
                onClick={handleNextJury}
                disabled={isFinished}
                className="bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded text-sm text-neutral-300 disabled:opacity-30 transition-colors"
              >
                Następny ⏩
              </button>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-orange-500 hover:text-white text-sm font-bold border border-orange-500/50 hover:bg-orange-600 hover:border-orange-600 px-4 py-1 rounded transition-colors"
        >
          Pokaż Tabelę Wyników
        </button>
      </div>

      <main className="flex-1 flex p-8 pt-16 gap-8 h-screen overflow-hidden">
        
        <div className="flex-[2] flex flex-col bg-neutral-900/40 rounded-xl border border-neutral-800/50 p-6 overflow-hidden">
          <h2 className="text-xl font-bold text-neutral-400 mb-4 tracking-widest uppercase">Klasyfikacja</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 overflow-x-hidden">
            {sortedParticipants.map((p, index) => {
              const stats = currentStats.get(p.id);
              
              const isLeader = index === 0;
              const isTenth = index === 9; 
              
              const ptsReceived = currentJury?.votes?.[p.id];
              const justGotPoints = !isFinished && ptsReceived && revealedPoints.includes(ptsReceived);

              let wrapperClasses = "mb-1";
              if (isLeader || isTenth) {
                wrapperClasses = "mb-3";
              }

              let rowClasses = "flex items-center p-2 rounded transition-colors duration-500 bg-neutral-800 border-y border-r border-transparent ";
              
              if (isLeader) {
                rowClasses += " border-l-4 border-l-orange-500 ";
              } else {
                rowClasses += " border-l-4 border-l-transparent ";
              }

              if (justGotPoints) {
                rowClasses = rowClasses.replace("bg-neutral-800", "bg-neutral-900/80");
              }

              return (
                <div key={p.id} className={wrapperClasses}>
                  <div className={rowClasses}>
                    <span className={`w-8 text-center font-mono font-bold ${isLeader ? 'text-orange-400' : 'text-neutral-500'}`}>
                      {index + 1}
                    </span>
                    <div className="mx-4 flex-shrink-0">
                      <Flag code={p.flagCode} />
                    </div>
                    <span className={`flex-1 font-medium truncate ${isLeader ? 'text-orange-100' : justGotPoints ? 'text-neutral-500' : 'text-white'}`}>
                      {p.name}
                    </span>
                    <span className={`w-12 text-right font-bold text-xl ${isLeader ? 'text-orange-400' : justGotPoints ? 'text-neutral-600' : 'text-neutral-300'}`}>
                      {stats.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-yellow-500"></div>
            
            {/* WSKAŹNIK POSTĘPU JURORÓW */}
            {!isFinished && (
              <div className="absolute top-4 right-4 bg-neutral-900/80 text-neutral-400 text-xs px-2 py-1 rounded border border-neutral-700 font-mono">
                Juror {activeJuryIndex + 1} / {totalJuries}
              </div>
            )}

            {isFinished ? (
              <>
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-2xl font-bold text-orange-400">Głosowanie zakończone!</h2>
                <p className="text-neutral-400 mt-2">Wszystkie głosy zostały zliczone.</p>
              </>
            ) : currentJury ? (
              <>
                <p className="text-neutral-400 uppercase tracking-widest text-sm mb-4 font-bold">Głosy przyznaje</p>
                <div className="transform scale-150 mb-6 shadow-lg">
                  <Flag code={currentJury.flagCode} />
                </div>
                <h2 className="text-3xl font-bold text-white">{currentJury.name}</h2>
              </>
            ) : null}
          </div>

          <div className="flex-1 bg-neutral-900/40 rounded-xl border border-neutral-800/50 p-6 overflow-y-auto">
             {!isFinished && currentJury && (
                <div className="space-y-2">
                  {scaleDesc.map(points => {
                    const voteEntry = Object.entries(currentJury.votes || {}).find(([_, pts]) => pts === points);
                    const participantId = voteEntry ? voteEntry[0] : null;
                    const isRevealed = revealedPoints.includes(points);
                    const participant = scoreboard.participants.find(p => p.id === participantId);

                    return (
                      <div key={points} className={`flex items-center p-3 rounded border transition-all duration-500 ${isRevealed ? 'bg-neutral-800 border-neutral-600' : 'bg-black/50 border-neutral-800 opacity-40'}`}>
                        <div className={`w-12 h-10 flex items-center justify-center font-bold text-xl rounded ${points === 12 ? 'bg-orange-600 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-neutral-700 text-orange-400'}`}>
                          {points}
                        </div>
                        
                        <div className="ml-4 flex-1">
                          {isRevealed && participant ? (
                            <div className="flex items-center gap-3 animate-fade-in truncate">
                              <Flag code={participant.flagCode} />
                              <span className="font-bold text-lg truncate">{participant.name}</span>
                            </div>
                          ) : (
                            <div className="h-6 w-3/4 bg-neutral-800 rounded animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
             )}
          </div>

        </div>
      </main>

      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
              <div>
                <h2 className="text-2xl font-bold text-orange-500">Aktualna Tabela Wyników</h2>
                <p className="text-neutral-500 text-sm mt-1">Podsumowanie głosów (do obecnego momentu animacji)</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-neutral-400 hover:text-white font-bold text-3xl px-2"
                title="Zamknij"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-auto bg-[#0a0a0a]">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-neutral-400 bg-neutral-950 border-b border-neutral-800 uppercase">
                  <tr>
                    <th className="px-4 py-4 text-center w-10">Msc</th>
                    <th className="px-4 py-4">Uczestnik</th>
                    
                    {scoreboard.juries.map((jury) => (
                      <th 
                        key={jury.id} 
                        className="px-2 py-3 text-center border-l border-neutral-800/50"
                        title={jury.name}
                      >
                        <div className="flex flex-col items-center justify-center opacity-80">
                          <Flag code={jury.flagCode} />
                          <span className="text-[10px] mt-1 font-bold text-neutral-500 tracking-wider">
                            {jury.name.substring(0, 3).toUpperCase()}
                          </span>
                        </div>
                      </th>
                    ))}
                    
                    <th className="px-4 py-4 text-center border-l border-neutral-800 font-bold text-base text-orange-500">
                      SUMA
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedParticipants.map((participant, index) => {
                    const stats = currentStats.get(participant.id);
                    
                    return (
                      <tr key={participant.id} className="border-b border-neutral-800/50 hover:bg-neutral-800 transition-colors">
                        <td className="px-4 py-3 text-center text-neutral-500 font-mono font-bold">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-base">
                          <div className="flex items-center gap-3">
                            <Flag code={participant.flagCode} />
                            {participant.name}
                          </div>
                        </td>
                        
                        {scoreboard.juries.map((jury, jIndex) => {
                          let points = null;
                          
                          if (jIndex < activeJuryIndex) {
                            points = jury.votes?.[participant.id];
                          } else if (jIndex === activeJuryIndex) {
                            const pts = jury.votes?.[participant.id];
                            if (pts && revealedPoints.includes(pts)) {
                              points = pts;
                            }
                          }

                          return (
                            <td 
                              key={jury.id} 
                              className={`px-2 py-3 text-center font-mono border-l border-neutral-800/50 ${points === Math.max(...scoreboard.pointScale) ? "text-orange-400 font-bold bg-orange-900/20" : "text-neutral-400"}`}
                            >
                              {points || "-"}
                            </td>
                          );
                        })}
                        
                        <td className="px-4 py-3 text-center font-bold text-lg text-orange-400 border-l border-neutral-800 bg-neutral-900/30">
                          {stats.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}