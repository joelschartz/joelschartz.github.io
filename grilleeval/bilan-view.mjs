import {buildBilan, bilanCSV, weightOf} from './bilan.mjs?v=D1.63';
import {format, levelColour, levelFor, validate} from './model.mjs?v=D1.63';
import {validateGrading} from './analysis.mjs?v=D1.63';
import {descriptorColumnWidth} from './descriptor-layout.mjs?v=D1.63';

export function createBilanWorkspace({
  getDocument, getRevision, esc, icon, euroDate, highlightSearch, foldName, displayDescriptor,
  gradingLevelInk, gradingMenu, verticalGradingAxis, updateGradingAxis, download, notice, chooseFiles, onLayout, onSelection, onKeepResults = () => {}, onHistory = () => {}, onChange = () => {}, setGrading = () => {}, initial = null
}) {
  const tests = new Map();
  const folded = new Set();
  let search = '', scope = '', pupil = '';
  let listedTests = [], liveTest = null, listQuery = '';
  let manualScope = false, current = null, shown = [];
  let renderedRevision = -1, dirty = true;
  // D1.62 · Un seul barème : celui du test ouvert (d.grading). Le bilan n’a plus de barème propre.
  let grading = null, catalogue = null;
  let detailRow = null, detailsTrigger = null;
  // D1.52 · Annuler / rétablir : la sélection des tests, les coefficients et le barème du bilan.
  const past = [], future = [];
  let weightSession = null, descriptorWidth = 0;
  const HISTORY_LIMIT = 80;
  // D1.57 · Un bilan est un document : fichier .json (type grilleeval.bilan) avec les tests complets, leurs coefficients et le barème.
  let bilanId = '', savedSignature = '';
  const hash = text => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + text.length; };
  function signature() {
    return hash(JSON.stringify({tests:[...tests.values()].map(t => [t.id, String(t.weight), hash(JSON.stringify(t.doc))])}));
  }
  function exportBilan() {
    if (!bilanId) bilanId = 'b-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return {type:'grilleeval.bilan', schemaVersion:1, bilanId, title:'Bilan des compétences', savedAt:new Date().toISOString(),
      grading:grading || getDocument().grading || null, tests:[...tests.values()].map(t => ({weight:String(t.weight), doc:t.doc}))};
  }
  function readBilan(raw) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || data.type !== 'grilleeval.bilan') return null;
    if (data.schemaVersion !== 1 || !Array.isArray(data.tests)) throw new Error('Version de bilan non prise en charge.');
    const list = data.tests.map(t => { const doc = validate(JSON.stringify(t.doc)); const id = evaluationKey(doc); return {id, doc, weight:String(t.weight ?? '1')}; });
    const grade = data.grading ? validateGrading(data.grading) : null;
    return {list, grading:grade, bilanId:String(data.bilanId || '')};
  }
  function loadBilan(data, {undoable = true, saved = true} = {}) {
    if (undoable) record();
    tests.clear();
    for (const t of data.list) tests.set(t.id, t);
    bilanId = data.bilanId; weightSession = null;
    changed();
    savedSignature = saved ? signature() : '';
    onChange();
  }
  function isDirty() { return tests.size > 0 && signature() !== savedSignature; }
  function markSaved() { savedSignature = signature(); onChange(); }
  function snapshot() {
    return {tests:[...tests.values()].map(t => ({...t})), grading:getDocument().grading};
  }
  function record() {
    past.push(snapshot());
    if (past.length > HISTORY_LIMIT) past.shift();
    future.length = 0;
    onHistory();
  }
  function restore(state) {
    tests.clear();
    for (const t of state.tests) tests.set(t.id, {...t});
    if (state.grading && JSON.stringify(state.grading) !== JSON.stringify(getDocument().grading)) setGrading(state.grading);
    weightSession = null;
    changed();
  }
  function step(back) {
    const from = back ? past : future, to = back ? future : past;
    if (!from.length) return false;
    to.push(snapshot());
    restore(from.pop());
    onHistory();
    notice(back ? 'Dernière modification du bilan annulée.' : 'Modification du bilan rétablie.');
    return true;
  }
  function paneHeading(target, title, count = '', frame = true, display = esc(title)) {
    return `<span class="ge-pane-actions"><button type="button" class="ge-pane-heading" data-bilan-target="${target}" title="Aller à ce volet · conserver le zoom"
      aria-label="Aller au volet ${esc(title)}">${display}${count === null ? '' : ` <small${target === 'tests' ? ' data-bilan-count' : ''}>${count}</small>`}</button>${frame ? `<button type="button"
      class="ge-pane-frame" data-bilan-frame="${target}" title="Cadrer le volet ${esc(title)}" aria-label="Cadrer le volet ${esc(title)}">${icon('frame')}</button>` : ''}</span>`;
  }
  function shortLevel(label){return label==='En voie d’acquisition'?'En voie d’acq.':label;}
  function bilanPercent(v){return v==null?'—':format(Math.round(v*10)/10)+' %';}
  // D1.49 · Même rendu que « Compétences par élève » dans la grille.
  function bilanResult(r,tip=''){if(!r||r.percent==null)return `<div class="ge-competency-result ge-bilan-result" data-result-state="unassociated"${tip?` title="${esc(tip)}"`:''}><strong class="ge-result-label">—</strong></div>`;
   const label=r.level==null?'':grading.labels[r.level];return `<div class="ge-competency-result ge-bilan-result" data-bilan-score="${r.percent}" data-level="${r.level??''}" style="--lv:${gradingLevelInk(r.level,grading)}"${tip?` title="${esc(tip)}"`:''}><strong class="ge-result-label">${esc(shortLevel(label))}</strong><small class="ge-result-percent">${bilanPercent(r.percent)}</small><i><b style="width:${Math.max(0,Math.min(100,r.percent))}%;background:${levelColour(grading,r.level)}"></b></i></div>`;}
  function bilanSections(list){const sections=[];for(const c of list){let s=sections.find(x=>x.name===c.section);if(!s)sections.push(s={name:c.section,items:[]});s.items.push(c);}return sections;}
  function bilanLevelName(c){return c.kind==='avance'?'Avancé':c.kind==='libre'?'Libre':'Socle';}
  function sectionToggle(section) {
    return `<button type="button" class="ge-bilan-fold" data-bilan-fold="${esc(section.name)}" aria-expanded="${!folded.has(section.name)}">
      <span class="ge-category-chevron">${icon('chevron')}</span><strong>${esc(section.name)}</strong>
      <small>${section.items.length} compétence${section.items.length > 1 ? 's' : ''}</small></button>`;
  }

  function bilanSectionRow(section, columns) {
    return `<tr class="ge-bilan-section"><th colspan="${columns}">${sectionToggle(section)}</th></tr>`;
  }

  function singleTestBadge(c) {
    if (current.evaluations < 2 || c.evaluations.size !== 1) return '';
    const source = tests.get(c.evaluations.values().next().value);
    return `<em class="ge-bilan-single" title="${esc(source?.doc.title || 'Compétence évaluée dans un seul test')}">1 seul test</em>`;
  }

  function competencyMeta(c) {
    const n = c.evaluations.size;
    const coverage = singleTestBadge(c) || (current.evaluations > 1 ? `${n} tests sur ${current.evaluations}` : '1 test');
    return `<small class="ge-bilan-competency-meta"><span>${esc(bilanLevelName(c))}</span><span>${coverage}</span></small>`;
  }

  function bilanDescriptor(c) {
    return `<th scope="row" class="ge-bilan-desc" title="${esc(c.text)}"><div class="ge-bilan-pin"><span>${highlightSearch(displayDescriptor(c.text),search)}</span>${competencyMeta(c)}</div></th>`;
  }

  function describeGraphic(label,percent,status,note) {
    return [label,percent == null ? '' : bilanPercent(percent),status,note].filter(Boolean).join(' · ');
  }

  function graphic({label,percent,vertical=false,missing='Aucun résultat complet',note=''}) {
    const value = bilanPercent(percent), level = levelFor(percent,grading);
    const status = level == null ? missing : grading.labels[level];
    const description = describeGraphic(label,percent,status,note);
    const length = Math.max(0,Math.min(100,percent ?? 0));
    const attrs = `role="img" aria-label="${esc(description)}" title="${esc(description)}" data-level="${level ?? ''}"
      ${level == null ? '' : `data-bilan-percent="${percent}" data-graphic-label="${esc(label)}"${note ? ` data-graphic-note="${esc(note)}"` : ''}`}
      style="--amount:${length}%;--bar-colour:${levelColour(grading,level)};--lv:${gradingLevelInk(level,grading)}"`;
    const grade = `<small class="ge-bilan-graphic-level">${esc(shortLevel(status))}</small>`;
    if (vertical) {
      return `<div class="ge-bilan-column" ${attrs}><div class="ge-bilan-column-plot" aria-hidden="true">
        ${level == null ? '' : '<i class="ge-column-fill"></i>'}<strong class="ge-bilan-column-value">${value}</strong></div>${grade}</div>`;
    }
    return `<div class="ge-bilan-hbar" ${attrs}><div class="ge-bilan-bar-track" aria-hidden="true">
      ${level == null ? '' : '<i></i>'}</div><strong class="ge-result-percent">${value}</strong>${grade}</div>`;
  }

  function overallColumn(person) {
    const {percent,count} = person.overall;
    const note = count + (count === 1 ? ' test complet' : ' tests complets') + ' sur ' + person.tests.size;
    return graphic({label:person.name,percent,vertical:true,missing:'Aucun test complet',note});
  }

  function testColumn(person,test) {
    const result = person.tests.get(test.id);
    const missing = !result ? 'Hors de ce test' : result.absent ? 'Absent(e)' : 'Test incomplet';
    return graphic({label:person.name + ' · ' + test.doc.title,percent:result?.percent,vertical:true,missing});
  }

  function detailTrigger(content,person,c,result) {
    if (!result?.parts.length) return content;
    return `<button type="button" class="ge-bilan-cell-trigger" data-bilan-cell data-bilan-cell-pupil="${esc(person.key)}"
      data-bilan-cell-competency="${esc(c.key)}" aria-expanded="false" aria-label="Détail : ${esc(person.name)}, ${esc(c.text)}">${content}</button>`;
  }

  function resultRow(c,person) {
    const result = person ? current.cell(person.key,c.key) : current.classMean(c.key);
    let cells;
    if (person) {
      const parts = new Map(result?.parts.map(part=>[part.evaluation,part]));
      cells = current.used.map(e=>{
        const part = parts.get(e.id);
        return `<td class="ge-bilan-part">${part ? `<strong>${bilanPercent(part.percent)}</strong><small>${format(part.points)} / ${format(part.possible)} pts</small>` :
          c.evaluations.has(e.id) ? '<small title="Résultat incomplet ou élève absent">incomplet</small>' : '<small class="ge-bilan-none">—</small>'}</td>`;
      });
    } else {
      cells = current.pupils.map(p=>{
        const x = current.cell(p.key,c.key);
        const content = bilanResult(x,x ? '' : p.name + ' · pas de résultat complet');
        return `<td>${detailTrigger(content,p,c,x)}</td>`;
      });
    }
    const subject = person ? person.name : 'Moyenne de la classe';
    const bar = graphic({label:subject + ' · ' + displayDescriptor(c.text),percent:result?.percent});
    return `<tr>${bilanDescriptor(c)}${cells.join('')}<td class="ge-bilan-class">${person ? detailTrigger(bar,person,c,result) : bar}</td></tr>`;
  }

  function columnAxis(person) {
    return `<th scope="row" class="ge-bilan-corner ge-bilan-axis-cell"><div class="ge-bilan-pin">
      <section class="ge-bilan-grading" aria-label="Barème">
        <div class="ge-vertical-heading">${paneHeading('chart','Résultats · Barème',null,true,'<span class="ge-bilan-heading-prefix">Résultats · </span>Barème')}${gradingMenu()}</div>
        <div data-bilan-axis>${verticalGradingAxis(grading)}</div>
        <small class="ge-bilan-axis-caption">${person ? 'Score global par test' : 'Moyenne pondérée<span> des tests complets</span>'}</small>
      </section></div></th>`;
  }

  function resultTable() {
    const person = pupil ? current.pupils.find(p=>p.key===pupil) : null;
    const n = person ? current.used.length : current.pupils.length;
    const columns = n+2;
    const top = person ? current.used.map(e=>testColumn(person,e)) : current.pupils.map(overallColumn);
    const names = person ? current.used.map(e=>`<th scope="col"><small>${esc([e.doc.date ? euroDate(e.doc.date) : '',weightOf(e.weight)!==1 ? '× '+format(weightOf(e.weight)) : ''].filter(Boolean).join(' · '))}</small><span>${esc(e.doc.title)}</span></th>`) :
      current.pupils.map((p,i)=>`<th scope="col"><button type="button" class="ge-bilan-pupil" data-bilan-pupil="${esc(p.key)}" title="Voir le bilan de ${esc(p.name)}">
        <small>${String(i+1).padStart(2,'0')}</small><span>${esc(p.name)}</span></button></th>`);
    let rows = bilanSections(shown).map(section=>bilanSectionRow(section,columns) +
      (folded.has(section.name) ? '' : section.items.map(c=>resultRow(c,person)).join(''))).join('');
    if (!rows) {
      const message = current.competencies.length ? 'Aucune compétence ne correspond.' : 'Ces tests n’ont aucune compétence associée à des exercices.';
      rows = `<tr><td colspan="${columns}"><p class="ge-bilan-empty">${message}</p></td></tr>`;
    }
    return `<table class="ge-bilan-table${person ? ' ge-bilan-detail' : ''}" aria-label="${person ? 'Bilan de '+esc(person.name) : 'Bilan des élèves et des compétences'}"
      style="width:calc(var(--bilan-descriptor) + ${n*136}px + var(--bilan-bar-width))">
      <colgroup><col class="ge-bilan-descriptor-col">${n ? `<col span="${n}">` : ''}<col class="ge-bilan-bar-col"></colgroup>
      <thead><tr class="ge-bilan-totals">${columnAxis(person)}${top.map(bar=>`<td>${bar}</td>`).join('')}
        ${person ? `<td class="ge-bilan-overall"><span>Moyenne des tests</span>${overallColumn(person)}</td>` : '<td class="ge-bilan-chart-gap" aria-hidden="true"></td>'}</tr>
        <tr class="ge-bilan-column-heads"><th scope="col" class="ge-bilan-corner"><div class="ge-bilan-pin">${paneHeading('table',person ? person.name : 'Compétences',String(shown.length))}</div></th>${names.join('')}
          <th scope="col" class="ge-bilan-class" data-bilan-bar-head>${paneHeading('competencies',person ? 'Bilan de '+person.name : 'Moyenne de la classe',null)}
            <div class="ge-bilan-bar-axis" aria-hidden="true"><i>0 %</i><i>50 %</i><i>100 %</i></div>
          </th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function updateChartGuides(scale) {
    const lines = scale.thresholds.map(n=>`linear-gradient(to top,transparent calc(${n}% - .5px),var(--line) calc(${n}% - .5px),var(--line) calc(${n}% + .5px),transparent calc(${n}% + .5px))`);
    visual.style.setProperty('--bilan-guides',lines.join(',') || 'none');
  }

  const element = document.createElement('div');
  element.className = 'ge-bilan-plan';
  element.innerHTML = `
    <section class="ge-bilan-selection ge-bilan-sheet" data-bilan-area="tests" aria-label="Tests du bilan">
      <div class="ge-section ge-bilan-head">
        ${paneHeading('tests','Tests du bilan','0')}
        <button type="button" class="ge-button" data-bilan-pick data-direct-control title="Ajouter des fichiers de test">+ Tests</button>
      </div>
      <div class="ge-bilan-list-tools" data-bilan-list-tools hidden>
        <span class="ge-search-box"><input type="search" data-bilan-list-search aria-label="Rechercher un test" placeholder="Rechercher un test…" autocomplete="off"><button type="button"
          class="ge-search-clear" data-bilan-search-clear="list" aria-label="Effacer la recherche" title="Effacer la recherche" hidden>${icon('close')}</button></span>
      </div>
      <div data-bilan-tests></div>
      <p class="ge-bilan-warning" data-bilan-collisions role="status" hidden></p>
      <button type="button" class="ge-bilan-drop" data-bilan-pick data-bilan-empty data-direct-control>
        <strong>Choisir des tests…</strong><small>ou déposer les fichiers .json ici</small></button>
    </section>
    <section class="ge-bilan-results ge-bilan-sheet" data-bilan-area="results" data-bilan-result aria-label="Résultats du bilan" hidden>
      <div class="ge-bilan-tools">
        <div class="ge-section ge-bilan-head">${paneHeading('results','Résultats du bilan',null)}</div>
        <div class="ge-bilan-toolbar">
          <select data-bilan-view aria-label="Élèves affichés"></select>
          <div class="ge-segment" role="group" aria-label="Compétences affichées" data-bilan-scopes></div>
          <span class="ge-search-box ge-bilan-search"><input type="search" data-bilan-search placeholder="Chercher une compétence…" aria-label="Chercher une compétence" autocomplete="off"><button type="button"
            class="ge-search-clear" data-bilan-search-clear="competencies" aria-label="Effacer la recherche" title="Effacer la recherche" hidden>${icon('close')}</button></span>
        </div>
        <small class="ge-bilan-scale-note" data-bilan-scale-note hidden>Certains tests ont été enregistrés avec un autre barème ; le bilan applique le barème actuel.</small>
      </div>
      <div data-bilan-table></div>
    </section>`;

  const find = selector => element.querySelector(selector);
  const selection = find('[data-bilan-area="tests"]'), results = find('[data-bilan-result]');
  const visual = find('[data-bilan-table]'), scopes = find('[data-bilan-scopes]');
  const pupilSelect = find('[data-bilan-view]');
  const searchInput = find('[data-bilan-search]'), listSearch = find('[data-bilan-list-search]');
  function syncClear() {
    find('[data-bilan-search-clear="competencies"]').hidden = !searchInput.value;
    find('[data-bilan-search-clear="list"]').hidden = !listSearch.value;
  }
  // Même logique que la colonne des compétences du test : deux lignes au plus, méta à droite, entre 380 et 760 px.
  let measureContext = null;
  function sizeDescriptors() {
    if (!current) return;
    const sample = visual.querySelector('.ge-bilan-desc span');
    const font = sample && window.getComputedStyle ? window.getComputedStyle(sample).font : '';
    if (!measureContext) {
      try { measureContext = document.createElement('canvas').getContext('2d'); } catch { measureContext = null; }
    }
    const narrow = (window.innerWidth || 1200) <= 800;
    let width = 0;
    if (!narrow && measureContext && font) {
      measureContext.font = font;
      width = descriptorColumnWidth(current.competencies.map(c => displayDescriptor(c.text)),
        text => measureContext.measureText(text).width, {min:380, max:760, padding:142});
    }
    if (width === descriptorWidth) return;
    descriptorWidth = width;
    if (width) element.style.setProperty('--bilan-descriptor', width + 'px');
    else element.style.removeProperty('--bilan-descriptor');
  }

  function evaluationKey(doc) {
    return doc.evalId ? 'id:' + doc.evalId : 'test:' + doc.title + '|' + (doc.date || '');
  }

  function selectedPupils() {
    return current.pupils.filter(p => shown.some(c => current.cell(p.key, c.key)));
  }

  function closeDetails(restoreFocus = false) {
    if (!detailRow) return;
    detailRow.remove();
    detailRow = null;
    detailsTrigger?.setAttribute('aria-expanded','false');
    if (restoreFocus && detailsTrigger?.isConnected) detailsTrigger.focus({preventScroll:true});
    detailsTrigger = null;
    onLayout();
  }

  function drawResults() {
    const query = foldName(search);
    shown = current.competencies.filter(c =>
      (scope !== 'shared' || c.evaluations.size > 1) && (!query || foldName(c.text).includes(query)));
    closeDetails();
    visual.innerHTML = current.evaluations ? resultTable() : `<p class="ge-bilan-empty">Aucun test avec un coefficient positif. ${gradingMenu()}</p>`;
    updateChartGuides(grading);
    sizeDescriptors();
    onLayout();
  }

  function choosePupil(key) {
    pupil = key;
    pupilSelect.value = key;
    drawResults();
    // D1.63 · Choisir un élève (ou toute la classe) ne déplace plus la vue : seulement si le tableau n’est plus visible.
    onKeepResults();
  }

  function drawControls() {
    const shared = current.competencies.filter(c => c.evaluations.size > 1).length;
    if (!manualScope || !shared) scope = current.evaluations > 1 && shared ? 'shared' : '';
    scopes.hidden = current.evaluations < 2;
    scopes.innerHTML = `<button type="button" data-bilan-scope="shared" title="Compétences évaluées dans au moins deux tests" ${shared ? '' : 'disabled'} aria-pressed="${scope === 'shared'}">En commun <small>${shared}</small></button>
      <button type="button" data-bilan-scope="" aria-pressed="${scope !== 'shared'}">Toutes <small>${current.competencies.length}</small></button>`;
    if (pupil && !current.pupils.some(p => p.key === pupil)) pupil = '';
    pupilSelect.innerHTML = '<option value="">Toute la classe</option>' + current.pupils.map(p =>
      `<option value="${esc(p.key)}">${esc(p.name)}</option>`).join('');
    pupilSelect.value = pupil;
  }

  function drawTestList() {
    const rows = find('[data-bilan-tests]');
    find('[data-bilan-list-tools]').hidden = listedTests.length < 5;
    find('[data-bilan-empty]').hidden = listedTests.length > 0;
    if (!listedTests.length) { rows.replaceChildren(); return; }
    const query = foldName(listQuery);
    const matches = query ? listedTests.filter(e =>
      foldName(e.doc.title + ' ' + euroDate(e.doc.date)).includes(query)) : listedTests;
    if (!matches.length) { rows.innerHTML = '<p class="ge-bilan-list-empty">Aucun test trouvé.</p>'; return; }
    rows.innerHTML = '<div class="ge-bilan-tests-head"><span>Test</span><span>Coefficient</span></div>' +
      matches.map(e => `<div class="ge-bilan-test-row" data-bilan-test="${esc(e.id)}">
        <span class="ge-bilan-test-name"><strong>${esc(e.doc.title)}</strong><small>${esc([e === liveTest ? 'Test ouvert' : '', euroDate(e.doc.date)].filter(Boolean).join(' · ') || 'Sans date')}</small></span>
        <input data-bilan-weight="${esc(e.id)}" data-direct-control value="${esc(String(e.weight).replace('.', ','))}" ${weightOf(e.weight) ? '' : 'class="ge-invalid" aria-invalid="true"'} inputmode="decimal" autocomplete="off" aria-label="Coefficient de ${esc(e.doc.title)}">
        <button type="button" class="ge-bilan-remove" data-bilan-remove="${esc(e.id)}" data-direct-control aria-label="Retirer ${esc(e.doc.title)}" title="Retirer">${icon('close')}</button>
      </div>`).join('');
  }

  function drawTests(list, openUsable, live) {
    listedTests = list;
    liveTest = live;
    if (list.length < 5) {
      listQuery = '';
      listSearch.value = '';
      syncClear();
    }
    find('[data-bilan-count]').textContent = String(list.length);
    drawTestList();
  }

  // D1.57 · Homonymes : jamais fusionnés en silence.
  function drawCollisions() {
    const note = find('[data-bilan-collisions]'), list = current?.collisions || [];
    note.hidden = !list.length;
    if (!list.length) { note.textContent = ''; return; }
    const names = [...new Map(list.map(c => [foldName(c.name), c])).values()];
    const shown = names.slice(0, 3).map(c => c.reason === 'same-test' ? `« ${c.name} » (deux fois dans « ${c.test} »)` : `« ${c.name} »`).join(', ');
    note.textContent = `Même nom pour deux élèves différents : ${shown}${names.length > 3 ? ` et ${names.length - 3} autre${names.length > 4 ? 's' : ''}` : ''}. Leurs résultats restent séparés ; donnez-leur des noms distincts dans les tests pour les reconnaître.`;
  }

  function updateScaleNote() {
    const signature = JSON.stringify(grading);
    find('[data-bilan-scale-note]').hidden = !listedTests.some(t=>weightOf(t.weight) && JSON.stringify(t.doc.grading)!==signature);
  }

  function sync(revision, editingWeight = false) {
    if (!element.isConnected || (!dirty && renderedRevision === revision)) return;
    const doc = getDocument(), key = evaluationKey(doc);
    const selected = tests.get(key);
    const live = selected?.live ? selected : null;
    if (live) live.doc = doc;
    const nextGrading = doc.grading;
    const recalculate = dirty || live || grading !== nextGrading || catalogue !== doc.catalogue;
    const list = [...tests.values()].sort((a,b) => String(a.doc.date || '').localeCompare(String(b.doc.date || '')));
    const openUsable = doc.tasks.length > 0 && (doc.students.length > 0 || doc.competencies.some(c => doc.links[c.id]?.length));
    const hasTests = list.length > 0;
    const lostSelection = !hasTests && !results.hidden;
    results.hidden = !hasTests;
    if (!editingWeight) drawTests(list, openUsable, live);
    if (hasTests && (recalculate || !current)) {
      grading = nextGrading;
      catalogue = doc.catalogue;
      updateScaleNote();
      const ranks = new Map(catalogue.map((c, i) => [c.id, i]));
      current = buildBilan(list, grading, {rank:c => ranks.get(c.catalogueId)});
      current.used = list.filter(e => weightOf(e.weight) > 0);
      drawCollisions();
      drawControls();
      drawResults();
    } else if (!hasTests) {
      current = grading = null;
      drawCollisions();
      shown = [];
      search = scope = pupil = '';
      manualScope = false;
      folded.clear();
      searchInput.value = '';
      syncClear();
      visual.replaceChildren();
      closeDetails();
      onLayout();
    }
    renderedRevision = revision;
    dirty = false;
    onLayout();
    if (lostSelection) onSelection();
  }

  function changed(editingWeight = false) {
    dirty = true;
    sync(getRevision(), editingWeight);
    onChange();
  }

  function previewGrading(next,refreshLabels=false) {
    const axis = find('[data-bilan-axis]');
    if (axis) updateGradingAxis(axis,next);
    updateChartGuides(next);
    for (const graph of visual.querySelectorAll('[data-bilan-percent]')) {
      const percent = Number(graph.dataset.bilanPercent), level = levelFor(percent,next);
      if (!refreshLabels && String(level) === graph.dataset.level) continue;
      graph.dataset.level = String(level);
      graph.style.setProperty('--bar-colour',levelColour(next,level));
      graph.style.setProperty('--lv',gradingLevelInk(level,next));
      const label = next.labels[level];
      graph.querySelector('.ge-bilan-graphic-level').textContent = shortLevel(label);
      graph.title = describeGraphic(graph.dataset.graphicLabel,percent,label,graph.dataset.graphicNote);
      graph.setAttribute('aria-label',graph.title);
    }
  }

  function applyGrading(next) {
    if (!current) return;
    if (JSON.stringify(next) === JSON.stringify(grading)) return;
    record();
    const labelsChanged = grading.labels !== next.labels;
    const refreshLabels = labelsChanged || grading.colours !== next.colours;
    grading = next;
    setGrading(next);
    current.setGrading(next);
    updateScaleNote();
    const axis = find('[data-bilan-axis]');
    if (axis && labelsChanged) axis.innerHTML = verticalGradingAxis(next);
    previewGrading(next,refreshLabels);
    for (const cell of visual.querySelectorAll('[data-bilan-score]')) {
      const level = levelFor(Number(cell.dataset.bilanScore),next);
      if (!refreshLabels && String(level) === cell.dataset.level) continue;
      cell.dataset.level = String(level);
      cell.style.setProperty('--lv',gradingLevelInk(level,next));
      cell.querySelector('.ge-result-label').textContent = shortLevel(next.labels[level]);
      cell.querySelector('i b').style.backgroundColor = levelColour(next,level);
    }
    onLayout();
  }

  function showDetails(button) {
    const pk = button.dataset.bilanCellPupil, ck = button.dataset.bilanCellCompetency;
    const result = current?.cell(pk, ck), person = current?.pupils.find(p => p.key === pk);
    const comp = current?.competencies.find(c => c.key === ck);
    if (!result?.parts.length || !person || !comp) return;
    if (button === detailsTrigger) return closeDetails(true);
    closeDetails();
    detailsTrigger = button;
    button.setAttribute('aria-expanded','true');
    const row = button.closest('tr'), cell = button.closest('td');
    detailRow = document.createElement('tr');
    detailRow.className = 'ge-bilan-detail-row';
    const slot = detailRow.insertCell();
    slot.colSpan = row.cells.length;
    const breakdown = document.createElement('div');
    breakdown.className = 'ge-bilan-breakdown';
    breakdown.setAttribute('data-bilan-breakdown','');
    breakdown.setAttribute('role','region');
    breakdown.setAttribute('aria-label','Détail du résultat');
    slot.append(breakdown);
    row.after(detailRow);
    breakdown.innerHTML = `<div class="ge-bilan-breakdown-head"><strong>${esc(person.name)}</strong>
      <button type="button" data-bilan-breakdown-close aria-label="Fermer le détail" title="Fermer">${icon('close')}</button></div>
      <p>${esc(displayDescriptor(comp.text))}</p>${trendSVG(orderedParts(result.parts))}<div class="ge-bilan-breakdown-parts">${orderedParts(result.parts).map(part =>
        `<div class="ge-bilan-breakdown-row"><span>${esc(part.title)}${part.date ? ` <small>${esc(euroDate(part.date))}</small>` : ''}</span><strong>${bilanPercent(part.percent)}</strong><small>× ${format(part.weight)}</small></div>`).join('')}</div>
      <div class="ge-bilan-breakdown-total"><span>Bilan</span><strong>${bilanPercent(result.percent)}</strong></div>`;
    const width = breakdown.offsetWidth;
    breakdown.style.marginInlineStart = Math.max(0, Math.min(cell.offsetLeft, visual.offsetWidth-width-12)) + 'px';
    breakdown.querySelector('button').focus({preventScroll:true});
    onLayout();
  }

  // D1.57 · Évolution : les résultats d’une compétence dans l’ordre des dates des tests.
  function orderedParts(parts) {
    return parts.map(p => ({...p, date:tests.get(p.evaluation)?.doc.date || ''})).sort((a,b) => String(a.date).localeCompare(String(b.date)) || a.index - b.index);
  }
  function trendSVG(parts) {
    if (parts.length < 2) return '';
    const W = 220, H = 46, pad = 6, step = (W - 2*pad) / (parts.length - 1), y = v => pad + (H - 2*pad) * (1 - v/100);
    const pts = parts.map((p,i) => [pad + i*step, y(Math.max(0, Math.min(100, p.percent)))]);
    const guides = (grading?.thresholds || []).map(t => `<line x1="${pad}" x2="${W-pad}" y1="${y(t)}" y2="${y(t)}" class="ge-trend-guide"/>`).join('');
    const dots = parts.map((p,i) => `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="3.2" fill="${levelColour(grading, levelFor(p.percent, grading))}"><title>${esc(p.title)} · ${bilanPercent(p.percent)}</title></circle>`).join('');
    return `<figure class="ge-bilan-trend" aria-label="Évolution sur ${parts.length} tests"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${guides}<polyline points="${pts.map(p => p.join(',')).join(' ')}" class="ge-trend-line"/>${dots}</svg><figcaption>Évolution</figcaption></figure>`;
  }
  function reportData() {
    if (!current) return null;
    return {pupils:current.pupils, competencies:current.competencies, cell:current.cell, grading,
      tests:current.used.map(e => ({id:e.id, title:e.doc.title, date:e.doc.date || '', subject:e.doc.subject || ''})), pupil, orderedParts};
  }

  async function addFiles(files) {
    const failed = [];
    let added = false;
    const before = snapshot(), read = [];
    let opened = null, replaced = 0, same = 0;
    for (const f of files) {
      try {
        if (!/\.json$/i.test(f.name) || f.size > 32*1024*1024) throw new Error('format');
        const text = await f.text(), bilan = readBilan(text);
        if (bilan) { opened = bilan; continue; }
        read.push(validate(text));
      } catch { failed.push(f.name); }
    }
    if (opened) { loadBilan(opened); notice('Bilan ouvert · annulation possible.'); }
    for (const doc of read) {
      const id = evaluationKey(doc), prev = tests.get(id);
      if (prev?.live && id === evaluationKey(getDocument())) continue;
      if (prev && JSON.stringify(prev.doc) === JSON.stringify(doc)) { same++; continue; }
      if (prev) replaced++;
      tests.set(id, {id, doc, weight:prev?.weight ?? '1'});
      added = true;
    }
    if (replaced) notice(replaced === 1 ? 'Un test du bilan a été remplacé par la version choisie · annulation possible.' : `${replaced} tests du bilan ont été remplacés par les versions choisies · annulation possible.`);
    else if (same && !added && !opened) notice(same === 1 ? 'Ce test est déjà dans le bilan.' : 'Ces tests sont déjà dans le bilan.');
    if (opened) { if (element.isConnected) onSelection(); if (!added) return; }
    if (added) {
      past.push(before);
      if (past.length > HISTORY_LIMIT) past.shift();
      future.length = 0;
      onHistory();
    }
    if (failed.length) notice(`Fichiers de test ignorés (${failed.length}) · ${failed.slice(0,3).join(', ')}`, true);
    if (added) { changed(); if (element.isConnected) onSelection(); }
  }
  element.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button) return;
    const action = button.dataset;
    if ('bilanPick' in action) return chooseFiles();
    if ('bilanOpen' in action) {
      includeOpen();
      return onSelection();
    }
    if ('bilanSearchClear' in action) return clearSearch(action.bilanSearchClear);
    if ('bilanRemove' in action) {
      if (!tests.has(action.bilanRemove)) return;
      record();
      tests.delete(action.bilanRemove);
      return changed();
    }
    if ('bilanCell' in action) return showDetails(button);
    if ('bilanBreakdownClose' in action) return closeDetails(true);
    if ('bilanScope' in action) { scope = action.bilanScope; manualScope = true; drawControls(); return drawResults(); }
    if ('bilanFold' in action) {
      const section = action.bilanFold;
      if (folded.has(section)) folded.delete(section); else folded.add(section);
      return drawResults();
    }
    if ('bilanPupil' in action) return choosePupil(action.bilanPupil);
  });
  function includeOpen() {
    const doc = getDocument(), id = evaluationKey(doc);
    if (tests.get(id)?.live) return;
    record();
    tests.set(id, {id, doc, weight:tests.get(id)?.weight ?? '1', live:true});
    changed();
  }
  function clearTests() {
    if (!tests.size) return;
    record();
    tests.clear();
    changed();
  }
  function exportCSV() {
    if (!current || !shown.length) return false;
    download(bilanCSV({...current, pupils:selectedPupils(), competencies:shown}, grading), 'bilan-competences.csv', 'text/csv;charset=utf-8');
    return true;
  }
  function clearSearch(which, focus = true) {
    const input = which === 'list' ? listSearch : searchInput;
    if (!input.value) return;
    input.value = '';
    if (which === 'list') { listQuery = ''; drawTestList(); onLayout(); }
    else { search = ''; drawResults(); }
    syncClear();
    if (focus) input.focus({preventScroll:true});
  }
  pupilSelect.addEventListener('change', () => choosePupil(pupilSelect.value));
  element.addEventListener('input', e => {
    const t = e.target;
    if (t.hasAttribute('data-bilan-list-search')) {
      listQuery = t.value;
      syncClear();
      drawTestList();
      return onLayout();
    }
    if (t.hasAttribute('data-bilan-search')) { search = t.value; syncClear(); drawResults(); }
    if (t.hasAttribute('data-bilan-weight')) {
      const test = tests.get(t.dataset.bilanWeight);
      if (!test) return;
      // Une seule étape d’annulation par saisie de coefficient.
      if (weightSession !== t) { record(); weightSession = t; }
      test.weight = t.value.trim() || '1';
      const invalid = !weightOf(test.weight);
      t.classList.toggle('ge-invalid', invalid);
      t.setAttribute('aria-invalid',String(invalid));
      changed(true);
    }
  });
  element.addEventListener('focusout', e => { if (e.target === weightSession) weightSession = null; });
  element.addEventListener('keydown', e => {
    const field = e.target.closest?.('[data-bilan-search],[data-bilan-list-search]');
    if (e.key === 'Escape' && field?.value) {
      e.preventDefault();
      e.stopPropagation();
      return clearSearch(field.hasAttribute('data-bilan-list-search') ? 'list' : 'competencies');
    }
    if (e.key === 'Escape' && detailRow) {
      e.preventDefault();
      e.stopPropagation();
      closeDetails(true);
    }
  });
  if (initial?.data) {
    try { const b = readBilan(initial.data); if (b) { loadBilan(b, {undoable:false, saved:false}); if (initial.saved) savedSignature = signature(); } } catch {}
  }
  return {
    element, selection, results, sync, addFiles, applyGrading, previewGrading, includeOpen, clearTests, exportCSV,
    exportBilan, isDirty, markSaved, reportData, newBilan:()=>{ if (!tests.size) return false; record(); tests.clear(); bilanId = ''; changed(); savedSignature = signature(); onChange(); return true; },
    undo:()=>step(true), redo:()=>step(false), canUndo:()=>past.length > 0, canRedo:()=>future.length > 0,
    canExport:()=>Boolean(current && shown.length),
    pupilCount:()=>current?.pupils.length ?? 0, resize:()=>{ if (current) sizeDescriptors(); },
    getGrading:()=>grading, testCount:()=>tests.size,
    detach() { closeDetails(); element.remove(); }
  };
}
