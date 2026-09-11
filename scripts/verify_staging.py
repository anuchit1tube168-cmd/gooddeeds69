#!/usr/bin/env python3
"""GET-only health observations; never proves deployment ownership or version."""
import argparse
import json
import sys
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen


def validate_url(url):
    parts = urlsplit(url)
    if (parts.scheme != 'https' or not parts.hostname or parts.username or
            parts.password or parts.query or parts.fragment):
        raise ValueError('HTTPS endpoint without credentials, query or fragment required')
    return parts


def gas_ping_url(base_url):
    parts = validate_url(base_url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode({'action': 'ping'}), ''))


def get_json(url, timeout):
    request = Request(url, headers={'User-Agent': 'rtafnc-staging-verifier/1.0'}, method='GET')
    with urlopen(request, timeout=timeout) as response:
        if urlsplit(response.url).scheme != 'https':
            raise ValueError('Unexpected transport')
        raw = response.read(65537)
        if len(raw) > 65536:
            raise ValueError('Oversized response')
        return response.status, json.loads(raw.decode('utf-8'))


def health_matches(name, body, expected_service):
    if not isinstance(body, dict) or body.get('productionWriteEnabled') is not False:
        return False
    if body.get('mode') == 'static-preview':
        return False
    return (body.get('status') == ('success' if name == 'apps-script' else 'ok')
            and body.get('service') == expected_service)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gas-url', required=True)
    parser.add_argument('--cloudflare-health-url', required=True)
    parser.add_argument('--gas-service', required=True)
    parser.add_argument('--cloudflare-service', required=True)
    parser.add_argument('--timeout', type=float, default=15)
    args = parser.parse_args(argv)
    try:
        gas_url = gas_ping_url(args.gas_url)
        validate_url(args.cloudflare_health_url)
        if not 0 < args.timeout <= 60:
            raise ValueError('Timeout must be between 0 and 60 seconds')
    except ValueError as exc:
        parser.error(str(exc))
    failed = False
    for name, url, service in [
        ('apps-script', gas_url, args.gas_service),
        ('cloudflare', args.cloudflare_health_url, args.cloudflare_service),
    ]:
        result = {'check': name, 'deploymentVerified': False}
        try:
            status, body = get_json(url, args.timeout)
            ok = status == 200 and health_matches(name, body, service)
            result.update(ok=ok, httpStatus=status)
        except Exception:
            ok = False
            result.update(ok=False, error='HEALTH_CHECK_FAILED')
        # Never echo URLs, provider response bodies or exception strings.
        print(json.dumps(result))
        failed = failed or not ok
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
