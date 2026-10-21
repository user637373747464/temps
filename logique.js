/* logique.js — tout ce que l'app « Temps » pense, sans rien afficher (testé sous Node : tests/test_logique.js).
 * Chargé dans le navigateur, tout est dans l'objet global  Temps.
 * Les dates sont des textes « AAAA-MM-JJ », les heures des textes « HH:MM ». */
(function (racine, fabrique) {
  if (typeof module === 'object' && module.exports) module.exports = fabrique(require('./donnees.js'));
  else racine.Temps = fabrique(racine.Donnees);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  var JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MIN_VIDE = 15;          // un trou plus court qu'un quart d'heure n'est pas affiché
  var VERSION_DONNEES = 1;

  /* ------------------------------------------------------------------ */
  /* 1. Heures                                                           */
  /* ------------------------------------------------------------------ */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function enMin(h) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(typeof h === 'string' ? h.trim() : '');
    if (!m) return NaN;
    var a = +m[1], b = +m[2];
    return a > 23 || b > 59 ? NaN : a * 60 + b;
  }
  function enHeure(min) {
    min = Math.max(0, Math.min(1439, Math.round(min)));
    return pad(Math.floor(min / 60)) + ':' + pad(min % 60);
  }
  function heureValide(h) { return !isNaN(enMin(h)); }
  function fmtDuree(min) {
    min = Math.round(min);
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + pad(m) : '');
  }

  /* ------------------------------------------------------------------ */
  /* 2. Dates                                                            */
  /* ------------------------------------------------------------------ */
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dateDe(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0); }   // midi : à l'abri des changements d'heure
  function dateValide(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(dateDe(s)) === s; }
  function ajouterJours(s, n) { var d = dateDe(s); d.setDate(d.getDate() + n); return iso(d); }
  function ecartJours(a, b) { return Math.round((dateDe(b) - dateDe(a)) / 86400000); }
  function jourSemaine(s) { return (dateDe(s).getDay() + 6) % 7; }       // 0 lundi … 6 dimanche
  function lundiDe(s) { return ajouterJours(s, -jourSemaine(s)); }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function libelleLong(s) { var d = dateDe(s); return cap(JOURS[jourSemaine(s)]) + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]; }
  var MOIS_ABR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function libelleCourt(s) { var d = dateDe(s); return JOURS[jourSemaine(s)].slice(0, 3) + '. ' + d.getDate() + ' ' + MOIS_ABR[d.getMonth()]; }
  function libelleMois(annee, mois) { return cap(MOIS[mois - 1]) + ' ' + annee; }

  // Semaine A ou B (le lundi d'ancrage est une semaine A ; flip = 1 inverse tout)
  function semaineAB(s, flip) {
    var n = Math.floor(ecartJours(D.ANCRE_AB, lundiDe(s)) / 7);
    return ((((n + (flip ? 1 : 0)) % 2) + 2) % 2) === 0 ? 'A' : 'B';
  }

  // 'cours' | 'vacances' | 'hors' (hors du planning de l'année). Une semaine (lundi–samedi) est en vacances
  // quand son samedi est marqué « Vacances … » dans le planning des DS.
  function samediDe(s) { return ajouterJours(lundiDe(s), 5); }
  function periode(s, ds) {
    var sam = samediDe(s);
    if (!ds || !Object.prototype.hasOwnProperty.call(ds, sam)) return 'hors';
    return /^Vacances/i.test(ds[sam]) ? 'vacances' : 'cours';
  }
  function nomVacances(s, ds) { return periode(s, ds) === 'vacances' ? ds[samediDe(s)] : ''; }
  // Texte du DS du jour (le samedi d'une semaine de cours), sinon null
  function dsDuJour(s, ds) {
    if (jourSemaine(s) !== 5 || periode(s, ds) !== 'cours') return null;
    var l = String(ds[s] || '').trim();
    return !l || /^Pas de DS/i.test(l) ? null : l;
  }

  /* ------------------------------------------------------------------ */
  /* 3. Données                                                          */
  /* ------------------------------------------------------------------ */
  var compteur = 0;
  function nouvelId() { compteur++; return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + compteur.toString(36); }
  function texte(v, max) { return typeof v === 'string' ? v.trim().slice(0, max || 200) : ''; }
  function hh(v) { return heureValide(v) ? enHeure(enMin(v)) : ''; }
  function copie(o) { return JSON.parse(JSON.stringify(o)); }

  function parDefaut() {
    return { v: VERSION_DONNEES, prefs: { lever: '05:00', coucher: '21:30', flip: 0 },
             edt: copie(D.EDT), ds: copie(D.DS), blocs: {}, modeles: [], colles: [], events: [], taches: [] };
  }

  function normBloc(b) {
    if (!b || typeof b !== 'object') return null;
    var nom = texte(b.nom, 60), d = hh(b.debut), f = hh(b.fin);
    if (!nom || !d || !f || enMin(d) >= enMin(f)) return null;
    return { id: texte(b.id, 40) || nouvelId(), nom: nom, debut: d, fin: f };
  }
  function normCours(c) {
    if (!c || typeof c !== 'object') return null;
    var matiere = texte(c.matiere, 60), d = hh(c.debut), f = hh(c.fin), j = +c.jour;
    if (!matiere || !d || !f || enMin(d) >= enMin(f) || !(j >= 0 && j <= 5) || j !== Math.floor(j)) return null;
    return { id: texte(c.id, 40) || nouvelId(), jour: j, debut: d, fin: f, matiere: matiere, prof: texte(c.prof, 60), salle: texte(c.salle, 40),
             semaine: c.semaine === 'A' || c.semaine === 'B' ? c.semaine : 'AB' };
  }
  function normColle(c) {
    if (!c || typeof c !== 'object' || !dateValide(c.date)) return null;
    var matiere = texte(c.matiere, 60); if (!matiere) return null;
    var duree = Math.round(+c.duree); if (!(duree >= 5 && duree <= 300)) duree = 60;
    return { id: texte(c.id, 40) || nouvelId(), date: c.date, debut: hh(c.debut), duree: duree, matiere: matiere, colleur: texte(c.colleur, 60), salle: texte(c.salle, 40) };
  }
  function normEvent(e) {
    if (!e || typeof e !== 'object' || !dateValide(e.date)) return null;
    var titre = texte(e.titre, 80); if (!titre) return null;
    var d = hh(e.debut), f = hh(e.fin);
    if (!d) f = '';
    else if (!f || enMin(f) <= enMin(d)) f = enHeure(Math.min(enMin(d) + 60, 1439));
    return { id: texte(e.id, 40) || nouvelId(), date: e.date, titre: titre, debut: d, fin: f };
  }
  function normTache(t) {
    if (!t || typeof t !== 'object' || !dateValide(t.date)) return null;
    var tx = texte(t.texte, 120); if (!tx) return null;
    return { id: texte(t.id, 40) || nouvelId(), date: t.date, texte: tx, fait: !!t.fait };
  }
  function normModele(m) {
    if (!m || typeof m !== 'object') return null;
    var nom = texte(m.nom, 40), blocs = (Array.isArray(m.blocs) ? m.blocs : []).map(function (b) {
      var x = normBloc(b); return x ? { nom: x.nom, debut: x.debut, fin: x.fin } : null;
    }).filter(Boolean);
    if (!nom || !blocs.length) return null;
    return { id: texte(m.id, 40) || nouvelId(), nom: nom, blocs: blocs };
  }

  // Remet n'importe quoi (fichier abîmé, ancienne version…) dans une forme sûre.
  function normaliser(o) {
    var d = parDefaut();
    if (!o || typeof o !== 'object') return d;
    var p = o.prefs && typeof o.prefs === 'object' ? o.prefs : {};
    var lever = hh(p.lever), coucher = hh(p.coucher);
    if (lever && coucher && enMin(lever) < enMin(coucher)) { d.prefs.lever = lever; d.prefs.coucher = coucher; }
    d.prefs.flip = p.flip ? 1 : 0;
    if (Array.isArray(o.edt)) d.edt = o.edt.map(normCours).filter(Boolean);
    if (o.ds && typeof o.ds === 'object' && !Array.isArray(o.ds)) {
      d.ds = {};
      Object.keys(o.ds).forEach(function (k) { if (dateValide(k) && typeof o.ds[k] === 'string') d.ds[k] = o.ds[k].trim().slice(0, 100); });
    }
    if (o.blocs && typeof o.blocs === 'object' && !Array.isArray(o.blocs)) {
      Object.keys(o.blocs).forEach(function (k) {
        if (!dateValide(k) || !Array.isArray(o.blocs[k])) return;
        var l = o.blocs[k].map(normBloc).filter(Boolean);
        if (l.length) d.blocs[k] = l;
      });
    }
    if (Array.isArray(o.modeles)) d.modeles = o.modeles.map(normModele).filter(Boolean);
    if (Array.isArray(o.colles)) d.colles = o.colles.map(normColle).filter(Boolean);
    if (Array.isArray(o.events)) d.events = o.events.map(normEvent).filter(Boolean);
    if (Array.isArray(o.taches)) d.taches = o.taches.map(normTache).filter(Boolean);
    return d;
  }

  function exporter(data, maintenant) {
    return JSON.stringify({ app: 'temps', version: VERSION_DONNEES, exporte: maintenant || Date.now(), data: data });
  }
  function lireSauvegarde(txt) {
    var o;
    try { o = JSON.parse(txt); } catch (e) { return { ok: false, erreur: 'Ce fichier n’est pas une sauvegarde valide.' }; }
    if (!o || o.app !== 'temps' || !o.data || typeof o.data !== 'object')
      return { ok: false, erreur: 'Ce fichier ne vient pas de l’app Temps (utilise Plus › Réglages › Exporter).' };
    return { ok: true, data: normaliser(o.data) };
  }

  // Colles de l'app Scolarité (clé « scolarite.v1 » : {colles:[{date,time,subject,colleur}], flip})
  function depuisScolarite(o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.colles)) return null;
    var colles = o.colles.map(function (c) {
      return c && normColle({ id: '', date: c.date, debut: c.time, duree: 60, matiere: c.subject, colleur: c.colleur, salle: '' });
    }).filter(Boolean);
    return { colles: colles, flip: o.flip ? 1 : 0 };
  }
  function fusionnerColles(data, nouvelles) {
    var vues = {}, ajoutees = 0;
    data.colles.forEach(function (c) { vues[c.date + '|' + c.debut + '|' + c.matiere] = 1; });
    nouvelles.forEach(function (c) {
      var k = c.date + '|' + c.debut + '|' + c.matiere;
      if (vues[k]) return;
      vues[k] = 1; data.colles.push(c); ajoutees++;
    });
    return ajoutees;
  }

  /* ------------------------------------------------------------------ */
  /* 4. Vérification des formulaires (renvoie un message ou null)        */
  /* ------------------------------------------------------------------ */
  function verifHeures(d, f, defaut) {
    if (!heureValide(d) || !heureValide(f)) return 'Choisis une heure de début et de fin.';
    if (enMin(d) >= enMin(f)) return 'La fin doit être après le début.';
    return defaut || null;
  }
  function validerBloc(b) {
    if (!texte(b.nom, 60)) return 'Donne un nom au bloc.';
    return verifHeures(b.debut, b.fin);
  }
  function validerCours(c) {
    if (!texte(c.matiere, 60)) return 'Indique la matière.';
    return verifHeures(c.debut, c.fin);
  }
  // heure vide = « heure à définir » : la colle apparaît alors en haut de la journée
  function validerColle(c) {
    if (!dateValide(c.date)) return 'Choisis une date.';
    if (!texte(c.matiere, 60)) return 'Indique la matière.';
    if (c.debut && !heureValide(c.debut)) return 'Heure invalide.';
    return null;
  }
  // sans heure de début = événement sur toute la journée
  function validerEvent(e) {
    if (!texte(e.titre, 80)) return 'Donne un titre à l’événement.';
    if (!dateValide(e.date)) return 'Choisis une date.';
    if (e.debut || e.fin) return verifHeures(e.debut, e.fin);
    return null;
  }
  function validerTache(t) {
    if (!texte(t.texte, 120)) return 'Écris la tâche.';
    return dateValide(t.date) ? null : 'Choisis une date.';
  }
  function validerReveil(lever, coucher) {
    if (!heureValide(lever) || !heureValide(coucher)) return 'Heures invalides.';
    return enMin(lever) < enMin(coucher) ? null : 'Le coucher doit être après le lever.';
  }

  /* ------------------------------------------------------------------ */
  /* 5. Composer une journée                                             */
  /* ------------------------------------------------------------------ */
  function coursDuJour(s, data) {
    var out = [], p = periode(s, data.ds);
    if (p !== 'cours') return out;
    var j = jourSemaine(s), ab = semaineAB(s, data.prefs.flip);
    data.edt.forEach(function (c) {
      if (c.jour !== j || (c.semaine !== 'AB' && c.semaine !== ab)) return;
      out.push({ kind: 'cours', id: c.id, debut: c.debut, fin: c.fin, titre: c.matiere, prof: c.prof, salle: c.salle, semaine: c.semaine });
    });
    var ds = dsDuJour(s, data.ds);
    if (ds) out.push({ kind: 'ds', id: 'ds-' + s, debut: D.DS_HORAIRE.debut, fin: D.DS_HORAIRE.fin, titre: 'DS', detail: ds, prof: '', salle: D.DS_HORAIRE.salle });
    return out;
  }

  var ORDRE = { cours: 0, ds: 0, colle: 1, event: 2, bloc: 3, vide: 4 };
  function trier(l) {
    return l.slice().sort(function (a, b) {
      return enMin(a.debut) - enMin(b.debut) || enMin(a.fin) - enMin(b.fin) || ORDRE[a.kind] - ORDRE[b.kind];
    });
  }
  function seChevauchent(a, b) { return enMin(a.debut) < enMin(b.fin) && enMin(b.debut) < enMin(a.fin); }

  // Les trous de la journée (entre le lever et le coucher) : les « blocs vides » à remplir.
  function trous(occupes, lever, coucher) {
    var iv = occupes.map(function (i) { return [enMin(i.debut), enMin(i.fin)]; }).sort(function (a, b) { return a[0] - b[0]; });
    var out = [], cur = lever;
    iv.forEach(function (x) {
      if (x[0] > cur) out.push([cur, Math.min(x[0], coucher)]);
      cur = Math.max(cur, x[1]);
    });
    if (cur < coucher) out.push([cur, coucher]);
    return out.filter(function (g) { return g[1] - g[0] >= MIN_VIDE; }).map(function (g) {
      return { kind: 'vide', id: 'vide-' + g[0], debut: enHeure(g[0]), fin: enHeure(g[1]) };
    });
  }

  function composerJour(s, data) {
    var lever = enMin(data.prefs.lever), coucher = enMin(data.prefs.coucher);
    var fixes = coursDuJour(s, data), journee = [];
    data.colles.forEach(function (c) {
      if (c.date !== s) return;
      if (!c.debut) { journee.push({ kind: 'colle', id: c.id, titre: c.matiere, prof: c.colleur, salle: c.salle }); return; }
      fixes.push({ kind: 'colle', id: c.id, debut: c.debut, fin: enHeure(Math.min(enMin(c.debut) + c.duree, 1439)), titre: c.matiere, prof: c.colleur, salle: c.salle });
    });
    data.events.forEach(function (e) {
      if (e.date !== s) return;
      if (!e.debut) { journee.push({ kind: 'event', id: e.id, titre: e.titre }); return; }
      fixes.push({ kind: 'event', id: e.id, debut: e.debut, fin: e.fin, titre: e.titre });
    });
    var blocs = (data.blocs[s] || []).map(function (b) { return { kind: 'bloc', id: b.id, debut: b.debut, fin: b.fin, titre: b.nom }; });
    var occupes = fixes.concat(blocs);
    var items = trier(occupes.concat(trous(occupes, lever, coucher)));
    items.forEach(function (a) {
      if (a.kind === 'vide') return;
      a.conflit = items.some(function (b) { return b !== a && b.kind !== 'vide' && seChevauchent(a, b); });
    });
    return { iso: s, periode: periode(s, data.ds), vacances: nomVacances(s, data.ds), semaine: semaineAB(s, data.prefs.flip),
             lever: data.prefs.lever, coucher: data.prefs.coucher, items: items, journee: journee };
  }

  // L'élément « en cours » à une heure donnée (en minutes) : un vrai bloc d'abord, sinon un trou
  function enCours(items, minute) {
    var cands = items.filter(function (i) { return enMin(i.debut) <= minute && minute < enMin(i.fin); });
    return cands.filter(function (i) { return i.kind !== 'vide'; })[0] || cands[0] || null;
  }

  /* ------------------------------------------------------------------ */
  /* 6. Répéter une journée                                              */
  /* ------------------------------------------------------------------ */
  function datesRepetition(debut, semaines, jours) {
    var out = [];
    for (var i = 0; i < semaines * 7; i++) {
      var d = ajouterJours(debut, i);
      if (jours.indexOf(jourSemaine(d)) >= 0) out.push(d);
    }
    return out;
  }
  function modeleDepuisBlocs(nom, blocs) {
    return { id: nouvelId(), nom: texte(nom, 40), blocs: blocs.map(function (b) { return { nom: b.nom, debut: b.debut, fin: b.fin }; }) };
  }
  function planRepetition(data, modele, opt) {
    var dates = datesRepetition(opt.debut, opt.semaines, opt.jours), remplaces = 0;
    if (opt.mode !== 'ajouter') dates.forEach(function (d) { remplaces += (data.blocs[d] || []).length; });
    return { dates: dates, remplaces: remplaces, ajoutes: dates.length * modele.blocs.length };
  }
  function validerRepetition(opt) {
    if (!dateValide(opt.debut)) return 'Choisis une date de début.';
    if (!(opt.semaines >= 1 && opt.semaines <= 8)) return 'Entre 1 et 8 semaines.';
    if (!opt.jours || !opt.jours.length) return 'Choisis au moins un jour.';
    return null;
  }
  function appliquerRepetition(data, modele, opt) {
    var plan = planRepetition(data, modele, opt);
    plan.dates.forEach(function (d) {
      var copies = modele.blocs.map(function (b) { return { id: nouvelId(), nom: b.nom, debut: b.debut, fin: b.fin }; });
      var base = opt.mode === 'ajouter' ? (data.blocs[d] || []) : [];
      var tout = base.concat(copies);
      if (tout.length) data.blocs[d] = tout; else delete data.blocs[d];
    });
    return plan;
  }

  /* ------------------------------------------------------------------ */
  /* 7. Tâches : celles qui sont faites disparaissent le lendemain       */
  /* ------------------------------------------------------------------ */
  function purgerTaches(taches, aujourdhui) {
    return taches.filter(function (t) { return !(t.fait && t.date < aujourdhui); });
  }
  function enRetard(taches, aujourdhui) { return taches.filter(function (t) { return !t.fait && t.date < aujourdhui; }); }
  function tachesDuJour(taches, s) {
    var l = taches.filter(function (t) { return t.date === s; });
    return l.filter(function (t) { return !t.fait; }).concat(l.filter(function (t) { return t.fait; }));
  }
  // Tâches à venir (après aujourd'hui), regroupées par date
  function tachesAVenir(taches, aujourdhui) {
    var par = {};
    taches.forEach(function (t) { if (t.date > aujourdhui) (par[t.date] = par[t.date] || []).push(t); });
    return Object.keys(par).sort().map(function (d) { return { date: d, taches: tachesDuJour(par[d], d) }; });
  }

  /* ------------------------------------------------------------------ */
  /* 8. Calendrier du mois                                               */
  /* ------------------------------------------------------------------ */
  function grilleMois(annee, mois) {
    var premier = annee + '-' + pad(mois) + '-01', cur = lundiDe(premier), semaines = [];
    do {
      var sem = [];
      for (var i = 0; i < 7; i++) { sem.push({ iso: cur, dansMois: cur.slice(0, 7) === premier.slice(0, 7) }); cur = ajouterJours(cur, 1); }
      semaines.push(sem);
    } while (cur.slice(0, 7) === premier.slice(0, 7));
    return semaines;
  }
  function moisSuivant(annee, mois, delta) {
    var n = annee * 12 + (mois - 1) + delta;
    return { annee: Math.floor(n / 12), mois: (n % 12) + 1 };
  }
  function resumeJour(s, data) {
    return {
      periode: periode(s, data.ds),
      ds: !!dsDuJour(s, data.ds),
      colles: data.colles.filter(function (c) { return c.date === s; }).length,
      events: data.events.filter(function (e) { return e.date === s; }).length,
      taches: data.taches.filter(function (t) { return t.date === s && !t.fait; }).length,
      blocs: (data.blocs[s] || []).length
    };
  }

  return {
    JOURS: JOURS, MOIS: MOIS, MIN_VIDE: MIN_VIDE, MATIERES: D.MATIERES,
    enMin: enMin, enHeure: enHeure, heureValide: heureValide, fmtDuree: fmtDuree,
    iso: iso, dateDe: dateDe, dateValide: dateValide, ajouterJours: ajouterJours, ecartJours: ecartJours, jourSemaine: jourSemaine,
    lundiDe: lundiDe, samediDe: samediDe, libelleLong: libelleLong, libelleCourt: libelleCourt, libelleMois: libelleMois,
    semaineAB: semaineAB, periode: periode, nomVacances: nomVacances, dsDuJour: dsDuJour,
    nouvelId: nouvelId, parDefaut: parDefaut, normaliser: normaliser, exporter: exporter, lireSauvegarde: lireSauvegarde,
    depuisScolarite: depuisScolarite, fusionnerColles: fusionnerColles,
    validerBloc: validerBloc, validerCours: validerCours, validerColle: validerColle, validerEvent: validerEvent,
    validerTache: validerTache, validerReveil: validerReveil, validerRepetition: validerRepetition,
    coursDuJour: coursDuJour, composerJour: composerJour, enCours: enCours, trier: trier,
    datesRepetition: datesRepetition, modeleDepuisBlocs: modeleDepuisBlocs, planRepetition: planRepetition, appliquerRepetition: appliquerRepetition,
    purgerTaches: purgerTaches, enRetard: enRetard, tachesDuJour: tachesDuJour, tachesAVenir: tachesAVenir,
    grilleMois: grilleMois, moisSuivant: moisSuivant, resumeJour: resumeJour
  };
});
