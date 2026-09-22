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
    def test_preview_daemon_hook_is_permanently_retired(self):
        scope = functions('backend/server.py', {'start_telegram_bot_listener_thread'})
        self.assertFalse(scope['start_telegram_bot_listener_thread']())

    def test_legacy_telegram_listener_module_stays_deleted(self):
        self.assertFalse(Path('data/telegram_bot_listener.py').exists())
        self.assertFalse(Path('data/line_webhook_bot.py').exists())

    def test_roster_export_stops_before_opening_or_overwriting_data(self):
        scope = functions('data/export_students.py', {'main'})
        with patch('builtins.open', side_effect=AssertionError('unexpected file access')):
            with self.assertRaisesRegex(RuntimeError, 'AUTHENTICATED_PRIVATE_EXPORT_REQUIRED'):
                scope['main']()

    def test_local_telegram_transport_is_retired_and_secret_free(self):
        source = Path('backend/server.py').read_text()
        self.assertNotIn("get_env_config('TELEGRAM_BOT_TOKEN')", source)
        self.assertNotIn("get_env_config('TELEGRAM_CHAT_ID')", source)
        self.assertNotIn('api.telegram.org/bot', source)
        scope = functions('backend/server.py', {'send_telegram_request', 'send_telegram_photo', 'notify_deed_submission_telegram'})
        self.assertEqual(scope['send_telegram_request']('sendMessage', {}), {})
        self.assertFalse(scope['send_telegram_photo']('/nonexistent', 'test'))
        self.assertFalse(scope['notify_deed_submission_telegram']({'id': 'synthetic-deed'}))


if __name__ == '__main__':
    unittest.main()
