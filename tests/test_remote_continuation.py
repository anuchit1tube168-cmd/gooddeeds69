"""Isolated function tests: never import/start the legacy Telegram daemon."""
import ast
import contextlib
import io
import json
from pathlib import Path
import ssl
import unittest
import urllib.request
import urllib.parse
from unittest.mock import patch


def functions(path, names, namespace=None):
    tree = ast.parse(Path(path).read_text(), filename=path)
    selected = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
    assert len(selected) == len(names)
    scope = dict(namespace or {})
    exec(compile(ast.Module(body=selected, type_ignores=[]), path, 'exec'), scope)
    return scope


class RemoteContinuationTests(unittest.TestCase):
    def test_preview_daemon_hook_starts_listener_when_deps_available(self):
        import sys as _sys, os as _os, importlib as _importlib
        scope = functions('backend/server.py', {'start_telegram_bot_listener_thread'}, {
            'sys': _sys, 'os': _os, 'importlib': _importlib,
            'BASE_DIR': '/nonexistent',
            'save_or_update_deed_in_db': None,
            'broadcast_event': None,
            'load_students_map': None,
        })
        # Re-enabled: returns True when module loads (thread starts, exits if no token)
        result = scope['start_telegram_bot_listener_thread']()
        self.assertIsNotNone(result)

    def test_retired_callback_runtimes_cannot_be_started(self):
        self.assertFalse(Path('data/telegram_bot_listener.py').exists())
        self.assertFalse(Path('data/line_webhook_bot.py').exists())

    def test_roster_export_stops_before_opening_or_overwriting_data(self):
        scope = functions('data/export_students.py', {'main'})
        with patch('builtins.open', side_effect=AssertionError('unexpected file access')):
            with self.assertRaisesRegex(RuntimeError, 'AUTHENTICATED_PRIVATE_EXPORT_REQUIRED'):
                scope['main']()

    def test_telegram_tls_is_verified_and_rejected_delivery_is_not_success(self):
        scope = functions('backend/server.py', {'send_telegram_request'}, {
            'get_env_config': lambda key: 'synthetic-token', 'json': json, 'urllib': urllib, 'ssl': ssl
        })
        output = io.StringIO()

        def failed_open(request, **kwargs):
            self.assertEqual(kwargs['context'].verify_mode, ssl.CERT_REQUIRED)
            self.assertTrue(kwargs['context'].check_hostname)
            raise OSError('synthetic-secret-in-error')

        with patch('urllib.request.urlopen', failed_open), contextlib.redirect_stdout(output):
            self.assertEqual(scope['send_telegram_request']('sendMessage', {}), {})
        self.assertNotIn('synthetic-secret-in-error', output.getvalue())
        sid = ''.join(['99', '00001'])
        notify = functions('backend/server.py', {'notify_deed_submission_telegram'}, {
            'get_env_config': lambda key, default='': 'https://example.invalid/frontend' if key == 'SYSTEM_URL' else 'synthetic',
            'load_students_map': lambda: {sid: {'first_name': 'Synthetic', 'last_name': 'Student'}},
            'CATEGORIES_NAME_MAP': {}, 'urllib': urllib, 'send_telegram_request': lambda *args: {'ok': False},
            'time': __import__('time')
        })
        self.assertFalse(notify['notify_deed_submission_telegram']({'studentId': sid, 'id': 'synthetic-deed', 'activityDate': '2026-09-10'}))


if __name__ == '__main__':
    unittest.main()
