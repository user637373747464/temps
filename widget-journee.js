// ======================================================================
// Widget « Ma journée » (app Temps) : emploi du temps du jour + to-do à côté
// Données : le fichier temps-widget.json créé par l'app
//   (Temps › Plus › Réglages › Mettre à jour les widgets, puis « Enregistrer dans Fichiers »
//    dans iCloud Drive › Scriptable).
// Taille conseillée : GRANDE. En moyenne, il montre la suite de la journée.
// ======================================================================

const BLANC = Color.white()
const CLAIR = new Color("#d0d0d0")
const GRIS = new Color("#9a9a9a")
const SOMBRE = new Color("#5a5a5a")
const BLEU = new Color("#a8d8ff")

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]

// Heure de Guadeloupe (UTC-4, pas de changement d'heure)
const GP = new Date(Date.now() - 4 * 3600000)
const AUJ = GP.toISOString().slice(0, 10)
const MIN = GP.getUTCHours() * 60 + GP.getUTCMinutes()
const enMin = h => parseInt(h.slice(0, 2)) * 60 + parseInt(h.slice(3, 5))

// Cherche le fichier temps-widget*.json le plus récent dans iCloud Drive › Scriptable
async function lireDonnees() {
  try {
    const fm = FileManager.iCloud()
    const dossier = fm.documentsDirectory()
    const noms = fm.listContents(dossier)
      .filter(n => /temps-widget.*\.json(\.icloud)?$/i.test(n))
      .map(n => n.replace(/^\./, "").replace(/\.icloud$/, ""))
    let meilleur = null
    for (const n of Array.from(new Set(noms))) {
      const p = fm.joinPath(dossier, n)
      try { await fm.downloadFileFromiCloud(p) } catch (e) { /* déjà là */ }
      const date = fm.modificationDate(p)
      if (!meilleur || date > meilleur.date) meilleur = { p: p, date: date }
    }
    if (!meilleur) return null
    return JSON.parse(fm.readString(meilleur.p))
  } catch (e) {
    return null
  }
}

function message(w, titre, detail) {
  const t = w.addText(titre)
  t.font = Font.boldRoundedSystemFont(14)
  t.textColor = BLANC
  w.addSpacer(6)
  const d = w.addText(detail)
  d.font = Font.mediumRoundedSystemFont(11)
  d.textColor = GRIS
}

async function main() {
  const w = new ListWidget()
  w.backgroundColor = Color.black()
  w.setPadding(12, 14, 10, 14)
  w.refreshAfterDate = new Date(Date.now() + 15 * 60000)
  const grand = !config.runsInWidget || config.widgetFamily === "large" || config.widgetFamily === "extraLarge"

  const data = await lireDonnees()
  const jour = data && data.jours ? data.jours[AUJ] : null
  if (!data) {
    message(w, "Fichier introuvable", "Dans Temps : Plus › Réglages › Mettre à jour les widgets, puis enregistre-le dans iCloud Drive › Scriptable.")
    return w
  }
  if (!jour) {
    message(w, "Données trop anciennes", "Ouvre Temps › Plus › Réglages › Mettre à jour les widgets.")
    return w
  }

  // En-tête
  const dd = new Date(AUJ + "T12:00:00Z")
  const entete = w.addStack()
  entete.centerAlignContent()
  const titre = entete.addText((JOURS[dd.getUTCDay()] + " " + dd.getUTCDate() + " " + MOIS[dd.getUTCMonth()]).toUpperCase())
  titre.font = Font.boldRoundedSystemFont(12)
  titre.textColor = BLANC
  entete.addSpacer()
  const sous = entete.addText(jour.periode === "vacances" ? String(jour.vacances || "Vacances").toUpperCase() : (jour.periode === "cours" ? "SEMAINE " + jour.semaine : ""))
  sous.font = Font.mediumRoundedSystemFont(10)
  sous.textColor = GRIS
  w.addSpacer(8)

  const corps = w.addStack()
  corps.topAlignContent()

  // ---- Colonne de gauche : l'emploi du temps ----
  const gauche = corps.addStack()
  gauche.layoutVertically()
  gauche.size = new Size(178, 0)

  ;(jour.journee || []).forEach(x => {
    const t = gauche.addText((x.kind === "colle" ? "Colle · " : "") + x.titre)
    t.font = Font.mediumRoundedSystemFont(10)
    t.textColor = BLEU
    t.lineLimit = 1
    gauche.addSpacer(3)
  })

  const items = jour.items || []
  let premier = 0
  if (!grand) {
    premier = items.findIndex(i => enMin(i.fin) > MIN)
    if (premier < 0) premier = items.length
  }
  const visibles = items.slice(premier, premier + (grand ? 14 : 6))
  if (!visibles.length) {
    const t = gauche.addText(items.length ? "Journée terminée" : "Rien de prévu")
    t.font = Font.mediumRoundedSystemFont(11)
    t.textColor = GRIS
  }
  visibles.forEach(it => {
    const passe = enMin(it.fin) <= MIN
    const courant = !passe && enMin(it.debut) <= MIN
    const special = it.kind === "colle" || it.kind === "ds"
    const couleur = passe ? SOMBRE : (special ? BLEU : (courant ? BLANC : CLAIR))
    const ligne = gauche.addStack()
    ligne.centerAlignContent()
    ligne.spacing = 5
    const h = ligne.addText(it.debut)
    h.font = Font.mediumMonospacedSystemFont(10)
    h.textColor = passe ? SOMBRE : GRIS
    let nom = it.titre
    if (it.kind === "colle") nom = "Colle " + nom
    if (it.kind === "ds") nom = "DS" + (it.detail ? " · " + it.detail : "")
    const t = ligne.addText(nom)
    t.font = courant ? Font.boldRoundedSystemFont(11) : Font.mediumRoundedSystemFont(11)
    t.textColor = couleur
    t.lineLimit = 1
    t.minimumScaleFactor = 0.7
    if (it.salle && it.salle.length <= 6 && it.kind !== "bloc") {
      const s = ligne.addText(it.salle)
      s.font = Font.regularRoundedSystemFont(9)
      s.textColor = passe ? SOMBRE : GRIS
      s.lineLimit = 1
    }
    gauche.addSpacer(3)
  })

  corps.addSpacer(10)

  // ---- Colonne de droite : la to-do ----
  const droite = corps.addStack()
  droite.layoutVertically()
  droite.size = new Size(112, 0)
  const th = droite.addText("À FAIRE")
  th.font = Font.boldRoundedSystemFont(10)
  th.textColor = GRIS
  droite.addSpacer(4)

  const taches = data.taches || []
  const retard = taches.filter(t => !t.fait && t.date < AUJ)
  const duJour = taches.filter(t => t.date === AUJ)
  const lignes = retard.map(t => ({ t: t, etat: "retard" }))
    .concat(duJour.filter(t => !t.fait).map(t => ({ t: t, etat: "afaire" })))
    .concat(duJour.filter(t => t.fait).map(t => ({ t: t, etat: "fait" })))
  const maxT = grand ? 10 : 5
  if (!lignes.length) {
    const t = droite.addText("Rien à faire")
    t.font = Font.mediumRoundedSystemFont(11)
    t.textColor = GRIS
  }
  lignes.slice(0, maxT).forEach(l => {
    const sym = l.etat === "fait" ? "✓ " : (l.etat === "retard" ? "! " : "○ ")
    const t = droite.addText(sym + l.t.texte)
    t.font = Font.mediumRoundedSystemFont(11)
    t.textColor = l.etat === "fait" ? SOMBRE : (l.etat === "retard" ? BLEU : BLANC)
    t.lineLimit = 2
    droite.addSpacer(3)
  })
  if (lignes.length > maxT) {
    const t = droite.addText("+ " + (lignes.length - maxT) + " autres")
    t.font = Font.regularRoundedSystemFont(10)
    t.textColor = GRIS
  }

  // ---- Pied : prévenir si le fichier est vieux ----
  w.addSpacer()
  const age = Date.now() - (data.genere || 0)
  if (age > 24 * 3600000) {
    const g = new Date(data.genere)
    const p = w.addText("Données du " + g.getDate() + "/" + (g.getMonth() + 1) + " · mets à jour dans Temps")
    p.font = Font.regularRoundedSystemFont(8)
    p.textColor = SOMBRE
  }
  return w
}

const widget = await main()
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentLarge()
}
Script.complete()
