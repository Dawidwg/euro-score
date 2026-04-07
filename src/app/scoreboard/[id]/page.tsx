"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Scoreboard } from "@/types";
import Link from "next/link";

export default function ScoreboardDashboard() {
  const params = useParams();
  const router = useRouter();
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);

  useEffect(() => {
    fetch("/api/scoreboards")
      .then((res) => res.json())
      .then((data: Scoreboard[]) => {
        const found = data.find((s) => s.id === params.id);
        if (found) {
          setScoreboard(found);
        } else {
          router.push("/");
        }
      });
  }, [params.id, router]);

  if (!scoreboard) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Ładowanie...</div>;

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-10 border-b border-neutral-700 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-orange-500">{scoreboard.title}</h1>
          <p className="text-neutral-400 mt-1">Główne menu zarządzania</p>
        </div>
        <Link href="/" className="text-neutral-400 hover:text-white transition-colors">
          &larr; Wróć do listy
        </Link>
      </header>

      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <Link href={`/scoreboard/${scoreboard.id}/settings`} className="md:col-span-2 bg-neutral-800 p-4 rounded-lg border border-neutral-600 hover:border-white transition-colors flex items-center gap-4">
          <span className="text-2xl">⚙️</span>
          <div>
            <h2 className="text-lg font-bold">Ustawienia ogólne</h2>
            <p className="text-neutral-400 text-sm">Zmień nazwę, zasady punktacji i tryb animacji.</p>
          </div>
        </Link>

        <Link href={`/scoreboard/${scoreboard.id}/participants`} className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 hover:border-orange-500 transition-colors block">
          <h2 className="text-xl font-bold mb-2">1. Uczestnicy</h2>
          <p className="text-neutral-400 text-sm">Zarządzaj listą krajów/piosenek.</p>
          <p className="mt-4 text-orange-400 font-bold">Na liście: {scoreboard.participants?.length || 0}</p>
        </Link>

        <Link href={`/scoreboard/${scoreboard.id}/juries`} className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 hover:border-orange-500 transition-colors block">
          <h2 className="text-xl font-bold mb-2">2. Jurorzy</h2>
          <p className="text-neutral-400 text-sm">Dodaj osoby/kraje przyznające punkty.</p>
          <p className="mt-4 text-orange-400 font-bold">Na liście: {scoreboard.juries?.length || 0}</p>
        </Link>

        <Link href={`/scoreboard/${scoreboard.id}/voting`} className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 hover:border-orange-500 transition-colors block">
          <h2 className="text-xl font-bold mb-2">3. Głosowanie</h2>
          <p className="text-neutral-400 text-sm">Wprowadź punkty od poszczególnych jurorów.</p>
          <p className="mt-4 text-orange-400 font-bold">Gotowe głosy: {scoreboard.juries?.filter(j => Object.keys(j.votes || {}).length > 0).length || 0} / {scoreboard.juries?.length || 0}</p>
        </Link>

        <Link href={`/scoreboard/${scoreboard.id}/results`} className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 hover:border-orange-500 transition-colors block">
          <h2 className="text-xl font-bold mb-2">4. Tabela Wyników</h2>
          <p className="text-neutral-400 text-sm">Wyświetl pełną tabelę podsumowującą głosy.</p>
        </Link>

        {/* KAFELEK DO ANIMACJI TERAZ DZIAŁA */}
        <Link href={`/scoreboard/${scoreboard.id}/presentation`} className="md:col-span-2 bg-neutral-800 p-6 rounded-lg border border-orange-500/50 hover:border-orange-500 transition-colors block shadow-[0_0_15px_rgba(249,115,22,0.2)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">▶️</span>
            <h2 className="text-xl font-bold text-orange-400">Prezentacja Wyników i Linki</h2>
          </div>
          <p className="text-neutral-400 text-sm">Zarządzaj animacją i generuj bezpieczne linki dla poszczególnych jurorów.</p>
        </Link>

      </main>
    </div>
  );
}