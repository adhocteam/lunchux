#!/usr/bin/env python
# Parts adapted from Django (BSD-licensed, compatible with MIT)
# https://github.com/django/django/blob/dec334cb66b3ee59cb82e1bb99a584aa0b9fbbd5/django/utils/html.py

from __future__ import unicode_literals, print_function
import os.path
import sys

_js_escapes = {
    ord('\\'): '\\u005C',
    ord('\''): '\\u0027',
    ord('"'): '\\u0022',
    ord('>'): '\\u003E',
    ord('<'): '\\u003C',
    ord('&'): '\\u0026',
    ord('='): '\\u003D',
    ord('-'): '\\u002D',
    ord(';'): '\\u003B',
    ord('\u2028'): '\\u2028',
    ord('\u2029'): '\\u2029'
}

# Escape every ASCII character with a value less than 32.
_js_escapes.update((ord('%c' % z), '\\u%04X' % z) for z in range(32))

def decode(strlike):
    if isinstance(strlike, bytes):
        return strlike.decode('utf-8')
    if isinstance(strlike, str):
        return strlike
    raise ValueError()

def escape_js_file(filename):
    lines = []
    with open(filename) as f:
        for line in f:
            lines.append(decode(line).translate(_js_escapes))
    return ''.join(lines)

def main(argv=None):
    if argv is None:
        argv = sys.argv
    infiles = argv[1:]
    print("var LunchUX = LunchUX || {};")
    print("LunchUX.Templates = {};")
    for filename in infiles:
        base = os.path.basename(filename)
        name, _ = os.path.splitext(base)
        js = escape_js_file(filename)
        print("LunchUX.Templates['{}'] = '{}';".format(name, js))

if __name__ == '__main__':
    sys.exit(main())
