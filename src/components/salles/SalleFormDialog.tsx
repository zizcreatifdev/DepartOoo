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
import type { Salle } from "@/pages/salles/SallesPage";
import type { Database } from "@/integrations/supabase/types";

type RoomType = Database["public"]["Enums"]["room_type"];

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  type: z.enum(["amphi", "salle_td", "salle_tp", "laboratoire"] as const),
  capacity: z.coerce.number().min(1, "Capacité minimum 1"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  salle: Salle | null;
  departmentId: string;
  onSuccess: () => void;
}

const SalleFormDialog = ({ open, onOpenChange, salle, departmentId, onSuccess }: Props) => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "salle_td", capacity: 30 },
  });

  useEffect(() => {
    if (salle) {
      form.reset({ name: salle.name, type: salle.type, capacity: salle.capacity });
    } else {
      form.reset({ name: "", type: "salle_td", capacity: 30 });
    }
  }, [salle, open]);

  const onSubmit = async (data: FormData) => {
    if (salle) {
      const { error } = await supabase.from("salles").update({
        name: data.name,
        type: data.type as RoomType,
        capacity: data.capacity,
      }).eq("id", salle.id);
      if (error) { toast.error("Erreur mise à jour"); return; }
      toast.success("Salle modifiée");
    } else {
      const { error } = await supabase.from("salles").insert({
        name: data.name,
        type: data.type as RoomType,
        capacity: data.capacity,
        department_id: departmentId,
      });
      if (error) { toast.error("Erreur création"); return; }
      toast.success("Salle ajoutée");
    }
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{salle ? "Modifier la salle" : "Ajouter une salle"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl><Input placeholder="Ex: Amphi A" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="amphi">Amphi</SelectItem>
                    <SelectItem value="salle_td">Salle TD</SelectItem>
                    <SelectItem value="salle_tp">Salle TP</SelectItem>
                    <SelectItem value="laboratoire">Laboratoire</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="capacity" render={({ field }) => (
              <FormItem>
                <FormLabel>Capacité</FormLabel>
                <FormControl><Input type="number" min={1} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit">{salle ? "Enregistrer" : "Ajouter"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SalleFormDialog;
