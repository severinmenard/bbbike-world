cat << EOF
Map data (c) OpenStreetMap contributors, https://www.openstreetmap.org
Extracts created by BBBike, http://BBBike.org
$BBBIKE_EXTRACT_MAPSME_VERSION by https://github.com/mapsme/omim


Please read the maps.me homepage how to use mwm files:

  https://maps.me/de/home
  https://maps.me/de/help
  https://wiki.openstreetmap.org/wiki/Maps.Me
  
Note: Routing in this extract is not support yet! Sorry.


Diese maps.me Karte wurde erzeugt am: $date
GPS Rechteck Koordinaten (lng,lat): $BBBIKE_EXTRACT_COORDS
Script URL: $BBBIKE_EXTRACT_URL
Name des Gebietes: $city

Spenden sind willkommen! Du kannst uns via PayPal, Flattr oder Bankueberweisung
unterstuetzen: http://www.bbbike.org/community.de.html

Danke, Wolfram Schneider

--
http://www.BBBike.org - Dein Fahrrad-Routenplaner
EOF