"""Real HTTP handler + synthetic private files; never calls provider APIs."""
import ast
import importlib.util
import io
import json
import os
from pathlib import Path
import ssl
import sys
import tempfile
import threading
import unittest
from http.client import HTTPConnection
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
import server
import line_notifier

class LegacyExportTests(unittest.TestCase):
    def test_public_regeneration_and_settings_reset_stop_before_file_access(self):
        cases = [
            ('data/build_photos.py', 'main', []),
            ('data/build_photos.py', 'build_photos', [[]]),
            ('data/build_photos.py', 'write_photos_js', [{}]),
            ('data/build_photos.py', 'write_students_js', [[], set()]),
            ('data/sync_all_students.py', 'main', []),
            ('data/embed_settings_to_excel.py', 'add_or_update_settings_sheet', ['synthetic.xlsx']),
        ]
        for path, name, args in cases:
            with self.subTest(path=path, function=name):
                tree = ast.parse((ROOT / path).read_text())
                function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == name)
                isolated = ast.Module(body=[function], type_ignores=[])
                namespace = {}
                exec(compile(isolated, path, 'exec'), namespace)
                with patch('builtins.open') as opened:
                    with self.assertRaisesRegex(RuntimeError, 'disabled'):
                        namespace[name](*args)
                    opened.assert_not_called()

class LocalBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        root = Path(cls.temp.name)
        (root / 'index.html').write_text('<h1>Synthetic preview</h1>')
        for path in ['data/students.json','data/line_mappings.json','data/students_data.js','photos/evidence/test.jpg']:
            p = root / path; p.parent.mkdir(parents=True, exist_ok=True); p.write_text('private synthetic payload')
        (root / 'shortcut.js').symlink_to(root / 'data/students_data.js')
        (root / 'secure-pilot').mkdir()
        (root / 'secure-pilot/airforce-flight.png').write_bytes(b'public aircraft fixture')
        (root / 'secure-pilot/private-evidence.png').write_bytes(b'private evidence fixture')
        cls.dir_patch = patch.object(server, 'FRONTEND_DIR', str(root)); cls.dir_patch.start()
        cls.httpd = server.ThreadingHTTPServer(('127.0.0.1', 0), server.CustomHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True); cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown(); cls.httpd.server_close(); cls.thread.join(); cls.dir_patch.stop(); cls.temp.cleanup()
    def request(self, method, path, body=None):
        client = HTTPConnection('127.0.0.1', self.httpd.server_port, timeout=3)
        client.request(method, path, body, {'X-GoodDeeds-Role':'admin', 'Cookie':'gooddeeds_role=admin', 'Origin':'https://untrusted.example'})
        response = client.getresponse(); result = response.status, dict(response.headers), response.read(); client.close(); return result
    def test_forged_roles_do_not_create_auth_context(self):
        handler = object.__new__(server.CustomHandler)
        handler.headers = {'X-GoodDeeds-Role':'admin','Cookie':'gooddeeds_role=admin'}
        self.assertEqual(handler.get_auth_context()['role'], '')
    def test_api_reads_and_events_are_denied(self):
        for endpoint in ['students','get_student','get_deeds','get_all_deeds','line_mappings','get_line_user','events','export_docx']:
            with self.subTest(endpoint=endpoint): self.assertEqual(self.request('GET','/api/'+endpoint)[0],403)
    def test_mutations_denied_before_body_or_side_effects(self):
        with patch.object(server,'save_student_line_binding') as binding, patch.object(server,'save_or_update_deed_in_db') as save:
            for endpoint in ['bind_line','submit_deed','approve_deed','update_student']:
                code, headers, body = self.request('POST','/api/'+endpoint,'{}')
                self.assertEqual(code,403)
                self.assertEqual(int(headers['Content-Length']),len(body))
                self.assertEqual(json.loads(body)['code'],'AUTHENTICATED_GATEWAY_REQUIRED')
            binding.assert_not_called(); save.assert_not_called()
    def test_json_response_frames_utf8_without_reading_request_body(self):
        handler = object.__new__(server.CustomHandler)
        handler.wfile = io.BytesIO()
        headers = {}
        with patch.object(handler,'send_response') as status, patch.object(handler,'end_headers'), patch.object(handler,'send_header',side_effect=lambda key,value:headers.update({key:value})):
            handler.send_json_response(403,{'message':'ต้องตรวจสิทธิ์'})
        body = handler.wfile.getvalue()
        status.assert_called_once_with(403)
        self.assertEqual(int(headers['Content-Length']),len(body))
        self.assertEqual(json.loads(body)['message'],'ต้องตรวจสิทธิ์')
    def test_static_get_head_aliases_and_symlinks_cannot_expose_private_data(self):
        for path in ['/data/students.json','/frontend/data/line_mappings.json','/data/students_data.js','/photos/evidence/test.jpg','/frontend/%64ata/students.json','/secure-pilot/../data/students.json','/shortcut.js','/data/']:
            for method in ['GET','HEAD']:
                with self.subTest(path=path,method=method):
                    code, headers, body = self.request(method,path)
                    self.assertEqual(code,403); self.assertNotIn(b'private synthetic payload',body)
    def test_preview_and_health_are_usable_without_wildcard_cors(self):
        self.assertEqual(self.request('GET','/')[0],200)
        code,headers,body = self.request('GET','/api/health')
        self.assertEqual(code,200); self.assertFalse(json.loads(body)['dataApiEnabled'])
        self.assertIs(json.loads(body)['productionWriteEnabled'], False)
        self.assertNotIn('Access-Control-Allow-Origin',headers); self.assertEqual(headers['Cache-Control'],'no-store')
    def test_public_aircraft_does_not_open_other_pilot_images(self):
        for method in ['GET', 'HEAD']:
            self.assertEqual(self.request(method, '/secure-pilot/airforce-flight.png')[0], 200)
            self.assertEqual(self.request(method, '/secure-pilot/private-evidence.png')[0], 403)

class LineTransportTests(unittest.TestCase):
    def test_unverified_binding_never_writes_or_starts_sync(self):
        with patch('builtins.open') as opened, patch.object(line_notifier.threading,'Thread') as thread:
            self.assertEqual(line_notifier.save_student_line_binding('synthetic','synthetic')['code'],'AUTHENTICATED_GATEWAY_REQUIRED')
            opened.assert_not_called(); thread.assert_not_called()
    def test_tls_verifies_certificates_and_hostnames(self):
        context = line_notifier.get_ssl_context()
        self.assertEqual(context.verify_mode,ssl.CERT_REQUIRED); self.assertTrue(context.check_hostname)
    def test_missing_token_or_retired_proxy_never_calls_network(self):
        with patch.object(line_notifier,'LINE_CHANNEL_ACCESS_TOKEN',''), patch.object(line_notifier.urllib.request,'urlopen') as network:
            self.assertFalse(line_notifier.send_line_push_message('synthetic',[{'type':'text','text':'Synthetic'}]))
            self.assertFalse(line_notifier.send_line_via_gas_proxy('synthetic',[])); network.assert_not_called()
    def test_delivery_acceptance_requires_line_success_and_never_falls_back(self):
        for code,body,expected in [(200,b'{}',True),(200,b'{"error":"denied"}',False),(200,b'not-json',False),(503,b'{}',False)]:
            with self.subTest(code=code,body=body), patch.object(line_notifier,'LINE_CHANNEL_ACCESS_TOKEN','synthetic'), patch.object(line_notifier.urllib.request,'urlopen') as network, patch.object(line_notifier,'send_line_via_gas_proxy') as fallback:
                response = network.return_value.__enter__.return_value;response.status=code;response.read.return_value=body
                self.assertEqual(line_notifier.send_line_push_message('synthetic',[{'type':'text','text':'Synthetic'}]),expected)
                self.assertEqual(network.call_count,1);fallback.assert_not_called()
    def test_public_roster_and_mapping_are_not_identity_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); private=root/'private'; public=root/'public'; private.mkdir();public.mkdir()
            sid='99'+'00001'
            (public/'students.json').write_text(json.dumps([{'student_id':sid,'line_user_id':'synthetic-line'}]))
            (public/'line_mappings.json').write_text(json.dumps({'synthetic-line':'admin'}))
            with patch.object(line_notifier,'PRIVATE_DIR',str(private)),patch.object(line_notifier,'DATA_DIR',str(private)),patch.object(line_notifier,'FRONTEND_DATA_DIR',str(public)):
                self.assertIsNone(line_notifier.find_user_by_line_id('synthetic-line'))
                self.assertIsNone(line_notifier.get_student_line(sid))
                self.assertEqual(line_notifier.get_all_line_mappings(),{})
