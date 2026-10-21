# Temps

Ton emploi du temps et ta journée, au même endroit. Noir et blanc, comme tes autres apps.

## Ce que fait l'app

**Jour** — ta journée en blocs, du lever au coucher.
- Les jours de cours, ton emploi du temps s'affiche tout seul : heure de début et de fin, matière, prof, salle (semaines A et B gérées).
- Quand tu as une perm, un trou entre deux cours, ou une longue plage libre : un bloc **Libre** apparaît. Touche-le pour y mettre un bloc.
- Un bloc que tu crées, c'est juste un **nom** + une heure de début et de fin.
- Le samedi, le **DS** apparaît de 7h10 à 11h20 (salle polyvalente), d'après ton tableau. Pendant les vacances, il n'y a ni cours ni DS.
- Le bloc en cours est en blanc (« Maintenant »). Ceux qui sont passés se grisent.
- Les colles et événements sans heure sont rangés en haut, dans « Toute la journée ».
- Touche **Lever** ou **Coucher** pour régler tes heures.
- Dessous : la **to-do** du jour, avec des cases à cocher.

**Options** (en haut de la journée) — **Répéter cette journée** : tes blocs sont copiés sur les jours que tu choisis, pendant 1 à 4 semaines (2 par défaut). Tu peux lui donner un **nom** pour la garder comme **modèle** et la réutiliser plus tard (Options › Appliquer un modèle). Tu vois à l'avance combien de jours seront remplis. Seuls tes blocs sont copiés, pas les cours.

**Le gros +** — ajouter pour **n'importe quel jour** : un bloc, une tâche, un événement (avec ou sans heure) ou une colle.

**Mois** — le calendrier. Les petits signes : ● événement, ■ colle, ○ tâche, ◆ DS. La lettre A ou B à gauche de chaque semaine. Les semaines de vacances sont estompées. Touche un jour pour voir son résumé, puis « Ouvrir la journée ».

**À faire** — toutes tes tâches : en retard, aujourd'hui, demain, plus tard. Une tâche **cochée disparaît à la fin de la journée**. Une tâche non faite reste « en retard » (elle ne disparaît pas sans que tu l'aies décidé).

**Plus**
- *Emploi du temps* : tous les cours, modifiables (ajouter, changer, supprimer, A / B / toutes les semaines).
- *DS et vacances* : une ligne par samedi. Un libellé qui commence par « Vacances » met toute la semaine en vacances.
- *Colles* : ajouter, modifier, effacer les anciennes.
- *Modèles de journée* : appliquer, renommer, supprimer.
- *Réglages* : lever et coucher, inverser les semaines A/B, sauvegarde (exporter / importer), récupérer les colles de Scolarité, tout effacer.

Presque chaque suppression ou grosse modification affiche un bouton **Annuler** pendant quelques secondes.

## Mettre en ligne (GitHub Pages)

1. Sur github.com, crée un **nouveau dépôt** (New repository), par exemple `temps`, public.
2. Clique « uploading an existing file », puis glisse **tout le contenu** du dossier `temps` (les fichiers ET les dossiers `icons`, `tests`) et valide (« Commit changes »).
3. Dans le dépôt : **Settings › Pages › Deploy from a branch › main / (root) › Save**.
4. Après une minute, l'app est à l'adresse `https://TON-COMPTE.github.io/temps/`.
5. Sur iPhone : ouvre cette adresse dans **Safari**, puis **Partager › Sur l'écran d'accueil**. Elle s'ouvre ensuite comme une vraie app, et marche sans réseau.

> Pour une mise à jour : remplace les fichiers modifiés dans le dépôt. Si l'iPhone garde l'ancienne version, ferme complètement l'app et rouvre-la deux fois.

## Tes données

Tout reste dans le navigateur de ton iPhone. Rien n'est envoyé nulle part. Ton emploi du temps et le planning des DS sont **copiés** dans l'app au premier lancement : si tu les modifies, tes changements restent (et « Remettre l'emploi du temps d'origine » les annule).

**Sauvegarde** : Plus › Réglages › Exporter. Ça crée un fichier à garder dans Fichiers ou iCloud ; « Importer » le remet. Fais-le de temps en temps : si tu supprimes les données de Safari pour ce site, ou si tu changes de téléphone, sans fichier tu perds tout.

## Limites (honnêtes)

- **Pas de rappels ni d'alarmes** : une app web sur iPhone ne peut pas te réveiller ni t'envoyer de notification de façon fiable. Pour ça, garde l'app Rappels ou Horloge.
- **Pas de synchronisation** entre appareils : chaque appareil a ses propres données (utilise la sauvegarde pour les déplacer). L'app installée sur l'écran d'accueil et la même adresse ouverte dans Safari n'ont pas non plus les mêmes données.
- **Testée dans un iPhone simulé** (Chromium, écrans 390 × 844 et 320 × 568, tactile) : tous les boutons, la sauvegarde, la reprise, l'hors-ligne. **Pas testée sur un vrai iPhone** : si un détail d'affichage cloche (clavier, sélecteur d'heure, export de fichier), dis-le-moi avec une capture d'écran.
- **L'emploi du temps et le planning des DS viennent de tes deux images** (groupe 2, sans espagnol ni EPS). Vérifie-les une fois. Deux points précis : le **TP d'ITC du jeudi** finit à **15h20** sur ton image, alors que l'app Scolarité avait 14h50 ; et le **cours de physique-chimie du lundi 9h25 (semaine A)** n'a **pas de salle** sur l'image.
- **Les semaines A/B** suivent la même règle que Scolarité (la semaine du 7 septembre 2026 est une semaine A). Si ce n'est pas la bonne chez toi : Réglages › Inverser A et B.
- **Les vacances** : une semaine (lundi–dimanche) est « sans cours » quand le samedi correspondant est marqué « Vacances… » dans le planning des DS. Pour Noël, le tableau donne la reprise le lundi 4 janvier 2027.
- **Le bloc DS** dure toujours de 7h10 à 11h20, même quand le tableau indique un DS de 2 h : le libellé (« SI (2h) / ITC (2h) »…) te dit ce qu'il y a.
- **Récupérer les colles de Scolarité** ne marche que si les deux apps partagent le même espace de stockage (même adresse `…github.io` dans le même navigateur). Sur iPhone, une app installée sur l'écran d'accueil garde souvent son espace à part : dans ce cas, ajoute tes colles à la main. Les colles récupérées durent 1 h par défaut.
- Les tâches cochées disparaissent quand l'app s'ouvre ou est ouverte après minuit : si tu ne l'ouvres pas pendant plusieurs jours, elles disparaissent à l'ouverture suivante.
- Pas de notes ni de graphiques dans Temps : ça reste dans Scolarité.

## Fichiers

```
index.html            la page
styles.css            le style (noir et blanc)
app.js                l'écran : vues, formulaires, sauvegarde
logique.js            ce que l'app « pense » (A/B, vacances, blocs libres, répétition, tâches), sans affichage, testé
donnees.js            ton emploi du temps et le planning des DS (point de départ)
sw.js, manifest…      pour installer l'app et la faire marcher hors ligne
icons/                les icônes
tests/                tests automatiques
```

## Modifier l'emploi du temps « d'origine »

Dans l'app : Plus › Emploi du temps. Pour changer le point de départ (nouvelle année, par exemple), c'est le fichier `donnees.js` : une ligne par cours, et les samedis du planning des DS.

## Lancer les tests (facultatif)

```
node --test tests/test_logique.js     # 40 tests : A/B, vacances, emploi du temps, blocs libres, répétition, tâches, calendrier, données abîmées
python3 tests/e2e.py                  # ~200 vérifications dans un iPhone simulé (Playwright + Chromium)
```
