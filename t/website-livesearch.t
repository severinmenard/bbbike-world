#!/usr/local/bin/perl
# Copyright (c) Sep 2012-2016 Wolfram Schneider, http://bbbike.org

BEGIN {
    if ( $ENV{BBBIKE_TEST_NO_NETWORK} || $ENV{BBBIKE_TEST_NO_PRODUCTION} ) {
        print "1..0 # skip due no network or non production\n";
        exit;
    }
}

use Test::More;
use lib qw(./world/lib ../lib);
use BBBike::Test;
use Extract::Config;

use strict;
use warnings;

my $test           = BBBike::Test->new();
my $extract_config = Extract::Config->new()->load_config_nocgi();

my @homepages_localhost =
  ( $ENV{BBBIKE_TEST_SERVER} ? $ENV{BBBIKE_TEST_SERVER} : "http://localhost" );
my @homepages = $extract_config->get_server_list(qw/www dev/);

if ( $ENV{BBBIKE_TEST_FAST} || $ENV{BBBIKE_TEST_SLOW_NETWORK} ) {
    @homepages = ();
}
unshift @homepages, @homepages_localhost;

# ads only on production system
plan tests => scalar(@homepages) * ( $test->myget_counter + 16 );

sub livesearch_extract {
    my $url = shift;

    my $res = $test->myget( $url, 5_000 );
    my $content = $res->decoded_content();

    like( $content, qr|Content-Type" content="text/html; charset=utf-8"|,
        "charset" );

    #like( $content, qr|rel="shortcut|, "icon" );
    like( $content, qr|src="(..)?/html/bbbike(-js)?.js"|, "bbbike(-js)?.js" );
    like( $content, qr|src="(..)?/html/jquery/.*?.js"|,   "jquery.js" );
    like( $content, qr|href="(..)?/html/bbbike.css"|,     "bbbike.css" );

    like( $content, qr|<div id="map"></div>|, "div#map" );
    like( $content, qr|bbbike_maps_init|,     "bbbike_maps_init" );
    like( $content, qr|city = ".+";|,         "city" );

    like( $content, qr|bbbike_maps_init|,         "bbbike_maps_init" );
    like( $content, qr|plotRoute|,                "plotRoute" );
    like( $content, qr|Cycle Route Statistic|,    "Cycle Route Statistic" );
    like( $content, qr|Number of unique routes:|, "Number of unique routes:" );
    like( $content, qr|median:|,                  "median:" );
    like( $content, qr|jumpToCity|,               "jumpToCity" );
    like( $content, qr|>today<|,                  ">today<" );

    like( $content, qr|<div id="footer">|, "footer" );
    like( $content, qr|</html>|,           "closing </html>" );

    return $content;
}

########################################################################
# main
#

foreach my $homepage (@homepages) {

    #diag "checked homepage $homepage";
    &livesearch_extract("$homepage/cgi/livesearch.cgi");
}

__END__
