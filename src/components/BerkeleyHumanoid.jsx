import { useEffect, useRef } from 'react'
import { Box3, Color, Euler, Group, Mesh, MeshPhysicalMaterial, Vector3 } from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

const MODEL_ROOT = '/models/berkeley-lite'

function vector(value, fallback = [0, 0, 0]) {
  if (!value) return fallback
  return value.trim().split(/\s+/).map(Number)
}

function applyOrigin(object, origin) {
  if (!origin) return
  object.position.fromArray(vector(origin.getAttribute('xyz')))
  object.rotation.copy(new Euler(...vector(origin.getAttribute('rpy')), 'XYZ'))
}

function finishFor(linkName) {
  const actuator = /(hip|knee|ankle|shoulder|elbow|wrist|waist|neck)/.test(linkName)
  const hand = /(hand|finger|fingertip)/.test(linkName)
  const shell = /(chest|torso|pelvis|head|foot)/.test(linkName)
  if (actuator) return { color: '#313940', metalness: 0.94, roughness: 0.18, clearcoat: 0.72 }
  if (hand) return { color: '#79868e', metalness: 0.76, roughness: 0.25, clearcoat: 0.46 }
  if (shell) return { color: '#606d75', metalness: 0.88, roughness: 0.22, clearcoat: 0.58 }
  return { color: '#aab4b9', metalness: 0.9, roughness: 0.19, clearcoat: 0.54 }
}

export default function BerkeleyHumanoid({ selectedPartId, onSelectPart, onReady, onError }) {
  const mount = useRef(null)
  const meshes = useRef([])

  useEffect(() => {
    let cancelled = false
    const geometries = []
    const materials = []
    const modelRoot = new Group()
    modelRoot.name = 'BERKELEY-LITE-V2'
    modelRoot.rotation.x = -Math.PI / 2
    mount.current?.add(modelRoot)

    async function load() {
      const response = await fetch(`${MODEL_ROOT}/lite.urdf`)
      if (!response.ok) throw new Error(`Humanoid-assemblage niet beschikbaar (${response.status})`)
      const xml = new DOMParser().parseFromString(await response.text(), 'application/xml')
      if (xml.querySelector('parsererror')) throw new Error('URDF kon niet worden gelezen')

      const links = new Map()
      const meshTasks = []
      for (const link of xml.querySelectorAll('robot > link')) {
        const linkName = link.getAttribute('name')
        const linkGroup = new Group()
        linkGroup.name = linkName
        links.set(linkName, linkGroup)

        for (const visual of link.querySelectorAll(':scope > visual')) {
          const meshNode = visual.querySelector('geometry > mesh')
          if (!meshNode) continue
          const visualGroup = new Group()
          applyOrigin(visualGroup, visual.querySelector(':scope > origin'))
          linkGroup.add(visualGroup)

          meshTasks.push({ linkName, visualGroup, filename: meshNode.getAttribute('filename').split('/').pop() })
        }
      }

      const childLinks = new Set()
      for (const joint of xml.querySelectorAll('robot > joint')) {
        const parentName = joint.querySelector('parent')?.getAttribute('link')
        const childName = joint.querySelector('child')?.getAttribute('link')
        const parent = links.get(parentName)
        const child = links.get(childName)
        if (!parent || !child) continue
        applyOrigin(child, joint.querySelector(':scope > origin'))
        parent.add(child)
        childLinks.add(childName)
      }

      const rootName = [...links.keys()].find(name => !childLinks.has(name))
      if (!rootName) throw new Error('Geen hoofdassemblage gevonden')
      modelRoot.add(links.get(rootName))

      const loader = new STLLoader()
      await Promise.all(meshTasks.map(async ({ linkName, visualGroup, filename }) => {
        const geometry = await loader.loadAsync(`${MODEL_ROOT}/meshes/${filename}`)
        if (cancelled) { geometry.dispose(); return }
        geometry.computeVertexNormals()
        geometries.push(geometry)
        const material = new MeshPhysicalMaterial({ ...finishFor(linkName), envMapIntensity: 1.35 })
        materials.push(material)
        const rendered = new Mesh(geometry, material)
        rendered.name = linkName
        rendered.userData.partId = linkName
        rendered.castShadow = true
        rendered.receiveShadow = true
        visualGroup.add(rendered)
        meshes.current.push(rendered)
      }))

      const bounds = new Box3().setFromObject(modelRoot)
      const center = bounds.getCenter(new Vector3())
      modelRoot.position.set(-center.x, -bounds.min.y, -center.z)
      modelRoot.updateMatrixWorld(true)
      if (!cancelled) onReady?.({ links: links.size, meshes: meshes.current.length, heightM: bounds.max.y - bounds.min.y })
    }

    load().catch(error => { if (!cancelled) onError?.(error) })
    return () => {
      cancelled = true
      mount.current?.remove(modelRoot)
      geometries.forEach(item => item.dispose())
      materials.forEach(item => item.dispose())
      meshes.current = []
    }
  }, [])

  useEffect(() => {
    for (const mesh of meshes.current) {
      const selected = mesh.userData.partId === selectedPartId
      mesh.material.emissive = new Color(selected ? '#073948' : '#000000')
      mesh.material.emissiveIntensity = selected ? 0.65 : 0
    }
  }, [selectedPartId])

  return <group ref={mount} onClick={(event) => {
    event.stopPropagation()
    onSelectPart?.(event.object.userData.partId || event.object.name)
  }}/>
}
