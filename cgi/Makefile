# Copyright (c) 2009-2013 Wolfram Schneider, https://bbbike.org

all: perltidy
NCPU=`../bin/ncpu`

ALL:=	$(shell file * | egrep -w 'perl|Perl|Perl5' | egrep -v homemap.cgi | awk '{print $$1}' | perl -ne 's/://; print if !/.(bak|tdy|ERR)$$/' | sort)

perlcheck:
	${MAKE} _perlcheck 2>/dev/null || ${MAKE} _perlcheck

_perlcheck:
	@echo "Check perl modules/scripts: ${ALL}"
	@echo ${ALL} | xargs -n1 -P${NCPU} -E " " perl -T -cw

perltidy: perlcheck
	echo ${ALL} | xargs -n4 -P${NCPU} -E " " perltidy -b

clean:
	rm -f *.bak *.tdy *.ERR

distclean: clean msg-clean
msg-clean:
	rm -f ../../cgi/msg/*.bak

help:
	@echo "make [ perltidy | clean ]"
