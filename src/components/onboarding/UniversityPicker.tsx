/**
 * UniversityPicker
 * Composant de recherche floue (Fuse.js) parmi les universités existantes.
 * Si aucun résultat → formulaire inline pour créer une nouvelle université.
 */
import { useState, useEffect, useRef } from "react";
import { Building2, Search, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  University,
  searchUniversities,
  createUniversity,
} from "@/services/universities.service";

interface Props {
  value: University | null;
  onChange: (u: University | null) => void;
}

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 Mo

const UniversityPicker: React.FC<Props> = ({ value, onChange }) => {
  const [query, setQuery]                       = useState("");
  const [results, setResults]                   = useState<University[]>([]);
  const [allUniversities, setAllUniversities]   = useState<University[]>([]);
  const [showDropdown, setShowDropdown]         = useState(false);
  const [showCreateForm, setShowCreateForm]     = useState(false);

  // Formulaire de création
  const [createName, setCreateName]             = useState("");
  const [createShortName, setCreateShortName]   = useState("");
  const [createCity, setCreateCity]             = useState("");
  const [createLogoFile, setCreateLogoFile]     = useState<File | null>(null);
  const [createLogoPreview, setCreateLogoPreview] = useState<string | null>(null);
  const [creating, setCreating]                 = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Chargement initial ──────────────────────────────────────
  useEffect(() => {
    searchUniversities("").then((all) => {
      setAllUniversities(all);
      setResults(all.slice(0, 8));
    }).catch(() => {});
  }, []);

  // ── Filtrage Fuse.js à chaque frappe ───────────────────────
  useEffect(() => {
    if (!query.trim()) {
      setResults(allUniversities.slice(0, 8));
      setShowCreateForm(false);
      return;
    }
    searchUniversities(query).then((res) => {
      setResults(res);
      setShowCreateForm(res.length === 0);
      // Pré-remplir le nom de création avec la requête
      if (res.length === 0) setCreateName(query);
    });
  }, [query, allUniversities]);

  // ── Fermer au clic extérieur ────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (u: University) => {
    onChange(u);
    setQuery("");
    setShowDropdown(false);
    setShowCreateForm(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setShowDropdown(false);
    setShowCreateForm(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_SIZE) {
      toast.error("Logo trop lourd (maximum 2 Mo).");
      return;
    }
    setCreateLogoFile(file);
    setCreateLogoPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error("Le nom de l'université est requis.");
      return;
    }
    setCreating(true);
    try {
      const u = await createUniversity({
        name:       createName.trim(),
        short_name: createShortName.trim() || undefined,
        city:       createCity.trim()       || undefined,
        logo_file:  createLogoFile          ?? undefined,
      });
      toast.success("Université créée — elle sera vérifiée par l'équipe Departo.");
      onChange(u);
      setShowDropdown(false);
      setShowCreateForm(false);
    } catch (err: any) {
      toast.error("Erreur lors de la création : " + err.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Université déjà sélectionnée → carte ───────────────────
  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
        {value.logo_url ? (
          <img
            src={value.logo_url}
            alt={value.name}
            className="h-8 w-8 rounded object-contain shrink-0"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{value.name}</p>
          {value.short_name && (
            <p className="text-xs text-muted-foreground">{value.short_name}</p>
          )}
        </div>
        {value.statut === "officielle" && (
          <Badge variant="outline" className="shrink-0 text-[10px] text-green-600 border-green-300">
            Officielle
          </Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="shrink-0 text-muted-foreground"
        >
          Changer
        </Button>
      </div>
    );
  }

  // ── Champ de recherche + dropdown ──────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9 pr-8"
          placeholder="Recherchez votre université..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setShowDropdown(false); setShowCreateForm(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">

          {/* Liste des résultats */}
          {results.length > 0 && (
            <ul className="max-h-56 overflow-y-auto py-1">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(u)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    {u.logo_url ? (
                      <img
                        src={u.logo_url}
                        alt={u.name}
                        className="h-8 w-8 rounded object-contain shrink-0"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{u.name}</span>
                      {u.short_name && (
                        <span className="text-xs text-muted-foreground">{u.short_name}</span>
                      )}
                    </span>
                    {u.statut === "officielle" && (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px] text-green-600 border-green-300"
                      >
                        Officielle
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Aucun résultat → formulaire de création inline */}
          {showCreateForm && query.trim() && (
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Aucune université trouvée pour{" "}
                <span className="font-medium text-foreground">"{query}"</span>
              </p>

              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <p className="text-sm font-medium">Créer une nouvelle université</p>

                <div className="space-y-1.5">
                  <Label className="text-xs">Nom complet *</Label>
                  <Input
                    placeholder="Ex: Université de Lomé"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sigle (optionnel)</Label>
                    <Input
                      placeholder="Ex: UL"
                      value={createShortName}
                      onChange={(e) => setCreateShortName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ville (optionnel)</Label>
                    <Input
                      placeholder="Ex: Lomé"
                      value={createCity}
                      onChange={(e) => setCreateCity(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Upload logo */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Logo (PNG / JPG / SVG, max 2 Mo)</Label>
                  <div className="flex items-center gap-2">
                    {createLogoPreview && (
                      <img
                        src={createLogoPreview}
                        alt="Aperçu logo"
                        className="h-10 w-10 rounded border object-contain"
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs"
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      {createLogoPreview ? "Changer le logo" : "Ajouter le logo"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreate}
                  disabled={creating || !createName.trim()}
                  className="w-full h-8 text-xs"
                >
                  {creating
                    ? "Création en cours..."
                    : `+ Créer "${createName || query}" comme nouvelle université`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UniversityPicker;
