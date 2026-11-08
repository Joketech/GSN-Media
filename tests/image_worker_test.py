import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
import uuid

class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(prefix='.gsn-test-images-', dir=Path.cwd())
        self.previous_data_dir = os.environ.get('DATA_DIR')
        os.environ['DATA_DIR'] = self.folder.name
        spec = importlib.util.spec_from_file_location('image_worker', Path(__file__).parents[1] / 'services/image_worker.py')
        self.worker = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.worker)

    def tearDown(self):
        self.worker.POOL.shutdown(wait=True)
        self.folder.cleanup()
        if self.previous_data_dir is None:
            os.environ.pop('DATA_DIR', None)
        else:
            os.environ['DATA_DIR'] = self.previous_data_dir

    def test_bounds_and_defaults(self):
        p = dict(id=str(uuid.uuid4()), prompt='A ceramic cup')
        self.assertEqual(self.worker.validate(p)['role'], 'image')
        for patch in [dict(id='../escape'),dict(prompt=''),dict(seed=True),dict(steps=100),dict(ratio='9:1'),dict(role='video')]:
            with self.assertRaises(ValueError):
                self.worker.validate({**p, **patch})

    def test_persisted_job(self):
        p = self.worker.validate(dict(id=str(uuid.uuid4()), prompt='A coffee pouch'))
        self.worker.save({**p, 'state':'queued'})
        self.worker.update(p['id'], state='running')
        self.assertEqual(self.worker.read(p['id'])['state'], 'running')

if __name__ == '__main__':
    unittest.main()
