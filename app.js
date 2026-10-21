/* app.js — l'écran de « Temps ».
 * Les règles (semaines A/B, vacances, blocs vides, répétition, tâches…) sont dans logique.js, testées à part.
 * Ici : affichage, formulaires, sauvegarde dans le téléphone. */
(function () {
  'use strict';
  var T = Temps;

  /* ------------------------------------------------------------------ */
  /* Petits outils                                                       */
  /* ------------------------------------------------------------------ */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function att(el, n) { return el.getAttribute('data-' + n) || ''; }
  function pluriel(n, mot, pl) { return n + ' ' + (n > 1 ? (pl || mot + 's') : mot); }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function nomJour(s) { return cap(T.JOURS[T.jourSemaine(s)]); }
  function dateTxt(s, avecAnnee) {
    var d = T.dateDe(s);
    return d.getDate() + (d.getDate() === 1 ? 'er' : '') + ' ' + T.MOIS[d.getMonth()] + (avecAnnee ? ' ' + d.getFullYear() : '');
  }
  function coarse() { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return true; } }

  /* ------------------------------------------------------------------ */
  /* L'heure (on peut la figer avec  ?maintenant=2026-11-04T08:00  pour tester) */
  /* ------------------------------------------------------------------ */
  var horlogeFixe = null;
  (function () {
    var m = /[?&]maintenant=([0-9T:\-]+)/.exec(location.search);
    if (m) { var d = new Date(m[1]); if (!isNaN(d.getTime())) horlogeFixe = d.getTime(); }
  })();
  function maintenant() { return new Date(horlogeFixe != null ? horlogeFixe : Date.now()); }
  function auj() { return T.iso(maintenant()); }
  function minNow() { var d = maintenant(); return d.getHours() * 60 + d.getMinutes(); }

  /* ------------------------------------------------------------------ */
  /* Sauvegarde dans le téléphone (localStorage, avec secours en mémoire) */
  /* ------------------------------------------------------------------ */
  var CLE = 'temps.v1', memoire = null, alerteStockage = false;
  function chargerDonnees() {
    var s = null;
    try { s = localStorage.getItem(CLE); } catch (e) { /* stockage indisponible */ }
    if (!s) s = memoire;
    if (!s) return T.parDefaut();
    try { return T.normaliser(JSON.parse(s)); }
    catch (e) {
      try { localStorage.setItem(CLE + '.corrompu', s); } catch (e2) { /* tant pis */ }   // on garde une copie du fichier abîmé
      return T.parDefaut();
    }
  }
  function sauver() {
    var s = JSON.stringify(E.data);
    memoire = s;
    try { localStorage.setItem(CLE, s); }
    catch (e) {
      if (!alerteStockage) { alerteStockage = true; toast('Impossible d’enregistrer sur cet appareil (stockage bloqué ou plein).'); }
    }
  }

  /* ------------------------------------------------------------------ */
  /* État                                                                */
  /* ------------------------------------------------------------------ */
  var E = {
    data: chargerDonnees(), vue: 'jour', sous: null, jour: auj(), sel: auj(), mois: null,
    aujourdhui: auj(), sigMaint: '', form: null, confirmation: null, annuler: null, dsPasse: false
  };
  E.mois = { annee: +E.jour.slice(0, 4), mois: +E.jour.slice(5, 7) };

  function purger() {
    var avant = E.data.taches.length;
    E.data.taches = T.purgerTaches(E.data.taches, auj());
    return avant - E.data.taches.length;
  }
  if (purger()) sauver();

  /* Toute modification passe par ici : sauvegarde, réaffichage, et un bouton « Annuler » si on donne un message. */
  function modifier(fn, msg) {
    var avant = JSON.stringify(E.data);
    fn();
    sauver();
    rendre();
    if (msg) {
      toast(typeof msg === 'function' ? msg() : msg, function () {
        E.data = T.normaliser(JSON.parse(avant)); sauver(); rendre();
      });
    }
  }

  var tt = null;
  function toast(msg, annuler) {
    var t = $('#toast');
    t.innerHTML = '';
    var sp = document.createElement('span'); sp.textContent = msg; t.appendChild(sp);
    if (annuler) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Annuler'; b.setAttribute('data-act', 'annuler-action');
      t.appendChild(b); t.className = ''; E.annuler = annuler;
    } else { t.className = 'seul'; E.annuler = null; }
    t.hidden = false;
    clearTimeout(tt);
    tt = setTimeout(function () { t.hidden = true; E.annuler = null; }, annuler ? 7000 : 2800);
  }

  /* ------------------------------------------------------------------ */
  /* Onglets                                                             */
  /* ------------------------------------------------------------------ */
  var ICONES = {
    jour: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14M5 12h9M5 17.5h12"/></svg>',
    mois: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    taches: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.4l2.7 2.7 4.9-5.4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/></svg>'
  };
  function nbAFaire() {
    var a = auj();
    return E.data.taches.filter(function (t) { return !t.fait && t.date <= a; }).length;
  }
  function rendreOnglets() {
    var tabs = [['jour', 'Jour'], ['mois', 'Mois'], ['taches', 'À faire'], ['plus', 'Plus']], nb = nbAFaire();
    $('#onglets').innerHTML = '<div class="rang">' + tabs.map(function (t) {
      return '<button type="button" class="' + (E.vue === t[0] ? 'actif' : '') + '" data-act="onglet" data-v="' + t[0] + '"' + (E.vue === t[0] ? ' aria-current="page"' : '') + '>' +
        ICONES[t[0]] + t[1] + (t[0] === 'taches' && nb ? '<span class="point">' + Math.min(nb, 99) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }

  function rendre(haut) {
    var y = haut ? 0 : (window.pageYOffset || 0);
    rendreOnglets();
    $('#fab').hidden = !(E.vue === 'jour' || E.vue === 'mois' || E.vue === 'taches');
    var h;
    if (E.vue === 'jour') h = vueJour();
    else if (E.vue === 'mois') h = vueMois();
    else if (E.vue === 'taches') h = vueTaches();
    else h = vuePlus();
    $('#app').innerHTML = h;
    window.scrollTo(0, y);
  }
  function aller(vue) {
    if (vue === 'jour' && E.vue === 'jour') E.jour = auj();      // retoucher « Jour » ramène à aujourd'hui
    E.vue = vue; E.sous = null; fermerCalque(); rendre(true);
  }

  /* ------------------------------------------------------------------ */
  /* Vue « Jour »                                                        */
  /* ------------------------------------------------------------------ */
  function txtSalle(s) { return !s ? '' : (/^salle/i.test(s) ? s : 'Salle ' + s); }
  function duree(it) { return T.enMin(it.fin) - T.enMin(it.debut); }

  function blocHtml(it, maint, fini) {
    var cls = 'bl ' + it.kind + (it.conflit ? ' conflit' : '') + (maint ? ' maintenant' : '') + (fini ? ' fini' : '');
    var act = { cours: 'voir-cours', ds: 'voir-ds', colle: 'edit-colle', event: 'edit-event', bloc: 'edit-bloc', vide: 'ajout-vide' }[it.kind];
    var attrs = ' data-id="' + esc(it.id) + '"';
    var etiq = [], titre = it.titre, det = '';
    if (it.kind === 'ds') { etiq.push('DS'); titre = it.detail; det = it.salle; }
    else if (it.kind === 'cours') det = [it.prof, txtSalle(it.salle)].filter(Boolean).join(' · ');
    else if (it.kind === 'colle') { etiq.push('Colle'); det = [it.prof, txtSalle(it.salle)].filter(Boolean).join(' · '); }
    else if (it.kind === 'event') etiq.push('Événement');
    else if (it.kind === 'vide') { titre = 'Libre'; det = T.fmtDuree(duree(it)); attrs = ' data-d="' + it.debut + '" data-f="' + it.fin + '"'; }
    if (maint) etiq.push('Maintenant');
    if (it.conflit) etiq.push('Chevauchement');
    return '<button type="button" class="' + cls + '" data-act="' + act + '"' + attrs + '>' +
      '<span class="heures"><span>' + it.debut + '</span><span>' + it.fin + '</span></span>' +
      '<span class="carte">' +
      (etiq.length ? '<span class="etiquettes">' + etiq.map(function (e) { return '<span class="etiq-p">' + esc(e) + '</span>'; }).join('') + '</span>' : '') +
      '<b>' + esc(titre) + '</b>' + (det ? '<span class="det">' + esc(det) + '</span>' : '') + '</span></button>';
  }

  function tacheHtml(t, avecDate) {
    return '<div class="tache' + (t.fait ? ' fait' : '') + '">' +
      '<button type="button" class="coche" data-act="cocher" data-id="' + esc(t.id) + '" aria-pressed="' + !!t.fait + '" aria-label="' + (t.fait ? 'Décocher' : 'Cocher') + ' : ' + esc(t.texte) + '"><i></i></button>' +
      '<button type="button" class="txt" data-act="edit-tache" data-id="' + esc(t.id) + '">' + esc(t.texte) +
      (avecDate ? '<small>' + esc(T.libelleCourt(t.date)) + '</small>' : '') + '</button></div>';
  }

  function vueJour() {
    var s = E.jour, a = auj(), estAuj = s === a, j = T.composerJour(s, E.data), nm = minNow();
    var cur = estAuj ? T.enCours(j.items, nm) : null;
    E.sigMaint = cur ? cur.id : '';
    var past = [];
    if (estAuj) past.push('<span class="pastille pleine">Aujourd’hui</span>');
    if (j.periode === 'hors') past.push('<span class="pastille">Hors planning scolaire</span>');
    else past.push('<span class="pastille">Semaine ' + j.semaine + '</span>');
    if (j.periode === 'vacances') past.push('<span class="pastille">' + esc(j.vacances) + '</span>');

    var h = '<div class="jour-nav">' +
      '<button type="button" class="rond" data-act="jour" data-d="-1" aria-label="Jour précédent">‹</button>' +
      '<div class="jour-titre"><h1>' + esc(nomJour(s)) + '</h1><div class="sous">' + esc(dateTxt(s, true)) + '</div></div>' +
      '<button type="button" class="rond" data-act="jour" data-d="1" aria-label="Jour suivant">›</button></div>' +
      '<div class="outils"><div class="pastilles">' + past.join('') + '</div><div class="btns">' +
      (estAuj ? '' : '<button type="button" class="btn petit" data-act="aujourdhui">Aujourd’hui</button>') +
      '<button type="button" class="btn petit" data-act="menu-jour">Options</button></div></div>';

    if (j.journee.length) {
      h += '<div class="journee"><span class="etiq">Toute la journée</span>' + j.journee.map(function (x) {
        return '<button type="button" class="puce-j" data-act="' + (x.kind === 'colle' ? 'edit-colle' : 'edit-event') + '" data-id="' + esc(x.id) + '">' +
          (x.kind === 'colle' ? 'Colle · ' : '') + esc(x.titre) + '</button>';
      }).join('') + '</div>';
    }

    h += '<button type="button" class="repere" data-act="reveil"><span>' + j.lever + '</span>Lever</button><div class="blocs">' +
      j.items.map(function (it) { return blocHtml(it, !!cur && cur.id === it.id, estAuj && nm >= T.enMin(it.fin)); }).join('') +
      '</div><button type="button" class="repere" data-act="reveil"><span>' + j.coucher + '</span>Coucher</button>';

    var taches = T.tachesDuJour(E.data.taches, s), retard = estAuj ? T.enRetard(E.data.taches, s) : [];
    var restantes = taches.filter(function (t) { return !t.fait; }).length + retard.length;
    h += '<h2>À faire' + (restantes ? '<small>' + restantes + ' à cocher</small>' : '') + '</h2>';
    if (retard.length) h += '<div class="taches"><div class="sous-titre-liste">En retard</div>' + retard.map(function (t) { return tacheHtml(t, true); }).join('') + '</div><div style="height:10px"></div>';
    if (taches.length) h += '<div class="taches">' + taches.map(function (t) { return tacheHtml(t); }).join('') + '</div>';
    else if (!retard.length) h += '<div class="vide-etat" style="padding:10px 20px 4px">Rien à faire ce jour-là.</div>';
    h += '<div class="rangee"><button type="button" class="btn large" data-act="ajout-tache" data-d="' + s + '">+ Ajouter une tâche</button></div>';
    return h;
  }

  /* ------------------------------------------------------------------ */
  /* Vue « Mois »                                                        */
  /* ------------------------------------------------------------------ */
  function vueMois() {
    var m = E.mois, g = T.grilleMois(m.annee, m.mois), a = auj();
    var h = '<div class="mois-nav"><button type="button" class="rond" data-act="mois" data-d="-1" aria-label="Mois précédent">‹</button>' +
      '<h1>' + esc(T.libelleMois(m.annee, m.mois)) + '</h1>' +
      '<button type="button" class="rond" data-act="mois" data-d="1" aria-label="Mois suivant">›</button></div>';
    h += '<div class="mois-tete"><span></span>' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>';
    g.forEach(function (sem) {
      var ab = T.periode(sem[0].iso, E.data.ds) === 'cours' ? T.semaineAB(sem[0].iso, E.data.prefs.flip) : '';
      h += '<div class="mois-sem"><span class="ab">' + ab + '</span>';
      sem.forEach(function (c) {
        var r = T.resumeJour(c.iso, E.data), d = T.dateDe(c.iso);
        var cls = 'mj' + (c.dansMois ? '' : ' autre') + (r.periode === 'vacances' ? ' vac' : '') + (c.iso === a ? ' auj' : '') + (c.iso === E.sel ? ' sel' : '');
        var mk = (r.events ? '<i class="mk"></i>' : '') + (r.colles ? '<i class="mk carre"></i>' : '') + (r.taches ? '<i class="mk creux"></i>' : '') + (r.ds ? '<i class="mk losange"></i>' : '');
        var lab = nomJour(c.iso).toLowerCase() + ' ' + dateTxt(c.iso) + (r.periode === 'vacances' ? ', vacances' : '') +
          (r.events ? ', ' + pluriel(r.events, 'événement') : '') + (r.colles ? ', ' + pluriel(r.colles, 'colle') : '') + (r.taches ? ', ' + pluriel(r.taches, 'tâche') : '') + (r.ds ? ', DS' : '');
        h += '<button type="button" class="' + cls + '" data-act="sel-jour" data-d="' + c.iso + '" aria-label="' + esc(lab) + '" aria-pressed="' + (c.iso === E.sel) + '">' + d.getDate() +
          '<span class="marques">' + mk + '</span></button>';
      });
      h += '</div>';
    });
    h += '<div class="legende"><span><i class="mk"></i>Événement</span><span><i class="mk carre"></i>Colle</span><span><i class="mk creux"></i>Tâche</span><span><i class="mk losange"></i>DS</span></div>';

    var s = E.sel, j = T.composerJour(s, E.data), r = T.resumeJour(s, E.data);
    var pas = [];
    if (j.periode === 'hors') pas.push('<span class="pastille">Hors planning scolaire</span>'); else pas.push('<span class="pastille">Semaine ' + j.semaine + '</span>');
    if (j.periode === 'vacances') pas.push('<span class="pastille">' + esc(j.vacances) + '</span>');
    var li = j.journee.map(function (x) { return '<li><span class="h">Jour</span><span>' + esc(x.titre) + ' <span class="g">' + (x.kind === 'colle' ? 'colle' : 'événement') + '</span></span></li>'; });
    j.items.forEach(function (it) {
      if (it.kind === 'vide') return;
      var nom = { cours: '', ds: ' DS', colle: ' colle', event: ' événement', bloc: ' bloc' }[it.kind];
      li.push('<li><span class="h">' + it.debut + '</span><span>' + esc(it.kind === 'ds' ? it.detail : it.titre) + (nom ? ' <span class="g">' + nom.trim() + '</span>' : '') + '</span></li>');
    });
    if (r.taches) li.push('<li><span class="h">○</span><span>' + pluriel(r.taches, 'tâche') + ' à faire</span></li>');
    h += '<div class="resume"><h3>' + esc(nomJour(s) + ' ' + dateTxt(s)) + '</h3><div class="pastilles">' + pas.join('') + '</div>' +
      (li.length ? '<ul>' + li.join('') + '</ul>' : '<p class="gris" style="margin:12px 0 0">Rien de prévu.</p>') +
      '<div class="rangee"><button type="button" class="btn primaire" data-act="ouvrir-jour">Ouvrir la journée</button>' +
      '<button type="button" class="btn" data-act="ajouter" data-d="' + s + '">+ Ajouter</button></div></div>';
    return h;
  }

  /* ------------------------------------------------------------------ */
  /* Vue « À faire »                                                     */
  /* ------------------------------------------------------------------ */
  function vueTaches() {
    var a = auj(), demain = T.ajouterJours(a, 1), ts = E.data.taches;
    var retard = T.enRetard(ts, a), jour = T.tachesDuJour(ts, a), dem = T.tachesDuJour(ts, demain), venir = T.tachesAVenir(ts, demain);
    var h = '<div class="entete"><h1>À faire</h1></div>';
    if (retard.length) h += '<h2>En retard</h2><div class="taches">' + retard.map(function (t) { return tacheHtml(t, true); }).join('') + '</div>';
    h += '<h2>Aujourd’hui</h2>' + (jour.length ? '<div class="taches">' + jour.map(function (t) { return tacheHtml(t); }).join('') + '</div>' : '<div class="vide-etat" style="padding:12px 20px">Rien à faire aujourd’hui.</div>');
    if (dem.length) h += '<h2>Demain</h2><div class="taches">' + dem.map(function (t) { return tacheHtml(t); }).join('') + '</div>';
    venir.forEach(function (g) { h += '<h2>' + esc(nomJour(g.date) + ' ' + dateTxt(g.date)) + '</h2><div class="taches">' + g.taches.map(function (t) { return tacheHtml(t); }).join('') + '</div>'; });
    h += '<p class="note-bas">Une tâche cochée disparaît à la fin de la journée.<br>Une tâche non faite reste « en retard » jusqu’à ce que tu la coches.</p>';
    return h;
  }

  /* ------------------------------------------------------------------ */
  /* Vue « Plus »                                                        */
  /* ------------------------------------------------------------------ */
  function lienPlus(v, titre, sous) {
    return '<button type="button" class="ligne" data-act="sous" data-v="' + v + '"><span class="corps"><b>' + esc(titre) + '</b><span class="gris">' + esc(sous) + '</span></span><span class="fleche">›</span></button>';
  }
  function retour() { return '<div class="retour"><button type="button" class="btn petit" data-act="plus-retour">‹ Plus</button></div>'; }

  function vuePlus() {
    var d = E.data, a = auj();
    if (E.sous === 'edt') return sousEdt();
    if (E.sous === 'ds') return sousDs();
    if (E.sous === 'colles') return sousColles();
    if (E.sous === 'modeles') return sousModeles();
    if (E.sous === 'reglages') return sousReglages();
    var aVenir = d.colles.filter(function (c) { return c.date >= a; }).length;
    return '<div class="entete"><h1>Plus</h1></div><div class="liste">' +
      lienPlus('edt', 'Emploi du temps', pluriel(d.edt.length, 'cours', 'cours') + ' · semaines A et B') +
      lienPlus('ds', 'Planning des DS et vacances', 'Les samedis, et les semaines sans cours') +
      lienPlus('colles', 'Colles', aVenir ? pluriel(aVenir, 'colle') + ' à venir' : 'Aucune colle à venir') +
      lienPlus('modeles', 'Modèles de journée', d.modeles.length ? pluriel(d.modeles.length, 'modèle') : 'Aucun modèle') +
      lienPlus('reglages', 'Réglages', 'Lever et coucher, semaines A/B, sauvegarde') + '</div>';
  }

  var ORD_SEM = { AB: 0, A: 1, B: 2 };
  function sousEdt() {
    var h = retour() + '<div class="entete"><h1>Emploi du temps</h1></div>' +
      '<p class="sous" style="margin:-8px 4px 6px">Il s’affiche tout seul les jours de cours, jamais pendant les vacances. Touche un cours pour le modifier.</p>';
    for (var j = 0; j < 6; j++) {
      var l = E.data.edt.filter(function (c) { return c.jour === j; }).sort(function (x, y) { return T.enMin(x.debut) - T.enMin(y.debut) || ORD_SEM[x.semaine] - ORD_SEM[y.semaine]; });
      if (!l.length) continue;
      h += '<div class="groupe-jour"><h2>' + cap(T.JOURS[j]) + '</h2><div class="liste">' + l.map(function (c) {
        return '<button type="button" class="ligne" data-act="edit-cours" data-id="' + esc(c.id) + '"><span class="heure-col">' + c.debut + '<br>' + c.fin + '</span>' +
          '<span class="corps"><b>' + esc(c.matiere) + (c.semaine !== 'AB' ? '<span class="mini">' + c.semaine + '</span>' : '') + '</b>' +
          '<span class="gris">' + esc([c.prof, txtSalle(c.salle)].filter(Boolean).join(' · ') || '—') + '</span></span><span class="fleche">›</span></button>';
      }).join('') + '</div></div>';
    }
    h += '<div class="rangee" style="margin-top:20px"><button type="button" class="btn primaire large" data-act="ajout-cours">+ Ajouter un cours</button></div>' +
      '<div class="liste" style="margin-top:22px"><button type="button" class="lien-bloc danger" data-act="reset-edt">Remettre l’emploi du temps d’origine<small>Annule tes changements ici. Tes blocs, colles et tâches ne bougent pas.</small></button></div>';
    return h;
  }

  function sousDs() {
    var cles = Object.keys(E.data.ds).sort(), debutSemaine = T.lundiDe(auj());
    function ligne(k) {
      var lab = E.data.ds[k], vac = /^Vacances/i.test(lab), pasDs = !lab || /^Pas de DS/i.test(lab);
      return '<button type="button" class="ligne' + (k < debutSemaine ? ' faible' : '') + '" data-act="edit-ds" data-d="' + k + '"><span class="heure-col">' + esc(T.libelleCourt(k).replace(/^[a-zé]+\.\s*/, '')) + '</span>' +
        '<span class="corps"><b>' + esc(vac ? lab : (lab || 'Pas de DS')) + '</b><span class="gris">' + (vac ? 'Semaine sans cours' : (pasDs ? 'Cours normaux, pas de DS' : 'DS 7:10–11:20')) + '</span></span><span class="fleche">›</span></button>';
    }
    var futur = cles.filter(function (k) { return k >= debutSemaine; }), passe = cles.filter(function (k) { return k < debutSemaine; });
    var h = retour() + '<div class="entete"><h1>DS et vacances</h1></div>' +
      '<p class="sous" style="margin:-8px 4px 12px">Une ligne par samedi. Un libellé qui commence par « Vacances » met toute la semaine (lundi à samedi) en vacances : plus de cours. Libellé vide = pas de DS.</p>' +
      '<div class="liste">' + (futur.length ? futur.map(ligne).join('') : '<div class="vide-etat">Plus de semaine prévue.</div>') + '</div>';
    if (passe.length) h += '<details class="repli"' + (E.dsPasse ? ' open' : '') + ' data-act-toggle="dsPasse"><summary>Semaines passées (' + passe.length + ')</summary><div class="liste">' + passe.map(ligne).join('') + '</div></details>';
    h += '<div class="rangee" style="margin-top:20px"><button type="button" class="btn primaire large" data-act="ajout-ds">+ Ajouter une semaine</button></div>';
    return h;
  }

  function texteColle(c) {
    var quand = T.libelleCourt(c.date) + (c.debut ? ' · ' + c.debut + '–' + T.enHeure(Math.min(1439, T.enMin(c.debut) + c.duree)) : ' · heure à définir');
    return [quand, c.colleur, txtSalle(c.salle)].filter(Boolean).join(' · ');
  }
  function sousColles() {
    var a = auj(), tri = function (x, y) { return (x.date + (x.debut || '99')).localeCompare(y.date + (y.debut || '99')); };
    var futur = E.data.colles.filter(function (c) { return c.date >= a; }).sort(tri);
    var passe = E.data.colles.filter(function (c) { return c.date < a; }).sort(tri).reverse();
    function ligne(c, faible) {
      return '<button type="button" class="ligne' + (faible ? ' faible' : '') + '" data-act="edit-colle" data-id="' + esc(c.id) + '"><span class="corps"><b>' + esc(c.matiere) + '</b><span class="gris">' + esc(texteColle(c)) + '</span></span><span class="fleche">›</span></button>';
    }
    var h = retour() + '<div class="entete"><h1>Colles</h1></div>' +
      '<div class="rangee" style="margin:0 0 6px"><button type="button" class="btn primaire large" data-act="ajout-colle" data-d="' + a + '">+ Ajouter une colle</button></div>' +
      '<h2>À venir</h2>' + (futur.length ? '<div class="liste">' + futur.map(function (c) { return ligne(c); }).join('') + '</div>' : '<div class="vide-etat" style="padding:14px">Aucune colle à venir.</div>');
    if (passe.length) {
      h += '<details class="repli"><summary>Passées (' + passe.length + ')</summary><div class="liste">' + passe.slice(0, 15).map(function (c) { return ligne(c, true); }).join('') + '</div></details>' +
        '<div class="liste" style="margin-top:18px"><button type="button" class="lien-bloc danger" data-act="suppr-colles-passees">Effacer les colles passées</button></div>';
    }
    return h;
  }

  function sousModeles() {
    var h = retour() + '<div class="entete"><h1>Modèles de journée</h1></div>' +
      '<p class="sous" style="margin:-8px 4px 12px">Un modèle, c’est une journée de blocs que tu peux recopier. Pour en créer un : prépare une journée, puis « Options › Répéter cette journée » et donne-lui un nom.</p>';
    if (!E.data.modeles.length) return h + '<div class="liste"><div class="vide-etat">Aucun modèle pour l’instant.</div></div>';
    return h + '<div class="liste">' + E.data.modeles.map(function (m) {
      return '<button type="button" class="ligne" data-act="menu-modele" data-id="' + esc(m.id) + '"><span class="corps"><b>' + esc(m.nom) + '</b><span class="gris">' +
        esc(pluriel(m.blocs.length, 'bloc') + ' · ' + m.blocs.map(function (b) { return b.nom; }).slice(0, 3).join(', ') + (m.blocs.length > 3 ? '…' : '')) + '</span></span><span class="fleche">›</span></button>';
    }).join('') + '</div>';
  }

  function sousReglages() {
    var p = E.data.prefs, ab = T.semaineAB(auj(), p.flip);
    return retour() + '<div class="entete"><h1>Réglages</h1></div>' +
      '<h2>Ma journée</h2><div class="liste"><button type="button" class="ligne" data-act="reveil"><span class="corps"><b>Lever et coucher</b><span class="gris">' + p.lever + ' → ' + p.coucher + ' · les trous entre les cours deviennent des blocs libres</span></span><span class="fleche">›</span></button></div>' +
      '<h2>Semaines A / B</h2><div class="liste"><div class="bascule"><div class="t"><b>Inverser A et B</b><span>Cette semaine est la semaine ' + ab + '. Si ce n’est pas la bonne, inverse.</span></div>' +
      '<button type="button" class="sw" role="switch" data-act="flip" aria-checked="' + !!p.flip + '" aria-label="Inverser les semaines A et B"></button></div></div>' +
      '<h2>Sauvegarde</h2><div class="liste">' +
      '<button type="button" class="lien-bloc" data-act="exporter">Exporter mes données<small>Crée un fichier de sauvegarde (à garder dans Fichiers ou iCloud).</small></button>' +
      '<button type="button" class="lien-bloc" data-act="importer">Importer une sauvegarde<small>Remplace tout ce qui est dans l’app.</small></button></div>' +
      '<h2>Autres</h2><div class="liste">' +
      '<button type="button" class="lien-bloc" data-act="import-scolarite">Récupérer les colles de Scolarité<small>Marche seulement si les deux apps partagent le même espace de stockage.</small></button>' +
      '<button type="button" class="lien-bloc danger" data-act="reset-tout">Tout effacer<small>Remet l’app comme au premier jour.</small></button></div>' +
      '<p class="note-bas">Tout reste dans ton téléphone. Rien n’est envoyé nulle part.</p>';
  }

  /* ------------------------------------------------------------------ */
  /* Feuilles : menus (en bas) et formulaires (en haut, à cause du clavier) */
  /* ------------------------------------------------------------------ */
  function fermerCalque() {
    var c = $('#calque'); c.hidden = true; c.innerHTML = ''; E.form = null; E.confirmation = null;
    document.body.classList.remove('feuille-ouverte');
  }
  function ouvrirMenu(html) {
    var c = $('#calque'); c.className = 'bas';
    c.innerHTML = '<div class="feuille" role="dialog" aria-modal="true">' + html + '</div>';
    c.hidden = false; document.body.classList.add('feuille-ouverte');
  }
  function confirmer(titre, texte, ok, action, danger) {
    E.confirmation = action;
    ouvrirMenu('<h3>' + esc(titre) + '</h3><p>' + esc(texte) + '</p><div class="rangee"><button type="button" class="btn" data-act="fermer">Annuler</button>' +
      '<button type="button" class="btn ' + (danger ? 'danger' : 'primaire') + '" data-act="ok-confirm">' + esc(ok) + '</button></div>');
  }
  function choix(act, titre, sous, extra, cls) {
    return '<button type="button" class="btn ' + (cls || '') + '" data-act="' + act + '"' + (extra || '') + '>' + esc(titre) + (sous ? '<small>' + esc(sous) + '</small>' : '') + '</button>';
  }
  function ouvrirForm(o) {
    E.form = o;
    var c = $('#calque'); c.className = 'haut';
    c.innerHTML = '<div class="feuille" role="dialog" aria-modal="true" aria-label="' + esc(o.titre) + '">' +
      '<div class="barre-feuille"><button type="button" class="btn petit" data-act="fermer">Annuler</button><b>' + esc(o.titre) + '</b>' +
      '<button type="button" class="btn petit primaire" data-act="ok-form">' + esc(o.ok || 'OK') + '</button></div>' +
      '<div class="corps-feuille">' + o.html + '<p class="erreur" id="erreur-form" role="alert" hidden></p>' +
      (o.supprimer ? '<button type="button" class="btn danger large" data-act="suppr-form">' + esc(o.supprLabel || 'Supprimer') + '</button>' : '') + '</div></div>';
    c.hidden = false; document.body.classList.add('feuille-ouverte');
    if (o.maj) o.maj();
    if (!coarse()) { var p = $('#calque input[type=text]'); if (p) p.focus(); }     // sur iPhone, on laisse le clavier fermé tant qu'on n'a rien touché
  }
  function erreurForm(msg) {
    var e = $('#erreur-form'); if (!e) return;
    e.textContent = msg; e.hidden = false;
    try { e.scrollIntoView({ block: 'nearest' }); } catch (x) { /* rien */ }
  }

  // champs
  function champTexte(nom, label, val, o) {
    o = o || {};
    return '<label class="champ"><span>' + esc(label) + '</span><input type="text" name="' + nom + '" value="' + esc(val || '') + '" maxlength="' + (o.max || 80) + '" autocomplete="off" autocorrect="off" autocapitalize="' + (o.cap || 'sentences') + '" enterkeyhint="done"' +
      (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + '></label>';
  }
  function champHeure(nom, label, val) { return '<label class="champ"><span>' + esc(label) + '</span><input type="time" name="' + nom + '" value="' + esc(val || '') + '"></label>'; }
  function champDate(nom, label, val) { return '<label class="champ"><span>' + esc(label) + '</span><input type="date" name="' + nom + '" value="' + esc(val || '') + '"></label>'; }
  function champSelect(nom, label, opts, val) {
    return '<label class="champ"><span>' + esc(label) + '</span><select name="' + nom + '">' + opts.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select></label>';
  }
  function chipSeg(g, v, label, on, multi) {
    return '<button type="button" class="chip' + (on ? ' actif' : '') + '" data-act="' + (multi ? 'seg-multi' : 'seg') + '" data-g="' + g + '" data-v="' + esc(v) + '" aria-pressed="' + !!on + '">' + esc(label) + '</button>';
  }
  function chipsRemplir(nom, valeurs) {
    return '<div class="chips" style="margin-top:-4px">' + valeurs.map(function (v) {
      return '<button type="button" class="chip petit" data-act="remplir" data-n="' + nom + '" data-v="' + esc(v) + '">' + esc(v) + '</button>';
    }).join('') + '</div>';
  }
  function interrupteur(nom, titre, sous, on, cible, inverse) {
    return '<div class="bascule"><div class="t"><b>' + esc(titre) + '</b>' + (sous ? '<span>' + esc(sous) + '</span>' : '') + '</div>' +
      '<button type="button" class="sw" role="switch" data-act="bascule-form" data-champ="' + nom + '" data-cible="' + cible + '"' + (inverse ? ' data-inverse="1"' : '') + ' aria-checked="' + !!on + '" aria-label="' + esc(titre) + '"></button></div>';
  }
  function val(nom) { var el = $('#calque [name="' + nom + '"]'); return el ? String(el.value) : ''; }
  function bool(nom) { var el = $('#calque [data-champ="' + nom + '"]'); return !!el && el.getAttribute('aria-checked') === 'true'; }
  function segVal(g) { var el = $('#calque [data-g="' + g + '"][aria-pressed="true"]'); return el ? att(el, 'v') : ''; }
  function segVals(g) { return $$('#calque [data-g="' + g + '"][aria-pressed="true"]').map(function (el) { return att(el, 'v'); }); }

  /* ---- Ajouter (le gros « + ») ---- */
  function cibleDate() { return E.vue === 'jour' ? E.jour : (E.vue === 'mois' ? E.sel : auj()); }
  function menuAjouter(date) {
    ouvrirMenu('<h3>Ajouter</h3><p>' + esc(nomJour(date) + ' ' + dateTxt(date)) + '</p><div class="choix">' +
      choix('ajout-bloc', 'Bloc', 'Un nom, une heure de début et de fin', ' data-d="' + date + '"') +
      choix('ajout-tache', 'Tâche', 'Une case à cocher', ' data-d="' + date + '"') +
      choix('ajout-event', 'Événement', 'Un rendez-vous, avec ou sans heure', ' data-d="' + date + '"') +
      choix('ajout-colle', 'Colle', 'Matière, colleur, salle', ' data-d="' + date + '"') +
      '</div><div class="rangee"><button type="button" class="btn large" data-act="fermer">Fermer</button></div>');
  }

  /* ---- Bloc ---- */
  function heuresParDefaut(date) {
    var nm = date === auj() ? Math.ceil(minNow() / 5) * 5 : 0;
    var v = T.composerJour(date, E.data).items.filter(function (i) { return i.kind === 'vide' && T.enMin(i.fin) - Math.max(T.enMin(i.debut), nm) >= 30; })[0];
    if (!v) return ['09:00', '10:00'];
    var d = Math.max(T.enMin(v.debut), nm), f = T.enMin(v.fin);
    if (f - d > 150) f = d + 60;
    return [T.enHeure(d), T.enHeure(f)];
  }
  function trouverBloc(id) {
    var ks = Object.keys(E.data.blocs);
    for (var i = 0; i < ks.length; i++) {
      var b = E.data.blocs[ks[i]].filter(function (x) { return x.id === id; })[0];
      if (b) return { date: ks[i], bloc: b };
    }
    return null;
  }
  function retirerBloc(id) {
    Object.keys(E.data.blocs).forEach(function (k) {
      E.data.blocs[k] = E.data.blocs[k].filter(function (b) { return b.id !== id; });
      if (!E.data.blocs[k].length) delete E.data.blocs[k];
    });
  }
  function formBloc(o) {
    var edit = !!o.id;
    ouvrirForm({
      titre: 'Bloc', ok: edit ? 'OK' : 'Ajouter',
      html: champTexte('nom', 'Nom', o.nom, { max: 60, placeholder: 'Ex. Révisions de maths' }) +
        '<div class="deux">' + champHeure('debut', 'Début', o.debut) + champHeure('fin', 'Fin', o.fin) + '</div>' + champDate('date', 'Jour', o.date),
      supprimer: edit ? function () { modifier(function () { retirerBloc(o.id); }, 'Bloc supprimé'); } : null,
      valider: function () {
        var b = { nom: val('nom'), debut: val('debut'), fin: val('fin') }, date = val('date');
        var err = T.validerBloc(b) || (T.dateValide(date) ? null : 'Choisis un jour.');
        if (err) return err;
        modifier(function () {
          if (edit) retirerBloc(o.id);
          (E.data.blocs[date] = E.data.blocs[date] || []).push({ id: o.id || T.nouvelId(), nom: b.nom.trim(), debut: b.debut, fin: b.fin });
        });
        if (date !== (E.vue === 'mois' ? E.sel : E.jour)) toast('Bloc ajouté : ' + nomJour(date).toLowerCase() + ' ' + dateTxt(date));
      }
    });
  }

  /* ---- Tâche ---- */
  function formTache(o) {
    var edit = !!o.id;
    ouvrirForm({
      titre: 'Tâche', ok: edit ? 'OK' : 'Ajouter',
      html: champTexte('texte', 'Tâche', o.texte, { max: 120, placeholder: 'Ex. Finir le DM de maths' }) + champDate('date', 'Pour le', o.date),
      supprimer: edit ? function () { modifier(function () { E.data.taches = E.data.taches.filter(function (t) { return t.id !== o.id; }); }, 'Tâche supprimée'); } : null,
      valider: function () {
        var t = { texte: val('texte'), date: val('date') }, err = T.validerTache(t);
        if (err) return err;
        modifier(function () {
          if (edit) { var x = E.data.taches.filter(function (y) { return y.id === o.id; })[0]; if (x) { x.texte = t.texte.trim(); x.date = t.date; } }
          else E.data.taches.push({ id: T.nouvelId(), date: t.date, texte: t.texte.trim(), fait: false });
        });
        if (!edit && t.date !== (E.vue === 'mois' ? E.sel : E.jour) && E.vue !== 'taches') toast('Tâche ajoutée : ' + nomJour(t.date).toLowerCase() + ' ' + dateTxt(t.date));
      }
    });
  }

  /* ---- Événement ---- */
  function formEvent(o) {
    var edit = !!o.id, timed = !!o.debut;
    ouvrirForm({
      titre: 'Événement', ok: edit ? 'OK' : 'Ajouter',
      html: champTexte('titre', 'Titre', o.titre, { max: 80, placeholder: 'Ex. Anniversaire de Paul' }) + champDate('date', 'Jour', o.date) +
        interrupteur('journee', 'Toute la journée', '', !timed, 'heures-event', true) +
        '<div class="deux" id="heures-event"' + (timed ? '' : ' hidden') + '>' + champHeure('debut', 'Début', o.debut || '14:00') + champHeure('fin', 'Fin', o.fin || '15:00') + '</div>',
      supprimer: edit ? function () { modifier(function () { E.data.events = E.data.events.filter(function (e) { return e.id !== o.id; }); }, 'Événement supprimé'); } : null,
      valider: function () {
        var e = { titre: val('titre'), date: val('date'), debut: bool('journee') ? '' : val('debut'), fin: bool('journee') ? '' : val('fin') }, err = T.validerEvent(e);
        if (err) return err;
        modifier(function () {
          var n = { id: o.id || T.nouvelId(), date: e.date, titre: e.titre.trim(), debut: e.debut, fin: e.fin };
          if (edit) E.data.events = E.data.events.map(function (x) { return x.id === o.id ? n : x; }); else E.data.events.push(n);
        });
        if (!edit && e.date !== (E.vue === 'mois' ? E.sel : E.jour)) toast('Événement ajouté : ' + nomJour(e.date).toLowerCase() + ' ' + dateTxt(e.date));
      }
    });
  }

  /* ---- Colle ---- */
  var DUREES = [[30, '30 min'], [45, '45 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h']];
  function formColle(o) {
    var edit = !!o.id, timed = o.debut !== '';
    ouvrirForm({
      titre: 'Colle', ok: edit ? 'OK' : 'Ajouter',
      html: champTexte('matiere', 'Matière', o.matiere, { max: 60, placeholder: 'Ex. Mathématiques' }) + chipsRemplir('matiere', T.MATIERES.filter(function (m) { return m !== 'Option'; })) +
        champTexte('colleur', 'Colleur', o.colleur, { max: 60, cap: 'words' }) + champTexte('salle', 'Salle', o.salle, { max: 40, cap: 'none' }) + champDate('date', 'Jour', o.date) +
        interrupteur('heure', 'Heure connue', 'Sinon la colle reste en haut de la journée', timed, 'heures-colle', false) +
        '<div id="heures-colle"' + (timed ? '' : ' hidden') + '><div class="deux">' + champHeure('debut', 'Début', o.debut || '17:00') +
        champSelect('duree', 'Durée', DUREES, o.duree || 60) + '</div></div>',
      supprimer: edit ? function () { modifier(function () { E.data.colles = E.data.colles.filter(function (c) { return c.id !== o.id; }); }, 'Colle supprimée'); } : null,
      valider: function () {
        var c = { date: val('date'), matiere: val('matiere'), debut: bool('heure') ? val('debut') : '' }, err = T.validerColle(c);
        if (err) return err;
        modifier(function () {
          var n = { id: o.id || T.nouvelId(), date: c.date, debut: c.debut, duree: +val('duree') || 60, matiere: c.matiere.trim(), colleur: val('colleur').trim(), salle: val('salle').trim() };
          if (edit) E.data.colles = E.data.colles.map(function (x) { return x.id === o.id ? n : x; }); else E.data.colles.push(n);
        });
        if (!edit && c.date !== (E.vue === 'mois' ? E.sel : E.jour) && E.vue !== 'plus') toast('Colle ajoutée : ' + nomJour(c.date).toLowerCase() + ' ' + dateTxt(c.date));
      }
    });
  }

  /* ---- Cours de l'emploi du temps ---- */
  function formCours(o) {
    var edit = !!o.id;
    ouvrirForm({
      titre: 'Cours', ok: edit ? 'OK' : 'Ajouter',
      html: champTexte('matiere', 'Matière', o.matiere, { max: 60, placeholder: 'Ex. Mathématiques' }) + chipsRemplir('matiere', T.MATIERES) +
        champTexte('prof', 'Professeur', o.prof, { max: 60, cap: 'words' }) + champTexte('salle', 'Salle', o.salle, { max: 40, cap: 'none' }) +
        champSelect('jour', 'Jour', [0, 1, 2, 3, 4, 5].map(function (j) { return [j, cap(T.JOURS[j])]; }), o.jour) +
        '<div class="deux">' + champHeure('debut', 'Début', o.debut) + champHeure('fin', 'Fin', o.fin) + '</div>' +
        '<span class="etiq-champ">Semaines</span><div class="chips">' + chipSeg('sem', 'AB', 'Toutes', o.semaine === 'AB') + chipSeg('sem', 'A', 'Semaine A', o.semaine === 'A') + chipSeg('sem', 'B', 'Semaine B', o.semaine === 'B') + '</div>',
      supprimer: edit ? function () { modifier(function () { E.data.edt = E.data.edt.filter(function (c) { return c.id !== o.id; }); }, 'Cours supprimé'); } : null,
      supprLabel: 'Supprimer ce cours',
      valider: function () {
        var c = { matiere: val('matiere'), debut: val('debut'), fin: val('fin') }, err = T.validerCours(c);
        if (err) return err;
        modifier(function () {
          var n = { id: o.id || T.nouvelId(), jour: +val('jour'), debut: c.debut, fin: c.fin, matiere: c.matiere.trim(), prof: val('prof').trim(), salle: val('salle').trim(), semaine: segVal('sem') || 'AB' };
          if (edit) E.data.edt = E.data.edt.map(function (x) { return x.id === o.id ? n : x; }); else E.data.edt.push(n);
        });
      }
    });
  }

  /* ---- DS / vacances ---- */
  function formDs(o) {
    var edit = !!o.date;
    ouvrirForm({
      titre: 'Semaine', ok: edit ? 'OK' : 'Ajouter',
      html: (edit ? '<p class="apercu" style="margin-top:0"><b>' + esc('Samedi ' + dateTxt(o.date, true)) + '</b></p>' : champDate('date', 'Un jour de cette semaine', o.nouvelle || '')) +
        champTexte('label', 'DS ou vacances', o.label, { max: 100, placeholder: 'Ex. Mathématiques (4h)' }) +
        '<div class="chips" style="margin-top:-4px"><button type="button" class="chip petit" data-act="remplir" data-n="label" data-v="">Pas de DS</button>' +
        '<button type="button" class="chip petit" data-act="remplir" data-n="label" data-v="Vacances de ">Vacances</button></div>' +
        '<p class="apercu">Le DS a lieu de 7:10 à 11:20, salle polyvalente. Un libellé qui commence par « Vacances » enlève les cours de toute la semaine.</p>',
      supprimer: edit ? function () { modifier(function () { delete E.data.ds[o.date]; }, 'Semaine retirée du planning'); } : null,
      supprLabel: 'Retirer cette semaine du planning',
      valider: function () {
        if (!edit && !T.dateValide(val('date'))) return 'Choisis une date.';
        var date = edit ? o.date : T.samediDe(val('date'));
        modifier(function () { E.data.ds[date] = val('label').trim().slice(0, 100); });
      }
    });
  }

  /* ---- Lever / coucher ---- */
  function formReveil() {
    ouvrirForm({
      titre: 'Réveil', ok: 'OK',
      html: '<p class="apercu" style="margin-top:0">Entre ces deux heures, tout ce qui n’est pas occupé devient un bloc libre.</p><div class="deux">' +
        champHeure('lever', 'Lever', E.data.prefs.lever) + champHeure('coucher', 'Coucher', E.data.prefs.coucher) + '</div>',
      valider: function () {
        var l = val('lever'), c = val('coucher'), err = T.validerReveil(l, c);
        if (err) return err;
        modifier(function () { E.data.prefs.lever = l; E.data.prefs.coucher = c; });
      }
    });
  }

  /* ---- Modèles et répétition ---- */
  function lireRepetition() {
    return { debut: val('debut'), semaines: +segVal('sem') || 2, jours: segVals('jour').map(Number), mode: segVal('mode') || 'remplacer' };
  }
  function apercuRepetition(modele) {
    var o = lireRepetition(), el = $('#apercu'); if (!el) return;
    var err = T.validerRepetition(o);
    if (err) { el.innerHTML = esc(err); return; }
    var p = T.planRepetition(E.data, modele, o);
    if (!p.dates.length) { el.innerHTML = 'Aucun jour ne correspond : change la date de début ou les jours.'; return; }
    el.innerHTML = '<b>' + pluriel(p.dates.length, 'jour') + '</b> du ' + esc(T.libelleCourt(p.dates[0])) + ' au ' + esc(T.libelleCourt(p.dates[p.dates.length - 1])) +
      (p.remplaces ? ' · ' + pluriel(p.remplaces, 'bloc existant', 'blocs existants') + ' remplacé' + (p.remplaces > 1 ? 's' : '') : '');
  }
  function formRepeter(modele, o) {
    var JL = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    ouvrirForm({
      titre: 'Répétition', ok: 'Répéter',
      html: (o.nomEditable
        ? '<p class="apercu" style="margin-top:0">Tes <b>' + pluriel(modele.blocs.length, 'bloc') + '</b> seront copiés sur les jours choisis. Les cours, colles et événements ne sont pas copiés.</p>' +
          champTexte('nom', 'Nom (facultatif : garde-la comme modèle)', '', { max: 40, placeholder: 'Ex. Journée de révision' })
        : '<p class="apercu" style="margin-top:0"><b>' + esc(modele.nom) + '</b> · ' + pluriel(modele.blocs.length, 'bloc') + '</p>') +
        champDate('debut', 'À partir du', o.debut) +
        '<span class="etiq-champ">Pendant</span><div class="chips">' + [1, 2, 3, 4].map(function (n) { return chipSeg('sem', n, n + (n > 1 ? ' semaines' : ' semaine'), n === o.semaines); }).join('') + '</div>' +
        '<span class="etiq-champ">Les jours</span><div class="jours-chips">' + JL.map(function (l, i) {
          return '<button type="button" class="chip' + (o.jours.indexOf(i) >= 0 ? ' actif' : '') + '" data-act="seg-multi" data-g="jour" data-v="' + i + '" aria-pressed="' + (o.jours.indexOf(i) >= 0) + '" aria-label="' + T.JOURS[i] + '">' + l + '</button>';
        }).join('') + '</div>' +
        '<span class="etiq-champ">Si un jour a déjà des blocs</span><div class="chips">' + chipSeg('mode', 'remplacer', 'Les remplacer', o.mode === 'remplacer') + chipSeg('mode', 'ajouter', 'Les garder', o.mode === 'ajouter') + '</div>' +
        '<p class="apercu" id="apercu"></p>',
      maj: function () { apercuRepetition(modele); },
      valider: function () {
        var opt = lireRepetition(), err = T.validerRepetition(opt);
        if (err) return err;
        var plan = T.planRepetition(E.data, modele, opt);
        if (!plan.dates.length) return 'Aucun jour ne correspond : change la date de début ou les jours.';
        var nom = o.nomEditable ? val('nom').trim() : '';
        modifier(function () {
          if (nom) E.data.modeles.push(T.modeleDepuisBlocs(nom, modele.blocs));
          T.appliquerRepetition(E.data, modele, opt);
        }, 'Journée répétée sur ' + pluriel(plan.dates.length, 'jour') + (nom ? ' · modèle « ' + nom + ' » gardé' : ''));
      }
    });
  }
  function repeterJour() {
    var s = E.jour, blocs = (E.data.blocs[s] || []).slice().sort(function (a, b) { return T.enMin(a.debut) - T.enMin(b.debut); });
    if (!blocs.length) return;
    formRepeter(T.modeleDepuisBlocs('', blocs), { nomEditable: true, debut: T.ajouterJours(s, 1), semaines: 2, jours: [0, 1, 2, 3, 4, 5, 6], mode: 'remplacer' });
  }
  function appliquerModele(id) {
    var m = E.data.modeles.filter(function (x) { return x.id === id; })[0]; if (!m) return;
    var cible = E.vue === 'jour' ? E.jour : auj();
    formRepeter(m, { nomEditable: false, debut: cible, semaines: 1, jours: [T.jourSemaine(cible)], mode: 'remplacer' });
  }

  /* ---- Menus ---- */
  function menuJour() {
    var s = E.jour, nb = (E.data.blocs[s] || []).length, nm = E.data.modeles.length;
    ouvrirMenu('<h3>' + esc(nomJour(s) + ' ' + dateTxt(s)) + '</h3>' +
      (nb || nm ? '' : '<p>Crée d’abord quelques blocs : tu pourras ensuite répéter cette journée sur les jours suivants.</p>') +
      '<div class="choix">' +
      (nb ? choix('repeter-jour', 'Répéter cette journée…', 'Copie tes ' + pluriel(nb, 'bloc') + ' sur d’autres jours') : '') +
      (nm ? choix('choisir-modele', 'Appliquer un modèle…', pluriel(nm, 'modèle') + ' enregistré' + (nm > 1 ? 's' : '')) : '') +
      (nb ? choix('vider-jour', 'Vider mes blocs de ce jour', 'Les cours et les colles restent', '', 'danger') : '') +
      '</div><div class="rangee"><button type="button" class="btn large" data-act="fermer">Fermer</button></div>');
  }
  function menuModele(id) {
    var m = E.data.modeles.filter(function (x) { return x.id === id; })[0]; if (!m) return;
    ouvrirMenu('<h3>' + esc(m.nom) + '</h3><p>' + esc(m.blocs.map(function (b) { return b.debut + ' ' + b.nom; }).join(' · ')) + '</p><div class="choix">' +
      choix('appliquer-modele', 'Appliquer…', 'Sur un ou plusieurs jours', ' data-id="' + esc(id) + '"', 'primaire') +
      choix('renommer-modele', 'Renommer', '', ' data-id="' + esc(id) + '"') +
      choix('suppr-modele', 'Supprimer ce modèle', 'Les jours déjà remplis ne changent pas', ' data-id="' + esc(id) + '"', 'danger') +
      '</div><div class="rangee"><button type="button" class="btn large" data-act="fermer">Fermer</button></div>');
  }
  function menuChoixModele() {
    ouvrirMenu('<h3>Quel modèle ?</h3><div class="choix">' + E.data.modeles.map(function (m) {
      return choix('appliquer-modele', m.nom, pluriel(m.blocs.length, 'bloc'), ' data-id="' + esc(m.id) + '"');
    }).join('') + '</div><div class="rangee"><button type="button" class="btn large" data-act="fermer">Fermer</button></div>');
  }
  function detailHtml(lignes) {
    return '<div class="detail">' + lignes.filter(function (l) { return l[1]; }).map(function (l) { return '<div><span>' + esc(l[0]) + '</span><span>' + esc(l[1]) + '</span></div>'; }).join('') + '</div>';
  }
  function voirCours(id) {
    var c = E.data.edt.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    ouvrirMenu('<h3>' + esc(c.matiere) + '</h3>' + detailHtml([['Horaire', c.debut + ' – ' + c.fin + ' (' + T.fmtDuree(T.enMin(c.fin) - T.enMin(c.debut)) + ')'], ['Professeur', c.prof], ['Salle', c.salle],
      ['Semaines', c.semaine === 'AB' ? 'Toutes' : 'Semaine ' + c.semaine + ' seulement'], ['Jour', cap(T.JOURS[c.jour]) + 's']]) +
      '<div class="rangee"><button type="button" class="btn" data-act="fermer">Fermer</button><button type="button" class="btn primaire" data-act="edit-cours" data-id="' + esc(id) + '">Modifier</button></div>');
  }
  function voirDs() {
    var s = E.jour, l = T.dsDuJour(s, E.data.ds);
    ouvrirMenu('<h3>DS du ' + esc(nomJour(s).toLowerCase() + ' ' + dateTxt(s)) + '</h3>' + detailHtml([['Épreuves', l || ''], ['Horaire', '7:10 – 11:20 (4 h 10)'], ['Salle', 'Salle polyvalente']]) +
      '<div class="rangee"><button type="button" class="btn" data-act="fermer">Fermer</button><button type="button" class="btn primaire" data-act="edit-ds" data-d="' + s + '">Modifier</button></div>');
  }

  /* ---- Sauvegarde ---- */
  function telecharger(txt, nom) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = nom;
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) { /* rien */ } a.remove(); }, 1500);
    toast('Sauvegarde exportée.');
  }
  function exporter() {
    var txt = T.exporter(E.data, Date.now()), nom = 'temps-sauvegarde-' + auj() + '.json', fichier = null;
    try { fichier = new File([txt], nom, { type: 'application/json' }); } catch (e) { /* vieux navigateur */ }
    if (fichier && navigator.canShare && navigator.share && navigator.canShare({ files: [fichier] })) {
      navigator.share({ files: [fichier], title: 'Sauvegarde Temps' }).catch(function (e) { if (!e || e.name !== 'AbortError') telecharger(txt, nom); });
      return;
    }
    telecharger(txt, nom);
  }
  function importerFichier(fichier) {
    var r = new FileReader();
    r.onload = function () {
      var res = T.lireSauvegarde(String(r.result));
      if (!res.ok) { toast(res.erreur); return; }
      confirmer('Remplacer tes données ?', 'Tout ce qui est dans l’app sera remplacé par le contenu de ce fichier. Tu pourras annuler juste après.', 'Remplacer', function () {
        modifier(function () { E.data = res.data; E.data.taches = T.purgerTaches(E.data.taches, auj()); }, 'Sauvegarde importée');
      }, true);
    };
    r.onerror = function () { toast('Impossible de lire ce fichier.'); };
    r.readAsText(fichier);
  }
  function importerScolarite() {
    var o = null;
    try { o = JSON.parse(localStorage.getItem('scolarite.v1')); } catch (e) { /* pas d'accès */ }
    var r = T.depuisScolarite(o);
    if (!r || !r.colles.length) { toast('Je ne trouve aucune colle de Scolarité sur cet appareil.'); return; }
    var inverse = (r.flip ? 1 : 0) !== E.data.prefs.flip;
    confirmer('Récupérer les colles ?', pluriel(r.colles.length, 'colle') + ' trouvée' + (r.colles.length > 1 ? 's' : '') + ' dans Scolarité (les doublons sont ignorés). Leur durée est mise à 1 h : modifie-la si besoin.' +
      (inverse ? ' Les semaines A et B seront aussi inversées pour correspondre à Scolarité.' : ''), 'Récupérer', function () {
      var n = 0;
      modifier(function () { n = T.fusionnerColles(E.data, r.colles); E.data.prefs.flip = r.flip ? 1 : 0; }, function () { return n ? pluriel(n, 'colle') + ' ajoutée' + (n > 1 ? 's' : '') : 'Aucune nouvelle colle (déjà là).'; });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */
  var actions = {
    onglet: function (el) { aller(att(el, 'v')); },
    'plus-retour': function () { E.sous = null; rendre(true); },
    sous: function (el) { E.sous = att(el, 'v'); rendre(true); },
    jour: function (el) { E.jour = T.ajouterJours(E.jour, +att(el, 'd')); rendre(true); },
    aujourdhui: function () { E.jour = auj(); rendre(true); },
    mois: function (el) { E.mois = T.moisSuivant(E.mois.annee, E.mois.mois, +att(el, 'd')); rendre(); },
    'sel-jour': function (el) {
      E.sel = att(el, 'd');
      if (E.sel.slice(0, 7) !== E.mois.annee + '-' + (E.mois.mois < 10 ? '0' : '') + E.mois.mois) E.mois = { annee: +E.sel.slice(0, 4), mois: +E.sel.slice(5, 7) };
      rendre();
    },
    'ouvrir-jour': function () { E.jour = E.sel; E.vue = 'jour'; rendre(true); },
    ajouter: function (el) { menuAjouter(att(el, 'd') || cibleDate()); },
    fermer: fermerCalque,
    'ok-confirm': function () { var a = E.confirmation; fermerCalque(); if (a) a(); },
    'annuler-action': function () { var f = E.annuler; E.annuler = null; $('#toast').hidden = true; if (f) f(); },

    'ajout-bloc': function (el) { var d = att(el, 'd') || E.jour, h = heuresParDefaut(d); formBloc({ date: d, nom: '', debut: h[0], fin: h[1] }); },
    'ajout-vide': function (el) { var d = att(el, 'f'), s = att(el, 'd'), a = T.enMin(s), b = T.enMin(d); if (b - a > 150) b = a + 60; formBloc({ date: E.jour, nom: '', debut: s, fin: T.enHeure(b) }); },
    'edit-bloc': function (el) { var r = trouverBloc(att(el, 'id')); if (r) formBloc({ id: r.bloc.id, date: r.date, nom: r.bloc.nom, debut: r.bloc.debut, fin: r.bloc.fin }); },
    'ajout-tache': function (el) { formTache({ date: att(el, 'd') || E.jour, texte: '' }); },
    'edit-tache': function (el) { var t = E.data.taches.filter(function (x) { return x.id === att(el, 'id'); })[0]; if (t) formTache({ id: t.id, date: t.date, texte: t.texte }); },
    cocher: function (el) {
      var t = E.data.taches.filter(function (x) { return x.id === att(el, 'id'); })[0]; if (!t) return;
      t.fait = !t.fait; sauver(); rendre();
    },
    'ajout-event': function (el) { formEvent({ date: att(el, 'd') || E.jour, titre: '', debut: '', fin: '' }); },
    'edit-event': function (el) { var e = E.data.events.filter(function (x) { return x.id === att(el, 'id'); })[0]; if (e) formEvent({ id: e.id, date: e.date, titre: e.titre, debut: e.debut, fin: e.fin }); },
    'ajout-colle': function (el) { formColle({ date: att(el, 'd') || E.jour, matiere: '', colleur: '', salle: '', debut: '17:00', duree: 60 }); },
    'edit-colle': function (el) {
      var c = E.data.colles.filter(function (x) { return x.id === att(el, 'id'); })[0];
      if (c) formColle({ id: c.id, date: c.date, matiere: c.matiere, colleur: c.colleur, salle: c.salle, debut: c.debut, duree: c.duree });
    },
    'voir-cours': function (el) { voirCours(att(el, 'id')); },
    'voir-ds': voirDs,
    'ajout-cours': function () { formCours({ jour: 0, debut: '08:00', fin: '10:00', matiere: '', prof: '', salle: '', semaine: 'AB' }); },
    'edit-cours': function (el) {
      var c = E.data.edt.filter(function (x) { return x.id === att(el, 'id'); })[0];
      if (c) formCours({ id: c.id, jour: c.jour, debut: c.debut, fin: c.fin, matiere: c.matiere, prof: c.prof, salle: c.salle, semaine: c.semaine });
    },
    'edit-ds': function (el) { var k = att(el, 'd'); formDs({ date: k, label: E.data.ds[k] || '' }); },
    'ajout-ds': function () { formDs({ label: '', nouvelle: T.ajouterJours(auj(), 7) }); },
    reveil: formReveil,
    'menu-jour': menuJour,
    'repeter-jour': repeterJour,
    'choisir-modele': menuChoixModele,
    'vider-jour': function () {
      var s = E.jour, n = (E.data.blocs[s] || []).length;
      confirmer('Vider cette journée ?', pluriel(n, 'bloc') + ' ser' + (n > 1 ? 'ont' : 'a') + ' supprimé' + (n > 1 ? 's' : '') + '. Les cours et les colles restent.', 'Vider', function () { modifier(function () { delete E.data.blocs[s]; }, 'Journée vidée'); }, true);
    },
    'menu-modele': function (el) { menuModele(att(el, 'id')); },
    'appliquer-modele': function (el) { appliquerModele(att(el, 'id')); },
    'renommer-modele': function (el) {
      var id = att(el, 'id'), m = E.data.modeles.filter(function (x) { return x.id === id; })[0]; if (!m) return;
      ouvrirForm({ titre: 'Renommer', ok: 'OK', html: champTexte('nom', 'Nom', m.nom, { max: 40 }),
        valider: function () { var n = val('nom').trim(); if (!n) return 'Donne un nom au modèle.'; modifier(function () { m.nom = n.slice(0, 40); }); } });
    },
    'suppr-modele': function (el) {
      var id = att(el, 'id');
      confirmer('Supprimer ce modèle ?', 'Les jours où tu l’as déjà utilisé ne changent pas.', 'Supprimer', function () { modifier(function () { E.data.modeles = E.data.modeles.filter(function (m) { return m.id !== id; }); }, 'Modèle supprimé'); }, true);
    },
    'ok-form': function () {
      var o = E.form; if (!o) return;
      var err = o.valider();
      if (err) { erreurForm(err); return; }
      fermerCalque();
    },
    'suppr-form': function () { var o = E.form; if (!o || !o.supprimer) return; fermerCalque(); o.supprimer(); },
    seg: function (el) {
      $$('#calque [data-g="' + att(el, 'g') + '"]').forEach(function (b) { var on = b === el; b.classList.toggle('actif', on); b.setAttribute('aria-pressed', on); });
      if (E.form && E.form.maj) E.form.maj();
    },
    'seg-multi': function (el) {
      var on = el.getAttribute('aria-pressed') !== 'true'; el.classList.toggle('actif', on); el.setAttribute('aria-pressed', on);
      if (E.form && E.form.maj) E.form.maj();
    },
    remplir: function (el) { var i = $('#calque [name="' + att(el, 'n') + '"]'); if (i) { i.value = att(el, 'v'); if (!coarse()) i.focus(); } },
    'bascule-form': function (el) {
      var on = el.getAttribute('aria-checked') !== 'true'; el.setAttribute('aria-checked', on);
      var c = $('#' + att(el, 'cible')); if (c) c.hidden = att(el, 'inverse') ? on : !on;
    },
    flip: function () { modifier(function () { E.data.prefs.flip = E.data.prefs.flip ? 0 : 1; }); },
    exporter: exporter,
    importer: function () { var f = $('#fichier'); if (f) f.click(); },
    'import-scolarite': importerScolarite,
    'reset-edt': function () {
      confirmer('Remettre l’emploi du temps d’origine ?', 'Tes changements à l’emploi du temps seront perdus. Tes blocs, colles et tâches ne bougent pas.', 'Remettre', function () {
        modifier(function () { E.data.edt = T.parDefaut().edt; }, 'Emploi du temps remis à l’origine');
      }, true);
    },
    'suppr-colles-passees': function () {
      confirmer('Effacer les colles passées ?', 'Seules les colles d’avant aujourd’hui sont supprimées.', 'Effacer', function () {
        var a = auj(); modifier(function () { E.data.colles = E.data.colles.filter(function (c) { return c.date >= a; }); }, 'Colles passées effacées');
      }, true);
    },
    'reset-tout': function () {
      confirmer('Tout effacer ?', 'Blocs, tâches, colles, événements, modèles et réglages seront supprimés, et l’emploi du temps remis à l’origine. Tu pourras annuler juste après.', 'Tout effacer', function () {
        modifier(function () { E.data = T.parDefaut(); }, 'Tout est effacé');
      }, true);
    }
  };

  document.addEventListener('click', function (e) {
    var cal = $('#calque');
    if (e.target === cal) { if (cal.className === 'bas') fermerCalque(); return; }      // un formulaire ne se ferme pas par un clic à côté : on perdrait ce qui est tapé
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var f = actions[att(el, 'act')];
    if (f) f(el, e);
  });
  document.addEventListener('toggle', function (e) {
    var t = e.target; if (t && t.getAttribute && t.getAttribute('data-act-toggle') === 'dsPasse') E.dsPasse = t.open;
  }, true);
  function majForm(e) {
    if (E.form && E.form.maj && $('#calque').contains(e.target)) E.form.maj();
  }
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'fichier') {
      if (e.target.files && e.target.files[0]) importerFichier(e.target.files[0]);
      e.target.value = '';
      return;
    }
    majForm(e);
  });
  document.addEventListener('input', majForm);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('#calque').hidden) { fermerCalque(); return; }
    if (e.key === 'Enter' && E.form && e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') { e.preventDefault(); actions['ok-form'](); }
  });

  /* ------------------------------------------------------------------ */
  /* Le temps qui passe : bloc « maintenant », minuit                    */
  /* ------------------------------------------------------------------ */
  function tick() {
    var a = auj();
    if (a !== E.aujourdhui) {                         // minuit est passé : les tâches cochées d'hier disparaissent
      var ancien = E.aujourdhui; E.aujourdhui = a;
      if (purger()) sauver();
      if (E.jour === ancien) E.jour = a;
      if (E.sel === ancien) E.sel = a;
      rendre();
      return;
    }
    if (E.vue === 'jour' && E.jour === a && $('#calque').hidden) {
      var cur = T.enCours(T.composerJour(a, E.data).items, minNow());
      if ((cur ? cur.id : '') !== E.sigMaint) rendre();
    }
  }
  setInterval(tick, 20000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); else sauver(); });
  window.addEventListener('pageshow', tick);

  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(function () { /* hors ligne : tant pis */ });

  window.__temps = {
    E: E, Temps: T, rendre: rendre, tick: tick,
    fixerHorloge: function (iso) { horlogeFixe = new Date(iso).getTime(); tick(); rendre(); }
  };
  rendre(true);
})();
