curl -A BBBike.org-Test/1.1 -g -sSf "http://overpass-api.de/api/interpreter?data=[out:xml];node%2852.467,13.321,52.564,13.457%29;out;" | time osmconvert --out-pbf - > tmp/dateline-planet/planet-latest-nometa-overpass-berlin.osm.pbf
curl -A BBBike.org-Test/1.1 -g -sSf "http://overpass-api.de/api/interpreter?data=[out:xml];node%2835.677,14.014,36.21,14.745%29;out;" | time osmconvert --out-pbf - > tmp/dateline-planet/planet-latest-nometa-overpass-malta.osm.pbf
curl -A BBBike.org-Test/1.1 -g -sSf "http://overpass-api.de/api/interpreter?data=[out:xml];node%2837.595,-122.607,37.949,-122.224%29;out;" | time osmconvert --out-pbf - > tmp/dateline-planet/planet-latest-nometa-overpass-san-francisco.osm.pbf
curl -A BBBike.org-Test/1.1 -g -sSf "http://overpass-api.de/api/interpreter?data=[out:xml];node%281.145,103.486,1.594,104.075%29;out;" | time osmconvert --out-pbf - > tmp/dateline-planet/planet-latest-nometa-overpass-singapore.osm.pbf
curl -A BBBike.org-Test/1.1 -g -sSf "http://overpass-api.de/api/interpreter?data=[out:xml];node%2842.589,23.106,42.817,23.515%29;out;" | time osmconvert --out-pbf - > tmp/dateline-planet/planet-latest-nometa-overpass-sofia.osm.pbf