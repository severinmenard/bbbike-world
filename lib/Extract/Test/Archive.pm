#!/usr/local/bin/perl
# Copyright (c) 2012-2015 Wolfram Schneider, http://bbbike.org
#
# extract config and libraries

package Extract::Test::Archive;
use Test::More;
use Data::Dumper;
use BBBike::Test;

require Exporter;

#use base qw/Exporter/;
#our @EXPORT = qw(save_request complete_save_request check_queue Param large_int square_km);

use strict;
use warnings;

##########################
# helper functions
#

our $debug = 0;

# global URL hash per class
our $url_hash = {};

# Extract::Utils::new->('q'=> $q, 'option' => $option)
sub new {
    my $class = shift;
    my %args  = @_;

    my $self = {
        'supported_languages' => [ "de", "en" ],
        'lang'                => 'en',
        'format'              => '',
        'format_name'         => '',
        'url'                 => '',
        'coords'              => '',
        'file'                => '',

        %args
    };

    bless $self, $class;
    $self->init;

    return $self;
}

sub init {
    my $self = shift;

    if ( defined $self->{'debug'} ) {
        $debug = $self->{'debug'};
    }

    $self->{'counter'} = 0;

    $self->init_env;
    $self->init_lang;
}

#############################################################################
# !!! Keep in sync !!!
# /cgi/extract.pl
#
#
## parameters for osm2XXX shell scripts
#$ENV{BBBIKE_EXTRACT_URL} = &script_url( $option, $obj );
#$ENV{BBBIKE_EXTRACT_COORDS} = qq[$obj->{"sw_lng"},$obj->{"sw_lat"} x $obj->{"ne_lng"},$obj->{"ne_lat"}];
#$ENV{'BBBIKE_EXTRACT_LANG'} = $lang;

sub init_env {
    my $self = shift;

    my $option = {
        'pbf2osm' => {
            'garmin_version'     => 'mkgmap-3334',
            'maperitive_version' => 'Maperitive-2.3.34',
            'osmand_version'     => 'OsmAndMapCreator-1.1.3',
            'mapsforge_version'  => 'mapsforge-0.4.3',
            'navit_version'      => 'maptool-0.5.0~svn5126',
            'shape_version'      => 'osmium2shape-1.0',
            'mapsme_version'     => 'mapsme-1.0',
        }
    };

    $ENV{'BBBIKE_EXTRACT_GARMIN_VERSION'} =
      $option->{pbf2osm}->{garmin_version};
    $ENV{'BBBIKE_EXTRACT_MAPERITIVE_VERSION'} =
      $option->{pbf2osm}->{maperitive_version};
    $ENV{'BBBIKE_EXTRACT_OSMAND_VERSION'} =
      $option->{pbf2osm}->{osmand_version};
    $ENV{'BBBIKE_EXTRACT_MAPSFORGE_VERSION'} =
      $option->{pbf2osm}->{mapsforge_version};
    $ENV{'BBBIKE_EXTRACT_NAVIT_VERSION'} = $option->{pbf2osm}->{navit_version};
    $ENV{'BBBIKE_EXTRACT_SHAPE_VERSION'} = $option->{pbf2osm}->{shape_version};
    $ENV{'BBBIKE_EXTRACT_MAPSME_VERSION'} =
      $option->{pbf2osm}->{mapsme_version};

#$ENV{BBBIKE_EXTRACT_URL}  = 'http://extract.bbbike.org/?sw_lng=-72.33&sw_lat=-13.712&ne_lng=-71.532&ne_lat=-13.217&format=png-google.zip&city=Cusco%2C%20Peru';
#$ENV{BBBIKE_EXTRACT_COORDS} = '-72.33,-13.712 x -71.532,-13.217';
}

# default env values for Cusco test
sub init_cusco {
    my $self = shift;

    my $format = $self->{'format'};
    my $lang   = $self->{'lang'};

    $ENV{BBBIKE_EXTRACT_URL} =
"http://extract.bbbike.org/?sw_lng=-72.33&sw_lat=-13.712&ne_lng=-71.532&ne_lat=-13.217&format=$format.zip&city=Cusco%2C%20Peru"
      . ( $lang ? "&lang=$lang" : "" );

    $ENV{BBBIKE_EXTRACT_COORDS} = "-72.329,-13.711 x -71.531,-13.216";

    return $self->{'city'} = 'Cusco';
}

sub init_lang {
    my $self = shift;
    my $lang = $self->{'lang'};

    $ENV{'BBBIKE_EXTRACT_LANG'} = $lang;

    # delete empty value
    if ( !$ENV{'BBBIKE_EXTRACT_LANG'} || $ENV{'BBBIKE_EXTRACT_LANG'} eq "" ) {
        delete $ENV{'BBBIKE_EXTRACT_LANG'};
        $lang = "";
    }

    return $self->{'lang'} = $lang;
}

sub out {
    my $self     = shift;
    my $pbf_file = $self->{'pbf_file'};
    my $style    = shift;

    my $prefix = $pbf_file;
    $prefix =~ s/\.pbf$//;

    my $lang   = $self->{'lang'};
    my $format = $self->{'format'};

    return $self->{'file'} =
        "$prefix.$format"
      . ( $style ? "-$style" : "" )
      . (    $lang
          && $lang ne "en" ? ".$ENV{'BBBIKE_EXTRACT_LANG'}.zip" : ".zip" );
}

sub validate {
    my $self = shift;

    my %args = @_;

    $self->check_checksum;
    $self->check_readme;
    $self->check_readme_html;

    return $self->{'counter'};
}

sub extract_file {
    my $self = shift;

    my $file     = shift;
    my $zip_file = $self->{'file'};

    my @data = ();
    if ( !-e $zip_file ) {
        die "zip file '$zip_file' does not exists\n";
    }

    if ( !open( IN, "unzip -p $zip_file '*/$file' |" ) ) {
        warn "unzip -p $zip_file: $!\n";
        return @data;
    }

    while (<IN>) {
        push @data, $_;
    }
    close IN;

    return @data;
}

sub counter {
    my $self = shift;

    return $self->{'counter'};
}

sub check_checksum {
    my $self = shift;

    my @data = $self->extract_file('CHECKSUM.txt');

    is( scalar(@data), 2, "two checksums" );
    cmp_ok( length( $data[0] ), ">", 34, "md5 + text is larger than 32 bytes" );
    cmp_ok( length( $data[1] ),
        ">", 66, "sha256 + text is larger than 64 bytes" );

    $self->{'counter'} += 3;
}

sub check_readme {
    my $self = shift;

    my $lang        = $self->{'lang'};
    my $format      = $self->{'format'};
    my $format_name = $self->{'format_name'};

    my @data = $self->extract_file('README.txt');

    cmp_ok( scalar(@data), ">", "20",
        "README.txt must be at least 20 lines long $#data, lang='$lang'" );

    like(
        $data[0],
qr"^Map data.*OpenStreetMap contributors, https://www.openstreetmap.org",
        "map data"
    );
    like(
        $data[1],
        qr"^Extracts created by BBBike, http://BBBike.org",
        "by bbbike.org"
    );
    like( $data[2], qr"^\S+\s+by\s+https?://\S+", "by software" );

    if ( $lang eq 'de' ) {
        ok(
            (
                grep {
                    /^Diese $format_name Karte wurde erzeugt am: \S+\s+.*UTC.+$/
                } @data
            ),
            "format_name + datum check"
        );
        ok(
            (
                grep {
/^GPS Rechteck Koordinaten \(lng,lat\): [\-0-9\.]+,.* [\-0-9\.]+,/
                } @data
            ),
            "gps"
        );
        ok(
            (
                grep {
                    qr"^Script URL: http://.*bbbike.org/.*\?.*format=.+.*city="
                } @data
            ),
            "url"
        );
        ok( ( grep { /^Name des Gebietes: \S+/ } @data ), "name" );

        ok( ( grep { /^Spenden sind willkommen/ } @data ), "feedback" );
        ok(
            (
                grep {
                    qr"unterstuetzen: http://www.bbbike.org/community.de.html"
                } @data
            ),
            "donate"
        );
        ok( ( grep { /^Danke, Wolfram Schneider/ } @data ), "thanks" );
        ok(
            (
                grep { qr"^http://www.BBBike.org - Dein Fahrrad-Routenplaner" }
                  @data
            ),
            "footer"
        );

        $self->{'counter'} += 8;
    }
    else {
        ok(
            (
                grep {
/^This $format_name (file|map) was created on: \S+\s+.*UTC.+$/
                } @data
            ),
            "format_name + date check"
        );
        ok(
            (
                grep {
/^GPS rectangle coordinates \(lng,lat\): [\-0-9\.]+,.* [\-0-9\.]+,/
                } @data
            ),
            "gps"
        );
        ok(
            (
                grep {
                    qr"^Script URL: http://.*bbbike.org/.*\?.*format=.+.*city="
                } @data
            ),
            "url"
        );
        ok( ( grep { /^Name of area: \S+/ } @data ), "name" );

        ok( ( grep { /^We appreciate any feedback/ } @data ), "feedback" );
        ok(
            (
                grep {
qr"^PayPal, Flattr or bank wire transfer: http://www.BBBike.org/community.html"
                } @data
            ),
            "donate"
        );
        ok( ( grep { /^thanks, Wolfram Schneider/ } @data ), "thanks" );
        ok(
            (
                grep { qr"^http://www.BBBike.org - Your Cycle Route Planner" }
                  @data
            ),
            "footer"
        );

        $self->{'counter'} += 8;
    }

    $self->{'counter'} += 4;
}

sub check_readme_html {
    my $self = shift;

    my $lang        = $self->{'lang'};
    my $format      = $self->{'format'};
    my $format_name = $self->{'format_name'};

    my @data = $self->extract_file('README.html');

    cmp_ok( scalar(@data), ">", "20",
        "README.html must be at least 20 lines long $#data, lang='$lang'" );

    ok( ( grep { / charset=utf-8"/ } @data ), "charset" );

    ok( ( grep { qr"<title>.+</title>" } @data ), "<title/>" );
    ok( ( grep { qr"<body>" } @data ),            "<body>" );
    ok( ( grep { qr"</pre>" } @data ),            "</pre>" );
    ok( ( grep { qr"</body>" } @data ),           "</body>" );
    ok( ( grep { qr"</html>" } @data ),           "</html>" );

    my @url;
    foreach my $url (@data) {
        push @url, $1 if $url =~ /href="(.+?)"/;
    }

    $self->{'counter'} += 7;

    $self->validate_url(@url);
}

sub validate_url {
    my $self = shift;
    my @url  = @_;

    my $test = BBBike::Test->new();
    my $hash = $url_hash;

    foreach my $url (@url) {
        $url =~ s,^(https?://(www\.)?)BBBike\.org,${1}bbbike\.org,;

        diag "url: $url" if $debug;
        if ( exists $hash->{$url} ) {

            #diag "cache";
        }
        else {

            my $res = $test->myget_head($url);
            $hash->{$url} = $res;
            $self->{'counter'} += 3;
        }
    }

    #$url_hash = $hash;
}
1;

__DATA__;
