"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Scoreboard, PointScale, PresentationMode } from "@/types";
import Link from "next/link";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);

  // Stany formularza
  const [title, setTitle] = useState("");
  const [scaleMode, setScaleMode] = useState("euro");
  const [presentationMode, setPresentationMode] = useState<PresentationMode>("top-separated");
  const [hasVotes, setHasVotes] = useState(false);

  useEffect(() => {
    fetch("/api/scoreboards")
      .then((res) => res.json())
      .then((data: Scoreboard[]) => {
        const found = data.find((s) => s.id === params.id);
        if (found) {
          setScoreboard(found);
          setTitle(found.title);
          setPresentationMode(found.presentationMode || "top-separated");
          
          // Detekcja używanej skali
          const isAltScale = found.pointScale.length === 7 && found.pointScale[3] === 6; // Proste sprawdzenie dla skali alternatywnej
          setScaleMode(isAltScale ? "alt" : "euro");

          // Zabezpieczenie przed zmianą skali, gdy są już głosy
          const votesExist = found.juries?.some((j: any) => j.votes && Object.keys(j.votes).length > 0);
          setHasVotes(votesExist || false);
        } else {
          router.push("/");
        }
      });
  }, [params.id, router]);

  const handleSave = async () => {
    if (!scoreboard) return;
    if (!title.trim()) return alert("Nazwa nie może być pusta!");

    let pointScale: PointScale = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1]; // Eurowizyjna domyślnie
    if (scaleMode === "alt") pointScale = [12, 10, 8, 6, 4, 2, 1];

    // Odtwarzamy cały obiekt z nowymi ustawieniami, nie tracąc starych list
    const updatedScoreboard: Scoreboard = {
      ...scoreboard,
      title: title.trim(),
      pointScale: hasVotes ? scoreboard.pointScale : pointScale, // Zmiana skali tylko jeśli nie ma głosów
      presentationMode: presentationMode,
    };

    await fetch("/api/scoreboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedScoreboard),
    });

    router.push(`/scoreboard/${scoreboard.id}`);
  };

  if (!scoreboard) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Ładowanie...</div>;

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
      <header className="max-w-3xl mx-auto mb-8 flex justify-between items-center border-b border-neutral-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-orange-500">Ustawienia ogólne</h1>
          <p className="text-neutral-400">{scoreboard.title}</p>
        </div>
        <div className="space-x-4">
          <Link href={`/scoreboard/${scoreboard.id}`} className="text-neutral-400 hover:text-white transition-colors">
            Anuluj
          </Link>
          <button 
            onClick={handleSave}
            className="bg-orange-600 hover:bg-orange-500 px-6 py-2 rounded font-bold transition-colors"
          >
            Zapisz zmiany
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto space-y-8">
        
        <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700">
          <h2 className="text-lg font-bold mb-4 border-b border-neutral-700 pb-2">Podstawowe informacje</h2>
          
          <label className="block mb-2 text-sm text-neutral-400">Nazwa Konkursu / Scoreboardu</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700">
          <div className="flex justify-between items-center mb-4 border-b border-neutral-700 pb-2">
            <h2 className="text-lg font-bold">Skala Punktowa</h2>
            {hasVotes && (
              <span className="bg-red-900/30 text-red-400 border border-red-800 text-xs px-3 py-1 rounded font-bold">
                Zablokowano edycję
              </span>
            )}
          </div>
          
          <label className="block mb-2 text-sm text-neutral-400">Wybierz system przyznawania punktów</label>
          <select
            value={scaleMode}
            onChange={(e) => setScaleMode(e.target.value)}
            disabled={hasVotes}
            className={`w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-white focus:outline-none ${hasVotes ? 'opacity-50 cursor-not-allowed' : 'focus:border-orange-500'}`}
          >
            <option value="euro">Klasyczna Eurowizja (12, 10, 8, 7, 6, 5, 4, 3, 2, 1)</option>
            <option value="alt">Skrócona / Alternatywna (12, 10, 8, 6, 4, 2, 1)</option>
          </select>
          
          {hasVotes && (
            <p className="mt-2 text-sm text-red-400">
              Przynajmniej jeden z jurorów oddał już głosy. Nie możesz zmienić skali punktowej w trakcie trwania głosowania.
            </p>
          )}
        </div>

        <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700">
          <h2 className="text-lg font-bold mb-4 border-b border-neutral-700 pb-2">Prezentacja Wyników (Animacja)</h2>
          
          <label className="block mb-2 text-sm text-neutral-400">Jak mają pojawiać się punkty podczas animacji?</label>
          <select
            value={presentationMode}
            onChange={(e) => setPresentationMode(e.target.value as PresentationMode)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-orange-500"
          >
            <option value="top-separated">Styl Eurowizji: Niskie punkty razem, "8", "10", "12" wyczytywane osobno (Zalecane)</option>
            <option value="one-by-one">Krok po kroku: Każdy punkt (od 1 do 12) pojawia się osobno po kolei</option>
            <option value="all-together">Ekspres: Wszystkie punkty jurora pojawiają się w tabeli natychmiast</option>
          </select>
          <p className="mt-3 text-sm text-neutral-500">
            Opcja ta określa domyślne zachowanie animacji dla widzów. Zawsze będzie istniała możliwość ręcznego przewinięcia "do przodu".
          </p>
        </div>

      </main>
    </div>
  );
}