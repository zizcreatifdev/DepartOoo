import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export interface ResponsableClasse {
  id: string;
  department_id: string;
  group_name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  whatsapp: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  departmentId: string;
  groups: string[];
  responsable: ResponsableClasse | null;
  onSuccess: () => void;
}

const ResponsableFormDialog: React.FC<Props> = ({ open, onOpenChange, departmentId, groups, responsable, onSuccess }) => {
  const [groupName, setGroupName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (responsable) {
      setGroupName(responsable.group_name);
      setFirstName(responsable.first_name);
      setLastName(responsable.last_name);
      setEmail(responsable.email || "");
      setWhatsapp(responsable.whatsapp || "");
    } else {
      setGroupName(groups[0] || "");
      setFirstName("");
      setLastName("");
      setEmail("");
      setWhatsapp("");
    }
  }, [responsable, open, groups]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !groupName) {
      toast.error("Nom, prénom et groupe sont obligatoires");
      return;
    }
    setSaving(true);
    const payload = {
      department_id: departmentId,
      group_name: groupName,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      whatsapp: whatsapp.trim() || null,
    };

    let error;
    if (responsable) {
      ({ error } = await supabase.from("responsables_classe").update(payload).eq("id", responsable.id));
    } else {
      ({ error } = await supabase.from("responsables_classe").insert(payload));
    }
    setSaving(false);

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.error("Un responsable existe déjà pour ce groupe");
      } else {
        toast.error("Erreur : " + error.message);
      }
      return;
    }
    toast.success(responsable ? "Responsable modifié" : "Responsable ajouté");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{responsable ? "Modifier le responsable" : "Ajouter un responsable de classe"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Groupe *</Label>
            <Select value={groupName} onValueChange={setGroupName} disabled={!!responsable}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prénom *</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" />
            </div>
            <div className="space-y-1">
              <Label>Nom *</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="space-y-1">
            <Label>Numéro WhatsApp</Label>
            <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+221 77 123 45 67" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : responsable ? "Modifier" : "Ajouter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResponsableFormDialog;
