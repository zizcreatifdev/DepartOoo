/**
 * ResultatsPromotion.tsx
 * Affiche les résultats calculés de la promotion avec 4 onglets.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle, Ban, Trophy, TrendingUp } from 'lucide-react';
import type { ResultatsPromotion as IResultatsPromotion, ResultatEtudiant } from '@/engine/calcul-notes.engine';

interface Props {
  resultats: IResultatsPromotion;
  sessionLabel: string;
}

// ============================================================
// Badge statut
// ============================================================

function StatutBadge({ statut, compensee }: { statut: ResultatEtudiant['statut']; compensee: boolean }) {
  if (statut === 'admis' && compensee)
    return <Badge className="bg-teal-100 text-teal-800 border-teal-300 text-[10px]">Admis (compensé)</Badge>;
  if (statut === 'admis')
    return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" /> Admis</Badge>;
  if (statut === 'rattrapage')
    return <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] gap-1"><AlertCircle className="h-3 w-3" /> Rattrapage</Badge>;
  if (statut === 'exclu')
    return <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-[10px] gap-1"><Ban className="h-3 w-3" /> Exclu</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] gap-1"><XCircle className="h-3 w-3" /> Ajourné</Badge>;
}

// ============================================================
// Tableau générique
// ============================================================

function TableauEtudiants({
  etudiants,
  showRang = true,
}: {
  etudiants: ResultatEtudiant[];
  showRang?: boolean;
}) {
  if (etudiants.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        Aucun étudiant dans cette catégorie.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showRang && <TableHead className="w-12 text-center text-xs">Rang</TableHead>}
          <TableHead className="text-xs">Matricule</TableHead>
          <TableHead className="text-xs">Nom</TableHead>
          <TableHead className="text-xs">Prénom</TableHead>
          <TableHead className="text-xs">Groupe</TableHead>
          <TableHead className="text-center text-xs font-bold">Moyenne /20</TableHead>
          <TableHead className="text-xs">Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {etudiants.map(e => (
          <TableRow key={e.student_id}>
            {showRang && (
              <TableCell className="text-center text-xs font-medium">
                {e.rang === 1 ? (
                  <span className="text-amber-500 flex items-center justify-center gap-0.5">
                    <Trophy className="h-3 w-3" /> {e.rang}
                  </span>
                ) : e.rang}
              </TableCell>
            )}
            <TableCell className="font-mono text-xs">{e.student_number}</TableCell>
            <TableCell className="font-medium text-sm">{e.last_name}</TableCell>
            <TableCell className="text-sm">{e.first_name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[10px]">{e.group_name}</Badge>
            </TableCell>
            <TableCell className="text-center font-bold">
              {e.moyenne !== null ? (
                <span className={e.moyenne < 10 ? 'text-destructive' : 'text-emerald-600'}>
                  {e.moyenne.toFixed(2)}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <StatutBadge statut={e.statut} compensee={e.compensee} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================================
// Composant principal
// ============================================================

const ResultatsPromotion: React.FC<Props> = ({ resultats, sessionLabel }) => {
  const { stats, admis, ajournes, rattrapage, exclus } = resultats;

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.nb_admis}</p>
            <p className="text-xs text-muted-foreground">Admis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{stats.nb_rattrapage}</p>
            <p className="text-xs text-muted-foreground">Rattrapage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.nb_ajournes}</p>
            <p className="text-xs text-muted-foreground">Ajournés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Barre de réussite + stats résumé */}
      {stats.total > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">Taux de réussite :</span>
                <span className="text-emerald-600 font-bold">{stats.taux_reussite.toFixed(1)}%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-medium">Moyenne promo :</span>
                <span className="font-bold">{stats.moyenne_promo.toFixed(2)} / 20</span>
              </span>
              <Badge variant="outline" className="text-xs">{sessionLabel}</Badge>
            </div>

            <div className="w-full bg-muted rounded-full h-5 overflow-hidden flex text-[10px]">
              {stats.nb_admis > 0 && (
                <div
                  className="bg-emerald-500 h-full flex items-center justify-center text-white font-medium"
                  style={{ width: `${(stats.nb_admis / stats.total) * 100}%` }}
                >
                  {Math.round((stats.nb_admis / stats.total) * 100)}%
                </div>
              )}
              {stats.nb_rattrapage > 0 && (
                <div
                  className="bg-orange-400 h-full flex items-center justify-center text-white font-medium"
                  style={{ width: `${(stats.nb_rattrapage / stats.total) * 100}%` }}
                >
                  {Math.round((stats.nb_rattrapage / stats.total) * 100)}%
                </div>
              )}
              {stats.nb_ajournes > 0 && (
                <div
                  className="bg-red-500 h-full flex items-center justify-center text-white font-medium"
                  style={{ width: `${(stats.nb_ajournes / stats.total) * 100}%` }}
                >
                  {Math.round((stats.nb_ajournes / stats.total) * 100)}%
                </div>
              )}
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Admis</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Rattrapage</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Ajournés</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onglets par statut */}
      <Tabs defaultValue="admis">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="admis" className="text-xs">
            Admis <Badge className="ml-1 bg-emerald-100 text-emerald-800 text-[10px]">{stats.nb_admis}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rattrapage" className="text-xs">
            Rattrapage <Badge className="ml-1 bg-orange-100 text-orange-800 text-[10px]">{stats.nb_rattrapage}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ajournes" className="text-xs">
            Ajournés <Badge className="ml-1 bg-red-100 text-red-800 text-[10px]">{stats.nb_ajournes}</Badge>
          </TabsTrigger>
          <TabsTrigger value="exclus" className="text-xs">
            Exclus <Badge className="ml-1 bg-gray-100 text-gray-700 text-[10px]">{exclus.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admis">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <TableauEtudiants etudiants={admis} showRang />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rattrapage">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <TableauEtudiants etudiants={rattrapage} showRang={false} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ajournes">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <TableauEtudiants etudiants={ajournes} showRang={false} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exclus">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <TableauEtudiants etudiants={exclus} showRang={false} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResultatsPromotion;
