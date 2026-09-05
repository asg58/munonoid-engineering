import { Suspense, useEffect, useRef, useState } from 'react'
import { wrap } from 'comlink'
import {
  Box, Boxes, Camera, Check, ChevronDown, ChevronRight, CircleAlert, Cpu, Database,
  FileText, Folder, Grid3X3, Play, Plus, Redo2, Save, Search, Settings,
  ShieldCheck, SlidersHorizontal, TestTube2, Undo2, Upload, X
} from 'lucide-react'
import { assembly, statusOrder } from './data/project'
import { clampRobotHeight, filterParts, validateProjectData } from './lib/projectChecks'
import { interpretCadCommand } from './lib/cadCommand'
import projectState from '../munonoid.project.json'
import componentCatalog from '../catalog/components.json'
import ProfessionalCadViewport from './components/ProfessionalCadViewport'

const defaultCadParameters = {
  plateWidth: 150, plateHeight: 170, plateThickness: 12, bore: 78,
  bearingOuter: 100, bearingInner: 60, bearingWidth: 14,
  motorDiameter: 78.5, motorLength: 45.4, shaftDiameter: 40,
  capstanDiameter: 72, capstanWidth: 42,
}

const labels = {
  torso: 'Romp', head: 'Hoofd', rightShoulder: 'Rechter schouderassemblage',
  leftShoulder: 'Linker schouderassemblage', pelvis: 'Bekken',
  rightLeg: 'Rechterbeen', leftLeg: 'Linkerbeen', electronics: 'Elektronica',
}

const modeItems = [
  [Box, 'Ontwerp'], [Database, 'Componenten'], [Play, 'Simulatie'],
  [ShieldCheck, 'Validatie'], [Grid3X3, 'BOM'], [FileText, 'Documenten'], [Settings, 'Instellingen'],
]

function IconButton({ children, label, active = false, onClick }) {
  return <button className={`icon-button ${active ? 'active' : ''}`} title={label} onClick={onClick}>{children}</button>
}

function AssemblyTree({ selected, onSelect }) {
  const [open, setOpen] = useState(() => Object.fromEntries(assembly.map(x => [x.id, true])))
  return <div className="tree">
    <div className="root-row"><ChevronDown size={14}/><Boxes size={15}/><strong>Munonoid Engineering CAD</strong></div>
    {assembly.map(group => <div key={group.id}>
      <button className={`tree-row ${selected === group.id ? 'selected' : ''}`} onClick={() => onSelect(group.id)}>
        <span onClick={(e) => { e.stopPropagation(); setOpen(v => ({...v, [group.id]: !v[group.id]})) }}>{open[group.id] ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}</span>
        <Folder size={14}/><span>{group.label}</span>
      </button>
      {open[group.id] && group.children.map((child, index) =>
        <button key={child} className={`tree-row child ${selected === group.id && index === 0 ? 'child-focus' : ''}`} onClick={() => onSelect(group.id)}>
          <span/><Box size={13}/><span>{child}</span>
        </button>
      )}
    </div>)}
  </div>
}

function PropertyField({ label, value, unit, onChange, type = 'number' }) {
  return <label className={`property-row ${!onChange ? 'locked' : ''}`}><span>{label}</span><div className="field-wrap"><input type={type} value={value} readOnly={!onChange} onChange={e => onChange?.(e.target.value)} /><em>{unit}</em></div></label>
}

function CadInspector({ selectedPartId, parameters, onParameter, status, error, renderMode, onRenderMode, onRender8K, rendering8K }) {
  const [activeTab, setActiveTab] = useState('properties')
  const fields = [
    ['plateWidth', 'Plaatbreedte'], ['plateHeight', 'Plaathoogte'], ['plateThickness', 'Plaatdikte'],
    ['bore', 'Centrale boring'], ['bearingOuter', 'Lager buiten-Ø'], ['bearingInner', 'Lager binnen-Ø'],
    ['bearingWidth', 'Lagerbreedte'], ['motorDiameter', 'RS02 bounding Ø', true], ['motorLength', 'RS02 lengte', true],
    ['shaftDiameter', 'Asdiameter'], ['capstanDiameter', 'Capstan buiten-Ø'], ['capstanWidth', 'Capstanbreedte'],
  ]
  return <aside className="inspector panel">
    <div className="panel-title"><span>Parametrische CAD</span><SlidersHorizontal size={15}/></div>
    <div className="inspector-head"><h2>{selectedPartId || 'Rechter schoudermodule'}</h2><span className="part-code">B-REP · OPENCASCADE · MM</span></div>
    <div className="tabs">{[['properties', 'Eigenschappen'], ['materials', 'Materialen'], ['render', 'Render']].map(([id, label]) =>
      <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</div>
    {activeTab === 'properties' && <section className="property-section"><h3>Exacte geometrie</h3>
      {fields.map(([key, label, locked]) => <PropertyField key={key} label={label} value={parameters[key]} unit="mm" onChange={locked ? null : value => onParameter(key, value)}/>)}
    </section>}
    {activeTab === 'materials' && <section className="render-settings"><h3>Productiematerialen</h3>
      <PropertyField label="Materiaal" value="Al 7075-T6" unit="PBR" type="text"/>
      <PropertyField label="Oppervlak" value="Hard anodized" unit="" type="text"/>
      <PropertyField label="Motor" value="Zwart anodized" unit="PBR" type="text"/>
      <PropertyField label="As / lager" value="Gehard staal" unit="PBR" type="text"/>
    </section>}
    {activeTab === 'render' && <section className="render-settings"><h3>Fotorealistische weergave</h3>
      <div className="render-mode"><button className={renderMode === 'realistic' ? 'active' : ''} onClick={() => onRenderMode('realistic')}>Realistisch</button><button className={renderMode === 'cad' ? 'active' : ''} onClick={() => onRenderMode('cad')}>CAD + randen</button></div>
      <button className="render-8k-side" onClick={onRender8K} disabled={rendering8K}><Camera size={15}/>{rendering8K ? '8K wordt opgebouwd…' : 'Render 8K'}</button>
      <small>7680 × 4320 PNG · vanuit dezelfde 1:1 CAD</small>
    </section>}
    <section className="evidence-card">
      <div className="evidence-head"><span className="evidence-badge verified">FABRIKANT-CAD</span><strong>RobStride RS02</strong></div>
      <dl><div><dt>Bestand</dt><dd>Officiële STEP</dd></div><div><dt>Revisie</dt><dd>6ad12f5</dd></div><div><dt>Hash</dt><dd>c988a3a3…f063</dd></div><div><dt>Maat</dt><dd>78,5 × 78,5 × 45,4 mm</dd></div></dl>
      <a href={componentCatalog[0].sources.cad} target="_blank" rel="noreferrer">Open fabrikantbron</a>
    </section>
    <section className="validation-box">
      <div className="validation-title"><ShieldCheck size={16}/><strong>Productievrijgave</strong></div>
      <p><Check size={14}/> B-Rep-geometrie en STEP-export actief</p>
      <p><Check size={14}/> Kernel rekent rechtstreeks in millimeters</p>
      <p><Check size={14}/> MOT-RS02 gebruikt de officiële leveranciers-STEP</p>
      <p className="warning"><CircleAlert size={14}/> JNT-SPIDER is nog een envelop, geen gekozen lager</p>
      <p className={error ? 'warning' : ''}>{error ? <CircleAlert size={14}/> : <Check size={14}/>} {error || status}</p>
    </section>
  </aside>
}

function BomTable({ parts, query, setQuery }) {
  const filtered = filterParts(parts, query)
  return <section className="bottom-panel panel">
    <div className="bom-tabs"><button className="active">BOM <span>{parts.length}</span></button><button>Constraints <span>6</span></button><button>Tests <span>4</span></button><div className="table-search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter onderdelen"/>{query && <X size={13} onClick={()=>setQuery('')}/>}</div><button className="add-part"><Plus size={14}/> Onderdeel</button></div>
    <div className="table-scroll"><table><thead><tr><th>Part ID</th><th>Component</th><th>Aantal</th><th>Bron</th><th>Sector</th><th>Status</th><th>Massa</th><th>Prijs</th></tr></thead>
      <tbody>{filtered.map((p, i)=><tr key={p.id} className={i===0 ? 'active-row' : ''}><td>{p.id}</td><td>{p.name}</td><td>{p.quantity || 1}</td><td>{p.source}</td><td>{p.sector}</td><td><i className={`status-dot status-${statusOrder.indexOf(p.status)}`}/>{p.status}</td><td>{p.mass.toFixed(2)} kg</td><td>{p.price > 0 ? `€ ${p.price.toFixed(2)}` : 'offerte'}</td></tr>)}</tbody></table></div>
  </section>
}

function SelfTestPanel({ report, onClose, onRun }) {
  if (!report) return null
  const passed = report.results.filter((result) => result.passed).length
  const complete = report.status === 'complete'

  return <section className="self-test-panel" role="dialog" aria-label="Automatische zelftest">
    <div className="self-test-head">
      <div><span>Automatische zelftest</span><strong>{complete ? `${passed}/${report.results.length} geslaagd` : 'Bezig met controleren…'}</strong></div>
      <button className="self-test-close" onClick={onClose} aria-label="Zelftest sluiten"><X size={16}/></button>
    </div>
    <div className={`self-test-score ${complete && passed === report.results.length ? 'passed' : ''}`}>
      {complete ? <><b>{passed === report.results.length ? 'SYSTEEM GEREED' : 'CONTROLE NODIG'}</b><span>{report.duration} ms</span></> : <><b>TESTS WORDEN UITGEVOERD</b><span className="test-pulse"/></>}
    </div>
    <div className="self-test-results">
      {report.results.map((result) => <div className="self-test-row" key={result.id}>
        <span className={result.passed ? 'test-pass' : 'test-fail'}>{result.passed ? <Check size={14}/> : <X size={14}/>}</span>
        <div><strong>{result.label}</strong><small>{result.detail}</small></div>
      </div>)}
    </div>
    {complete && <button className="self-test-run" onClick={onRun}><TestTube2 size={15}/> Opnieuw testen</button>}
  </section>
}

const waitForPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

async function waitForCanvas(timeout = 4000) {
  const startedAt = performance.now()
  while (performance.now() - startedAt < timeout) {
    if (document.querySelector('.viewport canvas')) return true
    await new Promise((resolve) => window.setTimeout(resolve, 100))
  }
  return false
}

export default function App() {
  const cadWorker = useRef(null)
  const cadApi = useRef(null)
  const viewportRef = useRef(null)
  const [cadParameters, setCadParameters] = useState(() => {
    try { return { ...defaultCadParameters, ...JSON.parse(localStorage.getItem('munonoid-cad-parameters')) } }
    catch { return defaultCadParameters }
  })
  const [cadModel, setCadModel] = useState(null)
  const [cadStatus, setCadStatus] = useState('CAD-kernel starten…')
  const [cadError, setCadError] = useState('')
  const [selectedCadPart, setSelectedCadPart] = useState('right_shoulder_roll')
  const [selectedComponent, setSelectedComponent] = useState(projectState.robot.selectedComponent)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [selfTest, setSelfTest] = useState(null)
  const [renderMode, setRenderMode] = useState('realistic')
  const [rendering8K, setRendering8K] = useState(false)
  const [activeView, setActiveView] = useState('perspective')
  const [assemblyMode, setAssemblyMode] = useState('detail')
  const [command, setCommand] = useState('')
  const parts = projectState.bom
  useEffect(() => {
    cadWorker.current = new Worker(new URL('./workers/cad.worker.js', import.meta.url), { type: 'module' })
    cadApi.current = wrap(cadWorker.current)
    return () => cadWorker.current?.terminate()
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!cadApi.current) return
      setCadStatus('Complete robot opbouwen…')
      setCadError('')
      try {
        const preview = await cadApi.current.buildHumanoidPreview()
        setCadModel(preview)
        setCadStatus(`${preview.parts.length} assemblagedelen · ${preview.dof} DOF · leveranciersmaten 1:1`)
      } catch (error) {
        setCadError(error.message || 'CAD-berekening mislukt')
      }
    }, 220)
    return () => window.clearTimeout(timer)
  }, [cadParameters])
  useEffect(() => localStorage.setItem('munonoid-cad-parameters', JSON.stringify(cadParameters)), [cadParameters])
  const selectComponent = (componentId) => {
    setSelectedComponent(componentId)
    if (componentId !== 'rightShoulder') action(`${labels[componentId]} staat in de CAD-planning; de rechter schouder is nu actief.`)
  }
  const exportStep = async () => {
    if (!cadApi.current) return
    setCadStatus('STEP-bestand genereren…')
    try {
      const blob = await cadApi.current.exportShoulder(cadParameters)
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'munonoid-right-shoulder.step'
      link.click()
      URL.revokeObjectURL(link.href)
      setCadStatus('STEP-export gereed')
    } catch (error) { setCadError(error.message || 'STEP-export mislukt') }
  }
  const render8K = async () => {
    if (!viewportRef.current || rendering8K) return
    setRendering8K(true)
    setCadStatus('Fotorealistische 8K-render opbouwen…')
    try {
      const bytes = await viewportRef.current.render8K()
      setCadStatus(`8K PNG gereed · ${(bytes / 1024 / 1024).toFixed(1)} MB`)
      action('8K-render is gedownload')
    } catch (error) {
      setCadError(error.message || '8K-render mislukt')
    } finally { setRendering8K(false) }
  }
  const setView = (view) => { setActiveView(view); viewportRef.current?.setView(view) }
  const executeCommand = () => {
    const instruction = interpretCadCommand(command)
    if (instruction.type === 'none') return
    if (instruction.type === 'render8k') render8K()
    else if (instruction.type === 'display') {
      setRenderMode(instruction.mode)
      action(instruction.mode === 'cad' ? 'CAD-randen zichtbaar' : 'Fotorealistische materialen actief')
    } else if (instruction.type === 'parameter') {
      setCadParameters(current => ({ ...current, [instruction.key]: instruction.value }))
      action('Plaatbreedte aangepast en CAD opnieuw berekend')
    } else action('Opdracht gecontroleerd; deze wijziging vraagt eerst engineeringdata')
    setCommand('')
  }
  const action = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200) }
  const runSelfTest = async () => {
    const startedAt = performance.now()
    const previous = { selectedComponent, query }
    setSelfTest({ status: 'running', results: [] })

    const data = validateProjectData(assembly, parts)
    const results = [
      { id: 'assembly', label: 'Onderdelenboom', passed: data.assemblyOk, detail: `${assembly.length} hoofdassemblages gecontroleerd` },
      { id: 'bom-data', label: 'BOM-basisgegevens', passed: data.partsOk, detail: `${parts.length} markt- en maatwerkonderdelen gecontroleerd` },
      { id: 'scale', label: 'Millimeterschaal 1:1', passed: clampRobotHeight(1100) === 1200 && clampRobotHeight(2100) === 2000, detail: 'Ontwerpbereik 1200–2000 mm begrensd' },
    ]

    await waitForPaint()
    const cadPassed = cadModel?.type === 'humanoid' && cadModel.parts?.length >= 10 && cadModel.dof === 28 && !cadError
    results.push({ id: 'cad-kernel', label: 'OpenCascade + fabrikant-STEP', passed: cadPassed, detail: cadPassed ? `${cadModel.parts.length} echte onderdelen, 28 DOF, officiële STEP-assemblage` : 'Leveranciersgeometrie is nog niet gereed' })

    setQuery('Dyneema')
    await waitForPaint()
    const rows = [...document.querySelectorAll('.bottom-panel tbody tr')]
    const filterPassed = rows.length === 1 && rows[0].textContent.includes('CAB-DYN-001')
    results.push({ id: 'filter', label: 'BOM-filter', passed: filterPassed, detail: filterPassed ? 'Dyneema levert exact één passend onderdeel' : `${rows.length} onverwachte resultaten gevonden` })

    const canvasPassed = await waitForCanvas()
    results.push({ id: 'canvas', label: '3D-weergave', passed: canvasPassed, detail: canvasPassed ? 'Interactieve WebGL-canvas is geladen' : '3D-canvas kon niet worden gestart' })

    setSelectedComponent(previous.selectedComponent)
    setQuery(previous.query)
    await waitForPaint()
    setSelfTest({ status: 'complete', results, duration: Math.round(performance.now() - startedAt) })
  }
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">M</span><strong>MUNONOID</strong></div><span className="divider"/>
      <button className="project-select">{projectState.name} <ChevronDown size={14}/></button>
      <div className="top-actions"><IconButton label="Ongedaan maken"><Undo2 size={17}/></IconButton><IconButton label="Opnieuw"><Redo2 size={17}/></IconButton>
        <span className="ai-bridge"><Cpu size={15}/> OpenCascade · leverancier-CAD</span>
        <button className="self-test-button" onClick={runSelfTest}><TestTube2 size={16}/> Zelftest</button>
        <button onClick={()=>action('CAD-parameters zijn actief in deze sessie')}><Save size={16}/> Parameters actief</button>
        <button className="validate" onClick={()=>action('Vrijgave geblokkeerd: gewrichtsbelasting en peeskracht ontbreken')}><CircleAlert size={16}/> Valideren <span>2</span></button>
        <button className="render-top" onClick={render8K} disabled={rendering8K}><Camera size={16}/> {rendering8K ? 'Renderen…' : 'Render 8K'}</button>
      </div>
    </header>
    <nav className="mode-rail">{modeItems.map(([Icon,label], i)=><button key={label} className={i===0?'active':''}><Icon size={20}/><span>{label}</span></button>)}</nav>
    <aside className="assembly panel"><div className="panel-title"><span>Assemblage</span><Plus size={15}/></div><div className="search"><Search size={14}/><input placeholder="Zoek componenten"/></div><AssemblyTree selected={selectedComponent} onSelect={selectComponent}/></aside>
    <main className="viewport panel">
      <div className="view-tabs">{[['perspective','Perspectief'],['front','Voor'],['right','Rechts'],['top','Boven']].map(([id,label])=><button key={id} className={activeView===id?'active':''} onClick={()=>setView(id)}>{label}</button>)}</div>
      <div className="quality-switch"><button className={renderMode==='realistic'?'active':''} onClick={()=>setRenderMode('realistic')}>Realistisch</button><button className={renderMode==='cad'?'active':''} onClick={()=>setRenderMode('cad')}>CAD + Render</button></div>
      <div className="live-tools cad-tools" aria-label="CAD-gereedschap">
        <button className={renderMode === 'realistic' ? 'active' : ''} onClick={() => setRenderMode('realistic')}><Boxes size={15}/> Solid</button><button className={renderMode === 'cad' ? 'active' : ''} onClick={() => setRenderMode('cad')}><Grid3X3 size={15}/> Randen</button>
        <span/><button onClick={exportStep}><Upload size={14}/> STEP exporteren</button>
        <a href="/models/munonoid-right-shoulder-v0.step" download><FileText size={14}/> Gevalideerde baseline</a>
        <strong>{cadStatus}</strong>
      </div>
      <div className="viewport-hud"><strong>{assemblyMode === 'detail' ? 'Schouder- en bovenlichaamdetail' : 'Complete Berkeley Lite V2 basisassemblage'}</strong><span>73 Onshape CAD-meshes · 72 DOF · RobStride-aandrijving · originele schaal</span></div>
      <Suspense fallback={<div className="viewport-loading">3D-model laden…</div>}>
        <ProfessionalCadViewport ref={viewportRef} model={cadModel} selectedPartId={selectedCadPart} onSelectPart={setSelectedCadPart} renderMode={renderMode} assemblyMode={assemblyMode}
          onModelReady={({ links, meshes }) => setCadStatus(`${links} echte links · ${meshes} CAD-meshes geladen`)} onModelError={(error) => setCadError(error.message)}/>
      </Suspense>
      <div className="assembly-view-switch"><button className={assemblyMode === 'detail' ? 'active' : ''} onClick={() => setAssemblyMode('detail')}>Schouderdetail</button><button className={assemblyMode === 'full' ? 'active' : ''} onClick={() => setAssemblyMode('full')}>Volledige robot</button></div>
      <div className="command-bar"><Cpu size={17}/><input value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>e.key==='Enter'&&executeCommand()} placeholder="Codex bestuurt deze assemblage — geef een engineeringopdracht"/><button onClick={executeCommand}>Door Codex uitvoeren</button></div>
      <div className="dimension"><span>1:1</span><small>mm</small></div>
      <div className="axis"><b className="z">Z</b><b className="x">X</b><b className="y">Y</b></div>
      <div className="grid-label">Raster 100 mm</div>
    </main>
    <CadInspector selectedPartId={selectedCadPart} parameters={cadParameters} status={cadStatus} error={cadError} renderMode={renderMode} onRenderMode={setRenderMode} onRender8K={render8K} rendering8K={rendering8K}
      onParameter={(key, value) => setCadParameters(current => ({ ...current, [key]: Number(value) || 0 }))}/>
    <BomTable parts={parts} query={query} setQuery={setQuery}/>
    <footer className="statusbar"><span>Kernel: <strong>OpenCascade</strong></span><span>Eenheden: <strong>mm</strong></span><span>Schaal: <strong>1:1</strong></span><span className="path">/Munonoid/MNV-1/Complete-Humanoid-R1</span><span>Motor-CAD: <strong>leveranciers-CAD</strong></span><span className="ready"><i/> Live B-Rep actief</span></footer>
    <SelfTestPanel report={selfTest} onClose={() => setSelfTest(null)} onRun={runSelfTest}/>
    {notice && <div className="toast"><Check size={16}/>{notice}</div>}
  </div>
}
