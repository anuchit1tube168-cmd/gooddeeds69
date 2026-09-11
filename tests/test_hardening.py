import contextlib
import io
import json
import unittest
from unittest.mock import patch
from scripts.verify_staging import gas_ping_url, health_matches, main


class StagingVerifierTests(unittest.TestCase):
    def test_url_rejects_credentials_and_ambiguous_endpoints(self):
        for url in ['http://example.test/exec', 'https://user:secret' + '@' + 'example.test/exec',
                    'https://example.test/exec?token=secret', 'https://example.test/exec#secret']:
            with self.subTest(url=url), self.assertRaises(ValueError):
                gas_ping_url(url)
        self.assertEqual(gas_ping_url('https://example.test/exec'),
                         'https://example.test/exec?action=ping')

    def test_health_requires_exact_service_boolean_and_nonpreview(self):
        good = dict(status='ok', service='synthetic-gateway', productionWriteEnabled=False)
        self.assertTrue(health_matches('cloudflare', good, 'synthetic-gateway'))
        for body in [[], None, {}, {**good, 'service': 'other'},
                     {**good, 'mode': 'static-preview'}, {**good, 'productionWriteEnabled': 'false'},
                     {**good, 'productionWriteEnabled': 0}, {**good, 'productionWriteEnabled': True}]:
            self.assertFalse(health_matches('cloudflare', body, 'synthetic-gateway'))

    def test_failures_are_sanitized_and_health_is_not_deployment_proof(self):
        output = io.StringIO()
        with patch('scripts.verify_staging.get_json', side_effect=[
            RuntimeError('secret-provider-detail'),
            (200, dict(status='ok', service='synthetic', productionWriteEnabled=False))
        ]) as get, contextlib.redirect_stdout(output):
            self.assertEqual(main(['--gas-url','https://example.test/exec',
                '--cloudflare-health-url','https://example.test/health',
                '--gas-service','synthetic','--cloudflare-service','synthetic']),1)
        self.assertEqual(get.call_count,2)
        self.assertNotIn('secret',output.getvalue())
        self.assertNotIn('https',output.getvalue())
        self.assertTrue(all(row['deploymentVerified'] is False for row in map(json.loads,output.getvalue().splitlines())))
