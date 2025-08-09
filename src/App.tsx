
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Download, Upload, Calendar, Filter, Search, Trash, Share2, LogIn, Image as ImageIcon, X } from "lucide-react";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type Statut = "Terminé" | "En cours" | "À venir";
export type Segment = "Builder" | "Commercial" | "Gestion immobilière" | "Dealer";

export type Tache = {
  id: string;
  titre: string;
  segment: Segment;
  statut: Statut;
  date?: string;
  notes?: string;
  image?: string;
};

const SEGMENTS: Segment[] = ["Builder", "Commercial", "Gestion immobilière", "Dealer"];
const STATUTS: Statut[] = ["Terminé", "En cours", "À venir"];

const EXEMPLES: Tache[] = [
  { id: crypto.randomUUID(), titre: "Gala DRHBA – Prix d'Excellence", segment: "Builder", statut: "Terminé", date: "2025-02-01" },
  { id: crypto.randomUUID(), titre: "Sommet du logement BILD (Toronto)", segment: "Builder", statut: "Terminé", date: "2025-02-08" },
  { id: crypto.randomUUID(), titre: "CFAA – Congrès", segment: "Gestion immobilière", statut: "En cours", date: "2025-02-13" },
  { id: crypto.randomUUID(), titre: "WEHBA – Tournoi de golf", segment: "Builder", statut: "À venir", date: "2025-07-15" },
  { id: crypto.randomUUID(), titre: "RBC Canadian Open – invitations", segment: "Commercial", statut: "À venir", date: "2025-08-08" },
  { id: crypto.randomUUID(), titre: "Page dealers – webform", segment: "Dealer", statut: "En cours" },
];

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
  return [value, setValue] as const;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700">{children}</span>;
}
function Button({ children, onClick, primary=false, danger=false, type = "button" as const }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean; type?: "button" | "submit" }) {
  const cls = danger
    ? "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm shadow-sm border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
    : primary
    ? "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm shadow-sm border bg-gray-900 text-white hover:bg-black"
    : "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm shadow-sm border bg-white hover:bg-gray-50";
  return <button type={type} onClick={onClick} className={cls}>{children}</button>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${props.className ?? ""}`} />;
}
function Select({ value, onChange, options }: { value?: string; onChange?: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange?.(e.target.value)} className="w-full rounded-xl border px-3 py-2">
      {options.map((o) => (<option key={o} value={o}>{o}</option>))}
    </select>
  );
}

function SortableCarte({ item, onDelete, onChangeImage }: { item: Tache; onDelete: (id: string) => void; onChangeImage: (id: string, dataUrl?: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  const fileRef = useRef<HTMLInputElement | null>(null);
  function pick() { fileRef.current?.click(); }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onChangeImage(item.id, String(reader.result));
    reader.readAsDataURL(f);
  }
  return (
    <div ref={setNodeRef} style={style} className={`rounded-2xl border bg-white p-3 shadow-sm ${isDragging ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span {...attributes} {...listeners} className="cursor-grab text-gray-400">≡</span>
          <div className="font-medium leading-5">{item.titre}</div>
        </div>
        <div className="flex items-center gap-1">
          <Button onClick={pick}><ImageIcon size={16}/>Changer image</Button>
          {item.image && (<Button danger onClick={() => onChangeImage(item.id, undefined)}><X size={16}/>Retirer</Button>)}
          <input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={onFile} />
          <Button danger onClick={() => onDelete(item.id)}><Trash size={16}/>Suppr.</Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <Badge><Calendar size={14} className="mr-1"/>{item.date || "–"}</Badge>
        <Badge>{item.segment}</Badge>
      </div>
      {item.image && (
        <div className="mt-2 overflow-hidden rounded-xl border">
          {/* Aperçu image */}
          <img src={item.image} alt="aperçu" className="h-32 w-full object-cover" />
        </div>
      )}
      {item.notes && <p className="mt-2 text-sm text-gray-700">{item.notes}</p>}
    </div>
  );
}

function Colonne({ titre, items, onDelete, onChangeImage }: { titre: Statut; items: Tache[]; onDelete: (id: string) => void; onChangeImage: (id: string, dataUrl?: string) => void }) {
  return (
    <div className="flex min-h-[220px] flex-col gap-3 rounded-3xl border bg-[#F8FAFC] p-4">
      <div className="text-sm font-semibold tracking-wide text-gray-700">{titre}</div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed p-6 text-sm text-gray-400">Aucun élément</div>
      ) : (
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-3">
            {items.map((i) => (
              <SortableCarte key={i.id} item={i} onDelete={onDelete} onChangeImage={onChangeImage} />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

function ImageInput({ value, onChange }: { value?: string; onChange: (dataUrl?: string) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  function onPick() { fileRef.current?.click(); }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(f);
  }
  return (
    <div className="flex items-center gap-2">
      <Button onClick={onPick}><ImageIcon size={16}/>Ajouter une image</Button>
      <input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={onFile} />
      {value && (
        <div className="relative">
          <img src={value} alt="aperçu" className="h-12 w-20 rounded object-cover ring-1 ring-gray-200" />
          <button aria-label="Supprimer" onClick={() => onChange(undefined)} className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow ring-1 ring-gray-300"><X size={12}/></button>
        </div>
      )}
    </div>
  );
}

function FormAjout({ onAdd }: { onAdd: (t: Tache) => void }) {
  const [draft, setDraft] = useState<Tache>({ id: crypto.randomUUID(), titre: "", segment: "Builder", statut: "En cours" });

  function submit(e: React.FormEvent) { e.preventDefault(); if (!draft.titre.trim()) return; onAdd(draft); setDraft({ id: crypto.randomUUID(), titre: "", segment: "Builder", statut: "En cours" }); }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-3xl border bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">Ajouter une activité</div>
      <Input placeholder="Titre (ex: BILD Awards)" value={draft.titre} onChange={(e) => setDraft({ ...draft, titre: e.target.value })} />
      <div className="grid grid-cols-3 gap-2 max-[900px]:grid-cols-1">
        <Select value={draft.segment} onChange={(v) => setDraft({ ...draft, segment: v as Segment })} options={SEGMENTS} />
        <Select value={draft.statut} onChange={(v) => setDraft({ ...draft, statut: v as Statut })} options={STATUTS} />
        <Input type="date" value={draft.date ?? ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
      </div>
      <Input placeholder="Notes (facultatif)" value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      <ImageInput value={draft.image} onChange={(img) => setDraft({ ...draft, image: img })} />
      <div className="flex items-center justify-end"><Button primary type="submit"><Plus size={16}/>Ajouter</Button></div>
    </form>
  );
}

function ActionsFichier({ data, exportRef, onImport }: { data: Tache[]; exportRef: React.RefObject<HTMLDivElement>; onImport: (data: Tache[]) => void }) {
  function exporterJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "planning.json"; a.click(); URL.revokeObjectURL(url);
  }
  function importerJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; const fr = new FileReader();
    fr.onload = () => { try { onImport(JSON.parse(String(fr.result)) as Tache[]); } catch { alert("Fichier invalide"); } };
    fr.readAsText(file);
  }
  async function exporterPDF() {
    if (!exportRef.current) return;
    const canvas = await html2canvas(exportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 20, 20, imgWidth, Math.min(imgHeight, pageHeight - 40));
    pdf.save("planning.pdf");
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button primary onClick={exporterJSON}><Download size={16}/>Exporter JSON</Button>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-sm shadow-sm">
        <Upload size={16}/>Importer JSON
        <input type="file" accept="application/json" className="hidden" onChange={importerJSON} />
      </label>
      <Button primary onClick={exporterPDF}><Share2 size={16}/>Exporter PDF</Button>
    </div>
  );
}

export default function App() {
  const [titre, setTitre] = useState("Quarterly Project Update");
  const [periode, setPeriode] = useState("T1 2025");
  const [recherche, setRecherche] = useState("");
  const [filtreSegment, setFiltreSegment] = useState<Segment | "Tous">("Tous");
  const [taches, setTaches] = useLocalStorage<Tache[]>("planning-app-v3", EXEMPLES);
  const boardRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  const affichage = useMemo(() => {
    const q = recherche.toLowerCase();
    return taches.filter(t => (
      (filtreSegment === "Tous" || t.segment === filtreSegment) &&
      (t.titre.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q))
    ));
  }, [taches, filtreSegment, recherche]);

  const parStatut: Record<Statut, Tache[]> = useMemo(() => ({
    "Terminé": affichage.filter(t => t.statut === "Terminé"),
    "En cours": affichage.filter(t => t.statut === "En cours"),
    "À venir": affichage.filter(t => t.statut === "À venir"),
  }), [affichage]);

  function onDelete(id: string) { setTaches(prev => prev.filter(t => t.id !== id)); }
  function onAdd(n: Tache) { setTaches(prev => [n, ...prev]); }
  function setImage(id: string, dataUrl?: string) { setTaches(prev => prev.map(t => t.id === id ? { ...t, image: dataUrl } : t)); }

  function onDragEnd(e: DragEndEvent) {
    const active = e.active; const over = e.over; if (!over || active.id === over.id) return;
    const cols: Statut[] = ["Terminé", "En cours", "À venir"];
    const sourceCol = cols.find(s => parStatut[s].some(t => t.id === active.id));
    const destCol = cols.find(s => parStatut[s].some(t => t.id === over.id));
    if (!sourceCol || !destCol) return;
    const sourceItems = parStatut[sourceCol];
    const destItems = parStatut[destCol];
    const activeIndex = sourceItems.findIndex(i => i.id === active.id);
    const overIndex = destItems.findIndex(i => i.id === over.id);
    setTaches(prev => {
      let copy = prev.slice();
      const moving = copy.find(t => t.id === active.id);
      if (!moving) return prev;
      if (sourceCol === destCol) {
        const ids = sourceItems.map(i => i.id);
        const newOrder = arrayMove(ids, activeIndex, overIndex);
        const reordered = sourceItems.slice().sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
        copy = copy.map(t => (t.statut === sourceCol ? (reordered.find(r => r.id === t.id) || t) : t));
      } else {
        copy = copy.map(t => (t.id === moving.id ? { ...t, statut: destCol } : t));
      }
      return copy;
    });
  }

  const total = affichage.length;
  const termines = parStatut["Terminé"].length;
  const enCours = parStatut["En cours"].length;
  const aVenir = parStatut["À venir"].length;

  return (
    <div className="mx-auto max-w-7xl p-6 bg-[#F3F5F9]">
      <div className="mb-4 flex items-center justify-between rounded-2xl border bg-white px-4 py-2">
        <div className="font-semibold text-[#0F172A]">Planning – Sales & Events</div>
        <button className="inline-flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-sm shadow-sm"><LogIn size={16}/> Connexion (bientôt)</button>
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{titre}</h1>
          <div className="text-gray-600">{periode}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          <Input value={periode} onChange={(e) => setPeriode(e.target.value)} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-3xl border bg-white p-4 shadow-sm md:grid-cols-3">
        <div className="flex items-center gap-2">
          <Search size={16} />
          <Input placeholder="Rechercher un intitulé ou une note…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} />
          <Select value={filtreSegment} onChange={(v) => setFiltreSegment(v as any)} options={["Tous", ...SEGMENTS]} />
        </div>
        <ActionsFichier data={taches} exportRef={boardRef} onImport={(d) => setTaches(d)} />
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div ref={boardRef} className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="md:col-span-1"><FormAjout onAdd={onAdd} /></div>
          <div className="grid gap-3 rounded-3xl border bg-white p-4 shadow-sm md:col-span-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
              <Badge>Total: {total}</Badge>
              <Badge>Terminés: {termines}</Badge>
              <Badge>En cours: {enCours}</Badge>
              <Badge>À venir: {aVenir}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {STATUTS.map((s) => (
                <div key={s} className="space-y-3">
                  <Colonne titre={s} items={parStatut[s]} onDelete={(id) => onDelete(id)} onChangeImage={setImage} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DndContext>

      <div className="mt-8 text-xs text-gray-500">
        <p>Ajouter une image d'aperçu : dans le formulaire à gauche, cliquez sur « Ajouter une image ». L’aperçu s’affichera sur la carte dans le tableau, comme sur votre PDF.</p>
      </div>
    </div>
  );
}
