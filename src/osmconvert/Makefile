###############################################################
# Copyright (c) 2013 Wolfram Schneider, https://bbbike.org
#
# Get and convert OpenStreetMap.org data to BBBike
#
# For more information about BBBike, visit https://www.bbbike.org
#
# see also
# https://wiki.openstreetmap.org/wiki/Osmconvert#Download
#

PROG=osmconvert
DATE := $(shell date '+%Y-%m-%d')
VERSION := $(shell egrep '^.define VERSION' ${PROG}.c  | perl -npe 's,.*?",,; s,".*,,')

all: ${PROG}

${PROG}.o: ${PROG}.c
	cc -c $< 

${PROG}: ${PROG}.o
	cc $< -lz -O3 -o ${PROG}-${VERSION}
	ls -l ${PROG}-${VERSION}
	ldd ${PROG}-${VERSION}

help:
	@echo "usage: make [ targets ... ]"
	@echo ""
	@echo "  [ help | clean | all ]"

distclean: clean
clean:
	rm -f ${PROG} ${PROG}-${DATE} ${PROG}-${VERSION} ${PROG}.o

