######################################################################
#
BBBIKE_WORLD_JAVASCRIPT_FILES=msg.??.json

JAVASCRIPT_FILES= ${BBBIKE_WORLD_JAVASCRIPT_FILES}

jsbeautifier js jsb:
	for i in ${BBBIKE_WORLD_JAVASCRIPT_FILES}; do \
	   jsbeautifier -k $$i > $@.tmp && mv -f $@.tmp $$i; \
	done

clean:
	rm -f *.bak
distclean: clean

help:
	@echo "make [ jsbeautifier | clean ]"

