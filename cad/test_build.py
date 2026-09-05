import tempfile
import unittest
from pathlib import Path

from cad.build import build


class CadBuildTest(unittest.TestCase):
    def test_exports_real_step_and_glb_with_release_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            report = build(Path(directory))
            self.assertEqual(report["units"], "mm")
            self.assertEqual(len(report["parts"]), 6)
            self.assertFalse(report["productionReady"])
            self.assertEqual(set(report["blockedBy"]), {"SHO-BEARING"})
            motor = next(part for part in report["parts"] if part["id"] == "MOT-RS02")
            self.assertEqual(motor["classification"], "verified-vendor")
            self.assertEqual(motor["boundingBoxMm"], [78.5, 78.5, 45.4])
            self.assertGreater((Path(directory) / report["outputs"]["step"]).stat().st_size, 10_000)
            self.assertGreater((Path(directory) / report["outputs"]["glb"]).stat().st_size, 1_000)


if __name__ == "__main__":
    unittest.main()
