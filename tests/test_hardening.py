import os
import sys
import unittest
from unittest.mock import patch

ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, ROOT)

from backend.server import production_writes_enabled
from scripts.verify_staging import gas_ping_url


class WriteGateTests(unittest.TestCase):
    def test_writes_default_to_disabled(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(production_writes_enabled())

    def test_only_explicit_true_enables_writes(self):
        for value in ('1', 'yes', 'false', ''):
            with self.subTest(value=value), patch.dict(os.environ, {'PRODUCTION_WRITE_ENABLED': value}):
                self.assertFalse(production_writes_enabled())
        with patch.dict(os.environ, {'PRODUCTION_WRITE_ENABLED': 'true'}):
            self.assertTrue(production_writes_enabled())


class StagingVerifierTests(unittest.TestCase):
    def test_gas_ping_preserves_existing_query(self):
        self.assertEqual(
            gas_ping_url('https://example.test/exec?deployment=staging'),
            'https://example.test/exec?deployment=staging&action=ping',
        )


if __name__ == '__main__':
    unittest.main()
