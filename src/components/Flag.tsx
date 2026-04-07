"use client";

export default function Flag({ code }: { code: string }) {
  const cleanCode = code.trim().toLowerCase();

  // Domyślna flaga "Brak/Nieznana"
  if (!cleanCode || cleanCode === "un") {
    return (
      <div 
        className="bg-neutral-600 flex items-center justify-center text-[10px] text-white font-bold rounded border border-neutral-700" 
        style={{ width: '32px', height: '22px', minWidth: '32px' }}
      >
        ?
      </div>
    );
  }

  // Flagi oficjalne (2-literowe, np. pl, se, us) pobierane z sieci
  if (cleanCode.length === 2) {
    return (
      <img
        src={`https://flagcdn.com/w40/${cleanCode}.png`}
        alt={`Flaga ${cleanCode}`}
        className="rounded object-cover shadow-sm border border-neutral-700/50"
        style={{ width: '32px', height: '22px', minWidth: '32px' }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // Flagi historyczne/niestandardowe (3-literowe, np. yug) pobierane z dysku
  return (
    <img
      src={`/custom-flags/${cleanCode}.png`}
      alt={`Custom flaga ${cleanCode}`}
      className="rounded object-cover shadow-sm border border-neutral-700/50 bg-neutral-800"
      style={{ width: '32px', height: '22px', minWidth: '32px' }}
      onError={(e) => {
        // Zastępstwo, gdy zapomnisz wgrać pliku na dysk
        (e.target as HTMLImageElement).src = `https://via.placeholder.com/32x22/525252/FFFFFF?text=${cleanCode.toUpperCase()}`;
      }}
    />
  );
}