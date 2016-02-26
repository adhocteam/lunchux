all: build/templates.js

JSHINT=jshint

js_files = $(shell find . -name \*.js ! -path ./node_modules/\*)

jshint: $(js_files)
	$(JSHINT) $<

template_files = $(shell find js/templates -name \*.html)

build/templates.js: $(template_files)
	mkdir -p build
	env PYTHONIOENCODING=utf-8 ./tools/compiletemplates.py $^ > $@

clean:
	-rm -f build/templates.js
