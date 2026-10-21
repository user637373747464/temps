'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../logique.js');
const D = require('../donnees.js');

const neuf = () => T.parDefaut();

/* ---------- heures et dates ---------- */
test('heures : conversion et validation', () => {
  assert.equal(T.enMin('07:10'), 430);
  assert.equal(T.enMin('7:10'), 430);
  assert.equal(T.enHeure(430), '07:10');
  assert.ok(isNaN(T.enMin('24:00')));
  assert.ok(isNaN(T.enMin('12:60')));
  assert.ok(isNaN(T.enMin('')));
  assert.ok(isNaN(T.enMin(null)));
  assert.equal(T.fmtDuree(45), '45 min');
  assert.equal(T.fmtDuree(120), '2 h');
  assert.equal(T.fmtDuree(125), '2 h 05');
});

test('dates : jour de la semaine, lundi, écarts (changement d\'heure compris)', () => {
  assert.equal(T.jourSemaine('2026-10-21'), 2);   // mercredi
  assert.equal(T.jourSemaine('2026-10-24'), 5);   // samedi
  assert.equal(T.jourSemaine('2026-10-25'), 6);   // dimanche
  assert.equal(T.lundiDe('2026-10-25'), '2026-10-19');
  assert.equal(T.lundiDe('2026-10-19'), '2026-10-19');
  assert.equal(T.ajouterJours('2026-10-24', 1), '2026-10-25');
  assert.equal(T.ajouterJours('2026-10-25', 1), '2026-10-26');   // nuit du passage à l'heure d'hiver
  assert.equal(T.ajouterJours('2027-03-27', 2), '2027-03-29');   // passage à l'heure d'été (28 mars 2027)
  assert.equal(T.ecartJours('2026-10-24', '2026-10-27'), 3);
  assert.equal(T.ecartJours('2027-03-27', '2027-03-29'), 2);
  assert.equal(T.ecartJours('2026-12-31', '2027-01-01'), 1);
  assert.ok(T.dateValide('2028-02-29'));
  assert.ok(!T.dateValide('2027-02-29'));
  assert.ok(!T.dateValide('2027-13-01'));
  assert.ok(!T.dateValide('hier'));
  assert.equal(T.libelleLong('2026-10-21'), 'Mercredi 21 octobre');
  assert.equal(T.libelleCourt('2026-10-21'), 'mer. 21 oct.');
  assert.equal(T.libelleCourt('2026-11-07'), 'sam. 7 nov.');
  assert.equal(T.libelleCourt('2027-04-03'), 'sam. 3 avr.');
  assert.equal(T.libelleCourt('2026-12-26'), 'sam. 26 déc.');
});

/* ---------- semaine A / B ---------- */
test('semaine A/B : alternance, ancre, inversion', () => {
  assert.equal(T.semaineAB('2026-09-07', 0), 'A');
  assert.equal(T.semaineAB('2026-09-13', 0), 'A');   // dimanche de la même semaine
  assert.equal(T.semaineAB('2026-09-14', 0), 'B');
  assert.equal(T.semaineAB('2026-09-21', 0), 'A');
  assert.equal(T.semaineAB('2026-09-07', 1), 'B');
  assert.equal(T.semaineAB('2026-09-14', 1), 'A');
  assert.equal(T.semaineAB('2026-11-02', 0), 'A');   // 8 semaines après l'ancre
  assert.equal(T.semaineAB('2026-11-09', 0), 'B');
  assert.equal(T.semaineAB('2026-08-31', 0), 'B');   // avant l'ancre
  assert.equal(T.semaineAB('2026-08-24', 0), 'A');
  assert.equal(T.semaineAB('2027-06-14', 0), 'A');   // 40 semaines après l'ancre
  assert.equal(T.semaineAB('2027-06-21', 0), 'B');   // 41 semaines
});

/* ---------- période scolaire ---------- */
test('période : vacances de Toussaint, Noël, Carnaval, Pâques', () => {
  const ds = D.DS;
  assert.equal(T.periode('2026-10-17', ds), 'cours');        // samedi de DS
  assert.equal(T.periode('2026-10-19', ds), 'vacances');
  assert.equal(T.periode('2026-10-21', ds), 'vacances');     // aujourd'hui
  assert.equal(T.periode('2026-10-24', ds), 'vacances');
  assert.equal(T.periode('2026-10-26', ds), 'vacances');
  assert.equal(T.periode('2026-10-31', ds), 'vacances');
  assert.equal(T.periode('2026-11-01', ds), 'vacances');     // dimanche de la 2e semaine de vacances
  assert.equal(T.periode('2026-11-02', ds), 'cours');
  assert.equal(T.nomVacances('2026-10-21', ds), 'Vacances de Toussaint');
  assert.equal(T.nomVacances('2026-11-03', ds), '');
  assert.equal(T.periode('2026-12-19', ds), 'cours');        // dernier DS avant Noël
  assert.equal(T.periode('2026-12-21', ds), 'vacances');
  assert.equal(T.periode('2026-12-28', ds), 'vacances');
  assert.equal(T.periode('2027-01-03', ds), 'vacances');     // dimanche
  assert.equal(T.periode('2027-01-04', ds), 'cours');        // reprise le lundi 4 janvier
  assert.equal(T.periode('2027-02-08', ds), 'vacances');
  assert.equal(T.periode('2027-02-15', ds), 'vacances');
  assert.equal(T.periode('2027-02-22', ds), 'cours');
  assert.equal(T.periode('2027-03-22', ds), 'vacances');
  assert.equal(T.periode('2027-03-29', ds), 'vacances');
  assert.equal(T.periode('2027-04-05', ds), 'vacances');
  assert.equal(T.periode('2027-04-12', ds), 'cours');
});

test('période : hors du planning de l\'année', () => {
  assert.equal(T.periode('2026-08-24', D.DS), 'hors');
  assert.equal(T.periode('2026-07-01', D.DS), 'hors');
  assert.equal(T.periode('2027-07-05', D.DS), 'hors');
  assert.equal(T.periode('2026-10-21', {}), 'hors');
});

test('DS : le samedi des semaines de cours seulement', () => {
  const ds = D.DS;
  assert.equal(T.dsDuJour('2026-10-17', ds), 'Français-philosophie (4h)');
  assert.equal(T.dsDuJour('2026-10-16', ds), null);          // vendredi
  assert.equal(T.dsDuJour('2026-10-24', ds), null);          // vacances
  assert.equal(T.dsDuJour('2027-01-30', ds), null);          // libellé vide
  assert.equal(T.dsDuJour('2027-05-29', ds), null);          // « Pas de DS »
  assert.equal(T.dsDuJour('2027-06-05', ds), null);
  assert.equal(T.dsDuJour('2026-11-07', ds), 'Physique-chimie (4h)');
  // les 41 samedis de DS : 4h ou 2×2h etc. (jamais vide si pas de vacances)
  Object.keys(ds).forEach(k => {
    assert.equal(T.jourSemaine(k), 5, k + ' doit être un samedi');
    if (!/^Vacances|^Pas de DS|^$/.test(ds[k])) assert.ok(T.dsDuJour(k, ds), k);
  });
});

/* ---------- l'emploi du temps ---------- */
function resume(s, data) {
  return T.coursDuJour(s, data).map(c => `${c.debut}-${c.fin} ${c.titre} ${c.prof} ${c.salle}`.trim());
}

test('emploi du temps : semaine A (7-11 septembre 2026… et 2-6 novembre 2026)', () => {
  const d = neuf();
  // Lundi 2 novembre (A)
  assert.deepEqual(resume('2026-11-02', d), [
    '07:10-09:05 Mathématiques Legeais 305',
    '09:25-11:20 Physique-chimie Caballero',
    '13:25-15:20 Français-philosophie Debbiche 305']);
  // Mardi 3 (A)
  assert.deepEqual(resume('2026-11-03', d), [
    '07:10-09:05 Mathématiques Legeais 305',
    '09:25-11:20 Physique-chimie Caballero 305',
    '13:25-15:20 SI TD Boisdur 325',
    '15:25-17:20 Mathématiques TD Legeais 305']);
  // Mercredi 4
  assert.deepEqual(resume('2026-11-04', d), [
    '07:10-09:05 Mathématiques Legeais 305',
    '13:25-15:20 Physique-chimie TP Caballero 339, 323 ou 333']);
  // Jeudi 5 (A) : avec ITC TP
  assert.deepEqual(resume('2026-11-05', d), [
    '07:10-09:05 Mathématiques Legeais 305',
    '09:25-11:20 Anglais Damo / Clerc 305',
    '13:25-15:20 ITC TP Moll 322']);
  // Vendredi 6
  assert.deepEqual(resume('2026-11-06', d), [
    '07:10-09:05 Mathématiques Legeais 305',
    '09:25-11:20 Physique-chimie Caballero 305']);
});

test('emploi du temps : semaine B (9-13 novembre 2026)', () => {
  const d = neuf();
  assert.deepEqual(resume('2026-11-09', d), [
    '07:10-09:05 Mathématiques Legeais 305',
    '09:25-11:20 SI Boisdur 325',
    '13:25-15:20 Français-philosophie Debbiche 305']);
  assert.deepEqual(resume('2026-11-10', d), [
    '07:10-09:05 Mathématiques Legeais 305',
    '09:25-11:20 Physique-chimie Caballero 305',
    '13:25-15:20 Physique-chimie TD Caballero 327',
    '15:25-17:20 Mathématiques TD Legeais 305']);
  assert.deepEqual(resume('2026-11-12', d), [         // pas d'ITC en semaine B
    '07:10-09:05 Mathématiques Legeais 305',
    '09:25-11:20 Anglais Damo / Clerc 305']);
});

test('emploi du temps : inverser A/B échange les semaines', () => {
  const d = neuf();
  d.prefs.flip = 1;
  assert.deepEqual(resume('2026-11-02', d), [
    '07:10-09:05 Mathématiques Legeais 305',
    '09:25-11:20 SI Boisdur 325',
    '13:25-15:20 Français-philosophie Debbiche 305']);
});

test('emploi du temps : rien pendant les vacances, ni le dimanche, ni hors année', () => {
  const d = neuf();
  assert.deepEqual(resume('2026-10-21', d), []);
  assert.deepEqual(resume('2026-10-27', d), []);
  assert.deepEqual(resume('2026-11-08', d), []);          // dimanche
  assert.deepEqual(resume('2026-07-01', d), []);
  assert.deepEqual(resume('2026-12-23', d), []);
});

test('emploi du temps : 16 créneaux, 5 jours, jamais deux cours en même temps dans la même semaine', () => {
  assert.equal(D.EDT.length, 16);
  const ids = new Set(D.EDT.map(c => c.id));
  assert.equal(ids.size, 16);
  ['A', 'B'].forEach(ab => {
    for (let j = 0; j < 5; j++) {
      const l = D.EDT.filter(c => c.jour === j && (c.semaine === 'AB' || c.semaine === ab));
      l.forEach(x => l.forEach(y => {
        if (x !== y) assert.ok(!(T.enMin(x.debut) < T.enMin(y.fin) && T.enMin(y.debut) < T.enMin(x.fin)), `${ab} j${j} ${x.id}/${y.id}`);
      }));
    }
  });
});

test('samedi de DS : bloc DS 7h10–11h20, salle polyvalente', () => {
  const d = neuf();
  const c = T.coursDuJour('2026-11-07', d);
  assert.equal(c.length, 1);
  assert.equal(c[0].kind, 'ds');
  assert.equal(c[0].debut, '07:10');
  assert.equal(c[0].fin, '11:20');
  assert.equal(c[0].salle, 'Salle polyvalente');
  assert.equal(c[0].detail, 'Physique-chimie (4h)');
  assert.deepEqual(T.coursDuJour('2026-11-14', d).map(x => x.detail), ['Mathématiques (4h)']);
  assert.deepEqual(T.coursDuJour('2026-10-24', d), []);   // vacances
  assert.deepEqual(T.coursDuJour('2027-05-29', d), []);   // pas de DS
});

/* ---------- composer une journée : blocs vides ---------- */
test('journée : les trous deviennent des blocs « vide » (perm) entre lever et coucher', () => {
  const d = neuf();
  const j = T.composerJour('2026-11-02', d);       // lundi A, lever 05:00, coucher 21:30
  const k = j.items.map(i => `${i.kind} ${i.debut}-${i.fin}`);
  assert.deepEqual(k, [
    'vide 05:00-07:10',
    'cours 07:10-09:05',
    'vide 09:05-09:25',
    'cours 09:25-11:20',
    'vide 11:20-13:25',
    'cours 13:25-15:20',
    'vide 15:20-21:30']);
  assert.equal(j.periode, 'cours');
  assert.equal(j.semaine, 'A');
});

test('journée : un trou de moins de 15 minutes n\'est pas affiché', () => {
  const d = neuf();
  d.prefs.lever = '07:00';
  d.blocs['2026-11-02'] = [{ id: 'x', nom: 'Petit', debut: '15:20', fin: '21:20' }];
  const k = T.composerJour('2026-11-02', d).items.map(i => `${i.kind} ${i.debut}-${i.fin}`);
  assert.ok(!k.some(s => s.startsWith('vide 07:00')), 'trou 07:00-07:10 (10 min) caché : ' + k.join(' | '));
  assert.ok(!k.some(s => s.startsWith('vide 21:20')), 'trou 21:20-21:30 (10 min) caché');
  assert.ok(k.includes('vide 09:05-09:25'));                       // 20 min : gardé
});

test('journée : mes blocs remplissent les trous, avec le nom seulement', () => {
  const d = neuf();
  d.blocs['2026-11-02'] = [
    { id: 'b1', nom: 'Colle de maths à préparer', debut: '16:00', fin: '18:00' },
    { id: 'b2', nom: 'Sport', debut: '18:30', fin: '19:30' }];
  const j = T.composerJour('2026-11-02', d);
  const k = j.items.map(i => `${i.kind} ${i.debut}-${i.fin}`);
  assert.deepEqual(k, [
    'vide 05:00-07:10', 'cours 07:10-09:05', 'vide 09:05-09:25', 'cours 09:25-11:20', 'vide 11:20-13:25', 'cours 13:25-15:20',
    'vide 15:20-16:00', 'bloc 16:00-18:00', 'vide 18:00-18:30', 'bloc 18:30-19:30', 'vide 19:30-21:30']);
  const b = j.items.find(i => i.id === 'b1');
  assert.equal(b.titre, 'Colle de maths à préparer');
  assert.ok(!b.prof && !b.salle);
});

test('journée : chevauchement signalé (conflit), sans bloc vide', () => {
  const d = neuf();
  d.blocs['2026-11-02'] = [{ id: 'b1', nom: 'Révisions', debut: '08:00', fin: '10:00' }];
  const j = T.composerJour('2026-11-02', d);
  const parId = id => j.items.find(i => i.id === id);
  assert.ok(parId('b1').conflit);
  assert.ok(parId('c01').conflit);
  assert.ok(parId('c02').conflit);
  assert.ok(!parId('c04').conflit);
  assert.ok(j.items.filter(i => i.kind === 'vide').every(v => v.conflit === undefined));
  // pas de trou fantôme à l'intérieur de la zone chevauchée
  const vides = j.items.filter(i => i.kind === 'vide').map(i => i.debut + '-' + i.fin);
  assert.deepEqual(vides, ['05:00-07:10', '11:20-13:25', '15:20-21:30']);
});

test('journée : collée avec heure = bloc fixe ; sans heure = bandeau « journée »', () => {
  const d = neuf();
  d.colles.push({ id: 'k1', date: '2026-11-04', debut: '17:00', duree: 60, matiere: 'Maths', colleur: 'M. Dupont', salle: '210' });
  d.colles.push({ id: 'k2', date: '2026-11-04', debut: '', duree: 60, matiere: 'Physique', colleur: '', salle: '' });
  const j = T.composerJour('2026-11-04', d);
  const k = j.items.find(i => i.id === 'k1');
  assert.equal(k.kind, 'colle');
  assert.equal(k.debut, '17:00');
  assert.equal(k.fin, '18:00');
  assert.equal(k.prof, 'M. Dupont');
  assert.equal(k.salle, '210');
  assert.deepEqual(j.journee.map(x => x.id), ['k2']);
});

test('journée : événements avec ou sans heure', () => {
  const d = neuf();
  d.events.push({ id: 'e1', date: '2026-10-21', titre: 'Dentiste', debut: '14:00', fin: '15:00' });
  d.events.push({ id: 'e2', date: '2026-10-21', titre: 'Anniversaire', debut: '', fin: '' });
  const j = T.composerJour('2026-10-21', d);    // en vacances : pas de cours
  assert.deepEqual(j.items.map(i => `${i.kind} ${i.debut}-${i.fin}`), ['vide 05:00-14:00', 'event 14:00-15:00', 'vide 15:00-21:30']);
  assert.deepEqual(j.journee.map(x => x.titre), ['Anniversaire']);
  assert.equal(j.periode, 'vacances');
  assert.equal(j.vacances, 'Vacances de Toussaint');
});

test('journée : tri stable (début, fin, type)', () => {
  const d = neuf();
  d.blocs['2026-10-21'] = [
    { id: 'z', nom: 'B', debut: '10:00', fin: '11:00' },
    { id: 'y', nom: 'A', debut: '08:00', fin: '09:00' },
    { id: 'x', nom: 'C', debut: '10:00', fin: '10:30' }];
  const ids = T.composerJour('2026-10-21', d).items.filter(i => i.kind === 'bloc').map(i => i.id);
  assert.deepEqual(ids, ['y', 'x', 'z']);
});

test('journée : lever/coucher décalés, et journée entièrement occupée', () => {
  const d = neuf();
  d.prefs.lever = '06:30'; d.prefs.coucher = '23:00';
  let k = T.composerJour('2026-11-02', d).items;
  assert.equal(k[0].debut, '06:30');
  assert.equal(k[k.length - 1].fin, '23:00');
  d.blocs['2026-10-21'] = [{ id: 'p', nom: 'Tout', debut: '05:00', fin: '23:00' }];
  d.prefs.lever = '05:00'; d.prefs.coucher = '22:00';
  k = T.composerJour('2026-10-21', d).items;
  assert.deepEqual(k.map(i => i.kind), ['bloc']);
});

test('enCours : le vrai bloc avant le trou', () => {
  const d = neuf();
  const j = T.composerJour('2026-11-02', d);
  assert.equal(T.enCours(j.items, T.enMin('08:00')).kind, 'cours');
  assert.equal(T.enCours(j.items, T.enMin('09:10')).kind, 'vide');
  assert.equal(T.enCours(j.items, T.enMin('09:05')).kind, 'vide');
  assert.equal(T.enCours(j.items, T.enMin('09:25')).kind, 'cours');
  assert.equal(T.enCours(j.items, T.enMin('04:00')), null);
  assert.equal(T.enCours(j.items, T.enMin('21:30')), null);
});

/* ---------- répéter une journée ---------- */
test('répétition : dates sur 2 semaines', () => {
  assert.deepEqual(T.datesRepetition('2026-10-21', 2, [0, 1, 2, 3, 4, 5, 6]).length, 14);
  assert.deepEqual(T.datesRepetition('2026-10-21', 2, [2]), ['2026-10-21', '2026-10-28']);
  assert.deepEqual(T.datesRepetition('2026-10-21', 2, [0, 6]), ['2026-10-25', '2026-10-26', '2026-11-01', '2026-11-02']);
  assert.deepEqual(T.datesRepetition('2026-10-21', 1, []), []);
});

test('répétition : remplacer ou ajouter, nouveaux identifiants, annulation possible', () => {
  const d = neuf();
  d.blocs['2026-10-21'] = [{ id: 'a', nom: 'Réviser', debut: '09:00', fin: '12:00' }, { id: 'b', nom: 'Sport', debut: '17:00', fin: '18:00' }];
  d.blocs['2026-10-22'] = [{ id: 'c', nom: 'Vieux', debut: '10:00', fin: '11:00' }];
  const m = T.modeleDepuisBlocs('Journée de révision', d.blocs['2026-10-21']);
  assert.equal(m.nom, 'Journée de révision');
  assert.equal(m.blocs.length, 2);
  assert.ok(m.blocs.every(b => !('id' in b)));

  const avant = JSON.stringify(d);
  const opt = { debut: '2026-10-22', semaines: 2, jours: [0, 1, 2, 3, 4], mode: 'remplacer' };
  const plan = T.planRepetition(d, m, opt);
  assert.equal(plan.dates.length, 10);
  assert.equal(plan.remplaces, 1);               // seul le 22 octobre avait des blocs
  assert.equal(plan.ajoutes, 20);
  assert.equal(JSON.stringify(d), avant, 'planRepetition ne modifie rien');

  const snapshot = JSON.stringify(d);
  T.appliquerRepetition(d, m, opt);
  assert.equal(d.blocs['2026-10-22'].length, 2);
  assert.equal(d.blocs['2026-10-22'][0].nom, 'Réviser');
  assert.ok(!d.blocs['2026-10-24'], 'samedi non coché');
  assert.equal(d.blocs['2026-11-04'].length, 2);
  assert.ok(!d.blocs['2026-11-05'], 'hors des 2 semaines');
  const ids = new Set();
  Object.keys(d.blocs).forEach(k => d.blocs[k].forEach(b => ids.add(b.id)));
  assert.equal(ids.size, 2 + 20, 'tous les identifiants sont différents');
  // annuler = revenir à l'instantané
  assert.deepEqual(JSON.parse(snapshot).blocs['2026-10-22'][0].nom, 'Vieux');

  // mode ajouter
  const d2 = neuf();
  d2.blocs['2026-10-22'] = [{ id: 'c', nom: 'Existant', debut: '19:00', fin: '20:00' }];
  const plan2 = T.appliquerRepetition(d2, m, { debut: '2026-10-22', semaines: 1, jours: [3], mode: 'ajouter' });
  assert.equal(plan2.remplaces, 0);
  assert.deepEqual(d2.blocs['2026-10-22'].map(b => b.nom), ['Existant', 'Réviser', 'Sport']);
});

test('répétition : un modèle vide efface les jours (et la clé disparaît)', () => {
  const d = neuf();
  d.blocs['2026-10-22'] = [{ id: 'c', nom: 'x', debut: '10:00', fin: '11:00' }];
  T.appliquerRepetition(d, { id: 'm', nom: 'vide', blocs: [] }, { debut: '2026-10-22', semaines: 1, jours: [3], mode: 'remplacer' });
  assert.ok(!('2026-10-22' in d.blocs));
});

test('répétition : validation', () => {
  assert.ok(T.validerRepetition({ debut: 'x', semaines: 2, jours: [1] }));
  assert.ok(T.validerRepetition({ debut: '2026-10-21', semaines: 0, jours: [1] }));
  assert.ok(T.validerRepetition({ debut: '2026-10-21', semaines: 9, jours: [1] }));
  assert.ok(T.validerRepetition({ debut: '2026-10-21', semaines: 2, jours: [] }));
  assert.equal(T.validerRepetition({ debut: '2026-10-21', semaines: 2, jours: [1] }), null);
});

/* ---------- tâches ---------- */
test('tâches : les cochées d\'un jour passé disparaissent, les autres restent', () => {
  const ts = [
    { id: '1', date: '2026-10-20', texte: 'a', fait: true },     // faite hier → supprimée
    { id: '2', date: '2026-10-20', texte: 'b', fait: false },    // non faite hier → reste (en retard)
    { id: '3', date: '2026-10-21', texte: 'c', fait: true },     // faite aujourd'hui → reste jusqu'à minuit
    { id: '4', date: '2026-10-22', texte: 'd', fait: true }];    // future cochée par avance → reste
  const r = T.purgerTaches(ts, '2026-10-21');
  assert.deepEqual(r.map(t => t.id), ['2', '3', '4']);
  assert.deepEqual(T.purgerTaches(r, '2026-10-22').map(t => t.id), ['2', '4']);
  assert.deepEqual(T.purgerTaches(r, '2026-10-23').map(t => t.id), ['2']);
  assert.deepEqual(T.enRetard(ts, '2026-10-21').map(t => t.id), ['2']);
  assert.deepEqual(T.enRetard(ts, '2026-10-20').map(t => t.id), []);
});

test('tâches : celles à faire d\'abord, les cochées en bas', () => {
  const ts = [
    { id: '1', date: '2026-10-21', texte: 'a', fait: true },
    { id: '2', date: '2026-10-21', texte: 'b', fait: false },
    { id: '3', date: '2026-10-21', texte: 'c', fait: true },
    { id: '4', date: '2026-10-21', texte: 'd', fait: false },
    { id: '5', date: '2026-10-22', texte: 'e', fait: false }];
  assert.deepEqual(T.tachesDuJour(ts, '2026-10-21').map(t => t.id), ['2', '4', '1', '3']);
  const av = T.tachesAVenir(ts, '2026-10-21');
  assert.equal(av.length, 1);
  assert.equal(av[0].date, '2026-10-22');
});

/* ---------- calendrier du mois ---------- */
test('calendrier : octobre 2026 commence un jeudi, lundi en premier', () => {
  const g = T.grilleMois(2026, 10);
  assert.equal(g[0][0].iso, '2026-09-28');
  assert.equal(g[0][3].iso, '2026-10-01');
  assert.ok(!g[0][0].dansMois);
  assert.ok(g[0][3].dansMois);
  assert.equal(g.length, 5);
  assert.equal(g[4][6].iso, '2026-11-01');
  assert.ok(g.every(s => s.length === 7));
});

test('calendrier : mois de 6 semaines, février de 4 semaines, janvier 2027', () => {
  assert.equal(T.grilleMois(2027, 5).length, 6);        // 1er mai 2027 = samedi, 31 jours
  assert.equal(T.grilleMois(2027, 2).length, 4);        // février 2027 : 1er = lundi, 28 jours
  assert.equal(T.grilleMois(2027, 1)[0][0].iso, '2026-12-28');
  T.grilleMois(2027, 2).flat().forEach(c => assert.ok(c.dansMois));
});

test('calendrier : mois suivant / précédent (changement d\'année)', () => {
  assert.deepEqual(T.moisSuivant(2026, 12, 1), { annee: 2027, mois: 1 });
  assert.deepEqual(T.moisSuivant(2027, 1, -1), { annee: 2026, mois: 12 });
  assert.deepEqual(T.moisSuivant(2026, 10, 0), { annee: 2026, mois: 10 });
  assert.deepEqual(T.moisSuivant(2026, 3, -14), { annee: 2025, mois: 1 });
});

test('calendrier : résumé du jour', () => {
  const d = neuf();
  d.colles.push({ id: 'k', date: '2026-11-04', debut: '17:00', duree: 60, matiere: 'Maths', colleur: '', salle: '' });
  d.events.push({ id: 'e', date: '2026-11-04', titre: 'X', debut: '', fin: '' });
  d.taches.push({ id: 't1', date: '2026-11-04', texte: 'a', fait: false }, { id: 't2', date: '2026-11-04', texte: 'b', fait: true });
  d.blocs['2026-11-04'] = [{ id: 'b', nom: 'x', debut: '18:00', fin: '19:00' }];
  assert.deepEqual(T.resumeJour('2026-11-04', d), { periode: 'cours', ds: false, colles: 1, events: 1, taches: 1, blocs: 1 });
  assert.equal(T.resumeJour('2026-11-07', d).ds, true);
  assert.equal(T.resumeJour('2026-10-21', d).periode, 'vacances');
});

/* ---------- validation des formulaires ---------- */
test('validation des formulaires', () => {
  assert.ok(T.validerBloc({ nom: '', debut: '08:00', fin: '09:00' }));
  assert.ok(T.validerBloc({ nom: 'x', debut: '', fin: '09:00' }));
  assert.ok(T.validerBloc({ nom: 'x', debut: '10:00', fin: '09:00' }));
  assert.ok(T.validerBloc({ nom: 'x', debut: '10:00', fin: '10:00' }));
  assert.equal(T.validerBloc({ nom: 'x', debut: '08:00', fin: '09:00' }), null);
  assert.ok(T.validerCours({ matiere: '', debut: '08:00', fin: '09:00' }));
  assert.equal(T.validerCours({ matiere: 'Maths', debut: '08:00', fin: '09:00' }), null);
  assert.equal(T.validerColle({ date: '2026-11-04', matiere: 'Maths', debut: '' }), null, 'heure à définir : permis');
  assert.ok(T.validerColle({ date: '2026-11-04', matiere: 'Maths', debut: '25:00' }));
  assert.ok(T.validerColle({ date: '2026-11-04', matiere: '', debut: '17:00' }));
  assert.equal(T.validerColle({ date: '2026-11-04', matiere: 'Maths', debut: '17:00' }), null);
  assert.ok(T.validerEvent({ titre: '', date: '2026-11-04' }));
  assert.ok(T.validerEvent({ titre: 'x', date: '' }));
  assert.equal(T.validerEvent({ titre: 'x', date: '2026-11-04', debut: '', fin: '' }), null);
  assert.equal(T.validerEvent({ titre: 'x', date: '2026-11-04', debut: '10:00', fin: '11:00' }), null);
  assert.ok(T.validerEvent({ titre: 'x', date: '2026-11-04', debut: '10:00', fin: '09:00' }));
  assert.ok(T.validerEvent({ titre: 'x', date: '2026-11-04', debut: '10:00', fin: '' }));
  assert.ok(T.validerEvent({ titre: 'x', date: '2026-11-04', debut: '', fin: '10:00' }));
  assert.ok(T.validerTache({ texte: '  ', date: '2026-11-04' }));
  assert.equal(T.validerTache({ texte: 'a', date: '2026-11-04' }), null);
  assert.ok(T.validerReveil('22:00', '06:00'));
  assert.equal(T.validerReveil('05:00', '21:30'), null);
});

/* ---------- solidité des données ---------- */
test('normaliser : n\'importe quoi donne des données utilisables', () => {
  [null, undefined, 0, 'x', [], {}, { prefs: 5 }, { edt: 'non', ds: [], blocs: 3, colles: {}, events: null, taches: 7 }].forEach(x => {
    const n = T.normaliser(x);
    assert.equal(n.v, 1);
    assert.ok(Array.isArray(n.edt) && Array.isArray(n.colles) && Array.isArray(n.events) && Array.isArray(n.taches) && Array.isArray(n.modeles));
    assert.ok(n.blocs && typeof n.blocs === 'object');
    assert.ok(T.heureValide(n.prefs.lever) && T.heureValide(n.prefs.coucher));
    T.composerJour('2026-11-02', n);      // ne plante pas
  });
  assert.equal(T.normaliser({}).edt.length, 16, 'sans edt fourni → EDT par défaut');
  assert.equal(T.normaliser({ edt: [] }).edt.length, 0, 'un EDT vide choisi par l\'utilisateur est respecté');
});

test('normaliser : élimine les entrées abîmées, garde les bonnes', () => {
  const n = T.normaliser({
    prefs: { lever: '06:00', coucher: '05:00', flip: 1 },
    edt: [{ jour: 1, debut: '08:00', fin: '09:00', matiere: 'Maths' }, { jour: 9, debut: '08:00', fin: '09:00', matiere: 'X' }, { jour: 1, debut: '10:00', fin: '09:00', matiere: 'Y' }, null],
    ds: { '2026-11-07': 'Maths', 'pas-une-date': 'x', '2026-11-14': 5 },
    blocs: { '2026-11-02': [{ nom: 'ok', debut: '10:00', fin: '11:00' }, { nom: '', debut: '10:00', fin: '11:00' }, { nom: 'inv', debut: '12:00', fin: '11:00' }], 'zzz': [{ nom: 'a', debut: '10:00', fin: '11:00' }], '2026-11-03': [] },
    colles: [{ date: '2026-11-04', matiere: 'Maths', debut: '17:00', duree: 999 }, { date: 'x', matiere: 'Maths' }],
    events: [{ date: '2026-11-04', titre: 'T', debut: '10:00' }, { date: '2026-11-04', titre: 'U', debut: '', fin: '11:00' }],
    taches: [{ date: '2026-11-04', texte: 'a', fait: 1 }, { date: '2026-11-04', texte: '' }],
    modeles: [{ nom: 'M', blocs: [{ nom: 'b', debut: '09:00', fin: '10:00' }, { nom: '', debut: '09:00', fin: '10:00' }] }, { nom: 'vide', blocs: [] }]
  });
  assert.equal(n.prefs.lever, '05:00', 'lever/coucher incohérents → valeurs par défaut');
  assert.equal(n.prefs.coucher, '21:30');
  assert.equal(n.prefs.flip, 1);
  assert.equal(n.edt.length, 1);
  assert.equal(n.edt[0].semaine, 'AB');
  assert.ok(n.edt[0].id);
  assert.deepEqual(Object.keys(n.ds), ['2026-11-07']);
  assert.deepEqual(Object.keys(n.blocs), ['2026-11-02']);
  assert.equal(n.blocs['2026-11-02'].length, 1);
  assert.equal(n.colles.length, 1);
  assert.equal(n.colles[0].duree, 60, 'durée absurde → 60');
  assert.equal(n.events.length, 2);
  assert.equal(n.events[0].fin, '11:00', 'fin manquante → +1 h');
  assert.equal(n.events[1].debut, '');
  assert.equal(n.events[1].fin, '', 'pas d\'heure de début → pas de fin');
  assert.equal(n.taches.length, 1);
  assert.equal(n.taches[0].fait, true);
  assert.equal(n.modeles.length, 1);
  assert.equal(n.modeles[0].blocs.length, 1);
});

test('normaliser : idempotent', () => {
  const d = neuf();
  d.blocs['2026-11-02'] = [{ id: 'a', nom: 'x', debut: '10:00', fin: '11:00' }];
  d.colles.push({ id: 'k', date: '2026-11-04', debut: '17:00', duree: 45, matiere: 'Maths', colleur: 'Z', salle: '1' });
  const n1 = T.normaliser(d);
  assert.deepEqual(T.normaliser(n1), n1);
  assert.deepEqual(n1, d);
});

test('export / import : aller-retour et fichiers invalides', () => {
  const d = neuf();
  d.blocs['2026-11-02'] = [{ id: 'a', nom: 'x', debut: '10:00', fin: '11:00' }];
  const txt = T.exporter(d, 123);
  const r = T.lireSauvegarde(txt);
  assert.ok(r.ok);
  assert.deepEqual(r.data, d);
  assert.ok(!T.lireSauvegarde('pas du json').ok);
  assert.ok(!T.lireSauvegarde('{"app":"autre","data":{}}').ok);
  assert.ok(!T.lireSauvegarde('null').ok);
  assert.ok(!T.lireSauvegarde(JSON.stringify({ app: 'temps' })).ok);
  assert.ok(T.lireSauvegarde(JSON.stringify({ app: 'temps', data: { blocs: { '2026-11-02': [{ nom: 'a', debut: '09:00', fin: '10:00' }] } } })).ok);
});

test('import des colles depuis Scolarité', () => {
  const o = { flip: 1, colles: [
    { id: 'c1', date: '2026-11-05', time: '17:30', subject: 'Maths', colleur: 'Mme X' },
    { id: 'c2', date: '2026-11-06', time: '', subject: 'Physique', colleur: '' },
    { id: 'c3', date: 'bad', time: '10:00', subject: 'Z', colleur: '' }] };
  const r = T.depuisScolarite(o);
  assert.equal(r.flip, 1);
  assert.equal(r.colles.length, 2);
  assert.equal(r.colles[0].debut, '17:30');
  assert.equal(r.colles[0].matiere, 'Maths');
  assert.equal(r.colles[0].colleur, 'Mme X');
  assert.equal(r.colles[1].debut, '');
  assert.equal(T.depuisScolarite(null), null);
  assert.equal(T.depuisScolarite({}), null);

  const d = neuf();
  assert.equal(T.fusionnerColles(d, r.colles), 2);
  assert.equal(T.fusionnerColles(d, r.colles), 0, 'pas de doublons');
  assert.equal(d.colles.length, 2);
});

test('identifiants : tous différents', () => {
  const s = new Set();
  for (let i = 0; i < 2000; i++) s.add(T.nouvelId());
  assert.equal(s.size, 2000);
});

test('données par défaut : copie indépendante de donnees.js', () => {
  const a = neuf();
  a.edt[0].matiere = 'MODIFIÉ';
  a.ds['2026-11-07'] = 'MODIFIÉ';
  assert.equal(D.EDT[0].matiere, 'Mathématiques');
  assert.equal(D.DS['2026-11-07'], 'Physique-chimie (4h)');
  assert.equal(neuf().edt[0].matiere, 'Mathématiques');
});

test('modification du planning DS : changer un samedi change le jour', () => {
  const d = neuf();
  d.ds['2026-11-07'] = 'Vacances exceptionnelles';
  assert.equal(T.periode('2026-11-04', d.ds), 'vacances');
  assert.deepEqual(T.coursDuJour('2026-11-04', d), []);
  d.ds['2026-11-07'] = '';
  assert.equal(T.periode('2026-11-04', d.ds), 'cours');
  assert.equal(T.dsDuJour('2026-11-07', d.ds), null);
});
