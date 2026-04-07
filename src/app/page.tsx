"use client";

import { useState, useEffect } from "react";
import { Scoreboard, PointScale } from "@/types";
import Link from "next/link";

export default function Home() {
  // Stany naszej aplikacji (to, co zmienia się na ekranie)
  const [scoreboards, setScoreboards] = useState<Scoreboard[]>([]);
  const [isCreating, setIsCreating] = useState(false); // Czy pokazać okienko tworzenia
  const [newTitle, setNewTitle] = useState("");
  const [newScale, setNewScale] = useState("euro"); 

  // Krok 1: Przy starcie strony pobieramy zapisane tabele z naszego lokalnego API
  useEffect(() => {
    fetch("/api/scoreboards")
      .then((res) => res.json())
      .then((data) => setScoreboards(data || []));
  }, []);

  // Krok 2: Funkcja, która tworzy nowy wpis po kliknięciu "Utwórz" w okienku
  const handleCreate = async () => {
    if (!newTitle.trim()) return alert("Podaj nazwę tabeli!");

    // Wybieramy odpowiednią tablicę punktów w zależności od wyboru
    let pointScale: PointScale = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1]; // Eurowizyjna
    if (newScale === "alt") pointScale = [12, 10, 8, 6, 4, 2, 1];  // Alternatywna

    // Tworzymy "paczkę" z danymi nowej tabeli
    const newScoreboard: Scoreboard = {
      id: crypto.randomUUID(), // Generuje unikalny ciąg znaków
      title: newTitle,
      pointScale: pointScale,
      presentationMode: "one-by-one", // Domyślna animacja
      participants: [],
      juries: [],
      createdAt: Date.now(),
    };

    // Wysyłamy paczkę do naszego API, które zapisze to w pliku database.json
    await fetch("/api/scoreboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newScoreboard),
    });

    // Aktualizujemy listę na ekranie (stare + nowe) i zamykamy okienko
    setScoreboards([...scoreboards, newScoreboard]);
    setIsCreating(false);
    setNewTitle(""); // Czyścimy pole tekstowe na przyszłość
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 border-b border-neutral-700 pb-4">
        <h1 className="text-4xl font-bold text-orange-500 tracking-wider">
          SCORE<span className="text-white">BOARD</span>
        </h1>
        <p className="text-neutral-400 mt-2">Menedżer wyników i głosowań</p>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="bg-neutral-800 p-6 rounded-lg shadow-xl border border-neutral-700 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-orange-400">Twoje tabele</h2>
            <button
              onClick={() => setIsCreating(true)} // Kliknięcie otwiera okienko
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              + Utwórz nowy
            </button>
          </div>

          {/* Renderowanie listy tabel lub komunikatu o braku */}
          {scoreboards.length === 0 ? (
            <div className="text-center p-10 text-neutral-500 border-2 border-dashed border-neutral-700 rounded-lg">
              Nie masz jeszcze żadnych utworzonych tabel.
            </div>
          ) : (
            <ul className="space-y-3">
              {scoreboards.map((sb) => (
                <li key={sb.id} className="bg-neutral-700 p-4 rounded-md flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{sb.title}</h3>
                    <p className="text-sm text-neutral-400">
                      Uczestników: {sb.participants.length} | Jurorów: {sb.juries.length}
                    </p>
                  </div>
                  <Link 
                    href={`/scoreboard/${sb.id}`} 
                    className="bg-neutral-600 hover:bg-neutral-500 px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    Zarządzaj
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* OKIENKO (MODAL) TWORZENIA NOWEGO SCOREBOARDU */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <div className="bg-neutral-800 p-6 rounded-lg shadow-2xl border border-neutral-700 w-full max-w-md">
            <h2 className="text-xl font-bold text-orange-500 mb-4">Nowy Scoreboard</h2>
            
            <label className="block mb-2 text-sm text-neutral-300">Nazwa (np. Mój Konkurs 2026)</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)} // Zapisuje to co wpisujesz do pamięci
              className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 mb-4 text-white focus:outline-none focus:border-orange-500"
              placeholder="Wpisz nazwę..."
            />

            <label className="block mb-2 text-sm text-neutral-300">Skala punktowa</label>
            <select
              value={newScale}
              onChange={(e) => setNewScale(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 mb-6 text-white focus:outline-none focus:border-orange-500"
            >
              <option value="euro">Eurowizyjna (12, 10, 8, 7, 6, 5, 4, 3, 2, 1)</option>
              <option value="alt">Alternatywna (12, 10, 8, 6, 4, 2, 1)</option>
            </select>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsCreating(false)} // Zamyka okienko bez zapisu
                className="px-4 py-2 rounded text-neutral-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreate} // Uruchamia funkcję tworzącą (wyżej)
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded font-bold transition-colors"
              >
                Utwórz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}