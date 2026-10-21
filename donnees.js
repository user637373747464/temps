/* donnees.js — ton emploi du temps (groupe 2, sans espagnol ni EPS) et le planning des DS.
 * Source : les deux images du lycée. Tout se modifie ensuite dans l'app (Plus › Emploi du temps). */
(function (racine, fabrique) {
  if (typeof module === 'object' && module.exports) module.exports = fabrique();
  else racine.Donnees = fabrique();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // lundi de la semaine considérée comme « A » (comme dans l'app Scolarité)
  var ANCRE_AB = '2026-09-07';

  var MATIERES = ['Mathématiques', 'Physique-chimie', 'SI', 'ITC', 'Français-philosophie', 'Anglais', 'Option'];

  // jour : 0 lundi … 4 vendredi ; semaine : 'AB' = toutes les semaines, 'A' ou 'B' = une semaine sur deux
  var EDT = [
    { id: 'c01', jour: 0, debut: '07:10', fin: '09:05', matiere: 'Mathématiques', prof: 'Legeais', salle: '305', semaine: 'AB' },
    { id: 'c02', jour: 0, debut: '09:25', fin: '11:20', matiere: 'Physique-chimie', prof: 'Caballero', salle: '', semaine: 'A' },
    { id: 'c03', jour: 0, debut: '09:25', fin: '11:20', matiere: 'SI', prof: 'Boisdur', salle: '325', semaine: 'B' },
    { id: 'c04', jour: 0, debut: '13:25', fin: '15:20', matiere: 'Français-philosophie', prof: 'Debbiche', salle: '305', semaine: 'AB' },

    { id: 'c05', jour: 1, debut: '07:10', fin: '09:05', matiere: 'Mathématiques', prof: 'Legeais', salle: '305', semaine: 'AB' },
    { id: 'c06', jour: 1, debut: '09:25', fin: '11:20', matiere: 'Physique-chimie', prof: 'Caballero', salle: '305', semaine: 'AB' },
    { id: 'c07', jour: 1, debut: '13:25', fin: '15:20', matiere: 'Physique-chimie TD', prof: 'Caballero', salle: '327', semaine: 'B' },
    { id: 'c08', jour: 1, debut: '13:25', fin: '15:20', matiere: 'SI TD', prof: 'Boisdur', salle: '325', semaine: 'A' },
    { id: 'c09', jour: 1, debut: '15:25', fin: '17:20', matiere: 'Mathématiques TD', prof: 'Legeais', salle: '305', semaine: 'AB' },

    { id: 'c10', jour: 2, debut: '07:10', fin: '09:05', matiere: 'Mathématiques', prof: 'Legeais', salle: '305', semaine: 'AB' },
    { id: 'c11', jour: 2, debut: '13:25', fin: '15:20', matiere: 'Physique-chimie TP', prof: 'Caballero', salle: '339, 323 ou 333', semaine: 'AB' },

    { id: 'c12', jour: 3, debut: '07:10', fin: '09:05', matiere: 'Mathématiques', prof: 'Legeais', salle: '305', semaine: 'AB' },
    { id: 'c13', jour: 3, debut: '09:25', fin: '11:20', matiere: 'Anglais', prof: 'Damo / Clerc', salle: '305', semaine: 'AB' },
    { id: 'c14', jour: 3, debut: '13:25', fin: '15:20', matiere: 'ITC TP', prof: 'Moll', salle: '322', semaine: 'A' },

    { id: 'c15', jour: 4, debut: '07:10', fin: '09:05', matiere: 'Mathématiques', prof: 'Legeais', salle: '305', semaine: 'AB' },
    { id: 'c16', jour: 4, debut: '09:25', fin: '11:20', matiere: 'Physique-chimie', prof: 'Caballero', salle: '305', semaine: 'AB' }
  ];

  // Devoirs surveillés du samedi (7h10–11h20, salle polyvalente). Les dates sont des samedis.
  // « Vacances … » : toute la semaine (lundi–samedi) est en vacances. Libellé vide = pas de DS.
  var DS = {
    '2026-09-05': 'Mathématiques (2h) / Français-philosophie (2h)',
    '2026-09-12': 'Mathématiques (4h)',
    '2026-09-19': 'Physique-chimie (4h)',
    '2026-09-26': 'Mathématiques (4h)',
    '2026-10-03': 'LV (2h) / Physique-chimie (2h)',
    '2026-10-10': 'SI (2h) / Mathématiques (2h)',
    '2026-10-17': 'Français-philosophie (4h)',
    '2026-10-24': 'Vacances de Toussaint',
    '2026-10-31': 'Vacances de Toussaint',
    '2026-11-07': 'Physique-chimie (4h)',
    '2026-11-14': 'Mathématiques (4h)',
    '2026-11-21': 'Physique-chimie (4h)',
    '2026-11-28': 'SI (2h) / ITC (2h)',
    '2026-12-05': 'Mathématiques (4h)',
    '2026-12-12': 'Français-philosophie (4h)',
    '2026-12-19': 'LV (1h30) / Physique-chimie (2h30)',
    '2026-12-26': 'Vacances de Noël',
    '2027-01-02': 'Vacances de Noël',
    '2027-01-09': 'SI (4h)',
    '2027-01-16': 'ITC (2h) / Mathématiques (2h)',
    '2027-01-23': 'ITC (2h) / Mathématiques (2h)',
    '2027-01-30': '',
    '2027-02-06': 'LV (3h)',
    '2027-02-13': 'Vacances de Carnaval',
    '2027-02-20': 'Vacances de Carnaval',
    '2027-02-27': 'Français-philosophie (4h)',
    '2027-03-06': 'Mathématiques (4h)',
    '2027-03-13': 'Option (4h)',
    '2027-03-20': 'Physique-chimie (4h)',
    '2027-03-27': 'Vacances de Pâques',
    '2027-04-03': 'Vacances de Pâques',
    '2027-04-10': 'Vacances de Pâques',
    '2027-04-17': 'Français-philosophie (4h)',
    '2027-04-24': 'LV (3h)',
    '2027-05-01': '',
    '2027-05-08': '',
    '2027-05-15': 'Option (4h)',
    '2027-05-22': 'Mathématiques (2h) / Physique-chimie (2h)',
    '2027-05-29': 'Pas de DS (concours blanc la semaine suivante)',
    '2027-06-05': 'Pas de DS (semaine du concours blanc)',
    '2027-06-12': '',
    '2027-06-19': '',
    '2027-06-26': ''
  };

  var DS_HORAIRE = { debut: '07:10', fin: '11:20', salle: 'Salle polyvalente' };

  return { ANCRE_AB: ANCRE_AB, MATIERES: MATIERES, EDT: EDT, DS: DS, DS_HORAIRE: DS_HORAIRE };
});
