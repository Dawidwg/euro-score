"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Scoreboard, Jury } from "@/types";
import Link from "next/link";
import Flag from "@/components/Flag";

export default function VotingPage() {
  const params = useParams();
  const router = useRouter();
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  
  // Stan przechowujący aktualnie edytowanego jurora
  const [activeJuryId, setActiveJuryId] = useState<string | null>(null);
  
  // Stan przechowujący wprowadzane głosy (Klucz to punkty np. "12", Wartość to ID uczestnika)
  const [currentVotes, setCurrentVotes] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("/api/scoreboards")
      .then((res) => res.json())
      .then((data: Scoreboard[]) => {
        const found = data.find((s) => s.id === params.id);
        if (found) setScoreboard(found);
        else router.push("/");
      });
  }, [params.id, router]);

  // Funkcja otwierająca formularz dla wybranego jurora
  const openVotingForm = (jury: Jury) => {
    setActiveJuryId(jury.id);
    
    // Przekształcamy zapisane głosy jurora (ParticipantID -> Punkty) na format formularza (Punkty -> ParticipantID)
    const votesForForm: Record<number, string> = {};
    if (jury.votes) {
      Object.entries(jury.votes).forEach(([participantId, points]) => {
        votesForForm[points as number] = participantId;
      });
    }
    setCurrentVotes(votesForForm);
  };

  // Przydzielanie punktów uczestnikowi z rozwijanej listy
  const handleSelectParticipant = (points: number, participantId: string) => {
    setCurrentVotes(prev => ({
      ...prev,
      [points]: participantId
    }));
  };

  // Zapis głosów konkretnego jurora
  const handleSaveVotes = async () => {
    if (!scoreboard || !activeJuryId) return;

    // Przekształcamy głosy z powrotem na format do bazy (ParticipantID -> Punkty)
    const finalVotes: Record<string, number> = {};
    Object.entries(currentVotes).forEach(([points, participantId]) => {
      if (participantId) {
        finalVotes[participantId] = Number(points);
      }
    });

    // Aktualizujemy obiekt jurora
    const updatedJuries = scoreboard.juries.map(j => 
      j.id === activeJuryId ? { ...j, votes: finalVotes } : j
    );

    const updatedScoreboard = { ...scoreboard, juries: updatedJuries };

    // Zapis do API
    await fetch("/api/scoreboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedScoreboard),
    });

    // Aktualizujemy stan i zamykamy formularz
    setScoreboard(updatedScoreboard);
    setActiveJuryId(null);
    setCurrentVotes({});
  };

  if (!scoreboard) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Ładowanie...</div>;

  // --- WIDOK 2: FORMULARZ GŁOSOWANIA KONKRETNEGO JURORA ---
  if (activeJuryId) {
    const jury = scoreboard.juries.find(j => j.id === activeJuryId);
    
    // Sprawdzamy, które ID uczestników zostały już wykorzystane w tym głosowaniu, 
    // żeby zablokować możliwość oddania np. 12 i 10 punktów na tego samego kraju
    const usedParticipantIds = Object.values(currentVotes);

    return (
      <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
        <header className="max-w-2xl mx-auto mb-8 border-b border-neutral-700 pb-4">
          <div className="flex items-center gap-4 mb-2">
            <Flag code={jury?.flagCode || ""} />
            <h1 className="text-2xl font-bold text-orange-500">Głosuje: {jury?.name}</h1>
          </div>
          <p className="text-neutral-400">Przydziel punkty uczestnikom.</p>
        </header>

        <main className="max-w-2xl mx-auto bg-neutral-800 p-6 rounded-lg border border-neutral-700">
          <div className="space-y-3">
            {/* Wyświetlamy rozwijaną listę dla każdego punktu (od najwyższego) */}
            {scoreboard.pointScale.map(points => (
              <div key={points} className="flex items-center gap-4 bg-neutral-900 p-3 rounded border border-neutral-700">
                <div className="w-12 text-center text-xl font-bold text-orange-500 bg-neutral-800 rounded py-2 border border-orange-500/30">
                  {points}
                </div>
                
                <select
                  value={currentVotes[points] || ""}
                  onChange={(e) => handleSelectParticipant(points, e.target.value)}
                  className="flex-1 bg-neutral-800 border border-neutral-600 rounded p-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="">-- Wybierz uczestnika --</option>
                  {scoreboard.participants.map(p => {
                    // Blokujemy uczestnika, jeśli dostał już inne punkty (ale nie blokujemy go w polu, w którym właśnie jest wybrany)
                    const isUsedElsewhere = usedParticipantIds.includes(p.id) && currentVotes[points] !== p.id;
                    return (
                      <option key={p.id} value={p.id} disabled={isUsedElsewhere}>
                        {p.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <button 
              onClick={() => setActiveJuryId(null)}
              className="text-neutral-400 hover:text-white px-4 py-2 transition-colors"
            >
              Anuluj
            </button>
            <button 
              onClick={handleSaveVotes}
              className="bg-orange-600 hover:bg-orange-500 px-8 py-3 rounded font-bold transition-colors"
            >
              Zapisz głosy
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --- WIDOK 1: LISTA JURORÓW (KTO ZAGŁOSOWAŁ, KTO NIE) ---
  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center border-b border-neutral-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-orange-500">Panel Głosowania</h1>
          <p className="text-neutral-400">{scoreboard.title}</p>
        </div>
        <Link href={`/scoreboard/${scoreboard.id}`} className="text-neutral-400 hover:text-white transition-colors">
          &larr; Wróć do menu
        </Link>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700">
          
          {scoreboard.juries.length === 0 || scoreboard.participants.length === 0 ? (
            <div className="text-center py-10 text-neutral-500">
              <p className="mb-2">Nie możesz jeszcze głosować.</p>
              <p className="text-sm">Musisz dodać przynajmniej jednego uczestnika i jednego jurora.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {scoreboard.juries.map((jury, index) => {
                // Sprawdzanie czy juror przyznał już jakieś punkty
                const votesCount = Object.keys(jury.votes || {}).length;
                const totalPointsRequired = scoreboard.pointScale.length;
                const isComplete = votesCount >= Math.min(totalPointsRequired, scoreboard.participants.length);

                return (
                  <li key={jury.id} className="flex items-center justify-between bg-neutral-900 p-4 rounded border border-neutral-700">
                    <div className="flex items-center gap-4">
                      <span className="text-neutral-500 font-mono w-6 text-right">{index + 1}.</span>
                      <Flag code={jury.flagCode} />
                      <span className="font-medium text-lg w-48">{jury.name}</span>
                      
                      {/* Etykieta statusu */}
                      {isComplete ? (
                        <span className="bg-green-900/50 text-green-400 border border-green-800 text-xs px-3 py-1 rounded font-bold">
                          Głosy oddane ({votesCount})
                        </span>
                      ) : votesCount > 0 ? (
                        <span className="bg-orange-900/50 text-orange-400 border border-orange-800 text-xs px-3 py-1 rounded font-bold">
                          Niepełne ({votesCount}/{totalPointsRequired})
                        </span>
                      ) : (
                        <span className="bg-neutral-800 text-neutral-400 border border-neutral-600 text-xs px-3 py-1 rounded font-bold">
                          Brak głosów
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => openVotingForm(jury)}
                      className="bg-neutral-700 hover:bg-neutral-600 px-6 py-2 rounded text-sm font-bold transition-colors"
                    >
                      {votesCount > 0 ? "Edytuj głosy" : "Ustaw głosy"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}