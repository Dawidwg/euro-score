"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Scoreboard } from "@/types";
import Link from "next/link";
import Flag from "@/components/Flag";

export default function PresentationHub() {
  const params = useParams();
  const router = useRouter();
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scoreboards")
      .then((res) => res.json())
      .then((data: Scoreboard[]) => {
        const found = data.find((s) => s.id === params.id);
        if (found) {
          // --- SYSTEM ZABEZPIECZEŃ (GENEROWANIE TOKENÓW W TLE) ---
          const pubToken = (found as any).publicToken;
          const fToken = (found as any).fullToken;
          
          if (!pubToken || !fToken) {
            const updated = {
              ...found,
              publicToken: pubToken || crypto.randomUUID(),
              fullToken: fToken || crypto.randomUUID(),
            };
            fetch("/api/scoreboards", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated),
            }).then(() => setScoreboard(updated));
          } else {
            setScoreboard(found);
          }
        } else {
          router.push("/");
        }
      });
  }, [params.id, router]);

  const handleCopyLink = (juryId: string) => {
    if (!scoreboard) return;
    const pubToken = (scoreboard as any).publicToken;
    const url = `${window.location.origin}/presentation/${pubToken}/${juryId}`;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(juryId);
      setTimeout(() => setCopiedId(null), 1200); 
    });
  };

  if (!scoreboard) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Ładowanie...</div>;

  const publicToken = (scoreboard as any).publicToken || scoreboard.id;
  const fullToken = (scoreboard as any).fullToken || "full";

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-end border-b border-neutral-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-orange-500">Hub Prezentacji</h1>
          <p className="text-neutral-400 mt-1">{scoreboard.title}</p>
        </div>
        <Link href={`/scoreboard/${scoreboard.id}`} className="text-neutral-400 hover:text-white transition-colors">
          &larr; Wróć do menu
        </Link>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        
        <section className="bg-neutral-800 p-6 rounded-lg border border-orange-500/50 shadow-lg">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <span className="text-orange-500">▶️</span> Wersja 1: Pełna Animacja (Ciągła)
          </h2>
          <p className="text-neutral-400 text-sm mb-6">
            Link korzysta teraz z ukrytych tokenów bezpieczeństwa. Uruchamia całą prezentację od zera z możliwością sterowania (Poprzedni/Następny juror).
          </p>
          
          <div className="flex items-center gap-4">
            <Link 
              href={`/presentation/${publicToken}/${fullToken}`}
              target="_blank"
              className="bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded font-bold transition-colors text-center"
            >
              Uruchom Pełną Animację
            </Link>
            <button 
              onClick={() => handleCopyLink(fullToken)}
              className="bg-neutral-700 hover:bg-neutral-600 px-6 py-3 rounded font-bold transition-colors w-48 text-center whitespace-nowrap"
            >
              {copiedId === fullToken ? "✅ Skopiowano!" : "🔗 Kopiuj Link"}
            </button>
          </div>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg border border-neutral-700">
          <h2 className="text-xl font-bold mb-2">Wersja 2: Indywidualne linki (Odcinki)</h2>
          <p className="text-neutral-400 text-sm mb-6">
            Zabezpieczone linki, które ukrywają Twoje prawdziwe ID konkursu. Próba zmiany linku na słówko "full" zakończy się zablokowaniem dostępu.
          </p>

          <ul className="space-y-3">
            {scoreboard.juries.map((jury, index) => {
              const hasVoted = jury.votes && Object.keys(jury.votes).length > 0;

              return (
                <li key={jury.id} className="flex items-center justify-between bg-neutral-900 p-4 rounded border border-neutral-700">
                  <div className="flex items-center gap-4">
                    <span className="text-neutral-500 font-mono w-6 text-right">{index + 1}.</span>
                    <Flag code={jury.flagCode} />
                    <span className="font-medium text-lg w-48">{jury.name}</span>
                    
                    {!hasVoted && (
                      <span className="text-xs text-red-400 border border-red-800/50 bg-red-900/20 px-2 py-1 rounded">
                        Brak głosów (Pominięty)
                      </span>
                    )}
                  </div>
                  
                  {hasVoted ? (
                    <div className="flex gap-2">
                      <Link 
                        href={`/presentation/${publicToken}/${jury.id}`}
                        target="_blank"
                        className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded text-sm font-bold transition-colors"
                      >
                        Podgląd
                      </Link>
                      <button 
                        onClick={() => handleCopyLink(jury.id)}
                        className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded text-sm font-bold transition-colors w-36 whitespace-nowrap text-center"
                      >
                        {copiedId === jury.id ? "✅ Skopiowano" : "🔗 Kopiuj"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-neutral-600 text-sm font-medium mr-4">
                      Link niedostępny
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

      </main>
    </div>
  );
}