import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Enseignant } from "@/pages/enseignants/EnseignantsPage";

const schema = z.object({
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  type: z.enum(["permanent", "vacataire"] as const),
  quota_hours: z.coerce.number().min(0).default(0),
  allocated_hours: z.coerce.number().min(0).default(0),
  hourly_rate: z.coerce.number().min(0).default(0),
  vacation_start: z.string().optional().or(z.literal("")),
  vacation_end: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  enseignant: Enseignant | null;
  departmentId: string;
  onSuccess: () => void;
}

const EnseignantFormDialog = ({ open, onOpenChange, enseignant, departmentId, onSuccess }: Props) => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      type: "permanent",
      quota_hours: 0,
      allocated_hours: 0,
      hourly_rate: 0,
      vacation_start: "",
      vacation_end: "",
    },
  });

  const watchType = form.watch("type");

  useEffect(() => {
    if (enseignant) {
      form.reset({
        first_name: enseignant.first_name,
        last_name: enseignant.last_name,
        email: enseignant.email,
        type: enseignant.type,
        quota_hours: enseignant.quota_hours,
        allocated_hours: enseignant.allocated_hours,
        hourly_rate: enseignant.hourly_rate,
        vacation_start: enseignant.vacation_start || "",
        vacation_end: enseignant.vacation_end || "",
      });
    } else {
      form.reset({
        first_name: "",
        last_name: "",
        email: "",
        type: "permanent",
        quota_hours: 0,
        allocated_hours: 0,
        hourly_rate: 0,
        vacation_start: "",
        vacation_end: "",
      });
    }
  }, [enseignant, open]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      type: data.type as "permanent" | "vacataire",
      quota_hours: data.type === "permanent" ? data.quota_hours : 0,
      allocated_hours: data.type === "vacataire" ? data.allocated_hours : 0,
      hourly_rate: data.type === "vacataire" ? data.hourly_rate : 0,
      vacation_start: data.type === "vacataire" && data.vacation_start ? data.vacation_start : null,
      vacation_end: data.type === "vacataire" && data.vacation_end ? data.vacation_end : null,
    };

    if (enseignant) {
      const { error } = await supabase.from("enseignants").update(payload).eq("id", enseignant.id);
      if (error) { toast.error("Erreur mise à jour"); return; }
      toast.success("Enseignant modifié");
    } else {
      const { error } = await supabase.from("enseignants").insert({
        ...payload,
        department_id: departmentId,
      });
      if (error) { toast.error("Erreur création"); return; }
      toast.success("Enseignant ajouté");
    }
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{enseignant ? "Modifier l'enseignant" : "Ajouter un enseignant"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="last_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl><Input placeholder="Nom" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="first_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl><Input placeholder="Prénom" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="email@univ.dz" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="vacataire">Vacataire</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {watchType === "permanent" && (
              <FormField control={form.control} name="quota_hours" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quota d'heures statutaires</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {watchType === "vacataire" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="allocated_hours" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heures allouées</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="hourly_rate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taux horaire (DA)</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="vacation_start" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Début vacation</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vacation_end" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin vacation</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit">{enseignant ? "Enregistrer" : "Ajouter"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EnseignantFormDialog;
