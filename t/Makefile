# Copyright (c) 2009-2014 Wolfram Schneider, https://bbbike.org

all: help

NCPU:=  $(shell ../bin/ncpu)

perlcheck:
	echo "Check perl modules/scripts: ./world/t/*.t"
	${MAKE} _perlcheck >/dev/null 2>&1 || ${MAKE} _perlcheck

_perlcheck:
	cd ../../; ls world/t/*.t world/t/*.pl | xargs -n1 -P${NCPU} perl -I. -cw

perltidy: perlcheck
	cd ../../; ls world/t/*.t | xargs -n4 -P${NCPU} perltidy -b

clean:
	rm -f *.bak *.tdy *.ERR

distclean: clean
	rm -rf data-osm/tmp/[A-Za-z]*

help:
	@echo "usage: make [ perltidy | clean | distclean | help ]"

