import contextlib
import io
import json
import unittest
from unittest.mock import patch
from scripts.verify_staging import gas_ping_url, health_matches, main, readiness_matches


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


class GatewayReadinessTests(unittest.TestCase):
    def fixture(self):
        return dict(ok=True, app='RTAFNC Good Deed', environment='staging',
                    productionCutover=False, productionWriteEnabled=False,
                    authSessionEnabled=True, d1Bound=True, liffConfigured=True,
                    adapterConfigured=True, stagingE2EEnabled=True, readGate=True,
                    submitGate=False, reviewGate=False, activationGate=False,
                    pilotGateConfigured=True, pilotGateEnforced=True)

    def test_actual_audited_gateway_readiness_contract(self):
        self.assertTrue(readiness_matches(self.fixture()))
        self.assertFalse(health_matches('cloudflare', self.fixture(), 'synthetic'))
        for key, value in self.fixture().items():
            missing = self.fixture()
            del missing[key]
            with self.subTest(missing=key):
                self.assertFalse(readiness_matches(missing))
            for invalid in ([not value, str(value).lower(), int(value), None]
                            if isinstance(value, bool) else ['other', None]):
                with self.subTest(key=key, invalid=invalid):
                    self.assertFalse(readiness_matches({**self.fixture(), key: invalid}))
        for body in [None, [], {}, {**self.fixture(), 'mode': 'static-preview'}]:
            self.assertFalse(readiness_matches(body))

    def test_readiness_profile_observes_without_certifying_deployment(self):
        output = io.StringIO()
        with patch('scripts.verify_staging.get_json', side_effect=[
            (200, dict(status='success', service='synthetic-gas', productionWriteEnabled=False)),
            (200, self.fixture())
        ]) as get, contextlib.redirect_stdout(output):
            self.assertEqual(main(['--gas-url', 'https://example.test/exec',
                '--gas-service', 'synthetic-gas', '--cloudflare-health-url',
                'https://example.test/readiness', '--cloudflare-readiness']), 0)
        self.assertEqual(get.call_args_list[1].args[0], 'https://example.test/readiness')
        rows = list(map(json.loads, output.getvalue().splitlines()))
        self.assertTrue(all(row['ok'] and row['deploymentVerified'] is False for row in rows))

    def test_readiness_requires_explicit_profile_and_exact_path_before_network(self):
        base = ['--gas-url', 'https://example.test/exec', '--gas-service', 'synthetic-gas',
                '--cloudflare-health-url', 'https://example.test/health']
        for extra in [[], ['--cloudflare-readiness'],
                      ['--cloudflare-readiness', '--cloudflare-service', 'synthetic']]:
            with patch('scripts.verify_staging.get_json') as get, contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    main(base + extra)
                self.assertEqual(error.exception.code, 2)
                get.assert_not_called()
