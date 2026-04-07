"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Scoreboard, Participant } from "@/types";
import Link from "next/link";
import Flag from "@/components/Flag";
import { countries } from "@/lib/countries";

export default function ParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [hasVotes, setHasVotes] = useState(false);

  // Stany dodawania
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [name, setName] = useState("");

  // Stany edycji
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSearchQuery, setEditSearchQuery] = useState("");
  const [editSelectedCode, setEditSelectedCode] = useState("");
  const [editShowDropdown, setEditShowDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const editDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/scoreboards")
      .then((res) => res.json())
      .then((data: Scoreboard[]) => {
        const found = data.find((s) => s.id === params.id);
        if (found) {
          setScoreboard(found);
          setParticipants(found.participants || []);
          const votesExist = found.juries?.some(j => Object.keys(j.votes || {}).length > 0);
          setHasVotes(votesExist);
        } else {
          router.push("/");
        }
      });
  }, [params.id, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false);
      if (editDropdownRef.current && !editDropdownRef.current.contains(event.target as Node)) setEditShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = (query: string) => countries.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleAdd = () => {
    const finalName = name.trim() || searchQuery.trim();
    if (!finalName) return alert("Podaj nazwę uczestnika!");
    let finalCode = selectedCode;
    if (!finalCode) {
      const match = countries.find(c => c.name.toLowerCase() === searchQuery.trim().toLowerCase());
      finalCode = match ? match.code : "UN";
    }
    const newParticipant: Participant = { id: crypto.randomUUID(), flagCode: finalCode, name: finalName };
    setParticipants([...participants, newParticipant]);
    setSearchQuery(""); setSelectedCode(""); setName("");
  };

  const handleStartEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditName(p.name);
    const country = countries.find(c => c.code === p.flagCode);
    setEditSearchQuery(country ? country.name : p.name);
    setEditSelectedCode(p.flagCode);
  };

  const handleSaveEdit = (id: string) => {
    let finalCode = editSelectedCode;
    if (!finalCode) {
      const match = countries.find(c => c.name.toLowerCase() === editSearchQuery.trim().toLowerCase());
      finalCode = match ? match.code : "UN";
    }
    setParticipants(participants.map(p => p.id === id ? { ...p, name: editName, flagCode: finalCode } : p));
    setEditingId(null);
  };

  const handleRemove = (idToRemove: string) => {
    if (hasVotes) return;
    setParticipants(participants.filter(p => p.id !== idToRemove));
  };

  const handleSave = async () => {
    if (!scoreboard) return;
    const updatedScoreboard = { ...scoreboard, participants };
    await fetch("/api/scoreboards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedScoreboard) });
    router.push(`/scoreboard/${scoreboard.id}`);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center border-b border-neutral-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-orange-500">Edycja uczestników</h1>
          <p className="text-neutral-400">{scoreboard?.title}</p>
        </div>
        <div className="space-x-4">
          <Link href={`/scoreboard/${scoreboard?.id}`} className="text-neutral-400 hover:text-white transition-colors">Anuluj</Link>
          <button onClick={handleSave} className="bg-orange-600 hover:bg-orange-500 px-6 py-2 rounded font-bold transition-colors">Zapisz zmiany</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 h-fit">
          <h2 className="text-lg font-bold mb-4 border-b border-neutral-700 pb-2">Dodaj nowego</h2>
          <div className="mb-4 relative" ref={dropdownRef}>
            <label className="block mb-1 text-sm text-neutral-400">Państwo / Flaga</label>
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setSelectedCode(""); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white text-sm focus:outline-none focus:border-orange-500" placeholder="np. Poland..." autoComplete="off" />
            {showDropdown && searchQuery.trim() !== "" && (
              <ul className="absolute w-full bg-neutral-700 border border-neutral-600 rounded mt-1 max-h-48 overflow-y-auto z-10 shadow-2xl">
                {filteredCountries(searchQuery).map((c, i) => (
                  <li key={i} onClick={() => { setSearchQuery(c.name); setSelectedCode(c.code); setShowDropdown(false); }} className="p-2 hover:bg-orange-600 cursor-pointer flex items-center gap-3 transition-colors text-sm"><Flag code={c.code} /> {c.name}</li>
                ))}
              </ul>
            )}
          </div>
          <label className="block mb-1 text-sm text-neutral-400">Uczestnik / Piosenka</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 mb-6 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-neutral-600" placeholder="Zostaw puste, by skopiować państwo" />
          <button onClick={handleAdd} className="w-full bg-neutral-700 hover:bg-neutral-600 py-2 rounded font-bold transition-colors">Dodaj do listy</button>
        </div>

        <div className="md:col-span-2 bg-neutral-800 p-6 rounded-lg border border-neutral-700">
          <h2 className="text-lg font-bold mb-2 border-b border-neutral-700 pb-2">Lista ({participants.length})</h2>
          {hasVotes && <p className="text-xs text-orange-400 mb-4 italic">⚠️ Blokada usuwania: w systemie są już głosy.</p>}
          <ul className="space-y-2">
            {participants.map((p, index) => (
              <li key={p.id} className="bg-neutral-900 p-3 rounded border border-neutral-700">
                {editingId === p.id ? (
                  <div className="space-y-3" ref={editDropdownRef}>
                    <div className="relative">
                      <input type="text" value={editSearchQuery} onChange={(e) => { setEditSearchQuery(e.target.value); setEditSelectedCode(""); setEditShowDropdown(true); }} className="w-full bg-neutral-800 border border-neutral-600 rounded p-2 text-white text-sm" autoComplete="off" />
                      {editShowDropdown && (
                        <ul className="absolute w-full bg-neutral-700 border border-neutral-600 rounded mt-1 max-h-32 overflow-y-auto z-20 shadow-xl">
                          {filteredCountries(editSearchQuery).map((c, i) => (
                            <li key={i} onClick={() => { setEditSearchQuery(c.name); setEditSelectedCode(c.code); setEditShowDropdown(false); }} className="p-2 hover:bg-orange-600 cursor-pointer flex items-center gap-2 text-xs"><Flag code={c.code} /> {c.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-neutral-800 border border-neutral-600 rounded p-2 text-white text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(p.id)} className="text-xs bg-green-700 px-3 py-1 rounded">OK</button>
                      <button onClick={() => setEditingId(null)} className="text-xs bg-neutral-700 px-3 py-1 rounded">Anuluj</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => handleStartEdit(p)}>
                      <span className="text-neutral-500 font-mono w-6 text-right text-xs">{index + 1}.</span>
                      <Flag code={p.flagCode} />
                      <span className="font-medium group-hover:text-orange-400 transition-colors">{p.name}</span>
                    </div>
                    {!hasVotes && <button onClick={() => handleRemove(p.id)} className="text-red-500 hover:text-red-400 px-2 font-bold">✕</button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}