import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Grid, Lightformer, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { syncGeometries } from 'replicad-threejs-helper'
import { ACESFilmicToneMapping, Color, PCFSoftShadowMap, SRGBColorSpace } from 'three'
import BerkeleyHumanoid from './BerkeleyHumanoid'

const MM = 1 / 1000

const materialFor = (part, selected, renderMode) => {
  if (selected) return { color: '#40c8e8', roughness: 0.16, metalness: 0.72, clearcoat: 0.8, clearcoatRoughness: 0.14 }
  if (part.material === 'black-anodized') return { color: part.color, roughness: 0.2, metalness: 0.92, clearcoat: 0.52, clearcoatRoughness: 0.15 }
  if (part.material === 'steel') return { color: '#b8c2c8', roughness: 0.1, metalness: 1, clearcoat: 0.7, clearcoatRoughness: 0.08 }
  if (part.material === 'carbon') return { color: '#222a2f', roughness: 0.3, metalness: 0.42, clearcoat: 0.62, clearcoatRoughness: 0.2 }
  if (part.material === 'glass') return { color: '#143746', roughness: 0.08, metalness: 0.22, transmission: 0.2, transparent: true, opacity: 0.86, clearcoat: 1 }
  if (part.material === 'pcb') return { color: '#28543a', roughness: 0.32, metalness: 0.18, clearcoat: 0.45 }
  if (part.material === 'battery') return { color: '#171d21', roughness: 0.4, metalness: 0.62, clearcoat: 0.32 }
  if (part.name.includes('BEARING')) return { color: '#aeb8bf', roughness: 0.12, metalness: 1, clearcoat: 0.65, clearcoatRoughness: 0.1 }
  if (part.name.includes('SHAFT')) return { color: '#b8c2c8', roughness: 0.1, metalness: 1, clearcoat: 0.72, clearcoatRoughness: 0.08 }
  if (part.name.includes('CAPSTAN')) return { color: '#355d6a', roughness: 0.2, metalness: 0.9, clearcoat: 0.55, clearcoatRoughness: 0.16 }
  return { color: renderMode === 'realistic' ? '#59636a' : part.color, roughness: 0.24, metalness: 0.9, clearcoat: 0.48, clearcoatRoughness: 0.18 }
}

function CadAssembly({ model, selectedPartId, onSelectPart, renderMode }) {
  const parts = model?.parts || model || []
  const geometries = useMemo(() => parts.length ? syncGeometries(parts, []) : [], [parts])
  useEffect(() => () => geometries.forEach(({ faces, lines }) => { faces.dispose(); lines.dispose() }), [geometries])
  return <group scale={MM} rotation={[-Math.PI / 2, 0, 0]}>
    {geometries.map((geometry, index) => {
      const part = parts[index]
      const instances = part.instances || [{ name: part.name, position: [0, 0, 0], rotation: [0, 0, 0] }]
      return instances.map((instance) => {
        const selected = selectedPartId === instance.name || selectedPartId === part.name
        const material = materialFor(part, selected, renderMode)
        return <group key={`${part.name}-${instance.name}`} position={instance.position} rotation={instance.rotation} onClick={(event) => { event.stopPropagation(); onSelectPart(instance.name) }}>
          <mesh geometry={geometry.faces} castShadow receiveShadow>
            <meshPhysicalMaterial {...material} emissive={selected ? '#062d37' : '#000000'} envMapIntensity={1.45}/>
          </mesh>
          <lineSegments geometry={geometry.lines} visible={renderMode === 'cad' || selected}>
            <lineBasicMaterial color={selected ? '#a6f3ff' : '#17232a'} transparent opacity={selected ? 0.9 : 0.38}/>
          </lineSegments>
        </group>
      })
    })}
  </group>
}

const ViewportScene = forwardRef(function ViewportScene({ model, selectedPartId, onSelectPart, renderMode, assemblyMode, onModelReady, onModelError }, ref) {
  const { gl, camera, scene, size } = useThree()
  const controls = useRef(null)

  useEffect(() => {
    const detail = assemblyMode === 'detail'
    camera.position.set(...(detail ? [0.72, 1.02, 0.78] : [1.65, 1.22, 1.8]))
    camera.lookAt(...(detail ? [0.18, 0.88, 0] : [0, 0.55, 0]))
    controls.current?.target.set(...(detail ? [0.18, 0.88, 0] : [0, 0.55, 0]))
    controls.current?.update()
  }, [assemblyMode, camera])

  useImperativeHandle(ref, () => ({
    setView(view) {
      const positions = { perspective: [2.45, 1.85, 2.65], front: [0, 0.86, 3.4], right: [3.4, 0.86, 0], top: [0, 4.1, 0.01] }
      camera.position.set(...(positions[view] || positions.perspective))
      camera.lookAt(0, 0.82, 0)
      controls.current?.target.set(0, 0.82, 0)
      controls.current?.update()
    },
    async render8K() {
      const context = gl.getContext()
      const max = context.getParameter(context.MAX_RENDERBUFFER_SIZE)
      if (max < 7680) throw new Error(`Deze GPU ondersteunt maximaal ${max}px; 8K vereist 7680px`)
      const oldAspect = camera.aspect
      const oldPixelRatio = gl.getPixelRatio()
      try {
        gl.setPixelRatio(1)
        gl.setSize(7680, 4320, false)
        camera.aspect = 7680 / 4320
        camera.updateProjectionMatrix()
        gl.render(scene, camera)
        const blob = await new Promise((resolve, reject) => gl.domElement.toBlob(value => value ? resolve(value) : reject(new Error('8K-beeld kon niet worden opgebouwd')), 'image/png'))
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'munonoid-complete-humanoid-8k.png'
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        return blob.size
      } finally {
        gl.setPixelRatio(oldPixelRatio)
        gl.setSize(size.width, size.height, false)
        camera.aspect = oldAspect
        camera.updateProjectionMatrix()
        gl.render(scene, camera)
      }
    },
  }), [camera, gl, scene, size])

  return <>
    <PerspectiveCamera makeDefault position={[2.45, 1.85, 2.65]} fov={31}/>
    <Environment resolution={256} environmentIntensity={0.9}>
      <Lightformer intensity={5} color="#d8efff" position={[3, 4, 4]} scale={[4, 4, 1]}/>
      <Lightformer intensity={3} color="#75bad5" position={[-4, 1, 2]} scale={[3, 5, 1]}/>
      <Lightformer intensity={2.5} color="#fff0dc" position={[0, 5, -4]} scale={[5, 2, 1]}/>
    </Environment>
    <ambientLight intensity={0.18}/>
    <hemisphereLight args={['#dceeff', '#11161a', 0.72]}/>
    <directionalLight position={[3.8, 5.5, 4.6]} intensity={4.6} color="#fff7ec" castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.00015}/>
    <directionalLight position={[-3, 2.6, 2]} intensity={2.4} color="#80c5df"/>
    <spotLight position={[0, 4, -3]} intensity={4.2} angle={0.42} penumbra={0.82} color="#dcecff"/>
    <BerkeleyHumanoid selectedPartId={selectedPartId} onSelectPart={onSelectPart} onReady={onModelReady} onError={onModelError}/>
    <mesh position={[0, -0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[12, 12]}/><meshStandardMaterial color="#0e1317" roughness={0.78} metalness={0.2}/>
    </mesh>
    <ContactShadows position={[0, 0.002, 0]} opacity={0.82} scale={4} blur={2.1} far={3}/>
    {renderMode === 'cad' && (
      <Grid args={[8, 8]} position={[0, 0.004, 0]} cellSize={0.1} cellThickness={0.35} cellColor="#293841" sectionSize={1} sectionThickness={0.9} sectionColor="#486779" fadeDistance={7}/>
    )}
    <OrbitControls ref={controls} makeDefault target={[0, 0.82, 0]} minDistance={1.1} maxDistance={7} enableDamping/>
  </>
})

const ProfessionalCadViewport = forwardRef(function ProfessionalCadViewport({ model, selectedPartId, onSelectPart, renderMode = 'realistic', assemblyMode = 'detail', onModelReady, onModelError }, ref) {
  const [webglAvailable] = useState(() => {
    try {
      const canvas = document.createElement('canvas')
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
    } catch { return false }
  })

  if (!webglAvailable) return <div className="cad-fallback" role="status">
    <div className="fallback-schematic" aria-hidden="true">
      <span className="schematic-plate plate-a"/><span className="schematic-bearing"/>
      <span className="schematic-motor"><i/><i/><i/><i/><i/><i/></span>
      <span className="schematic-shaft"/><span className="schematic-capstan"/><span className="schematic-plate plate-b"/>
    </div>
    <strong>CAD-model actief · 3D-GPU niet beschikbaar</strong>
    <span>De exacte B-Rep en STEP-export blijven werken. Open de app op een apparaat met WebGL voor de interactieve weergave.</span>
  </div>

  return <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace, shadowMap: { enabled: true, type: PCFSoftShadowMap } }} onCreated={({ gl }) => { gl.setClearColor(new Color('#0d1216'), 1); gl.toneMappingExposure = 1.08 }} onPointerMissed={() => onSelectPart(null)}>
    <color attach="background" args={['#0d1216']}/><fog attach="fog" args={['#0d1216', 4.5, 9]}/>
    <ViewportScene ref={ref} model={model} selectedPartId={selectedPartId} onSelectPart={onSelectPart} renderMode={renderMode} assemblyMode={assemblyMode} onModelReady={onModelReady} onModelError={onModelError}/>
  </Canvas>
})

export default ProfessionalCadViewport
