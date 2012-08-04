#!/usr/local/bin/perl
# Copyright (c) 2012 Wolfram Schneider, http://bbbike.org
#
# extract-lnglat.pl - split the planet.osm into 360x180 lng,lat data tiles
#
# usage: extract-lng-lat.pl > shell.sh

# Aachen:::de::5.88 50.60 6.58 50.99:294951::

my $heatmap = $ENV{TILES_DIR} || "tiles";
my $step = 4;

my $fs; # file step
for ( -180 .. 179 ) {
    $fs = $_ if $_ % $step == 0;
    $a = $fs + $step;

    print
qq[time make -s -f Makefile.osm],
      qq[ MAX_CPU=1],
      qq[ CITIES_FILE=$heatmap/cities/cities_${_}.txt],
      qq[ LOG_DIR=$heatmap/tmp],
      qq[ CITIES_DB=$heatmap/cities/cities_${_}.csv],
      qq[ OSM_DIR=$heatmap/osm-lnglat/$_ ],
qq[ OSM_PLANET_PBF=$heatmap/osm-lng/planet_${fs}_-89_${a}_89.osm.pbf ],
      qq[_cities-pbf > $heatmap/tmp/log.extract-lnglat.$_\0];
}

