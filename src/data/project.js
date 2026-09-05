export const assembly = [
  { id: 'torso', label: 'Romp', children: ['Borstframe', 'Ruggengraat', 'Ribframe'] },
  { id: 'head', label: 'Hoofd', children: ['Nekgewricht', 'Vision mount', 'Communicatiemodule'] },
  { id: 'rightShoulder', label: 'Rechterarm', children: ['Schouderassemblage', 'Bovenarm', 'Elleboog', 'Onderarm', 'Pols', 'Hand'] },
  { id: 'leftShoulder', label: 'Linkerarm', children: ['Schouderassemblage', 'Bovenarm', 'Elleboog', 'Onderarm', 'Pols', 'Hand'] },
  { id: 'pelvis', label: 'Bekken', children: ['Bekkenframe', 'Linkerheup', 'Rechterheup'] },
  { id: 'rightLeg', label: 'Rechterbeen', children: ['Bovenbeen', 'Knie', 'Onderbeen', 'Enkel', 'Voet'] },
  { id: 'leftLeg', label: 'Linkerbeen', children: ['Bovenbeen', 'Knie', 'Onderbeen', 'Enkel', 'Voet'] },
  { id: 'electronics', label: 'Elektronica', children: ['Vermogensverdeling', 'Besturingscomputer', 'Kabelboom', 'Sensoren'] },
]

export const initialParts = [
  { id: 'CAB-DYN-001', name: 'Dyneema SK78 Ø1,5 mm kabel/pees', quantity: 1, source: 'Lijnenspecialist', sector: 'Marine', status: 'onderzocht', mass: 0.03, price: 18.5 },
  { id: 'MOT-RS04', name: 'RobStride RS04 · officiële STEP', quantity: 8, source: 'RobStride fabrikantrepo', sector: 'Robotica', status: 'CAD-gecontroleerd', mass: 11.36, price: 0 },
  { id: 'MOT-RS03', name: 'RobStride RS03 · officiële STEP', quantity: 10, source: 'RobStride fabrikantrepo', sector: 'Robotica', status: 'CAD-gecontroleerd', mass: 9.0, price: 0 },
  { id: 'MOT-RS02', name: 'RobStride RS02 · officiële STEP', quantity: 4, source: 'RobStride fabrikantrepo', sector: 'Robotica', status: 'CAD-gecontroleerd', mass: 1.52, price: 0 },
  { id: 'MOT-RS05', name: 'RobStride RS05 · officiële STEP', quantity: 6, source: 'RobStride fabrikantrepo', sector: 'Robotica', status: 'CAD-gecontroleerd', mass: 1.146, price: 0 },
  { id: 'FRM-MNV-001', name: 'MNV-1 aluminium/carbon frame-set', quantity: 1, source: 'Munonoid engineering', sector: 'Constructie', status: 'concept', mass: 12.8, price: 0 },
  { id: 'HAND-LEAP-V2', name: 'LEAP Hand V2 · open-source CAD', quantity: 2, source: 'LEAP Hand / ROBOTIS', sector: 'Robotica', status: 'onderzocht', mass: 1.0, price: 0 },
  { id: 'CMP-JETSON-ORIN-NX', name: 'NVIDIA Jetson Orin NX', quantity: 1, source: 'NVIDIA', sector: 'AI/compute', status: 'voorlopig gekozen', mass: 0.15, price: 0 },
  { id: 'BAT-48V-P45B-001', name: '48 V tractiepack · Molicel P45B', quantity: 1, source: 'Molicel / engineeringpack', sector: 'Energie', status: 'onderzocht', mass: 5.5, price: 0 },
  { id: 'NET-CANHUB-001', name: 'RobStride CAN hub / power board', quantity: 3, source: 'RobStride fabrikantrepo', sector: 'Elektronica', status: 'CAD-gecontroleerd', mass: 0.45, price: 0 },
  { id: 'SEN-OAK-D-PRO', name: 'Luxonis OAK-D Pro vision', quantity: 2, source: 'Luxonis', sector: 'Perceptie', status: 'voorlopig gekozen', mass: 0.18, price: 0 },
  { id: 'ISO-4762-M6', name: 'ISO 4762 M6 bevestigingsset', quantity: 96, source: 'Standaardonderdeel', sector: 'Bevestiging', status: 'onderzocht', mass: 0.72, price: 0 },
]

export const statusOrder = ['concept', 'leveranciers-CAD vereist', 'onderzocht', 'voorlopig gekozen', 'CAD-gecontroleerd', 'gesimuleerd', 'prototype getest', 'vrijgegeven voor productie']
