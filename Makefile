all: build/templates.js

JSHINT=jshint

js_files = $(shell find . -name \*.js ! -path ./node_modules/\*)

jshint: $(js_files)
	$(JSHINT) $<

template_files = $(shell find js/templates -name \*.html ! -name \*.\#\*)

build/templates.js: $(template_files)
	mkdir -p build
	env PYTHONIOENCODING=utf-8 ./tools/compiletemplates.py $^ > $@

publish:
	rsync -e ssh -avz --exclude .git . --exclude config.js pubweb.adhocteam.us:/opt/lunchux/

clean:
	-rm -f build/templates.js
