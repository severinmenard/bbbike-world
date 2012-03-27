#!/usr/local/bin/perl
# Copyright (c) 2009-2012 Wolfram Schneider, http://bbbike.org
#
# area.cgi - which areas are covered by bbbike.org

use CGI qw/-utf-8/;
use IO::File;
use JSON;
use Data::Dumper;

use lib './world/bin';
use lib '../world/bin';
use lib '../bin';
use BBBikeWorldDB;

use strict;
use warnings;

my $debug = 1;

binmode \*STDOUT, ":raw";
my $q = new CGI;

sub footer {
    my %args   = @_;
    my $q      = new CGI;
    my $cities = $args{'cities'};

    my $city = $q->param("city") || "";
    $city = "Berlin" if $city !~ /^[A-Z][a-z]+$/;
    $city = "Berlin" if !grep { $city eq $_ } @$cities;

    $city = CGI::escapeHTML($city);

    return <<EOF;
<div id="footer">
<div id="footer_top">
<a href="../">home</a> |
<a href="/$city/">$city</a> |
<a href="javascript:resizeOtherCities(more_cities);">more cities</a>

</div>
</div>
<hr>

<div id="copyright" style="text-align: center; font-size: x-small; margin-top: 1em;" >
(&copy;) 2008-2012 <a href="http://bbbike.org">BBBike.org</a> // Map data by the <a href="http://www.openstreetmap.org/" title="OpenStreetMap License">OpenStreetMap</a> Project
<div id="footer_community">
</div>
</div>
EOF
}

##############################################################################################
#
# main
#

my $database = "world/etc/cities.csv";
$database = "../$database" if -e "../$database";

my $db = BBBikeWorldDB->new( 'database' => $database, 'debug' => 0 );

print $q->header( -charset => 'utf-8', -expires => '+30m' );

my $sensor = 'true';
my $city_area = $q->param('city') || "";

print $q->start_html(
    -title => 'BBBike @ World covered areas',
    -head  => $q->meta(
        {
            -http_equiv => 'Content-Type',
            -content    => 'text/html; charset=utf-8'
        }
    ),

    -style => {
        'src' => [
            "../html/devbridge-jquery-autocomplete-1.1.2/styles.css",
            "../html/bbbike.css"
        ]
    },
    -script => [
        { -type => 'text/javascript', 'src' => "../html/jquery-1.4.2.min.js" },
        {
            -type => 'text/javascript',
            'src' =>
"../html/devbridge-jquery-autocomplete-1.1.2/jquery.autocomplete-min.js"
        },
        {
            -type => 'text/javascript',
            'src' =>
"http://maps.google.com/maps/api/js?sensor=$sensor&amp;language=de"
        },
        { -type => 'text/javascript', 'src' => "../html/bbbike.js" },
        { -type => 'text/javascript', 'src' => "../html/maps3.js" }
    ]
);

print qq{<div id="routing"></div>\n};
print qq{<div id="BBBikeGooglemap" style="height:94%">\n};
print qq{<div id="map"></div>\n};

my $map_type = $city_area ? "mapnik" : "terrain";
print <<EOF;
    <script type="text/javascript">
    //<![CDATA[

    city = "dummy";
    bbbike_maps_init('$map_type', [[43, 8],[57, 15]], "en", 1 );
  
    function jumpToCity (coord) {
	var b = coord.split("!");

	var bounds = new google.maps.LatLngBounds;
        for (var i=0; i<b.length; i++) {
	      var c = b[i].split(",");
              bounds.extend(new google.maps.LatLng( c[1], c[0]));
        }
        map.setCenter(bounds.getCenter());
        map.fitBounds(bounds);
	var zoom = map.getZoom();

        // no zoom level higher than 15
         map.setZoom( zoom < 16 ? zoom + 0 : 16);
    } 

    //]]>
    </script>
EOF

print qq{<script type="text/javascript">\n};

my $json = new JSON;
my $counter;
my @route_display;

my %hash = %{ $db->city };
my $city_center;
my @city_list;
foreach my $city ( sort keys %hash ) {

    my $coord = $hash{$city}->{'coord'};

    # warn "c: $city\n"; warn Dumper($hash{$city}), "\n";

    my $opt;
    my ( $x1, $y1, $x2, $y2 ) = split /\s+/, $coord;

    $opt->{"area"}        = "$x1,$y1!$x2,$y2";
    $opt->{"city"}        = "$city";
    $city_center->{$city} = $opt->{"area"};

    my $opt_json = $json->encode($opt);
    print qq{plotRoute(map, $opt_json, "[]");\n};

    push @city_list, $city;
}

my $city = $q->param('city') || "Berlin";
if ( $city && exists $city_center->{$city} ) {
    print "\n", qq[jumpToCity('$city_center->{$city}');\n];
}

print <<EOF;
var more_cities = false;
function resizeOtherCities(toogle) {
    var tag = document.getElementById("BBBikeGooglemap");
    var tag_more_cities = document.getElementById("more_cities");

    if (!tag) return;
    if (!tag_more_cities) return;

    if (!toogle) {
        tag.style.height = "75%";
	tag_more_cities.style.display = "block";
	tag_more_cities.style.fontSize = "85%";

    } else {
	tag_more_cities.style.display = "none";
        tag.style.height = "90%";
    }

    more_cities = toogle ? false : true;
    google.maps.event.trigger(map, 'resize');
}

resizeFullScreen(false);

</script>
<noscript>
<p>You must enable JavaScript and CSS to run this application!</p>
</noscript>
</div> <!-- map -->

EOF

print qq{<div id="more_cities" style="display:none;">\n};
foreach my $c (@city_list) {
    next if $c eq 'dummy' || $c eq 'bbbike';
    print qq{<a href="?city=$c">$c</a>\n};
}
print qq{<p/></div><!-- more cities -->\n};

print &footer( "cities" => \@city_list );

print $q->end_html;

