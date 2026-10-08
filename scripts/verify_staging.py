#!/usr/bin/env python3
"""Read-only deployment checks for the Good Deed staging services."""

import argparse
import json
import sys
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl
from urllib.request import Request, urlopen


def gas_ping_url(base_url):
    parts = urlsplit(base_url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query['action'] = 'ping'
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), ''))


def get_json(url, timeout):
    request = Request(url, headers={'User-Agent': 'rtafnc-staging-verifier/1.0'}, method='GET')
    with urlopen(request, timeout=timeout) as response:
        return response.status, json.loads(response.read().decode('utf-8'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gas-url', required=True)
    parser.add_argument('--cloudflare-url', required=True)
    parser.add_argument('--timeout', type=float, default=15)
    args = parser.parse_args()

    checks = [
        ('apps-script', gas_ping_url(args.gas_url),
         lambda body: body.get('status') == 'success' and body.get('productionWriteEnabled') is False),
        ('cloudflare', args.cloudflare_url.rstrip('/') + '/api/health',
         lambda body: body.get('status') == 'ok' and body.get('productionWriteEnabled') is False),
    ]
    failed = False
    for name, url, predicate in checks:
        try:
            status, body = get_json(url, args.timeout)
            ok = status == 200 and predicate(body)
            print(json.dumps({'check': name, 'ok': ok, 'httpStatus': status, 'url': url}))
            failed = failed or not ok
        except Exception as exc:
            print(json.dumps({'check': name, 'ok': False, 'url': url, 'error': str(exc)}))
            failed = True
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
