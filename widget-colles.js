// ======================================================================
// Widget « Mes colles » (app Temps) : les colles de la semaine.
// Quand elles sont toutes passées, il affiche celles de la semaine suivante.
// Données : le fichier temps-widget.json créé par l'app
//   (Temps › Plus › Réglages › Mettre à jour les widgets, puis « Enregistrer dans Fichiers »
//    dans iCloud Drive › Scriptable).
// Taille conseillée : MOYENNE.
// ======================================================================

const BLANC = Color.white()
const CLAIR = new Color("#d0d0d0")
const GRIS = new Color("#9a9a9a")
const SOMBRE = new Color("#5a5a5a")
const BLEU = new Color("#a8d8ff")
const CARTE = new Color("#1c1c1e")

const JOURS_C = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"]
const MOIS_C = ["JAN", "FÉV", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"]

// Heure de Guadeloupe (UTC-4, pas de changement d'heure)
const GP = new Date(Date.now() - 4 * 3600000)
const AUJ = GP.toISOString().slice(0, 10)
const MIN = GP.getUTCHours() * 60 + GP.getUTCMinutes()
const enMin = h => parseInt(h.slice(0, 2)) * 60 + parseInt(h.slice(3, 5))
const dateUTC = iso => new Date(iso + "T12:00:00Z")
function ajouter(iso, n) { const d = dateUTC(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const numJour = iso => (dateUTC(iso).getUTCDay() + 6) % 7   // lundi = 0

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

const finColle = c => c.debut ? enMin(c.debut) + c.duree : 24 * 60
const passee = c => c.date < AUJ || (c.date === AUJ && finColle(c) <= MIN)

function libelleJour(c) {
  if (c.date === AUJ) return "AUJOURD'HUI"
  if (c.date === ajouter(AUJ, 1)) return "DEMAIN"
  const d = dateUTC(c.date)
  return JOURS_C[d.getUTCDay()] + " " + d.getUTCDate() + " " + MOIS_C[d.getUTCMonth()]
}

async function main() {
  const w = new ListWidget()
  w.backgroundColor = Color.black()
  w.setPadding(12, 14, 12, 14)
  w.refreshAfterDate = new Date(Date.now() + 15 * 60000)
  const petit = config.runsInWidget && config.widgetFamily === "small"

  const data = await lireDonnees()
  if (!data) {
    message(w, "Fichier introuvable", "Dans Temps : Plus › Réglages › Mettre à jour les widgets, puis enregistre-le dans iCloud Drive › Scriptable.")
    return w
  }
  const colles = data.colles || []
  const deLaSemaine = lundi => colles.filter(c => c.date >= lundi && c.date < ajouter(lundi, 7))

  // Semaine affichée : celle-ci, ou la prochaine quand tout est passé (ou qu'il n'y a rien)
  const lundi = ajouter(AUJ, -numJour(AUJ))
  let debutSem = lundi
  let sem = deLaSemaine(lundi)
  if (!sem.length || sem.every(passee)) {
    for (let k = 1; k <= 8; k++) {
      const l2 = ajouter(lundi, 7 * k)
      const s2 = deLaSemaine(l2)
      if (s2.length) { debutSem = l2; sem = s2; break }
    }
  }

  const d0 = dateUTC(debutSem)
  const etiquette = debutSem === lundi ? "CETTE SEMAINE"
    : (debutSem === ajouter(lundi, 7) ? "SEMAINE PROCHAINE" : "SEMAINE DU " + d0.getUTCDate() + " " + MOIS_C[d0.getUTCMonth()])
  const entete = w.addText("COLLES · " + etiquette)
  entete.font = Font.boldRoundedSystemFont(11)
  entete.textColor = GRIS
  w.addSpacer(8)

  if (!sem.length) {
    const t = w.addText("Aucune colle prévue")
    t.font = Font.boldRoundedSystemFont(14)
    t.textColor = BLANC
    return w
  }

  let affichees = sem.slice(0, 3)
  if (petit) affichees = [sem.find(c => !passee(c)) || sem[0]]
  const n = affichees.length
  const ligne = w.addStack()
  ligne.spacing = 8
  const largeur = petit ? 120 : Math.floor((300 - 8 * (n - 1)) / n)
  const serre = n === 3

  affichees.forEach(c => {
    const p = passee(c)
    const carte = ligne.addStack()
    carte.layoutVertically()
    carte.backgroundColor = CARTE
    carte.cornerRadius = 12
    carte.setPadding(9, 10, 9, 10)
    carte.size = new Size(largeur, 0)

    const j = carte.addText(libelleJour(c))
    j.font = Font.boldRoundedSystemFont(serre ? 10 : 11)
    j.textColor = p ? SOMBRE : BLEU
    j.lineLimit = 1
    carte.addSpacer(2)

    const h = carte.addText(c.debut ? c.debut + " – " + (function () { const f = finColle(c); return String(Math.floor(f / 60)).padStart(2, "0") + ":" + String(f % 60).padStart(2, "0") })() : "Toute la journée")
    h.font = Font.mediumMonospacedSystemFont(serre ? 9 : 10)
    h.textColor = p ? SOMBRE : GRIS
    h.lineLimit = 1
    carte.addSpacer(5)

    const m = carte.addText(c.matiere)
    m.font = Font.boldRoundedSystemFont(serre ? 12 : 14)
    m.textColor = p ? SOMBRE : BLANC
    m.lineLimit = 2
    m.minimumScaleFactor = 0.7
    carte.addSpacer(3)

    const sous = [c.colleur, c.salle ? "salle " + c.salle : ""].filter(Boolean).join(" · ")
    const s = carte.addText(p ? "✓ passée" : sous)
    s.font = Font.regularRoundedSystemFont(serre ? 9 : 10)
    s.textColor = p ? SOMBRE : GRIS
    s.lineLimit = 2
  })

  if (sem.length > affichees.length && !petit) {
    w.addSpacer(4)
    const plus = w.addText("+ " + (sem.length - affichees.length) + " autre(s) cette semaine")
    plus.font = Font.regularRoundedSystemFont(9)
    plus.textColor = GRIS
  }

  w.addSpacer()
  const age = Date.now() - (data.genere || 0)
  if (age > 7 * 24 * 3600000) {
    const g = new Date(data.genere)
    const pied = w.addText("Données du " + g.getDate() + "/" + (g.getMonth() + 1) + " · mets à jour dans Temps")
    pied.font = Font.regularRoundedSystemFont(8)
    pied.textColor = SOMBRE
  }
  return w
}

const widget = await main()
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
