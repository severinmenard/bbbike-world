#!/usr/local/bin/perl
# Copyright (c) 2012-2016 Wolfram Schneider, http://bbbike.org
#
# extract config load

package Extract::Config;

use CGI;
use JSON;
use Data::Dumper;

use strict;
use warnings;

###########################################################################
# config
#

# global config object
our $option = {};

our $formats = {
    'osm.pbf' => 'Protocolbuffer (PBF)',
    'osm.gz'  => "OSM XML gzip'd",
    'osm.bz2' => "OSM XML bzip'd",
    'osm.xz'  => "OSM XML 7z (xz)",

    'shp.zip' => "Shapefile (Esri)",

    'garmin-osm.zip'           => "Garmin OSM",
    'garmin-osm-ascii.zip'     => "Garmin OSM (ASCII)",
    'garmin-cycle.zip'         => "Garmin Cycle",
    'garmin-leisure.zip'       => "Garmin Leisure",
    'garmin-bbbike.zip'        => "Garmin BBBike",
    'garmin-onroad.zip'        => "Garmin Onroad",
    'garmin-onroad-ascii.zip'  => "Garmin Onroad (ASCII)",
    'garmin-openfietslite.zip' => "Garmin Openfietsmap Lite",

    'svg-google.zip'     => 'SVG google',
    'svg-hiking.zip'     => 'SVG hiking',
    'svg-osm.zip'        => 'SVG mapnik',
    'svg-urbanight.zip', => 'SVG night',
    'svg-wireframe.zip'  => 'SVG wireframe',
    'svg-cadastre.zip'   => 'SVG cadastre',

    'png-google.zip'     => 'PNG google',
    'png-hiking.zip'     => 'PNG hiking',
    'png-osm.zip'        => 'PNG mapnik',
    'png-urbanight.zip', => 'PNG night',
    'png-wireframe.zip'  => 'PNG wireframe',
    'png-cadastre.zip'   => 'PNG cadastre',

    'navit.zip' => "Navit",

    'obf.zip' => "Osmand (OBF)",

    'o5m.gz' => "o5m gzip'd",
    'o5m.xz' => "o5m 7z (xz)",

    'opl.xz' => "OPL 7z (xz)",
    'csv.gz' => "csv gzip'd",
    'csv.xz' => "csv 7z (xz)",

    'mapsforge-osm.zip' => "Mapsforge OSM",
    'mapsme-osm.zip'    => "maps.me OSM",

    'srtm-europe.osm.pbf'         => 'SRTM Europe PBF (25m)',
    'srtm-europe.osm.xz'          => 'SRTM Europe OSM XML 7z (25m)',
    'srtm-europe.garmin-srtm.zip' => 'SRTM Europe Garmin (25m)',
    'srtm-europe.obf.zip'         => 'SRTM Europe Osmand (25m)',

    'srtm.osm.pbf'         => 'SRTM World PBF (40m)',
    'srtm.osm.xz'          => 'SRTM World OSM XML 7z (40m)',
    'srtm.garmin-srtm.zip' => 'SRTM World Garmin (40m)',
    'srtm.obf.zip'         => 'SRTM World Osmand (40m)',

    #'srtm-europe.mapsforge-osm.zip' => 'SRTM Europe Mapsforge',
    #'srtm-southamerica.osm.pbf' => 'SRTM South America PBF',

};

our $formats_menu = {
    'osm' => {
        'title'   => "OSM",
        'formats' => [
            'osm.pbf', 'osm.xz', 'osm.gz', 'osm.bz2',
            'o5m.xz',  'opl.xz', 'csv.xz',
        ]
    },
    'garmin' => {
        'title'   => "Garmin",
        'formats' => [
            'garmin-osm.zip',          'garmin-osm-ascii.zip',
            'garmin-cycle.zip',        'garmin-leisure.zip',
            'garmin-bbbike.zip',       'garmin-onroad.zip',
            'garmin-onroad-ascii.zip', 'garmin-openfietslite.zip'
        ]
    },
    'android' => {
        'title' => "Android",
        'formats' =>
          [ 'obf.zip', 'mapsforge-osm.zip', 'mapsme-osm.zip', 'navit.zip' ]
    },
    'shape' => { 'title' => "Shapefile", 'formats' => ['shp.zip'] },
    'svg'   => {
        'title'   => "SVG",
        'formats' => [
            qw/svg-google.zip svg-hiking.zip svg-osm.zip svg-urbanight.zip svg-wireframe.zip svg-cadastre.zip/
        ]
    },
    'png' => {
        'title'   => "PNG",
        'formats' => [
            qw/png-google.zip png-hiking.zip png-osm.zip png-urbanight.zip png-wireframe.zip png-cadastre.zip/
        ]
    },
    'srtm' => {
        'title'   => "Contours (SRTM)",
        'formats' => [
            'srtm-europe.osm.pbf',         'srtm-europe.osm.xz',
            'srtm-europe.garmin-srtm.zip', 'srtm-europe.obf.zip',
            'srtm.osm.pbf',                'srtm.osm.xz',
            'srtm.garmin-srtm.zip',        'srtm.obf.zip'
        ]
    }
};

our $spool = {
    'incoming'  => "incoming",     # incoming request, not confirmed yet
    'confirmed' => "confirmed",    # ready to run
    'running'   => "running",      # currently running job
    'osm'       => "osm",          # cache older runs
    'download'  => "download",     # final directory for download
    'trash'     => "trash",        # keep a copy of the config for debugging
    'failed'    => "failed",       # keep record of failed runs
};

our $spool_dir = '/var/cache/extract';

our $planet_osm = {

    #'planet.osm' => '../osm/download/planet-latest.osm.pbf',
    'planet.osm' => '../osm/download/planet-latest-nometa.osm.pbf',

    'srtm-europe.osm.pbf' =>
      '../osm/download/srtm/Hoehendaten_Freizeitkarte_Europe.osm.pbf',
    'srtm-europe.osm.xz' =>
      '../osm/download/srtm/Hoehendaten_Freizeitkarte_Europe.osm.pbf',
    'srtm-europe.garmin-srtm.zip' =>
      '../osm/download/srtm/Hoehendaten_Freizeitkarte_Europe.osm.pbf',
    'srtm-europe.obf.zip' =>
      '../osm/download/srtm/Hoehendaten_Freizeitkarte_Europe.osm.pbf',
    'srtm-europe.mapsforge-osm.zip' =>
      '../osm/download/srtm/Hoehendaten_Freizeitkarte_Europe.osm.pbf',

    'srtm.osm.pbf'           => '../osm/download/srtm/planet-srtm-e40.osm.pbf',
    'srtm.osm.xz'            => '../osm/download/srtm/planet-srtm-e40.osm.pbf',
    'srtm.garmin-srtm.zip'   => '../osm/download/srtm/planet-srtm-e40.osm.pbf',
    'srtm.obf.zip'           => '../osm/download/srtm/planet-srtm-e40.osm.pbf',
    'srtm.mapsforge-osm.zip' => '../osm/download/srtm/planet-srtm-e40.osm.pbf',
};

#
# config for tile size databases
#
# available databases:
#
# world/etc/tile/csv.xz.csv
# world/etc/tile/garmin-osm.zip.csv
# world/etc/tile/mapsforge-osm.zip.csv
# world/etc/tile/navit.zip.csv
# world/etc/tile/obf.zip.csv
# world/etc/tile/osm.gz.csv
# world/etc/tile/pbf.csv
# world/etc/tile/shp.zip.csv
# world/etc/tile/srtm-europe.garmin-srtm.zip.csv
# world/etc/tile/srtm-europe.obf.zip.csv
# world/etc/tile/srtm-europe.pbf.csv
# world/etc/tile/srtm-garmin-srtm.zip.csv
# world/etc/tile/srtm-obf.zip.csv
# world/etc/tile/srtm-pbf.csv
# world/etc/tile/test.csv
#
# all others must be matched to a known database
#
our $tile_format = {
    "osm.pbf" => "pbf",
    "pbf"     => "pbf",

    "osm.gz"  => "osm.gz",
    "osm"     => "osm.gz",
    "gz"      => "osm.gz",
    "osm.xz"  => "osm.gz",
    "osm.bz2" => "osm.gz",

    "shp.zip" => "shp.zip",
    "shp"     => "shp.zip",

    "obf.zip" => "obf.zip",
    "obf"     => "obf.zip",

    "garmin-cycle.zip"         => "garmin-osm.zip",
    "garmin-osm.zip"           => "garmin-osm.zip",
    "garmin-osm-ascii.zip"     => "garmin-osm.zip",
    "garmin-leisure.zip"       => "garmin-osm.zip",
    "garmin-bbbike.zip"        => "garmin-osm.zip",
    "garmin-openfietslite.zip" => "garmin-osm.zip",

    "navit.zip" => "navit.zip",
    "navit"     => "navit.zip",

    "mapsforge-osm.zip" => "mapsforge-osm.zip",
    "mapsme-osm.zip"    => "pbf",

    "o5m.gz"  => "pbf",
    "o5m.bz2" => "pbf",
    "o5m.xz"  => "pbf",

    "csv.xz"  => "pbf",
    "csv.gz"  => "pbf",
    "csv.bz2" => "pbf",

    "opl.xz" => "pbf",

    "srtm-europe.osm.pbf"         => "srtm-europe-pbf",
    "srtm-europe.osm.xz"          => "srtm-europe-pbf",
    "srtm-europe.garmin-srtm.zip" => "srtm-europe-garmin-srtm.zip",
    "srtm-europe.obf.zip"         => "srtm-europe-obf.zip",

    "srtm.osm.pbf"         => "srtm-pbf",
    "srtm.osm.xz"          => "srtm-pbf",
    "srtm.garmin-srtm.zip" => "srtm-garmin-srtm.zip",
    "srtm.obf.zip"         => "srtm-obf.zip",
};

our $server = {
    'dev' => [qw/dev.bbbike.org dev1.bbbike.org dev4.bbbike.org/],
    'www' => [qw/www.bbbike.org www1.bbbike.org www4.bbbike.org/],
    'extract' =>
      [qw/extract.bbbike.org extract1.bbbike.org extract4.bbbike.org/],
    'download' =>
      [qw/download.bbbike.org download1.bbbike.org download4.bbbike.org/],
    'api'  => [qw/api.bbbike.org api1.bbbike.org api4.bbbike.org/],
    'tile' => [
        qw/a.tile.bbbike.org b.tile.bbbike.org c.tile.bbbike.org d.tile.bbbike.org/
    ],
    'production' => [
        qw(www.bbbike.org download.bbbike.org extract.bbbike.org mc.bbbike.org a.tile.bbbike.org b.tile.bbbike.org c.tile.bbbike.org d.tile.bbbike.org api.bbbike.org )
    ],
};

##########################
# helper functions
#

# Extract::Config::new->('q'=> $q, 'option' => $option)
sub new {
    my $class = shift;
    my %args  = @_;

    my $self = {%args};

    bless $self, $class;

    return $self;
}

#
# get list of active servers per service
# 'www' => (www, www1, www2, www3)
# 'extract' => (extract, extract2)
#
sub get_server_list {
    my $self = shift;
    my @type = @_;

    my $debug = $self->{'debug'};

    my @list = ();
    my $server = $option->{'server'} || $server;
    warn Dumper($server) if $debug >= 2;

    foreach my $type (@type) {
        if ( !$type || !exists $server->{$type} ) {
            warn "Unknown server type '$type'\n";
            return ();
        }

        foreach my $s ( @{ $server->{$type} } ) {
            push @list, "http://$s";
        }
    }

    return @list;
}

#
# Parse user config file by extract.cgi
# This allows to override standard config values
#

sub load_config {
    my $self = shift;

    my $config_file = shift || "../.bbbike-extract.rc";

    my $q = $self->{'q'};
    $option = $self->{'option'};

    my $debug =
      $q->param("debug") || $self->{'debug'} || $option->{'debug'} || 0;
    $self->{'debug'} = $debug;

    if (   $q->param('pro')
        || $q->url( -full => 1 ) =~ m,^http://extract-pro[1-4]?\., )
    {
        $option->{'pro'} = 1;

        $config_file = '../.bbbike-extract-pro.rc';
        warn "Use extract pro config file $config_file\n"
          if $debug >= 2;
    }

    # you can run "require" in perl only once
    if ( $INC{$config_file} ) {
        warn "WARNING: Config file $config_file was already loaded, ignored.\n";
        warn
qq{did you called Extract::Config->load_config("$config_file") twice?\n};
        return;
    }

    if ( -e $config_file ) {
        warn "Load config file: $config_file\n" if $debug >= 2;
        require $config_file;

        # double-check
        if ( $q->param("pro") ) {
            my $token = $option->{'email_token'} || "";
            if ( $token ne $q->param('pro') ) {
                warn Dumper($option) if $debug;
                die "Pro parameter does not match token\n";
            }
        }
    }

    else {
        warn "config file: $config_file not found, ignored\n"
          if $debug >= 2;
    }

    $self->config_format_menu;
}

sub config_format_menu {
    my $self = shift;

    $option = $self->{'option'};
    my $debug = $self->{'debug'};

    my $formats_order = $option->{'formats_order'};
    foreach my $f (@$formats_order) {
        if ( exists $formats_menu->{$f} ) {
            push @{ $option->{'formats'} }, $formats_menu->{$f};
        }
        else {
            warn "Unknown select menu format: $f, ignored\n" if $debug >= 1;
        }
    }
}

#
# Parse user config file.
# This allows to override standard config values
#
sub load_config_nocgi {
    my $self = shift;

    $option = $self->{'option'};
    my $debug = $self->{'debug'} || $option->{'debug'} || 0;

    my $config_file = "$ENV{HOME}/.bbbike-extract.rc";
    if ( $ENV{BBBIKE_EXTRACT_PROFILE} ) {
        $config_file = $ENV{BBBIKE_EXTRACT_PROFILE};
    }
    if ( -e $config_file ) {
        warn "Load config file nocgi: $config_file\n" if $debug >= 2;
        require $config_file;
    }
    else {
        warn "config file: $config_file not found, ignored\n"
          if $debug >= 2;
    }

    $self->{'debug'} = $debug;
    return $self;
}

# re-set values for extract-pro service
sub check_extract_pro {
    my $self = shift;

    my $q = $self->{'q'};
    $option = $self->{'option'};

    my $url = $q->url( -full => 1 );

    # basic version, skip
    return if !( $q->param("pro") || $url =~ m,/extract-pro/, );

    foreach my $key (qw/homepage_extract spool_dir download/) {
        my $key_pro = $key . "_pro";
        $option->{$key} = $option->{$key_pro};
    }

    $option->{"pro"} = 1;
}

sub is_production {
    my $self = shift;

    my $q = $self->{'q'};

    return 1 if -e "/tmp/is_production";

    return $q->virtual_host() =~ /^extract\.bbbike\.org$/i ? 1 : 0;
}

1;

__DATA__;
