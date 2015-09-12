#!/usr/local/bin/perl
# Copyright (c) Sep 2012-2013 Wolfram Schneider, http://bbbike.org

#BEGIN { }
BEGIN {
    print "1..0 # skip, not implemented yet\n";
    exit;
}

use FindBin;
use lib ( "$FindBin::RealBin/..", "$FindBin::RealBin/../lib",
    "$FindBin::RealBin", );

use Getopt::Long;
use Data::Dumper qw(Dumper);
use Test::More;
use File::Temp qw(tempfile);
use IO::File;
use Digest::MD5 qw(md5_hex);
use File::stat;

use strict;
use warnings;

my @svg_styles = qw/google/;
push @svg_styles, qw/osm/ if !$ENV{BBBIKE_TEST_FAST};
push @svg_styles, qw/urbanight wireframe/ if $ENV{BBBIKE_TEST_LONG};

plan tests => 4 + 5 * scalar(@svg_styles);

my $pbf_file = 'world/t/data-osm/tmp/Cusco.osm.pbf';

if ( !-f $pbf_file ) {
    system(qw(ln -sf ../Cusco.osm.pbf world/t/data-osm/tmp)) == 0
      or die "symlink failed: $?\n";
}

my $pbf_md5 = "6dc9df64ddc42347bbb70bc134b4feda";

# min size of garmin zip file
my $min_size = 200_000;

sub md5_file {
    my $file = shift;
    my $fh = new IO::File $file, "r";
    die "open file $file: $!\n" if !defined $fh;

    my $data;
    while (<$fh>) {
        $data .= $_;
    }

    $fh->close;

    my $md5 = md5_hex($data);
    return $md5;
}

######################################################################
is( $pbf_md5, md5_file($pbf_file), "md5 checksum matched" );

my $tempfile = File::Temp->new( SUFFIX => ".osm" );
my $prefix = $pbf_file;
$prefix =~ s/\.pbf$//;
my $st = 0;

# any style
system(qq[world/bin/pbf2osm --svg-osm $pbf_file osm]);
is( $?, 0, "pbf2osm --svg-osm converter" );
my $out = "$prefix.svg-osm.zip";
$st = stat($out) or die "Cannot stat $out\n";

system(qq[unzip -t $out]);
is( $?, 0, "valid zip file" );

cmp_ok( $st->size, '>', $min_size, "$out greather than $min_size" );

# known styles
foreach my $style (@svg_styles) {
    system(qq[world/bin/pbf2osm --svg-$style $pbf_file]);
    is( $?, 0, "pbf2osm --svg-$style converter" );

    $out = "$prefix.svg-$style.zip";
    system(qq[unzip -tqq $out]);
    is( $?, 0, "valid zip file" );
    $st = stat($out);
    my $size = $st->size;
    cmp_ok( $size, '>', $min_size, "$out: $size > $min_size" );

    system(qq[world/bin/extract-disk-usage.sh $out > $tempfile]);
    is( $?, 0, "extract disk usage check" );

    my $image_size = `cat $tempfile` * 1024;
    cmp_ok( $image_size, '>', $size, "image size: $image_size > $size" );
}

__END__