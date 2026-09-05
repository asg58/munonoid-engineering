from __future__ import annotations

import argparse
import json
from pathlib import Path

import cadquery as cq

ROOT = Path(__file__).resolve().parents[1]
CAD_DIR = ROOT / "cad"
DEFAULT_OUTPUT = ROOT / "artifacts" / "cad"
RS02_STEP = ROOT / "public" / "models" / "vendor" / "robstride-rs02.stp"
MOTOR_Z = 26.0
RS02_LENGTH = 45.4
CAPSTAN_Z = MOTOR_Z + RS02_LENGTH
OUTER_PLATE_Z = CAPSTAN_Z + 42.0


def mounting_plate(width: float, height: float, thickness: float) -> cq.Workplane:
    holes = [(-width / 2 + 18, -height / 2 + 18), (width / 2 - 18, -height / 2 + 18),
             (-width / 2 + 18, height / 2 - 18), (width / 2 - 18, height / 2 - 18)]
    return (cq.Workplane("XY").rect(width, height).extrude(thickness)
            .edges("|Z").fillet(5)
            .faces(">Z").workplane().pushPoints(holes).cboreHole(6.6, 11, 4)
            .faces(">Z").workplane().hole(78))


def rs02_motor() -> cq.Workplane:
    if not RS02_STEP.exists():
        raise FileNotFoundError(f"Official vendor STEP missing: {RS02_STEP}")
    return cq.importers.importStep(str(RS02_STEP))


def bearing_envelope() -> cq.Workplane:
    return cq.Workplane("XY").circle(50).circle(30).extrude(14)


def shaft() -> cq.Workplane:
    return (cq.Workplane("XY").circle(20).extrude(OUTER_PLATE_Z)
            .faces(">Z").workplane().circle(7).cutBlind(-34))


def capstan() -> cq.Workplane:
    return (cq.Workplane("XY").circle(36).extrude(42)
            .faces(">Z").workplane().circle(20).hole(42)
            .edges("%CIRCLE").chamfer(1.2))


def build_shoulder() -> tuple[cq.Assembly, list[dict]]:
    shapes = [
        ("SHO-PLATE-IN", mounting_plate(150, 170, 12), cq.Location(cq.Vector(0, 0, 0)), cq.Color(0.45, 0.50, 0.55)),
        ("SHO-BEARING", bearing_envelope(), cq.Location(cq.Vector(0, 0, 12)), cq.Color(0.70, 0.73, 0.76)),
        ("MOT-RS02", rs02_motor(), cq.Location(cq.Vector(0, 0, CAPSTAN_Z)), cq.Color(0.20, 0.24, 0.28)),
        ("SHO-CAPSTAN", capstan(), cq.Location(cq.Vector(0, 0, CAPSTAN_Z)), cq.Color(0.35, 0.55, 0.65)),
        ("SHO-SHAFT", shaft(), cq.Location(cq.Vector(0, 0, 12)), cq.Color(0.65, 0.68, 0.70)),
        ("SHO-PLATE-OUT", mounting_plate(150, 170, 12), cq.Location(cq.Vector(0, 0, OUTER_PLATE_Z)), cq.Color(0.45, 0.50, 0.55)),
    ]
    assembly = cq.Assembly(name="Munonoid-right-shoulder-v0")
    report = []
    with (CAD_DIR / "project.cad.json").open(encoding="utf-8") as handle:
        manifest = json.load(handle)
    definitions = {part["id"]: part for part in manifest["assemblies"][0]["parts"]}
    for part_id, shape, location, color in shapes:
        assembly.add(shape, name=part_id, loc=location, color=color)
        definition = definitions[part_id]
        volume_mm3 = shape.val().Volume()
        mass = definition.get("massOverrideKg")
        if mass is None:
            mass = volume_mm3 * definition["densityKgM3"] / 1_000_000_000
        box = shape.val().BoundingBox()
        report.append({
            "id": part_id,
            "classification": definition["kind"],
            "material": definition["material"],
            "volumeMm3": round(volume_mm3, 3),
            "massKg": round(mass, 4),
            "boundingBoxMm": [round(box.xlen, 3), round(box.ylen, 3), round(box.zlen, 3)],
            "productionReady": definition["kind"] != "envelope",
        })
    return assembly, report


def build(output: Path) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    assembly, parts = build_shoulder()
    step_path = output / "munonoid-right-shoulder-v0.step"
    glb_path = output / "munonoid-right-shoulder-v0.glb"
    assembly.export(str(step_path), "STEP", mode="default", unit="MM", outputUnit="MM")
    assembly.export(str(glb_path), "GLTF")
    report = {
        "kernel": f"CadQuery {cq.__version__} / OpenCascade",
        "units": "mm",
        "assembly": "Munonoid-right-shoulder-v0",
        "parts": parts,
        "totalMassKg": round(sum(part["massKg"] for part in parts), 4),
        "productionReady": all(part["productionReady"] for part in parts),
        "blockedBy": [part["id"] for part in parts if not part["productionReady"]],
        "outputs": {"step": step_path.name, "glb": glb_path.name},
    }
    (output / "build-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build exact Munonoid CAD artifacts in millimeters")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    print(json.dumps(build(args.output), indent=2))
