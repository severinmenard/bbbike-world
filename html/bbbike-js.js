// "use strict"
//////////////////////////////////////////////////////////////////////
// global objects/variables
//
var city = ""; // bbbike city
var map; // main map object
// bbbike options
var bbbike = {
    // map type by google
    mapTypeControlOptions: {
        mapTypeNames: ["ROADMAP", "TERRAIN", "SATELLITE", "HYBRID"],
        // moved to bbbike_maps_init(), because the JS object google is not defiend yet
        mapTypeIds: [],
    },

    // enable Google Arial View: 45 Imagery
    // http://en.wikipedia.org/wiki/Google_Maps#Google_Aerial_View
    mapImagery45: 45,

    // map type by OpenStreetMap & other
    mapType: {
        MapnikMapType: true,
        MapnikDeMapType: true,
        MapnikBwMapType: true,
        CycleMapType: true,
        PublicTransportMapType: true,
        HikeBikeMapType: true,
        BBBikeMapnikMapType: true,
        BBBikeMapnikGermanMapType: true,
        OCMLandscape: true,
        OCMTransport: true,
        MapQuest: true,
        MapQuestSatellite: true,
        Esri: true,
        EsriTopo: true,
        MapBox: true,
        Apple: true,
        Toner: true,
        Watercolor: true,
        NokiaTraffic: true,
        BingMapMapType: true,
        BingMapOldMapType: false,
        BingHybridMapType: true,
        BingSatelliteMapType: false,
        BingBirdviewMapType: true
    },

    mapPosition: {
        "default": "TOP_RIGHT",
        "mapnik_bw": "BOTTOM_RIGHT",
        "toner": "BOTTOM_RIGHT",
        "nokia_traffic": "BOTTOM_RIGHT",
        "watercolor": "BOTTOM_RIGHT",
        "bing_map": "BOTTOM_RIGHT",
        "bing_map_old": "BOTTOM_RIGHT",
        "bing_hybrid": "BOTTOM_RIGHT",
        "bing_satellite": "BOTTOM_RIGHT",
        "bing_birdview": "BOTTOM_RIGHT",
        "mapquest": "BOTTOM_RIGHT",
        "mapquest_satellite": "BOTTOM_RIGHT",
    },

    // optinal layers in google maps or all maps
    mapLayers: {
        TrafficLayer: true,
        BicyclingLayer: true,
        PanoramioLayer: true,
        WeatherLayer: true,

        // enable full screen mode
        SlideShow: true,
        FullScreen: true,
        Smoothness: true,
        VeloLayer: true,
        MaxSpeed: true,
        Replay: true,
        LandShading: true
    },

    // default map
    mapDefault: "mapnik",
    mapDefaultDE: "mapnik_de",

    //mapDefault: "terrain",
    // visible controls
    controls: {
        panControl: true,
        zoomControl: true,
        scaleControl: true,
        overviewMapControl: false
        // bug http://code.google.com/p/gmaps-api-issues/issues/detail?id=3167
    },

    available_google_maps: ["roadmap", "terrain", "satellite", "hybrid"],
    available_custom_maps: ["bing_birdview", "bing_map", "bing_map_old", "bing_hybrid", "bing_satellite", "public_transport", "ocm_transport", "ocm_landscape", "hike_bike", "mapnik_de", "mapnik_bw", "mapnik", "cycle", "bbbike_mapnik", "bbbike_mapnik_german", "bbbike_smoothness", "land_shading", "mapquest", "mapquest_satellite", "esri", "esri_topo", "mapbox", "apple", "velo_layer", "max_speed", "toner", "watercolor", "nokia_traffic"],

    area: {
        visible: true,
        greyout: true
    },

    // delay until we render streets on the map
    streetPlotDelay: 400,

    icons: {
        "green": '/images/mm_20_green.png',
        "red": '/images/mm_20_red.png',
        "white": '/images/mm_20_white.png',
        "yellow": '/images/mm_20_yellow.png',
        "bicycle_large": '/images/srtbike.gif',
        "bicycle_ico": '/images/srtbike.ico',

        "blue_dot": "/images/blue-dot.png",
        "green_dot": "/images/green-dot.png",
        "purple_dot": "/images/purple-dot.png",
        "red_dot": "/images/red-dot.png",
        "yellow_dot": "/images/yellow-dot.png",

        "start": "/images/dd-start.png",
        "ziel": "/images/dd-end.png",
        "via": "/images/yellow-dot.png",

        "shadow": "/images/shadow-dot.png",

    },

    maptype_usage: 1,

    granularity: 100000,
    // 5 digits for LatLng after dot
    // position of green/red/yellow search markers
    // 3-4: centered, left top
    // 8: left top
    search_markers_pos: 3.5,

    // change input color to dark green/red/yellow if marker was moved
    dark_icon_colors: 1,

    // IE bugs
    dummy: 0
};

var state = {
    fullscreen: false,
    replay: false,

    // tags to hide in full screen mode
    non_map_tags: ["copyright", "weather_forecast_html", "top_right", "other_cities", "footer", "routing", "route_table", "routelist", "link_list", "bbbike_graphic", "chart_div", "routes", "headlogo", "bottom", "language_switch", "headline", "sidebar"],

    // keep state of non map tags
    non_map_tags_val: {},

    // keep old state of map area
    map_style: {},

    maplist: [],
    slideShowMaps: [],
    markers: [],
    markers_drag: [],

    timeout_crossing: null,
    timeout_menu: null,

    // street lookup events
    timeout: null,

    marker_list: [],

    lang: "en",

    maptype_usage: "",

    // IE bugs
    dummy: 0
};

var layers = {};

//////////////////////////////////////////////////////////////////////
// functions
//

function runReplay(none, none2, toogleColor) {
    // still running
    if (state.replay) {
        state.replay = false;
        return;
    }

    state.replay = true;
    var zoom = map.getZoom();
    var zoom_min = 15;

    // zoom in
    map.setZoom(zoom > zoom_min ? zoom : zoom_min);

    var marker = new google.maps.Marker({
        // position: new google.maps.LatLng(start[0], start[1]),
        icon: bbbike.icons.bicycle_ico,
        map: map
    });

    var cleanup = function (text) {
            if (text) {
                toogleColor(false, text);
            } else {
                state.replay = false;
                toogleColor(true);
            }
        };

    runReplayRouteElevations(0, marker, cleanup, get_driving_time());
    // runReplayRoute(0, marker, cleanup);
}


function runReplayRouteElevations(offset, marker, cleanup, time) {

    // speed to move the map
    var timeout = 200;
    var step = 2;
    if (elevation_obj && elevation_obj.route_length > 0) {
        timeout = timeout * elevation_obj.route_length / 16;
    }

    if (!offset || offset < 0) offset = 0;
    if (offset >= elevations.length) return;

    var seconds = offset / elevations.length * time;

    // last element in route list, or replay was stopped
    if (offset + step == elevations.length || !state.replay) {
        cleanup(readableTime(seconds));
        setTimeout(function () {
            cleanup();
            marker.setMap(null); // delete marker from map
        }, 3000);
        return;
    }

    var start = elevations[offset].location;
    var pos = new google.maps.LatLng(start.lat(), start.lng());

    debug("offset: " + offset + " length: " + marker_list.length + " elevations: " + elevations.length + " timeout: " + timeout + " seconds: " + readableTime(seconds));

    map.panTo(pos);
    marker.setPosition(pos);

    cleanup(readableTime(seconds));
    setTimeout(function () {
        runReplayRouteElevations(offset + step, marker, cleanup, time);
    }, timeout);
}


function runReplayRoute(offset, marker, cleanup) {
    // speed to move the map
    var timeout = 300;
    if (elevation_obj && elevation_obj.route_length > 0) {
        timeout * elevation_obj.route_length / 10;
    }

    if (!offset || offset < 0) offset = 0;
    if (offset >= marker_list.length) return;

    // last element in route list
    if (offset + 1 == marker_list.length) {
        marker.setMap(null); // delete marker from map
        cleanup();
        return;
    }

    var start = marker_list[offset];
    var pos = new google.maps.LatLng(start[0], start[1]);

    marker.setPosition(pos);

    var bounds = new google.maps.LatLngBounds;
    bounds.extend(pos);
    map.setCenter(bounds.getCenter());

    debug("offset: " + offset + " length: " + marker_list.length + " elevations: " + elevations.length + " timeout: " + timeout); // + " height: " + elevations[offset].location.lat);
    setTimeout(function () {
        runReplayRoute(offset + 1, marker, cleanup);
    }, timeout);
}

// "driving_time":"0:27:10|0:19:15|0:15:20|0:13:25" => 0:15:20 => 920 seconds

function readableTime(time) {
    var hour = 0;
    var min = 0;
    var seconds = 0;

    hour = Math.floor(time / 3600);
    min = Math.floor(time / 60);
    seconds = Math.floor(time % 60);

    if (hour < 10) hour = "0" + hour;
    if (min < 10) min = "0" + min;
    if (seconds < 10) seconds = "0" + seconds;
    return hour + ":" + min + ":" + seconds;
}

function get_driving_time() {
    var time = 0;
    if (elevation_obj && elevation_obj.driving_time) {
        var speed = elevation_obj.driving_time.split("|");
        var t = speed[2];
        var t2 = t.split(":");
        time = t2[0] * 3600 + t2[1] * 60 + t2[2] * 1;
    }
    return time;
}

function toogleFullScreen(none, none2, toogleColor) {
    var fullscreen = state.fullscreen;

    for (var i = 0; i < state.non_map_tags.length; i++) {
        tagname = state.non_map_tags[i];
        var tag = document.getElementById(tagname);

        if (tag) {
            if (fullscreen) {
                tag.style.display = state.non_map_tags_val[tagname];
            } else {
                // keep copy of old state
                state.non_map_tags_val[tagname] = tag.style.display;
                tag.style.display = "none";
            }
        }
    }

    resizeFullScreen(fullscreen);
    // toogleColor(fullscreen)
    state.fullscreen = fullscreen ? false : true;
}

// start slide show left from current map

function reorder_map(maplist, currentMaptype) {
    var list = [];
    var later = [];
    var flag = 0;

    // Maps: A B C D E F
    // rotate from D: C B A F E D
    for (var i = 0; i < maplist.length; i++) {
        var maptype = maplist[i];

        // everything which is left of the current map
        if (flag) {
            list.push(maptype);
        } else { // right
            if (maptype == currentMaptype) {
                // list.push(maptype); // start with current map and a delay
                flag = 1;
            }
            later.push(maptype);
        }
    }

    for (var i = 0; i < later.length; i++) {
        list.push(later[i]);
    }

    // debug(list.length + " " + list.join(" "));
    return list;
}

function runSlideShow(none, none2, toogleColor) {
    // stop running slide show
    if (state.slideShowMaps.length > 0) {
        for (var i = 0; i < state.slideShowMaps.length; i++) {
            clearTimeout(state.slideShowMaps[i]);
        }
        state.slideShowMaps = [];
        toogleColor(true);
        return;
    }

    state.slideShowMaps = [];
    var delay = 6000;
    var counter = 0;

    var zoom = map.getZoom();
    var currentMaptype = map.getMapTypeId()
    var maplist = reorder_map(state.maplist, currentMaptype);
    maplist.push(currentMaptype);

    // active, stop button
    toogleColor(false);

    for (var i = 0; i < maplist.length; i++) {
        var maptype = maplist[i];

        (function (maptype, timeout, zoom) {
            var timer = setTimeout(function () {
                map.setMapTypeId(maptype);
                // keep original zoom, could be changed
                // by a map with zoom level up to 14 only
                map.setZoom(zoom);
            }, timeout, zoom);

            state.slideShowMaps.push(timer);
        })(maptype, delay * counter++, zoom);
    }

    // last action, reset color of control
    var timer = setTimeout(function () {
        toogleColor(true)
    }, delay * counter);
    state.slideShowMaps.push(timer);
}

function resizeFullScreen(fullscreen) {
    var tag = document.getElementById("BBBikeGooglemap");

    if (!tag) return;

    var style = ["width", "height", "marginLeft", "marginRight", "right", "left", "top", "bottom"];
    if (!fullscreen) {
        // keep old state
        for (var i = 0; i < style.length; i++) {
            state.map_style[style[i]] = tag.style[style[i]];
            tag.style[style[i]] = "0px";
        }

        tag.style.width = "99%";
        tag.style.height = "99%";
    } else {
        // restore old state
        for (var i = 0; i < style.length; i++) {
            tag.style[style[i]] = state.map_style[style[i]];
        }
    }

    google.maps.event.trigger(map, 'resize');
}


function togglePermaLinks() {
    togglePermaLink("permalink_url");
    togglePermaLink("permalink_url2");
}

function togglePermaLink(id) {
    var permalink = document.getElementById(id);
    if (permalink == null) return;

    if (permalink.style.display == "none") {
        permalink.style.display = "inline";
    } else {
        permalink.style.display = "none";
    };
}


function homemap_street(event) {
    var target = (event.target) ? event.target : event.srcElement;
    var street;

    // mouse event
    if (!target.id) {
        street = $(target).attr("title");
    }

    // key events in input field
    else {
        var ac_id = $("div.autocomplete");
        if (target.id == "suggest_start") {
            street = $(ac_id[0]).find("div.selected").attr("title") || $("input#suggest_start").attr("value");
        } else {
            street = $(ac_id[1]).find("div.selected").attr("title") || $("input#suggest_ziel").attr("value");
        }
    }

    if (street == undefined || street.length <= 2) {
        street = ""
    }
    // $("div#foo").text("street: " + street);
    if (street != "") {
        var js_div = $("div#BBBikeGooglemap").contents().find("div#street");
        if (js_div) {
            getStreet(map, city, street);
        }
    }
}

function homemap_street_timer(event, time) {
    // cleanup older calls waiting in queue
    if (state.timeout != null) {
        clearTimeout(state.timeout);
    }

    state.timeout = setTimeout(function () {
        homemap_street(event);
    }, time);
}


// test for all google + custom maps

function is_supported_map(maptype) {
    if (is_supported_maptype(maptype, bbbike.available_google_maps) || is_supported_maptype(maptype, bbbike.available_custom_maps)) {
        return 1;
    } else {
        return 0;
    }
}

function is_supported_maptype(maptype, list) {
    if (!list) return 0;

    for (var i = 0; i < list.length; i++) {
        if (list[i] == maptype) return 1;
    }

    return 0;
}

function bbbike_maps_init(maptype, marker_list, lang, without_area, region, zoomParam, layer, is_route) {
    // init google map types by name and order
    for (var i = 0; i < bbbike.mapTypeControlOptions.mapTypeNames.length; i++) {
        bbbike.mapTypeControlOptions.mapTypeIds.push(google.maps.MapTypeId[bbbike.mapTypeControlOptions.mapTypeNames[i]]);
    }
    state.maplist = init_google_map_list();

    if (!is_supported_map(maptype)) {
        maptype = is_european(region) && lang == "de" ? bbbike.mapDefaultDE : bbbike.mapDefault;
        if (city == "bbbike" && is_supported_map("bbbike_mapnik")) {
            maptype = "bbbike_mapnik";
        }
    }
    state.lang = lang;
    state.marker_list = marker_list;

    var routeLinkLabel = "Link to route: ";
    var routeLabel = "Route: ";
    var commonSearchParams = "&pref_seen=1&pref_speed=20&pref_cat=&pref_quality=&pref_green=&scope=;output_as=xml;referer=bbbikegooglemap";

    var startIcon = new google.maps.MarkerImage("../images/flag2_bl_centered.png", new google.maps.Size(20, 32), new google.maps.Point(0, 0), new google.maps.Point(16, 16));
    var goalIcon = new google.maps.MarkerImage("../images/flag_ziel_centered.png", new google.maps.Size(20, 32), new google.maps.Point(0, 0), new google.maps.Point(16, 16));

    map = new google.maps.Map(document.getElementById("map"), {
        zoomControl: bbbike.controls.zoomControl,
        scaleControl: bbbike.controls.scaleControl,
        panControl: bbbike.controls.panControl,
        disableDoubleClickZoom: false,
        mapTypeControlOptions: {
            mapTypeIds: bbbike.mapTypeControlOptions.mapTypeIds
        },
        panControlOptions: {
            position: google.maps.ControlPosition.TOP_LEFT
        },
        zoomControlOptions: {
            position: google.maps.ControlPosition.LEFT_TOP,
            style: google.maps.ZoomControlStyle.LARGE // DEFAULT // SMALL
        },
        overviewMapControl: bbbike.controls.overviewMapControl
    });

    // for zoom level, see http://code.google.com/apis/maps/documentation/upgrade.html
    var b = navigator.userAgent.toLowerCase();

    if (marker_list.length > 0) { //  && !(/msie/.test(b) && !/opera/.test(b)) ) {
        var bounds = new google.maps.LatLngBounds;
        for (var i = 0; i < marker_list.length; i++) {
            bounds.extend(new google.maps.LatLng(marker_list[i][0], marker_list[i][1]));
        }
        map.setCenter(bounds.getCenter());

        // var zoom = map.getBoundsZoomLevel(bounds);
        // improve zoom level, max. area as possible
        var bounds_padding = new google.maps.LatLngBounds;
        if (marker_list.length == 2) {
            var padding_x = 0.10; // make the area smaller by this value to cheat to map.getZoom()
            var padding_y = 0.07;

            bounds_padding.extend(new google.maps.LatLng(marker_list[0][0] + padding_x, marker_list[0][1] + padding_y));
            bounds_padding.extend(new google.maps.LatLng(marker_list[1][0] - padding_x, marker_list[1][1] - padding_y));
            if (!zoomParam) {
                map.fitBounds(bounds_padding);
            }
        } else {
            map.fitBounds(bounds);
        }
        var zoom = map.getZoom();

        // no zoom level higher than 15
        map.setZoom(zoom < 16 ? zoom : 15);

        // alert("zoom: " + zoom + " : " + map.getZoom() + " : " + zoomParam);
        if (zoomParam && parseInt(zoomParam) > 0) {
            map.setZoom(parseInt(zoomParam));
        }

/* XXX: danger!
	    // re-center after resize of map window
	    $(window).resize( function(e) { 
		var current_zoom = map.getZoom();
		// map.setCenter(bounds.getCenter()); 
		var zoom = map.getBoundsZoomLevel(bounds)
		map.fitBounds(bounds_padding);
		var zoom = map.getZoom();
			map.setZoom( zoom < 16 ? zoom : 15); 
	    });
	*/

        $(window).resize(function (e) {
            setMapHeight();
        });


        if (marker_list.length == 2 && without_area != 1 && bbbike.area.visible) {
            var x1 = marker_list[0][0];
            var y1 = marker_list[0][1];
            var x2 = marker_list[1][0];
            var y2 = marker_list[1][1];

            var route = new google.maps.Polyline({
                path: [
                new google.maps.LatLng(x1, y1), new google.maps.LatLng(x2, y1), new google.maps.LatLng(x2, y2), new google.maps.LatLng(x1, y2), new google.maps.LatLng(x1, y1)],
                // first point again
                strokeColor: '#ff0000',
                strokeWeight: 0
            });

            route.setMap(map);

            if (bbbike.area.greyout) {
                //x1-=1; y1-=1; x2+=1; y2+=1;
                var x3 = x1 - 180;
                var y3 = y1 - 179.99;
                var x4 = x1 + 180;
                var y4 = y1 + 179.99;

                var o = ['#ffffff', 0, 1, '#000000', 0.2];
                var area_around = new google.maps.Polygon({
                    paths: [
                    new google.maps.LatLng(x4, y1), new google.maps.LatLng(x3, y1), new google.maps.LatLng(x3, y3), new google.maps.LatLng(x4, y3), new google.maps.LatLng(x4, y1)],
                    // first point again
                    strokeColor: o[0],
                    strokeWeight: o[1],
                    strokeOpacity: o[2],
                    fillOpacity: o[4]
                });
                area_around.setMap(map);

                area_around = new google.maps.Polygon({
                    path: [
                    new google.maps.LatLng(x4, y2), new google.maps.LatLng(x3, y2), new google.maps.LatLng(x3, y4), new google.maps.LatLng(x4, y4), new google.maps.LatLng(x4, y2)],
                    // first point again
                    strokeColor: o[0],
                    strokeWeight: o[1],
                    strokeOpacity: o[2],
                    fillOpacity: o[4]
                });
                area_around.setMap(map);

                area_around = new google.maps.Polygon({
                    path: [
                    new google.maps.LatLng(x2, y1), new google.maps.LatLng(x2, y2), new google.maps.LatLng(x4, y2), new google.maps.LatLng(x4, y1), new google.maps.LatLng(x2, y1)],
                    strokeColor: o[0],
                    strokeWeight: o[1],
                    strokeOpacity: o[2],
                    fillOpacity: o[4]
                });
                area_around.setMap(map);

                area_around = new google.maps.Polygon({
                    path: [
                    new google.maps.LatLng(x1, y1), new google.maps.LatLng(x1, y2), new google.maps.LatLng(x3, y2), new google.maps.LatLng(x3, y1), new google.maps.LatLng(x1, y1)],
                    strokeColor: o[0],
                    strokeWeight: o[1],
                    strokeOpacity: o[2],
                    fillOpacity: o[4]
                });
                area_around.setMap(map);
            }
        }
    }

    function is_european(region) {
        return (region == "de" || region == "eu") ? true : false;
    }

    //
    // see:
    // 	http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
    //  http://wiki.openstreetmap.org/wiki/Tileserver
    //
    var mapnik_options = {
        bbbike: {
            "name": "Mapnik",
            "description": "Mapnik, by OpenStreetMap.org"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM() + ".tile.openstreetmap.org/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "MAPNIK",
        minZoom: 1,
        maxZoom: 18
    };

    // http://openstreetmap.de/
    var mapnik_de_options = {
        bbbike: {
            "name": "Mapnik (de)",
            "description": "German Mapnik, by OpenStreetMap.de"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM(4) + ".tile.openstreetmap.de/tiles/osmde/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "MAPNIK-DE",
        minZoom: 1,
        maxZoom: 18
    };

    // BBBike data in mapnik
    var bbbike_mapnik_options = {
        bbbike: {
            "name": "BBBike",
            "description": "BBBike Mapnik, by bbbike.de"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM(3) + ".tile.bbbike.org/osm/mapnik/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "BBBIKE-MAPNIK",
        minZoom: 1,
        maxZoom: 18
    };

    // BBBike smoothness overlay
    var bbbike_smoothness_options = {
        bbbike: {
            "name": "BBBike (Smoothness)",
            "description": "BBBike Smoothness, by bbbike.de"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM(3) + ".tile.bbbike.org/osm/bbbike-smoothness/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "BBBIKE-SMOOTHNESS",
        minZoom: 1,
        maxZoom: 18
    };

    var velo_layer_options = {
        bbbike: {
            "name": "Velo-Layer",
            "description": "Velo-Layer, by osm.t-i.ch/bicycle/map"
        },
        getTileUrl: function (a, z) {
            return "http://toolserver.org/tiles/bicycle/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "VELO-LAYER",
        minZoom: 1,
        maxZoom: 19
    };
    var max_speed_options = {
        bbbike: {
            "name": "Max Speed",
            "description": "Max Speed, by wince.dentro.info/koord/osm/KosmosMap.htm"
        },
        getTileUrl: function (a, z) {
            return "http://wince.dentro.info/koord/osm/tiles/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "MAX-SPEED",
        minZoom: 1,
        maxZoom: 15
    };

    // Land Shading overlay
    var land_shading_options = {
        bbbike: {
            "name": "Land Shading",
            "description": "Land Shading, by openpistemap.org"
        },
        getTileUrl: function (a, z) {
            return "http://" + "tiles2.openpistemap.org/landshaded/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "LAND-SHADING",
        minZoom: 1,
        maxZoom: 18
    };

    // BBBike data in mapnik german
    var bbbike_mapnik_german_options = {
        bbbike: {
            "name": "BBBike (de)",
            "description": "BBBike Mapnik German, by bbbike.de"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM(3) + ".tile.bbbike.org/osm/mapnik-german/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "BBBIKE-MAPNIK-GERMAN",
        minZoom: 1,
        maxZoom: 18
    };


    // http://osm.t-i.ch/bicycle/map/
    var mapnik_bw_options = {
        bbbike: {
            "name": "Mapnik (b/w)",
            "description": "Mapnik Black and White, by OpenStreetMap.org and wikimedia.org"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM() + ".www.toolserver.org/tiles/bw-mapnik/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "MAPNIK-BW",
        minZoom: 1,
        maxZoom: 18
    };

    // http://www.öpnvkarte.de/
    var public_transport_options = {
        bbbike: {
            "name": "Public Transport",
            "description": "Public Transport, by öpnvkarte.de and OpenStreetMap.org"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM() + ".tile.xn--pnvkarte-m4a.de/tilegen/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "TAH",
        minZoom: 1,
        maxZoom: 18
    };

    // http://hikebikemap.de/
    var hike_bike_options = {
        bbbike: {
            "name": "Hike&Bike",
            "description": "Hike&Bike, by OpenStreetMap.org and wikimedia.org"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM() + ".www.toolserver.org/tiles/hikebike/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "TAH",
        minZoom: 1,
        maxZoom: 17
    }

    var cycle_options = {
        bbbike: {
            "name": "Cycle",
            "description": "Cycle, by OpenStreetMap"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM() + ".tile.opencyclemap.org/cycle/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "CYCLE",
        minZoom: 1,
        maxZoom: 18
    };

    var ocm_transport_options = {
        bbbike: {
            "name": "Transport",
            "description": "Transport, by OpenCycleMap.org"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM() + ".tile2.opencyclemap.org/transport/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "TRANSPORT",
        minZoom: 1,
        maxZoom: 18
    };

    var ocm_landscape_options = {
        bbbike: {
            "name": "Landscape",
            "description": "Landscape, by OpenCycleMap.org"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM() + ".tile3.opencyclemap.org/landscape/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "LANDSCAPE",
        minZoom: 1,
        maxZoom: 18
    };

    var mapquest_options = {
        bbbike: {
            "name": "MapQuest",
            "description": "MapQuest, by mapquest.com"
        },
        getTileUrl: function (a, z) {
            return "http://otile" + randomServer(4) + ".mqcdn.com/tiles/1.0.0/osm/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "MapQuest",
        minZoom: 1,
        maxZoom: 19
    };

    var mapquest_satellite_options = {
        bbbike: {
            "name": "MapQuest Sat",
            "description": "MapQuest Satellite, by mapquest.com"
        },
        getTileUrl: function (a, z) {
            return "http://mtile0" + randomServer(4) + ".mqcdn.com/tiles/1.0.0/vy/sat/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "MapQuest",
        minZoom: 1,
        maxZoom: 19
    };

    var esri_options = {
        bbbike: {
            "name": "Esri",
            "description": "Esri, by arcgisonline.com"
        },
        getTileUrl: function (a, z) {
            return "http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/" + z + "/" + a.y + "/" + a.x + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "ESRI",
        minZoom: 1,
        maxZoom: 18
    };

    var esri_topo_options = {
        bbbike: {
            "name": "Esri Topo",
            "description": "Esri Topo, by arcgisonline.com"
        },
        getTileUrl: function (a, z) {
            return "http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/" + z + "/" + a.y + "/" + a.x + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "ESRI-TOPO",
        minZoom: 1,
        maxZoom: 18
    };

    function getTileUrlBing(a, z, type) {
        var fmt = (type == "r" ? "png" : "jpeg");
        var digit = ((a.y & 1) << 1) + (a.x & 1);

        var ret = "http://" + type + digit + ".ortho.tiles.virtualearth.net/tiles/" + type;
        for (var i = z - 1; i >= 0; i--) {
            ret += ((((a.y >> i) & 1) << 1) + ((a.x >> i) & 1));
        }
        ret += "." + fmt + "?g=45";
        return ret;
    }

    var bing_map_old_options = {
        bbbike: {
            "name": "Bing (old)",
            "description": "Bing traditional, by Microsoft"
        },
        getTileUrl: function (a, z) {
            return getTileUrlBing(a, z, "r")
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "BING-MAP-OLD",
        minZoom: 1,
        maxZoom: 19
    };
    var bing_map_options = {
        bbbike: {
            "name": "Bing",
            "description": "Bing, by maps.bing.com and Microsoft"
        },
        getTileUrl: function (a, z) {
            return getTileUrlBingVirtualearth(a, z, "r")
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "BING-MAP",
        minZoom: 1,
        maxZoom: 17
    }

    var bing_hybrid_options = {
        bbbike: {
            "name": "Bing Hybrid",
            "description": "Bing Hybrid, by maps.bing.com and Microsoft"
        },
        getTileUrl: function (a, z) {
            return getTileUrlBing(a, z, "h")
        },
        isPng: false,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "BING-MAP",
        minZoom: 1,
        maxZoom: 17
    };
    var bing_satellite_options = {
        bbbike: {
            "name": "Bing Sat",
            "description": "Bing Satellite, by maps.bing.com and Microsoft"
        },
        getTileUrl: function (a, z) {
            return getTileUrlBing(a, z, "a");
        },
        isPng: false,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "BING-MAP",
        minZoom: 1,
        maxZoom: 17
    };

    var mapbox_options = {
        bbbike: {
            "name": "MapBox",
            "description": "MapBox OSM, by mapbox.com"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM() + ".tiles.mapbox.com/v3/examples.map-vyofok3q/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "MapQuest",
        minZoom: 1,
        maxZoom: 17
    };

    var apple_options = {
        bbbike: {
            "name": "Apple",
            "description": "Apple iPhone OSM, by apple.com"
        },
        getTileUrl: function (a, z) {
            return "http://gsp2.apple.com/tile?api=1&style=slideshow&layers=default&lang=de_DE&z=" + z + "&x=" + a.x + "&y=" + a.y + "&v=9";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "apple",
        minZoom: 1,
        maxZoom: 14
    };

    var toner_options = {
        bbbike: {
            "name": "Toner",
            "description": "Toner, by maps.stamen.com"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM(4) + ".tile.stamen.com/toner/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "toner",
        minZoom: 1,
        maxZoom: 19
    };

    var watercolor_options = {
        bbbike: {
            "name": "Watercolor",
            "description": "Watercolor, by maps.stamen.com"
        },
        getTileUrl: function (a, z) {
            return "http://" + randomServerOSM(4) + ".tile.stamen.com/watercolor/" + z + "/" + a.x + "/" + a.y + ".png";
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "toner",
        minZoom: 1,
        maxZoom: 19
    };

    var nokia_traffic_options = {
        bbbike: {
            "name": "NokiaTraffic",
            "description": "HERE Traffic, by maps.here.com"
        },
        getTileUrl: function (a, z) {
            return nokia(a, z, "newest/normal.day");
        },
        isPng: true,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "nokia_traffic",
        minZoom: 1,
        maxZoom: 19
    };

    //
    // select a tiles random server. The argument is either an interger or a 
    // list of server names , e.g.:
    // list = ["a", "b"]; 
    // list = 4;
    //

    function randomServer(list) {
        var server;

        if (typeof list == "number") {
            server = parseInt(Math.random() * list);
        } else {
            server = list[parseInt(Math.random() * list.length)];
        }

        return server + ""; // string
    }

    // OSM use up to 3 or 4 servers: "a", "b", "c", "d"
    // default is 3 servers

    function randomServerOSM(number) {
        var tile_servers = ["a", "b", "c", "d"];
        var max = 3;
        if (max > tile_servers.length) max = tile_servers.length;

        if (!number || number > tile_servers.length || number < 0) number = max;

        var data = [];
        for (var i = 0; i < number; i++) {
            data.push(tile_servers[i]);
        }

        return randomServer(data);
    }

    //
    // Bing normal map:
    // http://ecn.t2.tiles.virtualearth.net/tiles/r1202102332222?g=681&mkt=de-de&lbl=l1&stl=h&shading=hill&n=z
    // http://ecn.t0.tiles.virtualearth.net/tiles/r12021023322300?g=681&mkt=de-de&lbl=l1&stl=h&shading=hill&n=z
    // 
    // Bird view:
    // http://ecn.t2.tiles.virtualearth.net/tiles/h120022.jpeg?g=681&mkt=en-gb&n=z
    // http://ecn.t0.tiles.virtualearth.net/tiles/cmd/ObliqueHybrid?a=12021023322-256-19-18&g=681
    //
    // http://rbrundritt.wordpress.com/2009/01/08/birds-eye-imagery-extraction-via-the-virtual-earth-web-services-part-2/
    //
    // map type: "r" (roadmap), "h" (hybrid", "a" (arial)

    function getTileUrlBingVirtualearth(a, z, type, lang) {
        var url;

        // low resolution, hybrid like map
        if (z <= 17) {
            url = "http://ecn.t" + randomServer(4) + ".tiles.virtualearth.net/tiles/" + type + getQuadKey(a, z);

            if (type == "r") {
                url += "?g=681&mkt=" + lang + "&lbl=l1&stl=h&shading=hill&n=z";
            } else if (type == "h" || type == "a") {
                url += ".jpeg?g=681&mkt=" + lang + "&n=z";
            }

            // Bird view
        } else {
            url = "http://ecn.t" + randomServer(4) + ".tiles.virtualearth.net/tiles/cmd/ObliqueHybrid?" + type + "=" + getQuadKey(a, z);
            url += "-256-19-18" + "&g=681";
        }

        return url + "&zoom=" + z;
    }

    // Converts tile XY coordinates into a QuadKey at a specified level of detail.
    // http://msdn.microsoft.com/en-us/library/bb259689.aspx

    function getQuadKey(a, z) {
        var quadKey = "";

        // bing quadKey does work only up to level of 17
        // http://rbrundritt.wordpress.com/2009/01/08/birds-eye-imagery-extraction-via-the-virtual-earth-web-services-part-1/
        var zReal = z;
        if (z > 17) z = 17;

        for (var i = z; i > 0; i--) {
            var digit = '0';
            var mask = 1 << (i - 1);

            if ((a.x & mask) != 0) {
                digit++;
            }

            if ((a.y & mask) != 0) {
                digit++;
                digit++;
            }
            quadKey += digit;
        }

        return quadKey;
    }

    var bing_birdview_options = {
        bbbike: {
            "name": "Bing Sat",
            "description": "Bing Satellite and Bird View, by Microsoft"
        },
        getTileUrl: function (a, z) {
            return getTileUrlBingVirtualearth(a, z, "a", lang);
        },
        isPng: false,
        opacity: 1.0,
        tileSize: new google.maps.Size(256, 256),
        name: "BING-BIRDVIEW",
        minZoom: 1,
        maxZoom: 18 // 23
    };

    function nokia(a, z, name, servers) {
        // [http://4.maptile.lbs.ovi.com/maptiler/v2/maptile/a2e328a0c5/normal.day/${z}/${x}/${y}/256/png8?app_id=SqE1xcSngCd3m4a1zEGb&token=r0sR1DzqDkS6sDnh902FWQ&lg=ENG"]
        var app_id = "SqE1xcSngCd3m4a1zEGb";
        var token = "r0sR1DzqDkS6sDnh902FWQ&lg";
        var tile_style_version = "newest";

        if (!servers || servers.length == 0) {
            servers = ["1", "2", "3", "4"];
        }

        var urls = {
            "normal.day": "base.maps.api.here.com/maptile/2.1/maptile/" + tile_style_version,
            "terrain.day": "aerial.maps.api.here.com/maptile/2.1/maptile/" + tile_style_version,
            "satellite.day": "aerial.maps.api.here.com/maptile/2.1/maptile/" + tile_style_version,
            "hybrid.day": "aerial.maps.api.here.com/maptile/2.1/maptile/" + tile_style_version,
            "normal.day.transit": "base.maps.api.here.com/maptile/2.1/maptile/" + tile_style_version,
            "newest/normal.day": "traffic.maps.api.here.com/maptile/2.1/traffictile"
        };
        var url_prefix = urls[name];

        var url = "http://" + randomServer(servers) + "." + url_prefix + "/" + name + "/" + z + "/" + a.x + "/" + a.y + "/256/png8?app_id=" + app_id + "&token=" + token + "lg=ENG";

        return url;
    }

    var mapControls = {
        "mapnik": function () {
            if (bbbike.mapType.MapnikMapType) {
                var MapnikMapType = new google.maps.ImageMapType(mapnik_options);
                map.mapTypes.set("mapnik", MapnikMapType);
                custom_map("mapnik", lang, mapnik_options.bbbike);
            }
        },
        "mapnik_de": function () {
            if (bbbike.mapType.MapnikDeMapType && is_european(region)) {
                var MapnikDeMapType = new google.maps.ImageMapType(mapnik_de_options);
                map.mapTypes.set("mapnik_de", MapnikDeMapType);
                custom_map("mapnik_de", lang, mapnik_de_options.bbbike);
            }
        },
        "bbbike_mapnik": function () {
            if (bbbike.mapType.BBBikeMapnikMapType && (city == "bbbike" || city == "Berlin")) {
                //bbbike.mapDefault = "bbbike_mapnik"; // make it the default map
                var BBBikeMapnikMapType = new google.maps.ImageMapType(bbbike_mapnik_options);
                map.mapTypes.set("bbbike_mapnik", BBBikeMapnikMapType);
                custom_map("bbbike_mapnik", lang, bbbike_mapnik_options.bbbike);
            }
        },


        "bbbike_mapnik_german": function () {
            if (bbbike.mapType.BBBikeMapnikGermanMapType && (city == "bbbike" || city == "Berlin")) {
                var BBBikeMapnikGermanMapType = new google.maps.ImageMapType(bbbike_mapnik_german_options);
                map.mapTypes.set("bbbike_mapnik_german", BBBikeMapnikGermanMapType);
                custom_map("bbbike_mapnik_german", lang, bbbike_mapnik_german_options.bbbike);
            }
        },
        "mapnik_bw": function () {
            if (bbbike.mapType.MapnikBwMapType) {
                var MapnikBwMapType = new google.maps.ImageMapType(mapnik_bw_options);
                map.mapTypes.set("mapnik_bw", MapnikBwMapType);
                custom_map("mapnik_bw", lang, mapnik_bw_options.bbbike);
            }
        },

        "cycle": function () {
            if (bbbike.mapType.CycleMapType) {
                var CycleMapType = new google.maps.ImageMapType(cycle_options);
                map.mapTypes.set("cycle", CycleMapType);
                custom_map("cycle", lang, cycle_options.bbbike);
            }
        },

        "hike_bike": function () {
            if (bbbike.mapType.HikeBikeMapType) {
                var HikeBikeMapType = new google.maps.ImageMapType(hike_bike_options);
                map.mapTypes.set("hike_bike", HikeBikeMapType);
                custom_map("hike_bike", lang, hike_bike_options.bbbike);
            }
        },

        "public_transport": function () {
            if (bbbike.mapType.PublicTransportMapType && is_european(region)) {
                var PublicTransportMapType = new google.maps.ImageMapType(public_transport_options);
                map.mapTypes.set("public_transport", PublicTransportMapType);
                custom_map("public_transport", lang, public_transport_options.bbbike);
            }
        },

        "ocm_transport": function () {
            if (bbbike.mapType.OCMTransport) {
                var OCMTransportMapType = new google.maps.ImageMapType(ocm_transport_options);
                map.mapTypes.set("ocm_transport", OCMTransportMapType);
                custom_map("ocm_transport", lang, ocm_transport_options.bbbike);
            }
        },

        "ocm_landscape": function () {
            if (bbbike.mapType.OCMLandscape) {
                var OCMLandscapeMapType = new google.maps.ImageMapType(ocm_landscape_options);
                map.mapTypes.set("ocm_landscape", OCMLandscapeMapType);
                custom_map("ocm_landscape", lang, ocm_landscape_options.bbbike);
            }
        },

        "bing_map_old": function () {
            if (bbbike.mapType.BingMapOldMapType) {
                var BingMapMapType = new google.maps.ImageMapType(bing_map_old_options);
                map.mapTypes.set("bing_map_old", BingMapMapType);
                custom_map("bing_map_old", lang, bing_map_old_options.bbbike);
            }
        },
        "bing_map": function () {
            if (bbbike.mapType.BingMapMapType) {
                var BingMapMapType = new google.maps.ImageMapType(bing_map_options);
                map.mapTypes.set("bing_map", BingMapMapType);
                custom_map("bing_map", lang, bing_map_options.bbbike);
            }
        },
        "bing_satellite": function () {
            if (bbbike.mapType.BingSatelliteMapType) {
                var BingSatelliteMapType = new google.maps.ImageMapType(bing_satellite_options);
                map.mapTypes.set("bing_satellite", BingSatelliteMapType);
                custom_map("bing_satellite", lang, bing_satellite_options.bbbike);
            }
        },
        "bing_birdview": function () {
            if (bbbike.mapType.BingBirdviewMapType) {
                var BingBirdviewMapType = new google.maps.ImageMapType(bing_birdview_options);
                map.mapTypes.set("bing_birdview", BingBirdviewMapType);
                custom_map("bing_birdview", lang, bing_birdview_options.bbbike);
            }
        },
        "bing_hybrid": function () {
            if (bbbike.mapType.BingHybridMapType) {
                var BingHybridMapType = new google.maps.ImageMapType(bing_hybrid_options);
                map.mapTypes.set("bing_hybrid", BingHybridMapType);
                custom_map("bing_hybrid", lang, bing_hybrid_options.bbbike);
            }
        },
        "mapquest": function () {
            if (bbbike.mapType.MapQuest) {
                var MapQuestMapType = new google.maps.ImageMapType(mapquest_options);
                map.mapTypes.set("mapquest", MapQuestMapType);
                custom_map("mapquest", lang, mapquest_options.bbbike);
            }
        },
        "mapquest_satellite": function () {
            if (bbbike.mapType.MapQuestSatellite) {
                var MapQuestSatelliteMapType = new google.maps.ImageMapType(mapquest_satellite_options);
                map.mapTypes.set("mapquest_satellite", MapQuestSatelliteMapType);
                custom_map("mapquest_satellite", lang, mapquest_satellite_options.bbbike);
            }
        },
        "esri": function () {
            if (bbbike.mapType.Esri) {
                var EsriMapType = new google.maps.ImageMapType(esri_options);
                map.mapTypes.set("esri", EsriMapType);
                custom_map("esri", lang, esri_options.bbbike);
            }
        },
        "esri_topo": function () {
            if (bbbike.mapType.EsriTopo) {
                var EsriTopoMapType = new google.maps.ImageMapType(esri_topo_options);
                map.mapTypes.set("esri_topo", EsriTopoMapType);
                custom_map("esri_topo", lang, esri_topo_options.bbbike);
            }
        },
        "mapbox": function () {
            if (bbbike.mapType.MapBox) {
                var MapBoxMapType = new google.maps.ImageMapType(mapbox_options);
                map.mapTypes.set("mapbox", MapBoxMapType);
                custom_map("mapbox", lang, mapbox_options.bbbike);
            }
        },
        "toner": function () {
            if (bbbike.mapType.Toner) {
                var TonerType = new google.maps.ImageMapType(toner_options);
                map.mapTypes.set("toner", TonerType);
                custom_map("toner", lang, toner_options.bbbike);
            }
        },
        "watercolor": function () {
            if (bbbike.mapType.Watercolor) {
                var WatercolorType = new google.maps.ImageMapType(watercolor_options);
                map.mapTypes.set("watercolor", WatercolorType);
                custom_map("watercolor", lang, watercolor_options.bbbike);
            }
        },
        "nokia_traffic": function () {
            if (bbbike.mapType.NokiaTraffic) {
                var NokiaTrafficType = new google.maps.ImageMapType(nokia_traffic_options);
                map.mapTypes.set("nokia_traffic", NokiaTrafficType);
                custom_map("nokia_traffic", lang, nokia_traffic_options.bbbike);
            }
        },
        "apple": function () {
            if (bbbike.mapType.Apple) {
                var AppleMapType = new google.maps.ImageMapType(apple_options);
                map.mapTypes.set("apple", AppleMapType);
                custom_map("apple", lang, apple_options.bbbike);
            }
        }
        // trailing comma for IE6
    };

    // custome layer
    var mapLayers = {
        "bbbike_smoothness": function () {
            if (bbbike.mapLayers.Smoothness) {
                return new google.maps.ImageMapType(bbbike_smoothness_options);
            }
        },
        "velo_layer": function () {
            if (bbbike.mapLayers.VeloLayer) {
                return new google.maps.ImageMapType(velo_layer_options);
            }
        },
        "max_speed": function () {
            if (bbbike.mapLayers.MaxSpeed) {
                return new google.maps.ImageMapType(max_speed_options);
            }
        },
        "land_shading": function () {
            if (bbbike.mapLayers.LandShading) {
                return new google.maps.ImageMapType(land_shading_options);
            }
        },
    };

    // keep in order for slide show
    // top postion
    mapControls.bbbike_mapnik();
    mapControls.bbbike_mapnik_german();
    mapControls.mapnik();
    mapControls.mapnik_de();
    mapControls.cycle();
    mapControls.hike_bike();
    mapControls.public_transport();
    mapControls.ocm_transport();
    mapControls.ocm_landscape();
    mapControls.esri();
    mapControls.esri_topo();
    mapControls.mapbox();
    mapControls.apple();

    // bottom postion
    mapControls.mapnik_bw();
    mapControls.toner();
    mapControls.watercolor();
    mapControls.nokia_traffic();
    mapControls.bing_map();
    mapControls.bing_map_old();
    mapControls.mapquest();
    mapControls.mapquest_satellite();
    mapControls.bing_satellite();
    mapControls.bing_birdview();
    mapControls.bing_hybrid();

    map.setMapTypeId(maptype);
    if (is_supported_maptype(maptype, bbbike.available_custom_maps)) {
        setCustomBold(maptype);
    }

    // maps layers
    init_google_layers(layer);
    init_custom_layers(mapLayers, layer);

    if (bbbike.mapLayers.Smoothness && (city == "bbbike" || city == "Berlin" || city == "Oranienburg" || city == "Potsdam" || city == "FrankfurtOder")) {
        custom_layer(map, {
            "id": "bbbike_smoothness",
            "layer": "Smoothness",
            "enabled": bbbike.mapLayers.Smoothness,
            "active": layer == "smoothness" ? true : false,
            "callback": add_smoothness_layer,
            "lang": lang
        });
    }

    if (bbbike.mapLayers.VeloLayer && is_european(region)) {
        custom_layer(map, {
            "id": "velo_layer",
            "layer": "VeloLayer",
            "enabled": bbbike.mapLayers.VeloLayer,
            "active": layer == "velo_layer" ? true : false,
            "callback": add_velo_layer,
            "lang": lang
        });
    }

    if (bbbike.mapLayers.MaxSpeed && is_european(region)) {
        custom_layer(map, {
            "id": "max_speed",
            "layer": "MaxSpeed",
            "enabled": bbbike.mapLayers.MaxSpeed,
            "active": layer == "max_speed" ? true : false,
            "callback": add_max_speed_layer,
            "lang": lang
        });
    }

    custom_layer(map, {
        "id": "land_shading",
        "layer": "Land Shading",
        "enabled": bbbike.mapLayers.LandShading,
        "active": layer == "land_shading" ? true : false,
        "callback": add_land_shading_layer,
        "lang": lang
    });



    custom_layer(map, {
        "id": "google_PanoramioLayer",
        "layer": "PanoramioLayer",
        "enabled": bbbike.mapLayers.PanoramioLayer,
        "active": layer == "panoramio" ? true : false,
        "callback": add_panoramio_layer,
        "lang": lang
    });

    custom_layer(map, {
        "id": "google_WeatherLayer",
        "layer": "WeatherLayer",
        "enabled": bbbike.mapLayers.WeatherLayer,
        "active": layer == "weather" ? true : false,
        "callback": add_weather_layer,
        "lang": lang
    });

    custom_layer(map, {
        "layer": "SlideShow",
        "enabled": bbbike.mapLayers.SlideShow,
        "active": layer == "slideshow" ? true : false,
        "callback": runSlideShow,
        "lang": lang
    });

    custom_layer(map, {
        "layer": "FullScreen",
        "enabled": bbbike.mapLayers.FullScreen,
        "active": layer == "fullscreen" ? true : false,
        "callback": toogleFullScreen,
        "lang": lang
    });

    custom_layer(map, {
        "layer": "Replay",
        "enabled": bbbike.mapLayers.Replay && is_route,
        // display only on route result page
        "active": layer == "replay" ? true : false,
        "callback": runReplay,
        "lang": lang
    });

    custom_layer(map, {
        "id": "google_BicyclingLayer",
        "layer": "BicyclingLayer",
        "enabled": bbbike.mapLayers.BicyclingLayer,
        "active": layer == "bicycling" ? true : false,
        "callback": add_bicycle_layer,
        "lang": lang
    });

    custom_layer(map, {
        "id": "google_TrafficLayer",
        "layer": "TrafficLayer",
        "enabled": bbbike.mapLayers.TrafficLayer,
        "active": layer == "traffic" ? true : false,
        "callback": add_traffic_layer,
        "lang": lang
    });

    setTimeout(function () {
        hideGoogleLayers(maptype);
    }, 300); // fast CPU
    setTimeout(function () {
        hideGoogleLayers(maptype);
    }, 1000);
    // setTimeout(function () { hideGoogleLayers(); }, 2000);
    // enable Google Arial View
    if (bbbike.mapImagery45 > 0) {
        map.setTilt(bbbike.mapImagery45);
    }

    // map changed
    google.maps.event.addListener(map, "maptypeid_changed", function () {
        hideGoogleLayers();
    });

    google.maps.event.clearListeners(map, 'rightclick');
    google.maps.event.addListener(map, "rightclick", function (event) {
        var zoom = map.getZoom();

        // Firefox 4.x and later bug
        (function (zoom) {
            var timeout = 10;
            var timer = setTimeout(function () {
                var z = map.getZoom();
                if (z + 1 == zoom) {
                    map.setZoom(zoom);
                    debug("reset zoom level to: " + zoom);
                }
            }, timeout);
        })(zoom);

        // on start page only
        if (state.markers.marker_start) debug("rightclick " + zoom + " " + pixelPos(event));

    });

    setTimeout(function () {
        setMapHeight();
    }, 200);
}

function pixelPos(event) {

    var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
    var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
    var scale = Math.pow(2, map.getZoom());
    // var worldPoint=map.getProjection().fromLatLngToPoint(marker.getPosition());
    var worldPoint = map.getProjection().fromLatLngToPoint(event.latLng);

    var point = new google.maps.Point((worldPoint.x - bottomLeft.x) * scale, (worldPoint.y - topRight.y) * scale);

    var map_div = document.getElementById("map");
    var menu_div = document.getElementById("start_menu");

    // create start menu
    if (!menu_div) {
        menu_div = document.createElement('div');

        menu_div.style.padding = '8px';
        menu_div.style.margin = '2px';

        // Set CSS for the control border
        menu_div.style.backgroundColor = 'white';
        menu_div.style.borderStyle = 'solid';
        menu_div.style.borderWidth = '0px';
        // menu_div.style.cursor = 'pointer';
        menu_div.style.textAlign = 'center';

        menu_div.id = "start_menu";
        menu_div.style.position = "absolute";

        map_div.appendChild(menu_div);
    }

    menu_div.style.display = "block";
    // setTimeout(function () { menu_div.style.display = "none";}, 8000);
    menu_div.style.left = point.x + "px";
    menu_div.style.top = point.y + "px";

    var content = ""; // "foobar " + "x: " + point.x + "y: " + point.y + "<br/>\n";
    // var pos = marker.getPosition();
    var type = ["start", "via", "ziel"];
    var address = "";

    for (var i = 0; i < type.length; i++) {
        if (i > 0) content += " | ";
        content += "<a href='#' onclick='javascript:setMarker(\"" + type[i] + '", "' + address + '", ' + granularity(event.latLng.lat()) + ", " + granularity(event.latLng.lng()) + ', "start_menu"' + ");'>" + translate_mapcontrol(type[i]) + "</a>" + "\n";
    }

    menu_div.innerHTML = content;

    if (state.timeout_menu) clearTimeout(state.timeout_menu);
    google.maps.event.addDomListenerOnce(menu_div, 'mouseout', function () {
        debug("got mouseout");
        state.timeout_menu = setTimeout(function () {
            menu_div.style.display = "none";
        }, 6000);
    });

    return "x: " + point.x + "y: " + point.y;
}



// layers which works only on google maps

function init_google_layers() {
    try {
        layers.bicyclingLayer = new google.maps.BicyclingLayer();
        layers.trafficLayer = new google.maps.TrafficLayer();
        layers.weatherLayer = new google.maps.weather.WeatherLayer();
    } catch (e) {}

    // need to download library first
    layers.panoramioLayer = false;
}

// custom layers

function init_custom_layers(layer) {
    if (bbbike.mapLayers.Smoothness) {
        layers.smoothnessLayer = layer.bbbike_smoothness();
    }
    if (bbbike.mapLayers.LandShading) {
        layers.land_shadingLayer = layer.land_shading();
    }
    if (bbbike.mapLayers.VeloLayer) {
        layers.veloLayer = layer.velo_layer();
    }
    if (bbbike.mapLayers.MaxSpeed) {
        layers.maxSpeedLayer = layer.max_speed();
    }
}


function debug_layer(layer) {
    var data = layer;
    for (var l in layerControl) {
        data += " " + l + ": " + layerControl[l];
    }

    debug(data);
}

// add bicycle routes and lanes to map, by google maps

function add_bicycle_layer(map, enable) {
    if (!layers.bicyclingLayer) return;

    if (enable) {
        layers.bicyclingLayer.setMap(map);
    } else {
        layers.bicyclingLayer.setMap(null);
    }
}

function add_weather_layer(map, enable) {
    if (!layers.weatherLayer) return;

    if (enable) {
        layers.weatherLayer.setMap(map);
    } else {
        layers.weatherLayer.setMap(null);
    }
}

// add traffic to map, by google maps

function add_traffic_layer(map, enable) {
    if (!layers.trafficLayer) return;

    if (enable) {
        layers.trafficLayer.setMap(map);
    } else {
        layers.trafficLayer.setMap(null);
    }
}

// bbbike smoothness layer

function add_smoothness_layer(map, enable) {
    if (!layers.smoothnessLayer) return;

    if (enable) {
        map.overlayMapTypes.setAt(0, layers.smoothnessLayer);
    } else {
        map.overlayMapTypes.setAt(0, null);
    }
}

function add_velo_layer(map, enable) {
    if (!layers.veloLayer) return;

    if (enable) {
        map.overlayMapTypes.setAt(1, layers.veloLayer);
    } else {
        map.overlayMapTypes.setAt(1, null);
    }
}

function add_max_speed_layer(map, enable) {
    if (!layers.maxSpeedLayer) return;

    if (enable) {
        map.overlayMapTypes.setAt(2, layers.maxSpeedLayer);
    } else {
        map.overlayMapTypes.setAt(2, null);
    }
}

function add_land_shading_layer(map, enable) {
    debug_layer("shading");

    if (!layers.land_shadingLayer) return;

    if (enable) {
        map.overlayMapTypes.setAt(3, layers.land_shadingLayer);
    } else {
        map.overlayMapTypes.setAt(3, null);
    }
}

// add traffic to map, by google maps

function add_panoramio_layer(map, enable) {
    // ignore if nothing to display
    if (!layers.panoramioLayer && !enable) return;

    //  activate library for panoramio
    if (!layers.panoramioLayer) {
        layers.panoramioLayer = new google.maps.panoramio.PanoramioLayer();
    }

    layers.panoramioLayer.setMap(enable ? map : null);
}

//
// guess if a streetname is from the OSM database
// false: 123,456
// false: foo [123,456]
//

function osm_streetname(street) {
    if (street.match(/^[\-\+ ]?[0-9\.]+,[\-\+ ]?[0-9\.]+[ ]*$/) || street.match(/^.* \[[0-9\.,\-\+]+\][ ]*$/)) {
        return 0;
    } else {
        return 1;
    }
}

function plotStreetGPS(street, caller) {
    var pos = street.match(/^(.*) \[([0-9\.,\-\+]+),[0-9]\][ ]*$/);

    debug("pos: " + pos[1] + " :: " + pos[2] + " :: length: " + pos.length);
    if (pos.length == 3) {
        var data = '["' + pos[1] + '",["' + pos[1] + "\t" + pos[2] + '"]]';
        debug(data);

        // plotStreet()
        caller(data);
    } else {
        debug("cannot plot street");
    }
}

var street = "";
var street_cache = [];
var data_cache = [];


function setMarker(type, address, lat, lng, div) {
    var marker = state.markers["marker_" + type];
    if (type == "via") displayVia();

    var id = "suggest_" + type;
    marker.setPosition(new google.maps.LatLng(lat, lng));

    // no address - look in database
    if (!address || address == "") {
        find_street(marker, id);

        // hide div after we move a marker
        if (div) {
            var tag = document.getElementById(div);
            if (tag) tag.style.display = "none";
        }
    }

    // address is known, fake resonse
    else {

        // find_street(marker, "suggest_" + type, null);
        // { query:"7.44007,46.93205", suggestions:["7.44042,46.93287     Bondelistr./"] }
        var data = '{query:"' + lng + "," + lat + '", suggestions:["' + lng + "," + lat + "\t" + address + '"]}';
        updateCrossing(marker, id, data);
        debug("data: " + data);
    }
}

function getStreet(map, city, street, strokeColor, noCleanup) {
    var streetnames = 3; // if set, display a info window with the street name
    var autozoom = 13; // if set, zoom to the streets
    var url = encodeURI("/cgi/street-coord.cgi?namespace=" + (streetnames ? "3" : "0") + ";city=" + city + "&query=" + street);

    if (!osm_streetname(street)) {
        debug("Not a OSM street name: '" + street + ', skip ajax call"');
        return plotStreetGPS(street, plotStreet);
    }

    if (!strokeColor) {
        strokeColor = "#0000FF";
    }

    if (!noCleanup) {
        // cleanup map
        for (var i = 0; i < street_cache.length; i++) {
            street_cache[i].setMap(null);
        }
        street_cache = [];
    }

    // read data from cache
    if (data_cache[url] != undefined) {
        return plotStreet(data_cache[url]);
    }



    function addInfoWindowStreet(marker, address, pos) {
        var infoWindow = new google.maps.InfoWindow({
            maxWidth: 500
        });

        // var pos = marker.getPosition();
        var type = ["start", "via", "ziel"];

        var content = "<span id=\"infoWindowContent\">\n"
        content += "<p>" + address + "</p>\n";
        for (var i = 0; i < type.length; i++) {
            if (i > 0) content += " | ";
            content += "<a href='#' onclick='javascript:setMarker(\"" + type[i] + '", "' + address + '", ' + granularity(pos.lat()) + ", " + granularity(pos.lng()) + ");'>" + translate_mapcontrol(type[i]) + "</a>" + "\n";
        }

        content += "</span>\n";
        infoWindow.setContent(content);
        infoWindow.open(map, marker);

        // close info window after 4 seconds
        setTimeout(function () {
            infoWindow.close()
        }, 5000)

    };

    // plot street(s) on map

    function plotStreet(data) {
        var js = eval(data);
        var streets_list = js[1];
        var query = js[0];
        var query_lc = query.toLowerCase();

        var autozoom_points = [];
        for (var i = 0; i < streets_list.length; i++) {
            var streets_route = new Array;
            var s;
            var street;

            if (!streetnames) {
                s = streets_list[i].split(" ");
            } else {
                var list = streets_list[i].split("\t");
                street = list[0];
                s = list[1].split(" ");
            }

            for (var j = 0; j < s.length; j++) {
                var coords = s[j].split(",");
                streets_route.push(new google.maps.LatLng(coords[1], coords[0]));
            }

            // only a point, create a list
            if (streets_route.length == 1) {
                streets_route[1] = streets_route[0];
            }

            var route = new google.maps.Polyline({
                path: streets_route,
                strokeColor: strokeColor,
                strokeWeight: 7,
                strokeOpacity: 0.5
            });
            route.setMap(map);

            street_cache.push(route);

            if (autozoom) {
                autozoom_points.push(streets_route[0]);
                autozoom_points.push(streets_route[streets_route.length - 1]);
            }

            // display a small marker for every street
            if (streetnames) {
                var pos = 0;
                // set the marker in the middle of the street
                if (streets_route.length > 0) {
                    pos = Math.ceil((streets_route.length - 1) / 2);
                }

                var marker = new google.maps.Marker({
                    position: streets_route[pos],
                    icon: query_lc == street.toLowerCase() ? bbbike.icons.green : bbbike.icons.white,
                    map: map
                });

                google.maps.event.addListener(marker, "click", function (marker, street, position) {
                    return function (event) {
                        addInfoWindowStreet(marker, street, position);
                    }
                }(marker, street, streets_route[pos]));

                if (streets_list.length <= 10) {
                    addInfoWindowStreet(marker, street, streets_route[pos]);
                }

                street_cache.push(marker);

            }

        }

        if (autozoom && autozoom_points.length > 0) {
            // improve zoom level, max. area as possible
            var bounds = new google.maps.LatLngBounds;
            for (var i = 0; i < autozoom_points.length; i++) {
                bounds.extend(autozoom_points[i]);
            }
            map.fitBounds(bounds);
            var zoom = map.getZoom();
            // do not zoom higher than XY
            map.setZoom(zoom > autozoom ? autozoom : zoom);
            // alert("zoom: " + zoom);
        }
    }

    // download street coords with AJAX
    downloadUrl(url, function (data, responseCode) {
        // To ensure against HTTP errors that result in null or bad data,
        // always check status code is equal to 200 before processing the data
        if (responseCode == 200) {
            data_cache[url] = data;
            plotStreet(data);
        } else if (responseCode == -1) {
            alert("Data request timed out. Please try later.");
        } else {
            alert("Request resulted in error. Check XML file is retrievable.");
        }
    });
}

// bbbike_maps_init("default", [[48.0500000,7.3100000],[48.1300000,7.4100000]] );
var infoWindow;
var routeSave;
var _area_hash = [];

function plotRoute(map, opt, street) {
    var r = [];

    for (var i = 0; i < street.length; i++) {
        //  string: '23.3529099,42.6708386'
        if (typeof street[i] == 'string') {
            var coords = street[i].split(",");
            r.push(new google.maps.LatLng(coords[1], coords[0]));
        }

        // array: [lat,lng] 
        else {
            r.push(new google.maps.LatLng(street[i][1], street[i][0]));
        }
    }

    // create a random color
    var color; {
        var _color_r = parseInt(Math.random() * 16).toString(16);
        var _color_g = parseInt(Math.random() * 16).toString(16);
        var _color_b = parseInt(Math.random() * 16).toString(16);

        color = "#" + _color_r + _color_r + _color_g + _color_g + _color_b + _color_b;
    }

    var x = r.length > 8 ? 8 : r.length;
    var route = new google.maps.Polyline({
        clickable: true,
        path: r,
        strokeColor: color,
        strokeWeight: 5,
        strokeOpacity: 0.5
    });
    route.setMap(map);

    var marker = new google.maps.Marker({
        position: r[parseInt(Math.random() * x)],
        icon: bbbike.icons.green,
        map: map
    });
    var marker2 = new google.maps.Marker({
        position: r[r.length - 1],
        icon: bbbike.icons.red,
        map: map
    });

    google.maps.event.addListener(marker, "click", function (event) {
        addInfoWindow(marker)
    });
    google.maps.event.addListener(marker2, "click", function (event) {
        addInfoWindow(marker2)
    });

    if (opt.viac && opt.viac != "") {
        var coords = opt.viac.split(",");
        var pos = new google.maps.LatLng(coords[1], coords[0]);

        var marker3 = new google.maps.Marker({
            position: pos,
            icon: bbbike.icons.yellow,
            map: map
        });
        google.maps.event.addListener(marker3, "click", function (event) {
            addInfoWindow(marker3)
        });
    }

    function driving_time(driving_time) {
        var data = "";
        var time = driving_time.split('|');
        for (var i = 0; i < time.length; i++) {
            var t = time[i].split(':');
            data += t[0] + ":" + t[1] + "h (at " + t[2] + "km/h) ";
        }
        return data;
    }

    function area(area) {
        var a = area.split("!");
        var x1y1 = a[0].split(",");
        var x2y2 = a[1].split(",");
        var x1 = x1y1[1];
        var y1 = x1y1[0];
        var x2 = x2y2[1];
        var y2 = x2y2[0];

        var r = [];
        r.push(new google.maps.LatLng(x1, y1));
        r.push(new google.maps.LatLng(x1, y2));
        r.push(new google.maps.LatLng(x2, y2));
        r.push(new google.maps.LatLng(x2, y1));
        r.push(new google.maps.LatLng(x1, y1));

        var route = new google.maps.Polyline({
            path: r,
            strokeColor: "#006400",
            strokeWeight: 4,
            strokeOpacity: 0.5
        });
        route.setMap(map);
    }

    // plot the area *once* for a city
    if (opt.area && !_area_hash[opt.area]) {
        area(opt.area);
        _area_hash[opt.area] = 1;
    }


    function addInfoWindow(marker) {
        var icons = [bbbike.icons.green, bbbike.icons.red, bbbike.icons.yellow];

        if (infoWindow) {
            infoWindow.close();
        }
        if (routeSave) {
            routeSave.setOptions({
                strokeWeight: 5
            });
        }

        infoWindow = new google.maps.InfoWindow({
            maxWidth: 400
        });
        var content = "<div id=\"infoWindowContent\">\n"
        content += "City: " + '<a target="_new" href="/' + opt.city + '/">' + opt.city + '</a>' + "<br/>\n";
        content += "<img height='12' src='" + icons[0] + "' /> " + "Start: " + opt.startname + "<br/>\n";
        if (opt.vianame && opt.vianame != "") {
            content += "<img height='12' src='" + icons[2] + "' /> " + "Via: " + opt.vianame + "<br/>\n";
        }
        content += "<img height='12' src='" + icons[1] + "' /> " + "Destination: " + opt.zielname + "<br/>\n";
        content += "Route Length: " + opt.route_length + "km<br/>\n";

        if (opt.driving_time) {
            content += "Driving time: " + driving_time(opt.driving_time) + "<br/>\n";
        }

        // pref_cat pref_quality pref_specialvehicle pref_speed pref_ferry pref_unlit
        if (opt.pref_speed != "" && opt.pref_speed != "20") {
            content += "Preferred speed: " + opt.pref_speed + "<br/>\n";
        }
        if (opt.pref_cat != "") {
            content += "Preferred street category: " + opt.pref_cat + "<br/>\n";
        }
        if (opt.pref_quality != "") {
            content += "Road surface: " + opt.pref_quality + "<br/>\n";
        }
        if (opt.pref_unlit != "") {
            content += "Avoid unlit streets: " + opt.pref_unlit + "<br/>\n";
        }
        if (opt.pref_specialvehicle != "") {
            content += "On the way with: " + opt.pref_specialvehicle + "<br/>\n";
        }
        if (opt.pref_ferry != "") {
            content += "Use ferries: " + opt.pref_ferry + "<br/>\n";
        }

        content += "</div>\n";
        infoWindow.setContent(content);
        infoWindow.open(map, marker);


        routeSave = route;
        route.setOptions({
            strokeWeight: 10
        });
    };
}

// bbbike_maps_init("default", [[48.0500000,7.3100000],[48.1300000,7.4100000]] );
// localized custom map names

function translate_mapcontrol(word, lang) {
    if (!lang) {
        lang = state.lang;
    }

    var l = {
        // master language, fallback for all
        "en": {
            "mapnik": "Mapnik",
            "cycle": "Cycle",
            "hike_bike": "Hike&amp;Bike",
            "public_transport": "Public Transport",
            "mapnik_de": "Mapnik (de)",
            "mapnik_bw": "Mapnik (b/w)",
            "mapquest": "MapQuest",
            "mapquest_satellite": "MapQuest (Sat)",
            "bing_map": "Bing",
            "bing_map_old": "Bing (old)",
            "bing_satellite": "Bing Sat",
            "bing_hybrid": "Bing Hybrid",
            "FullScreen": "Fullscreen",
            "Replay": "Replay",
            "SlideShow": "Slide Show",
            "esri": "Esri",
            "esri_topo": "Esri Topo",
            "mapbox": "MapBox",
            "apple": "Apple",
            "VeloLayer": "Velo-Layer",
            "MaxSpeed": "Speed Limit",
            "WeatherLayer": "Weather",
            "BicyclingLayer": "Google Bicyling",
            "TrafficLayer": "Google Traffic",
            "PanoramioLayer": "Panoramio",
            "toner": "Toner",
            "watercolor": "Watercolor",
            "NokiaTraffic": "HERE Traffic",

            "start": "Start",
            "ziel": "Destination",
            "via": "Via",

            "bing_birdview": "Bing Sat" // last 
        },

        // rest
        "da": {
            "cycle": "Cykel"
        },
        "de": {
            "Mapnik": "Mapnik",
            "Cycle": "Fahrrad",
            "traffic layer": "Google Verkehr",
            "Panoramio": "Panoramio Fotos",
            "cycle layer": "Google Fahrrad",
            "Hike&Bike": "Wandern",
            "Landscape": "Landschaft",
            "Public Transport": "ÖPNV",
            'Show map': "Zeige Karte",
            "FullScreen": "Vollbildmodus",
            "Mapnik (b/w)": "Mapnik (s/w)",
            "Black/White Mapnik, by OpenStreetMap": "Schwarz/Weiss Mapnik, von OpenStreetMap",
            "Cycle, by OpenStreetMap": "Fahrrad, von OpenStreetMap",
            "Public Transport, by OpenStreetMap": "Öffentlicher Personennahverkehr, von OpenStreetMap",
            "German Mapnik, by OpenStreetMap": "Mapnik in deutschem Kartenlayout, von OpenStreetMap",
            "SlideShow": "Slideshow",
            "BicyclingLayer": "Google Fahrrad",
            "TrafficLayer": "Google Verkehr",

            "bing_birdview": "Bing Sat",
            "WeatherLayer": "Wetter",
            "NokiaTraffic": "HERE Verkehr",

            "Set start point": "Setze Startpunkt",
            "Set destination point": "Setze Zielpunkt",
            "Set via point": "Setze Zwischenpunkt (Via)",
            "Your current postion": "Ihre aktuelle Position",
            "Approximate address": "Ungef&auml;hre Adresse",
            "crossing": "Kreuzung",
            "Error: outside area": "Fehler: ausserhalb des Gebietes",
            "Start": "Start",
            "Destination": "Ziel",
            "Smoothness": "Fahrbahnqualit&auml;t",
            "Land Shading": "Reliefkarte",
            "VeloLayer": "Velo-Layer",
            "MaxSpeed": "Tempo Limit",
            "Watercolor": "Aquarell",
            "Replay": "Replay",

            "start": "Start",
            "ziel": "Ziel",
            "via": "Via",

            "Via": "Via"
        },
        "es": {
            "cycle": "Bicicletas"
        },
        "fr": {
            "cycle": "Vélo"
        },
        "hr": {
            "cycle": "Bicikl"
        },
        "nl": {
            "cycle": "Fiets"
        },
        "pl": {
            "cycle": "Rower"
        },
        "pt": {
            "cycle": "Bicicleta"
        },
        "ru": {
            "cycle": "Велосипед"
        },
        "zh": {
            "cycle": "自行车"
        }
    };

    if (!lang) {
        return word;
    } else if (l[lang] && l[lang][word]) {
        return l[lang][word];
    } else if (l["en"] && l["en"][word]) {
        return l["en"][word];
    } else {
        return word;
    }
}




/**
 * The HomeControl adds a control to the map that simply
 * returns the user to Chicago. This constructor takes
 * the control DIV as an argument.
 */


function init_google_map_list() {
    var list = [];
    for (var i = 0; i < bbbike.mapTypeControlOptions.mapTypeIds.length; i++) {
        var maptype = bbbike.mapTypeControlOptions.mapTypeIds[i];
        list.push(maptype);
    }

    return list;
}

var currentText = {};

function HomeControl(controlDiv, map, maptype, lang, opt) {
    var name = opt && opt.name ? translate_mapcontrol(opt.name, lang) : translate_mapcontrol(maptype, lang);
    var description = opt && opt.description ? translate_mapcontrol(opt.description, lang) : translate_mapcontrol(maptype, lang);

    // Set CSS styles for the DIV containing the control
    // Setting padding to 5 px will offset the control
    // from the edge of the map
    var controlUI = document.createElement('DIV');
    var controlText = document.createElement('DIV');

    controlDiv.style.paddingTop = '5px';
    controlDiv.style.paddingRight = '2px';

    // Set CSS for the control border
    controlUI.style.backgroundColor = 'white';
    controlUI.style.borderStyle = 'solid';
    controlUI.style.borderWidth = '0px';
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';
    controlUI.title = translate_mapcontrol('Show map', lang) + " " + description;

    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    // controlText.style.fontFamily = 'Arial,sans-serif';
    controlText.style.fontSize = '13px';
    controlText.style.paddingLeft = '8px';
    controlText.style.paddingRight = '8px';
    controlText.style.paddingTop = '3px';
    controlText.style.paddingBottom = '3px';

    controlText.innerHTML = name;
    controlUI.appendChild(controlText);

    currentText[maptype] = controlText;

    // Setup the click event listeners: simply set the map to Chicago
    google.maps.event.addDomListener(controlUI, 'click', function () {
        map.setMapTypeId(maptype);
        setCustomBold(maptype);
    });

    state.maplist.push(maptype);
}

// de-select all custom maps and optional set a map to bold

function setCustomBold(maptype, log) {
    if (!currentText) return;

    for (var key in currentText) {
        currentText[key].style.fontWeight = "normal";
        currentText[key].style.color = "#000000";
        currentText[key].style.background = "#FFFFFF";
    }

    // optional: set map to bold
    if (currentText[maptype]) {
        currentText[maptype].style.fontWeight = "bold";
        currentText[maptype].style.color = "#FFFFFF";
        currentText[maptype].style.background = "#4682B4";
    }

    maptype_usage(maptype);
}

function maptype_usage(maptype) {
    // get information about map type and log maptype
    if (bbbike.maptype_usage) {
        var url = "/cgi/maptype.cgi?city=" + city + "&maptype=" + maptype;

        if (state.maptype == maptype) return;
        state.maptype = maptype;

        downloadUrl(url, function (data, responseCode) {
            if (responseCode == 200) {
                //
            } else if (responseCode == -1) {
                //
            } else {
                // 
            }
        });
    }
}

// hide google only layers on 
// non-google custom maps
//

function hideGoogleLayers(maptype) {
    if (!maptype) {
        maptype = map.getMapTypeId()
    }

    var value = is_supported_maptype(maptype, bbbike.available_custom_maps) ? "hidden" : "visible";
    var timeout = 0; // value == "hidden" ? 2000 : 1000;
    setTimeout(function () {
        var div = document.getElementById("BicyclingLayer");
        if (div) div.style.visibility = value;
    }, timeout + (value == "hidden" ? 0 : 0));

    setTimeout(function () {
        var div = document.getElementById("TrafficLayer");
        if (div) div.style.visibility = value;
    }, timeout + (value == "hidden" ? 0 : 0));

/*
    setTimeout(function () {
        var div = document.getElementById("WeatherLayer");
        if (div) div.style.visibility = value;
    }, timeout - (value == "hidden" ? 900 : -900));
    */

    setCustomBold(maptype, 1);
}

var layerControl = {
/*
    TrafficLayer: false,
    BicyclingLayer: false,
    PanoramioLayer: false,
    Smoothness: true,
    VeloLayer: true,
    MaxSpeed: true,
    LandShading: false
*/
};

function LayerControl(controlDiv, map, opt) {
    var layer = opt.layer;
    var enabled = opt.active;
    var callback = opt.callback;
    var lang = opt.lang;
    var id = opt.id;

    // Set CSS styles for the DIV containing the control
    // Setting padding to 5 px will offset the control
    // from the edge of the map
    var controlUI = document.createElement('DIV');
    controlUI.setAttribute("id", layer);

    var controlText = document.createElement('DIV');

    controlDiv.style.paddingTop = '5px';
    controlDiv.style.paddingRight = '2px';

    // Set CSS for the control border
    controlUI.style.backgroundColor = 'white';
    controlUI.style.borderStyle = 'solid';
    controlUI.style.borderWidth = '2px';
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';

    var layerText = layer;
    layerControl[layer] = false; // true // enabled; 
    toogleColor(true);

    // grey (off) <-> green (on)

    function toogleColor(toogle, text) {
        controlUI.style.color = toogle ? '#888888' : '#228b22';
        controlText.innerHTML = (text ? text + " " : "") + translate_mapcontrol(layerText, lang);
    }

    if (layer == "FullScreen") {
        controlUI.title = 'Click to enable/disable ' + translate_mapcontrol(layerText, lang);
    } else if (layer == "SlideShow") {
        controlUI.title = 'Click to run ' + translate_mapcontrol(layerText, lang);
    } else if (layer == "Replay") {
        controlUI.title = 'Click to replay route';
    } else {
        controlUI.title = 'Click to add the layer ' + layerText;
    }

    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    // controlText.style.fontFamily = 'Arial,sans-serif';
    controlText.style.fontSize = '12px';
    controlText.style.paddingLeft = '8px';
    controlText.style.paddingRight = '8px';
    controlText.style.paddingTop = '1px';
    controlText.style.paddingBottom = '1px';

    controlText.innerHTML = translate_mapcontrol(layerText, lang);
    controlUI.appendChild(controlText);
    if (enabled) controlText.fontWeight = "bold";

    // switch enabled <-> disabled
    google.maps.event.addDomListener(controlUI, 'click', function () {
        toogleColor(layerControl[layer]);
        layerControl[layer] = layerControl[layer] ? false : true;
        callback(map, layerControl[layer], toogleColor);

        if (layerControl[layer]) maptype_usage(layer);
    });

}

function custom_map(maptype, lang, opt) {
    var homeControlDiv = document.createElement('DIV');
    var homeControl = new HomeControl(homeControlDiv, map, maptype, lang, opt);

    var position = bbbike.mapPosition["default"];
    if (bbbike.mapPosition[maptype]) {
        position = bbbike.mapPosition[maptype];
    }

    homeControlDiv.index = 1;
    map.controls[google.maps.ControlPosition[position]].push(homeControlDiv);
}

function custom_layer(map, opt) {
    if (!opt.enabled) return;

    var layerControlDiv = document.createElement('DIV');
    var layerControl = LayerControl(layerControlDiv, map, opt);
    debug_layer(opt.id);

    layerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(layerControlDiv);
}


function displayCurrentPosition(area, lang) {
    if (!lang) lang = "en";

    if (!navigator.geolocation) {
        return;
    }

    navigator.geolocation.getCurrentPosition(function (position) {
        currentPosition = {
            "lat": position.coords.latitude,
            "lng": position.coords.longitude
        };

        var pos = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);
        var marker = new google.maps.Marker({
            position: pos,
            icon: bbbike.icons["purple_dot"],
            map: map
        });

        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({
            'latLng': pos
        }, function (results, status) {
            if (status != google.maps.GeocoderStatus.OK || !results[0]) {
                // alert("reverse geocoder failed to find an address for " + latlng.toUrlValue());
            } else {
                var result = results[0];

                // display info window at startup if inside the area
                if (area.length > 0) {
                    if (area[0][0] < currentPosition.lng && area[0][1] < currentPosition.lat && area[1][0] > currentPosition.lng && area[1][1] > currentPosition.lat) {

                        addInfoWindow(marker, result.formatted_address);

                        // hide window after N seconds
                        setTimeout(function () {
                            marker.setMap(null);
                            marker = new google.maps.Marker({
                                position: pos,
                                icon: bbbike.icons["purple_dot"],
                                map: map
                            });

                            google.maps.event.addListener(marker, "click", function (event) {
                                addInfoWindow(marker, result.formatted_address)
                            });

                        }, 5000);
                    }
                }

                // or later at click event
                google.maps.event.addListener(marker, "click", function (event) {
                    addInfoWindow(marker, result.formatted_address)
                });
            }
        });

        // google.maps.event.addListener(marker, "click", function(event) { addInfoWindow(marker) } );

        function addInfoWindow(marker, address) {
            infoWindow = new google.maps.InfoWindow({
                disableAutoPan: true,
                maxWidth: 400
            });
            var content = "<div id=\"infoWindowContent\">\n"
            content += "<p class='grey'>" + translate_mapcontrol("Your current postion", lang) + ": " + currentPosition.lat + "," + currentPosition.lng + "</p>\n";
            content += "<p>" + translate_mapcontrol("Approximate address", lang) + ": " + address + "</p>\n";
            // content += "<p>" + translate_mapcontrol("From here") + " " + translate_mapcontrol("To here") + "</p>\n";
            content += "</div>\n";
            infoWindow.setContent(content);
            infoWindow.open(map, marker);

        };
    });
}

// elevation.js
// var map = null;
var chart = null;

var geocoderService = null;
var elevationService = null;
var directionsService = null;

var mousemarker = null;
var markers = [];
var polyline = null;
var elevations = null;

var SAMPLES = 400;

// Load the Visualization API and the piechart package.
try {
    google.load("visualization", "1", {
        packages: ["columnchart"]
    });
} catch (e) {}

// Set a callback to run when the Google Visualization API is loaded.
// google.setOnLoadCallback(elevation_initialize);

function elevation_initialize(slippymap, opt) {
    var myLatlng = new google.maps.LatLng(15, 0);
    var myOptions = {
        zoom: 1,
        center: myLatlng,
        // mapTypeId: google.maps.MapTypeId.TERRAIN
    }

    var maptype = slippymap.maptype;
    if (is_supported_map(maptype)) {
        // state.maptype = maptype;
        setCustomBold(maptype);
    }

    if (slippymap) {
        map = slippymap;
    } else {
        map = new google.maps.Map(document.getElementById("map")); //, myOptions);
    }

    chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));

    geocoderService = new google.maps.Geocoder();
    elevationService = new google.maps.ElevationService();
    directionsService = new google.maps.DirectionsService();

    google.visualization.events.addListener(chart, 'onmouseover', function (e) {
        if (mousemarker == null) {
            mousemarker = new google.maps.Marker({
                position: elevations[e.row].location,
                map: map,
                icon: bbbike.icons.purple_dot
            });
        } else {
            mousemarker.setPosition(elevations[e.row].location);
        }
    });

    loadRoute(opt);
}

// Takes an array of ElevationResult objects, draws the path on the map
// and plots the elevation profile on a GViz ColumnChart

function plotElevation(results) {
    if (results == null) {
        alert("Sorry, no elevation results are available. Plot the route only.");
        return plotRouteOnly();
    }

    elevations = results;

    var path = [];
    for (var i = 0; i < results.length; i++) {
        path.push(elevations[i].location);
    }

    if (polyline) {
        polyline.setMap(null);
    }

    polyline = new google.maps.Polyline({
        path: path,
        clickable: true,
        strokeColor: '#00FF00',
        strokeWeight: 8,
        strokeOpacity: 0.6,
        map: map
    });

    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Sample');
    data.addColumn('number', 'Elevation');
    for (var i = 0; i < results.length; i++) {
        data.addRow(['', elevations[i].elevation]);
    }

    document.getElementById('chart_div').style.display = 'block';
    chart.draw(data, {
        // width: '800',
        // height: 200,
        legend: 'none',
        titleY: 'Elevation (m)',
        focusBorderColor: '#00ff00'
    });
}

// fallback, plot only the  route without elevation 

function plotRouteOnly() {
    var path = [];
    for (var i in marker_list) {
        path.push(new google.maps.LatLng(marker_list[i][0], marker_list[i][1]));
    }

    polyline = new google.maps.Polyline({
        path: path,
        clickable: true,
        strokeColor: '#008800',
        strokeWeight: 8,
        strokeOpacity: 0.6,
        map: map
    });
}

// Remove the green rollover marker when the mouse leaves the chart

function clearMouseMarker() {
    if (mousemarker != null) {
        mousemarker.setMap(null);
        mousemarker = null;
    }
}

// Add a marker and trigger recalculation of the path and elevation

function addMarker(latlng, doQuery) {
    if (markers.length < 800) {

        var marker = new google.maps.Marker({
            position: latlng,
            // map: map,
            // draggable: true
        })

        // google.maps.event.addListener(marker, 'dragend', function(e) { updateElevation(); });
        markers.push(marker);

        if (doQuery) {
            updateElevation();
        }
    }
}


// Trigger the elevation query for point to point
// or submit a directions request for the path between points

function updateElevation() {

    if (markers.length > 1) {
        var latlngs = [];

        // only 500 elevation points can be showed
        // skip every second/third/fourth etc. if there are more
        var select = parseInt((markers.length + SAMPLES) / SAMPLES);

        for (var i in markers) {
            if (i % select == 0) {
                latlngs.push(markers[i].getPosition())
            }
        }

        elevationService.getElevationAlongPath({
            path: latlngs,
            samples: SAMPLES
        }, plotElevation);

    }
}

function loadRoute(opt) {
    reset();
    // map.setMapTypeId( google.maps.MapTypeId.ROADMAP );
    if (opt.maptype) {
        map.setMapTypeId(opt.maptype);
    }

    var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < marker_list.length; i++) {
        var latlng = new google.maps.LatLng(marker_list[i][0], marker_list[i][1]);
        addMarker(latlng, false);
        bounds.extend(latlng);
    }
    map.fitBounds(bounds);
    updateElevation();
    RouteMarker(opt);
}


function RouteMarker(opt) {

    // up to 3 markers: [ start, ziel, via ]
    var icons = [bbbike.icons.green, bbbike.icons.red, bbbike.icons.yellow];

    for (var i = 0; i < marker_list_points.length; i++) {
        var point = new google.maps.LatLng(marker_list_points[i][0], marker_list_points[i][1]);

        var marker = new google.maps.Marker({
            position: point,
            icon: icons[i],
            map: map
        });

        google.maps.event.addListener(marker, "click", function (marker) {
            return function (event) {
                addInfoWindow(marker)
            };
        }(marker));
    }

    function driving_time(driving_time) {
        var data = "";
        var time = driving_time.split('|');
        for (var i = 0; i < time.length; i++) {
            var t = time[i].split(':');
            data += t[0] + ":" + t[1] + "h (at " + t[2] + "km/h) ";
        }
        return data;
    }

    function addInfoWindow(marker) {
        if (infoWindow) {
            infoWindow.close();
        }

        infoWindow = new google.maps.InfoWindow({
            maxWidth: 400
        });

        var content = "<div id=\"infoWindowContent\">\n"
        content += "City: " + '<a target="_new" href="/' + opt.city + '/">' + opt.city + '</a>' + "<br/>\n";
        content += "<img height='12' src='" + icons[0] + "' /> " + "Start: " + opt.startname + "<br/>\n";
        if (opt.vianame && opt.vianame != "") {
            content += "<img height='12' src='" + icons[2] + "' /> " + "Via: " + opt.vianame + "<br/>\n";
        }
        content += "<img height='12' src='" + icons[1] + "' /> " + "Destination: " + opt.zielname + "<br/>\n";
        content += "Route Length: " + opt.route_length + "km<br/>\n";
        content += "Driving time: " + driving_time(opt.driving_time) + "<br/>\n";
        content += "</div>\n";

        infoWindow.setContent(content);
        infoWindow.open(map, marker);
    };
}



// Clear all overlays, reset the array of points, and hide the chart

function reset() {
    if (polyline) {
        polyline.setMap(null);
    }

    for (var i in markers) {
        markers[i].setMap(null);
    }

    markers = [];

    document.getElementById('chart_div').style.display = 'none';
}

function smallerMap(step, id, id2) {
    if (!id) id = "BBBikeGooglemap";
    if (!step) step = 2;

    var tag = document.getElementById(id);
    if (!tag) return;

    var width = tag.style.width || "75%";

    // match "75%" and increase it by step=1 
    var matches = width.match(/^([0-9\.\-]+)%$/);

    var unit = "%";
    var m = 0;
    if (matches) {
        m = parseFloat(matches[0]) - step;
    }
    if (m <= 0 || m > 105) m = 75;

    // make map smaller, and move it right
    tag.style.width = m + unit;
    tag.style.left = (100 - m) + unit;

    // debug("M: " + m + " " + tag.style.width + " " + tag.style.left );
}

//
// set start/via/ziel markers
// zoom level is not known yet, try it 0.5 seconds later
//

function init_markers(opt) {
    var timeout = setTimeout(function () {
        _init_markers(opt)
    }, 900);

    // reset markers after the map bound were changed
    google.maps.event.addListener(map, "bounds_changed", function () {
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            _init_markers(opt)
        }, 1000);
    });
}

function _init_markers(opt) {
    var area = opt.area;
    var lang = opt.lang || "en";

    var zoom = map.getZoom();
    var ne = map.getBounds().getNorthEast();
    var sw = map.getBounds().getSouthWest();

    var lat, lng;
    if (area) {
        lat = area[1][0];
        lng = area[0][1];
    }

    // use current map size instead area
    else {
        lat = ne.lat();
        lng = sw.lng();
    }

    var dist = bbbike.search_markers_pos; // use 3.5 or 8
    var pos_lng = lng + (ne.lng() - lng) / dist; //  right
    var pos_lat = lat - (lat - sw.lat()) / dist; //  down
    padding = (ne.lng() - lng) / 16; // distance beteen markers on map, 1/x of the map
    var pos_start = new google.maps.LatLng(pos_lat, pos_lng);
    var pos_ziel = new google.maps.LatLng(pos_lat, pos_lng + padding);
    var pos_via = new google.maps.LatLng(pos_lat, pos_lng + 2.0 * padding);

    // shadow for markers, if moved
    var shadow = new google.maps.MarkerImage(bbbike.icons["shadow"], new google.maps.Size(49.0, 32.0), new google.maps.Point(0, 0), new google.maps.Point(16.0, 16.0));

    var marker_start = new google.maps.Marker({
        position: pos_start,
        clickable: true,
        draggable: true,
        title: translate_mapcontrol("Set start point", lang),
        icon: bbbike.icons["start"] // icon: "/images/start_ptr.png"
    });

    var marker_ziel = new google.maps.Marker({
        position: pos_ziel,
        clickable: true,
        draggable: true,
        title: translate_mapcontrol("Set destination point", lang),
        icon: bbbike.icons["ziel"] // icon: "/images/ziel_ptr.png"
    });

    var marker_via = new google.maps.Marker({
        position: pos_via,
        clickable: true,
        draggable: true,
        title: translate_mapcontrol("Set via point", lang),
        icon: bbbike.icons["via"] // icon: "/images/ziel_ptr.png"
    });


    // clean old markers
    debug("zoom level: " + map.getZoom() + " padding: " + padding);

    if (state.markers_drag.marker_start == null) {
        if (state.markers.marker_start) state.markers.marker_start.setMap(null);
        marker_start.setMap(map);
        state.markers.marker_start = marker_start;
    }
    if (state.markers_drag.marker_ziel == null) {
        if (state.markers.marker_ziel) state.markers.marker_ziel.setMap(null);
        marker_ziel.setMap(map);
        state.markers.marker_ziel = marker_ziel;
    }
    if (state.markers_drag.marker_via == null) {
        if (state.markers.marker_via) state.markers.marker_via.setMap(null);
        marker_via.setMap(map);
        state.markers.marker_via = marker_via;
    }



    // var event = 'position_changed'; // "drag", Firefox bug
    var event = 'drag'; // "drag", Firefox bug
    google.maps.event.addListener(marker_start, event, function () {
        state.markers_drag.marker_start = marker_start;
        find_street(marker_start, "suggest_start", shadow)
    });
    google.maps.event.addListener(marker_ziel, event, function () {
        state.markers_drag.marker_ziel = marker_ziel;
        find_street(marker_ziel, "suggest_ziel", shadow)
    });
    google.maps.event.addListener(marker_via, event, function () {
        state.markers_drag.marker_via = marker_via;
        find_street(marker_via, "suggest_via", shadow, function () {
            displayVia()
        });
    });
}

function displayVia() {
    var tag = document.getElementById("viatr");
    if (tag && tag.style.display == "none") toogleVia('viatr', 'via_message');
}

// round up to 1.1 meters

function granularity(val, gran) {
    var granularity = gran || bbbike.granularity;

    return parseInt(val * granularity) / granularity;
}

function debug(text, id) {
    // log to JavaScript console
    if (typeof console === "undefined" || typeof console.log === "undefined") { /* ARGH!!! old IE */
    } else {
        console.log("BBBike extract: " + text);
    }

    if (!id) id = "debug";

    var tag = jQuery("#" + id);
    if (!tag) return;

    // log to HTML page
    tag.html("debug: " + text);
}

function find_street(marker, input_id, shadow, callback) {
    var latLng = marker.getPosition();

    var input = document.getElementById(input_id);
    if (input) {
        if (input_id == "XXXsuggest_via") {
            toogleVia('viatr', 'via_message', null, true);
        }

        var value = granularity(latLng.lng()) + ',' + granularity(latLng.lat());
        input.setAttribute("value", value);

        // set shadow to indicate an active marker
        if (shadow) marker.setShadow(shadow);

        display_current_crossing(marker, input_id, {
            "lng": granularity(latLng.lng()),
            "lat": granularity(latLng.lat()),
            "callback": callback
        });

        var type = input_id.substr(8);
        var color = document.getElementById("icon_" + type);
        if (bbbike.dark_icon_colors && color) {
            color.setAttribute("bgcolor", type == "start" ? "green" : type == "ziel" ? "red" : "yellow");
        }

        // debug(value);
    } else {
        debug("Unknonw: " + input_id);
    }
}

/*************************************************
 * crossings
 *
 */

function inside_area(obj) { // { lng: lng, lat: lat }
    var area = state.marker_list;
    var bottomLeft = area[0];
    var topRight = area[1];

    var result;
    if (obj.lng >= bottomLeft[1] && obj.lng <= topRight[1] && obj.lat >= bottomLeft[0] && obj.lat <= topRight[0]) {
        result = 1;
    } else {
        result = 0;
    }

    debug("lng: " + obj.lng + " lat: " + obj.lat + " area: " + bottomLeft[1] + "," + bottomLeft[0] + " " + topRight[0] + "," + topRight[1] + " result: " + result);
    return result;
}

// call the API only after 100ms

function display_current_crossing(marker, id, obj) {
    if (state.timeout_crossing) {
        clearTimeout(state.timeout_crossing);
    }

    state.timeout_crossing = setTimeout(function () {
        _display_current_crossing(marker, id, obj)
    }, 100);
}

function _display_current_crossing(marker, id, obj) {
    var lngLat = obj.lng + "," + obj.lat
    var url = '/cgi/crossing.cgi?id=' + id + ';ns=dbac;city=' + city + ';q=' + lngLat;

    if (!inside_area(obj)) {
        debug("outside area");
        var query = translate_mapcontrol("Error: outside area");
        return updateCrossing(marker, id, '{query:"[' + query + ']", suggestions:[]}');
    }
    downloadUrl(url, function (data, responseCode) {
        if (responseCode == 200) {
            if (obj.callback) obj.callback();
            updateCrossing(marker, id, data);

        } else if (responseCode == -1) {
            alert("Data request timed out. Please try later.");
        } else {
            alert("Request resulted in error. Check XML file is retrievable.");
        }
    });
}

function set_input_field(id, value) {
    var input = document.getElementById(id);

    if (input) {
        input.value = value;
    } else {
        debug("unknown input field: " + id);
        return;
    }

    debug("crossing: " + id + " " + value);
}

// data: { query:"7.44007,46.93205", suggestions:["7.44042,46.93287	Bondelistr./"] }

function updateCrossing(marker, id, data) {

    if (!data || data == "") {
        return set_input_field(id, "");
    }

    var js = eval("(" + data + ")");

    if (!js || !js.suggestions) {
        return set_input_field(id, "");
    }

    var value = js.suggestions[0];
    var v, street_latlng;

    if (value) {
        v = value.split("\t");
        street_latlng = v[1] + " [" + v[0] + ",0]";
    } else {
        street_latlng = js.query;
    }

    newInfoWindow(marker, {
        "id": id,
        "crossing": v ? v[1] : street_latlng
    });

    return set_input_field(id, street_latlng);
}

function newInfoWindow(marker, opt) {

    var infoWindow = new google.maps.InfoWindow({
        maxWidth: 450
    });

    var content = "<div id=\"infoWindowContent\">\n"
    content += "<p>"
    content += translate_mapcontrol(opt.id == "suggest_start" ? "Start" : opt.id == "suggest_ziel" ? "Destination" : "Via") + " ";
    content += translate_mapcontrol("crossing") + ": <br/>" + opt.crossing;
    content += "</p>"
    content += "</div>\n";

    infoWindow.setContent(content);
    infoWindow.open(map, marker);

    google.maps.event.addListener(marker, "click", function (event) {
        infoWindow.open(map, marker);
        setTimeout(function () {
            infoWindow.close()
        }, 3000);
    });

    // close info window after 3 seconds
    setTimeout(function () {
        infoWindow.close()
    }, 2000);
};

// strip trailing country name

function format_address(address) {
    var street = address.split(",");
    street.pop();
    return street.join(",");
}

function googleCodeAddress(address, callback, logger) {
    function log_geocoder(logger, status) {
        // log geocode requests status by '/cgi/log.cgi';
        if (logger && logger.url) {
            var logger_url = encodeURI(logger.url + "?type=gmaps-geocoder&city=" + logger.city + "&query=" + address + "&status=" + status);
            $.get(logger_url);
        }
    }

    // search for an address only in this specific area
    // var box = [[43.60000,-79.66000],[43.85000,-79.07000]];
    var box = state.marker_list;

    var bounds = new google.maps.LatLngBounds;
    bounds.extend(new google.maps.LatLng(box[0][0], box[0][1]), new google.maps.LatLng(box[1][0], box[1][1]));

    if (!state.geocoder) {
        state.geocoder = new google.maps.Geocoder();
    }


    state.geocoder.geocode({
        'address': address,
        'bounds': bounds
    }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            var autocomplete = '{ query:"' + address + '", suggestions:[';

            var streets = [];
            for (var i = 0; i < results.length; i++) {
                if (inside_area({
                    lat: results[i].geometry.location.lat(),
                    lng: results[i].geometry.location.lng()
                })) {
                    streets.push('"' + format_address(results[i].formatted_address) + ' [' + granularity(results[i].geometry.location.lng()) + ',' + granularity(results[i].geometry.location.lat()) + ',1]"');
                }
            }

            autocomplete += streets.join(",");
            autocomplete += '] }';

            callback(autocomplete);
            log_geocoder(logger, "0");
        } else {
            log_geocoder(logger, status);
            // alert("Geocode was not successful for the following reason: " + status);
        }
    });
}

function toogleDiv(id, value) {
    var tag = document.getElementById(id);
    if (!tag) return;

    tag.style.display = tag.style.display == "none" ? "block" : "none";
    setMapHeight();
}

/* set map height, depending on footer height */

function setMapHeight() {
    var height = jQuery("body").height() - jQuery('#bottom').height() - 15;
    if (height < 200) height = 200;
    var width = jQuery("body").width() - jQuery('#routing').width() - 20;

    jQuery('#BBBikeGooglemap').height(height);
    jQuery('#BBBikeGooglemap').width(width);

    debug("height: " + height + ", width: " + width);
};

// EOF
// "use strict"
/*************************************************
 * utils
 *
 */

/* http://gmaps-samples-v3.googlecode.com/svn/trunk/xmlparsing/downloadurl.html */
/**
 * Returns an XMLHttp instance to use for asynchronous
 * downloading. This method will never throw an exception, but will
 * return NULL if the browser does not support XmlHttp for any reason.
 * @return {XMLHttpRequest|Null}
 */

function createXmlHttpRequest() {
    try {
        if (typeof ActiveXObject != 'undefined') {
            return new ActiveXObject('Microsoft.XMLHTTP');
        } else if (window["XMLHttpRequest"]) {
            return new XMLHttpRequest();
        }
    } catch (e) {
        // alert(e);
    }
    return null;
};

/**
 * This functions wraps XMLHttpRequest open/send function.
 * It lets you specify a URL and will call the callback if
 * it gets a status code of 200.
 * @param {String} url The URL to retrieve
 * @param {Function} callback The function to call once retrieved.
 */

function downloadUrl(url, callback) {
    var status = -1;
    var request = createXmlHttpRequest();
    if (!request) {
        return false;
    }

    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            try {
                status = request.status;
            } catch (e) {
                // Usually indicates request timed out in FF.
            }

            if (status == 200) {
                if (request.getResponseHeader("Content-Type").match("/xml")) {
                    callback(request.responseXML, request.status);
                } else {
                    // JSON
                    callback(request.responseText, request.status);
                }

                request.onreadystatechange = function () {};
            }
        }
    }

    request.open('GET', url, true);
    try {
        request.send(null);
    } catch (e) {
        // alert(e);
    }
};


/*************************************************
 * weather
 *
 */

function display_current_weather(weather) {
    // var url = 'http://ws.geonames.org/findNearByWeatherJSON?lat=' + lat + '&lng=' + lng;
    var url = '/cgi/weather.cgi?lat=' + weather.lat + '&lng=' + weather.lng + '&city=' + weather.city + '&city_script=' + weather.city_script;

    if (weather.lang && weather.lang != "") {
        url += '&lang=' + weather.lang;
    }

    downloadUrl(url, function (data, responseCode) {
        if (responseCode == 200) {
            updateWeather(data);
        } else if (responseCode == -1) {
            alert("Data request timed out. Please try later.");
        } else {
            alert("Request resulted in error. Check XML file is retrievable.");
        }
    });
}

function updateWeather(data) {
    if (!data || data == "") {
        return;
    }

    // var js =  {"weatherObservation":{"clouds":"few clouds","weatherCondition":"n/a","observation":"LFSB 242100Z VRB03KT 9999 FEW040 14/13 Q1019 NOSIG","ICAO":"LFSB","elevation":271,"countryCode":"FR","lng":7.51666666666667,"temperature":"14","dewPoint":"13","windSpeed":"03","humidity":93,"stationName":"Bale-Mulhouse","datetime":"2010-08-24 21:00:00","lat":47.6,"hectoPascAltimeter":1019}};
    // invalid label bug
    var js = eval("(" + data + ")");

    if (!js.weather || !js.weather.weatherObservation) {
        return; // no weather
    }
    var w = js.weather.weatherObservation;

    if (w.temperature == 0 && w.dewPoint == 0 && w.humidity == 100) {
        // broken data, ignore
        return;
    }

    var message = w.temperature + " &deg;C";

    if (w.clouds && w.clouds.substring(0, 2) != "n/") {
        message += ", " + w.clouds;
    }

    if (w.windSpeed > 0) {
        message += ', max. wind ' + parseInt(w.windSpeed, 10) + "m/s";
    }

    var span = document.getElementById("current_weather");
    if (span) {
        span.innerHTML = message;
    }

    var span_fc = document.getElementById("weather_forecast");
    if (span_fc) {
        var message_fc = renderWeatherForecast(js.forecast);
        // no forecast, use current weather only
        if (message_fc == "") {
            // message = ": no data available";
            if (w.stationName) message_fc += w.stationName + ", ";
            message_fc += message;
            if (w.humidity > 0) message_fc += ", humidity: " + w.humidity + "%";
        }

        span_fc.innerHTML = message_fc;
    }
}

function renderWeatherForecast(js) {
    if (!js || js == "" || !js.weather) {
        return "";
    }

    return google_weather(js);
}

// find a city and increase font size and set focus

function higlightCity(data, obj) {
    var pos = eval("(" + data + ")");
    if (!pos || pos.length < 1 || pos[0] == "NO_CITY") {
        return;
    }

    var a = document.getElementsByTagName("a");
    var focus;
    for (var i = 0; i < a.length; i++) {
        for (var j = 0; j < pos.length; j++) {
            var className = "C_" + pos[j];

            if (a[i].className == className) {
                a[i].style.fontSize = "200%";
                a[i].style.color = "green";

                a[i].setAttribute('title', pos[j] + " " + obj.lat + "," + obj.lng);

                if (!focus) {
                    focus = a[i];
                }

            }
        }
    }

    if (focus) {
        focus.focus();
    }

}

var currentPosition;

function geoCity(obj) {
    // "13.3888548", "52.5170397";
    // "-123.1333301", "49.2499987"
    if (!obj || obj.lng == undefined || obj.lat == undefined) {
        return;
    }

    var url = '/cgi/location.cgi?lng=' + obj.lng + '&lat=' + obj.lat;

    downloadUrl(url, function (data, responseCode) {
        if (responseCode == 200) {
            higlightCity(data, obj);
        } else if (responseCode == -1) {
            alert("Data request timed out. Please try later.");
        } else {
            alert("Request resulted in error. Check XML file is retrievable.");
        }
    });
}

function focusCity() {
    if (!navigator.geolocation) {
        return;
    }

    navigator.geolocation.getCurrentPosition(function (position) {
        currentPosition = {
            "lat": position.coords.latitude,
            "lng": position.coords.longitude
        };
        geoCity(currentPosition);
    });
}

function google_weather(w) {
    var unit = w.weather.forecast_information ? w.weather.forecast_information.unit_system.data : "";
    var html = "";
    var display_city_name = 1;

    // Fahrenheit -> Celcius

    function celcius(temp) {
        if (unit == "US") {
            var t = (temp - 32) / 1.8;
            return parseInt(t + 0.5, 10);
        }
        return temp;
    }

    var f = w.weather.current_conditions;
    // give up
    if (!f) {
        return html;
    }

    if (display_city_name) {
        html += '\n<span id="weather_city">';
        if (w.weather.forecast_information && w.weather.forecast_information.city) {
            html += "<b>" + w.weather.forecast_information.city.data + "</b>";
            html += " :  " + w.weather.forecast_information.forecast_date.data;
        }
        html += '</span>';
    }

    html += '<div id="weatherSection" class="marginLeft">' + '<div style="font-size: 0.8em;" class="roundCorner floatLeft" id="googleWeather">' + '<div style="padding: 5px; float: left;">' + '<div style="font-size: 140%;">' + '<b>' + f.temp_c.data + '°C' + '</b>' + '</div>' + '<div>' + '<b>' + f.condition.data + '</b><br />' + f.wind_condition.data + '<br />' + f.humidity.data + '<br />' + '</div>' + '</div>';

    function plot(f) {
        var html = '' + '<div style="padding: 5px; float: left;" align="center">';
        if (f.day_of_week) {
            html += f.day_of_week.data;
        }

        var icon_src = f.icon.data.match(/^http:/) ? f.icon.data : "http://www.google.com" + f.icon.data;
        html += '<br />' + '<img style="border: 0px solid rgb(187, 187, 204); margin-bottom: 2px;" src="' + icon_src + '" alt="' + f.condition.data + '" title="' + f.condition.data + '" /><br />';
        if (f.high) {
            html += '<nobr>' + celcius(f.high.data) + '°C | ' + celcius(f.low.data) + '°C</nobr>';
        }
        html += '</div>';

        return html;
    }

    html += plot(w.weather.current_conditions);

    var days = w.weather.forecast_conditions;
    for (var i = 0; i < days.length; i++) {
        html += plot(days[i]);
    }

    html += '</div><br class="clear" />';
    html += '</div>';


    return html;
}

// show the spinning wheel image

function show_spinning_wheel() {
    var span = document.getElementById("spinning_wheel");
    if (span) {
        span.style.visibility = "visible";
    }
    return true;
}

function toogleVia(via_field, via_message, via_input, visible) {
    var tag = document.getElementById(via_field);
    if (!tag) return;

    // IE 6/7 workarounds
    var table_row = "table-row";
    var table_cell = "table-cell";
    var b = navigator.userAgent.toLowerCase();
    if (/msie [67]/.test(b)) {
        table_row = "inline";
        table_cell = "inline";
    }

    tag.style.display = (tag.style.display == "none" || visible) ? table_row : "none";

    tag = document.getElementById(via_message);
    if (!tag) return;
    tag.style.display = (tag.style.display == "none" || visible) ? table_cell : "none";

    // reset input field if hiding the via area
    if (!via_input) return;
    tag = document.getElementById(via_input);
    if (!tag) return;
    tag.value = "";
}

function oS(tag) { // openStreet
    if (window.history) {
        open("./?" + "startstreet=" + encodeURIComponent(tag.innerHTML), "BBBike");
    }
}

var _google_plusone = 0;

function google_plusone() {
    if (!_google_plusone) {
        jQuery.getScript('https://apis.google.com/js/plusone.js');
        $('.gplus').remove();
    }
    _google_plusone = 1;
}

// unknown google maps bug
// Af[z] is undefined
// EOF
/*!
 * jQuery JavaScript Library v1.4.2
 * http://jquery.com/
 *
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 * Copyright 2010, The Dojo Foundation
 * Released under the MIT, BSD, and GPL Licenses.
 *
 * Date: Sat Feb 13 22:33:48 2010 -0500
 */
(function(A,w){function ma(){if(!c.isReady){try{s.documentElement.doScroll("left")}catch(a){setTimeout(ma,1);return}c.ready()}}function Qa(a,b){b.src?c.ajax({url:b.src,async:false,dataType:"script"}):c.globalEval(b.text||b.textContent||b.innerHTML||"");b.parentNode&&b.parentNode.removeChild(b)}function X(a,b,d,f,e,j){var i=a.length;if(typeof b==="object"){for(var o in b)X(a,o,b[o],f,e,d);return a}if(d!==w){f=!j&&f&&c.isFunction(d);for(o=0;o<i;o++)e(a[o],b,f?d.call(a[o],o,e(a[o],b)):d,j);return a}return i?
e(a[0],b):w}function J(){return(new Date).getTime()}function Y(){return false}function Z(){return true}function na(a,b,d){d[0].type=a;return c.event.handle.apply(b,d)}function oa(a){var b,d=[],f=[],e=arguments,j,i,o,k,n,r;i=c.data(this,"events");if(!(a.liveFired===this||!i||!i.live||a.button&&a.type==="click")){a.liveFired=this;var u=i.live.slice(0);for(k=0;k<u.length;k++){i=u[k];i.origType.replace(O,"")===a.type?f.push(i.selector):u.splice(k--,1)}j=c(a.target).closest(f,a.currentTarget);n=0;for(r=
j.length;n<r;n++)for(k=0;k<u.length;k++){i=u[k];if(j[n].selector===i.selector){o=j[n].elem;f=null;if(i.preType==="mouseenter"||i.preType==="mouseleave")f=c(a.relatedTarget).closest(i.selector)[0];if(!f||f!==o)d.push({elem:o,handleObj:i})}}n=0;for(r=d.length;n<r;n++){j=d[n];a.currentTarget=j.elem;a.data=j.handleObj.data;a.handleObj=j.handleObj;if(j.handleObj.origHandler.apply(j.elem,e)===false){b=false;break}}return b}}function pa(a,b){return"live."+(a&&a!=="*"?a+".":"")+b.replace(/\./g,"`").replace(/ /g,
"&")}function qa(a){return!a||!a.parentNode||a.parentNode.nodeType===11}function ra(a,b){var d=0;b.each(function(){if(this.nodeName===(a[d]&&a[d].nodeName)){var f=c.data(a[d++]),e=c.data(this,f);if(f=f&&f.events){delete e.handle;e.events={};for(var j in f)for(var i in f[j])c.event.add(this,j,f[j][i],f[j][i].data)}}})}function sa(a,b,d){var f,e,j;b=b&&b[0]?b[0].ownerDocument||b[0]:s;if(a.length===1&&typeof a[0]==="string"&&a[0].length<512&&b===s&&!ta.test(a[0])&&(c.support.checkClone||!ua.test(a[0]))){e=
true;if(j=c.fragments[a[0]])if(j!==1)f=j}if(!f){f=b.createDocumentFragment();c.clean(a,b,f,d)}if(e)c.fragments[a[0]]=j?f:1;return{fragment:f,cacheable:e}}function K(a,b){var d={};c.each(va.concat.apply([],va.slice(0,b)),function(){d[this]=a});return d}function wa(a){return"scrollTo"in a&&a.document?a:a.nodeType===9?a.defaultView||a.parentWindow:false}var c=function(a,b){return new c.fn.init(a,b)},Ra=A.jQuery,Sa=A.$,s=A.document,T,Ta=/^[^<]*(<[\w\W]+>)[^>]*$|^#([\w-]+)$/,Ua=/^.[^:#\[\.,]*$/,Va=/\S/,
Wa=/^(\s|\u00A0)+|(\s|\u00A0)+$/g,Xa=/^<(\w+)\s*\/?>(?:<\/\1>)?$/,P=navigator.userAgent,xa=false,Q=[],L,$=Object.prototype.toString,aa=Object.prototype.hasOwnProperty,ba=Array.prototype.push,R=Array.prototype.slice,ya=Array.prototype.indexOf;c.fn=c.prototype={init:function(a,b){var d,f;if(!a)return this;if(a.nodeType){this.context=this[0]=a;this.length=1;return this}if(a==="body"&&!b){this.context=s;this[0]=s.body;this.selector="body";this.length=1;return this}if(typeof a==="string")if((d=Ta.exec(a))&&
(d[1]||!b))if(d[1]){f=b?b.ownerDocument||b:s;if(a=Xa.exec(a))if(c.isPlainObject(b)){a=[s.createElement(a[1])];c.fn.attr.call(a,b,true)}else a=[f.createElement(a[1])];else{a=sa([d[1]],[f]);a=(a.cacheable?a.fragment.cloneNode(true):a.fragment).childNodes}return c.merge(this,a)}else{if(b=s.getElementById(d[2])){if(b.id!==d[2])return T.find(a);this.length=1;this[0]=b}this.context=s;this.selector=a;return this}else if(!b&&/^\w+$/.test(a)){this.selector=a;this.context=s;a=s.getElementsByTagName(a);return c.merge(this,
a)}else return!b||b.jquery?(b||T).find(a):c(b).find(a);else if(c.isFunction(a))return T.ready(a);if(a.selector!==w){this.selector=a.selector;this.context=a.context}return c.makeArray(a,this)},selector:"",jquery:"1.4.2",length:0,size:function(){return this.length},toArray:function(){return R.call(this,0)},get:function(a){return a==null?this.toArray():a<0?this.slice(a)[0]:this[a]},pushStack:function(a,b,d){var f=c();c.isArray(a)?ba.apply(f,a):c.merge(f,a);f.prevObject=this;f.context=this.context;if(b===
"find")f.selector=this.selector+(this.selector?" ":"")+d;else if(b)f.selector=this.selector+"."+b+"("+d+")";return f},each:function(a,b){return c.each(this,a,b)},ready:function(a){c.bindReady();if(c.isReady)a.call(s,c);else Q&&Q.push(a);return this},eq:function(a){return a===-1?this.slice(a):this.slice(a,+a+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},slice:function(){return this.pushStack(R.apply(this,arguments),"slice",R.call(arguments).join(","))},map:function(a){return this.pushStack(c.map(this,
function(b,d){return a.call(b,d,b)}))},end:function(){return this.prevObject||c(null)},push:ba,sort:[].sort,splice:[].splice};c.fn.init.prototype=c.fn;c.extend=c.fn.extend=function(){var a=arguments[0]||{},b=1,d=arguments.length,f=false,e,j,i,o;if(typeof a==="boolean"){f=a;a=arguments[1]||{};b=2}if(typeof a!=="object"&&!c.isFunction(a))a={};if(d===b){a=this;--b}for(;b<d;b++)if((e=arguments[b])!=null)for(j in e){i=a[j];o=e[j];if(a!==o)if(f&&o&&(c.isPlainObject(o)||c.isArray(o))){i=i&&(c.isPlainObject(i)||
c.isArray(i))?i:c.isArray(o)?[]:{};a[j]=c.extend(f,i,o)}else if(o!==w)a[j]=o}return a};c.extend({noConflict:function(a){A.$=Sa;if(a)A.jQuery=Ra;return c},isReady:false,ready:function(){if(!c.isReady){if(!s.body)return setTimeout(c.ready,13);c.isReady=true;if(Q){for(var a,b=0;a=Q[b++];)a.call(s,c);Q=null}c.fn.triggerHandler&&c(s).triggerHandler("ready")}},bindReady:function(){if(!xa){xa=true;if(s.readyState==="complete")return c.ready();if(s.addEventListener){s.addEventListener("DOMContentLoaded",
L,false);A.addEventListener("load",c.ready,false)}else if(s.attachEvent){s.attachEvent("onreadystatechange",L);A.attachEvent("onload",c.ready);var a=false;try{a=A.frameElement==null}catch(b){}s.documentElement.doScroll&&a&&ma()}}},isFunction:function(a){return $.call(a)==="[object Function]"},isArray:function(a){return $.call(a)==="[object Array]"},isPlainObject:function(a){if(!a||$.call(a)!=="[object Object]"||a.nodeType||a.setInterval)return false;if(a.constructor&&!aa.call(a,"constructor")&&!aa.call(a.constructor.prototype,
"isPrototypeOf"))return false;var b;for(b in a);return b===w||aa.call(a,b)},isEmptyObject:function(a){for(var b in a)return false;return true},error:function(a){throw a;},parseJSON:function(a){if(typeof a!=="string"||!a)return null;a=c.trim(a);if(/^[\],:{}\s]*$/.test(a.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,"")))return A.JSON&&A.JSON.parse?A.JSON.parse(a):(new Function("return "+
a))();else c.error("Invalid JSON: "+a)},noop:function(){},globalEval:function(a){if(a&&Va.test(a)){var b=s.getElementsByTagName("head")[0]||s.documentElement,d=s.createElement("script");d.type="text/javascript";if(c.support.scriptEval)d.appendChild(s.createTextNode(a));else d.text=a;b.insertBefore(d,b.firstChild);b.removeChild(d)}},nodeName:function(a,b){return a.nodeName&&a.nodeName.toUpperCase()===b.toUpperCase()},each:function(a,b,d){var f,e=0,j=a.length,i=j===w||c.isFunction(a);if(d)if(i)for(f in a){if(b.apply(a[f],
d)===false)break}else for(;e<j;){if(b.apply(a[e++],d)===false)break}else if(i)for(f in a){if(b.call(a[f],f,a[f])===false)break}else for(d=a[0];e<j&&b.call(d,e,d)!==false;d=a[++e]);return a},trim:function(a){return(a||"").replace(Wa,"")},makeArray:function(a,b){b=b||[];if(a!=null)a.length==null||typeof a==="string"||c.isFunction(a)||typeof a!=="function"&&a.setInterval?ba.call(b,a):c.merge(b,a);return b},inArray:function(a,b){if(b.indexOf)return b.indexOf(a);for(var d=0,f=b.length;d<f;d++)if(b[d]===
a)return d;return-1},merge:function(a,b){var d=a.length,f=0;if(typeof b.length==="number")for(var e=b.length;f<e;f++)a[d++]=b[f];else for(;b[f]!==w;)a[d++]=b[f++];a.length=d;return a},grep:function(a,b,d){for(var f=[],e=0,j=a.length;e<j;e++)!d!==!b(a[e],e)&&f.push(a[e]);return f},map:function(a,b,d){for(var f=[],e,j=0,i=a.length;j<i;j++){e=b(a[j],j,d);if(e!=null)f[f.length]=e}return f.concat.apply([],f)},guid:1,proxy:function(a,b,d){if(arguments.length===2)if(typeof b==="string"){d=a;a=d[b];b=w}else if(b&&
!c.isFunction(b)){d=b;b=w}if(!b&&a)b=function(){return a.apply(d||this,arguments)};if(a)b.guid=a.guid=a.guid||b.guid||c.guid++;return b},uaMatch:function(a){a=a.toLowerCase();a=/(webkit)[ \/]([\w.]+)/.exec(a)||/(opera)(?:.*version)?[ \/]([\w.]+)/.exec(a)||/(msie) ([\w.]+)/.exec(a)||!/compatible/.test(a)&&/(mozilla)(?:.*? rv:([\w.]+))?/.exec(a)||[];return{browser:a[1]||"",version:a[2]||"0"}},browser:{}});P=c.uaMatch(P);if(P.browser){c.browser[P.browser]=true;c.browser.version=P.version}if(c.browser.webkit)c.browser.safari=
true;if(ya)c.inArray=function(a,b){return ya.call(b,a)};T=c(s);if(s.addEventListener)L=function(){s.removeEventListener("DOMContentLoaded",L,false);c.ready()};else if(s.attachEvent)L=function(){if(s.readyState==="complete"){s.detachEvent("onreadystatechange",L);c.ready()}};(function(){c.support={};var a=s.documentElement,b=s.createElement("script"),d=s.createElement("div"),f="script"+J();d.style.display="none";d.innerHTML="   <link/><table></table><a href='/a' style='color:red;float:left;opacity:.55;'>a</a><input type='checkbox'/>";
var e=d.getElementsByTagName("*"),j=d.getElementsByTagName("a")[0];if(!(!e||!e.length||!j)){c.support={leadingWhitespace:d.firstChild.nodeType===3,tbody:!d.getElementsByTagName("tbody").length,htmlSerialize:!!d.getElementsByTagName("link").length,style:/red/.test(j.getAttribute("style")),hrefNormalized:j.getAttribute("href")==="/a",opacity:/^0.55$/.test(j.style.opacity),cssFloat:!!j.style.cssFloat,checkOn:d.getElementsByTagName("input")[0].value==="on",optSelected:s.createElement("select").appendChild(s.createElement("option")).selected,
parentNode:d.removeChild(d.appendChild(s.createElement("div"))).parentNode===null,deleteExpando:true,checkClone:false,scriptEval:false,noCloneEvent:true,boxModel:null};b.type="text/javascript";try{b.appendChild(s.createTextNode("window."+f+"=1;"))}catch(i){}a.insertBefore(b,a.firstChild);if(A[f]){c.support.scriptEval=true;delete A[f]}try{delete b.test}catch(o){c.support.deleteExpando=false}a.removeChild(b);if(d.attachEvent&&d.fireEvent){d.attachEvent("onclick",function k(){c.support.noCloneEvent=
false;d.detachEvent("onclick",k)});d.cloneNode(true).fireEvent("onclick")}d=s.createElement("div");d.innerHTML="<input type='radio' name='radiotest' checked='checked'/>";a=s.createDocumentFragment();a.appendChild(d.firstChild);c.support.checkClone=a.cloneNode(true).cloneNode(true).lastChild.checked;c(function(){var k=s.createElement("div");k.style.width=k.style.paddingLeft="1px";s.body.appendChild(k);c.boxModel=c.support.boxModel=k.offsetWidth===2;s.body.removeChild(k).style.display="none"});a=function(k){var n=
s.createElement("div");k="on"+k;var r=k in n;if(!r){n.setAttribute(k,"return;");r=typeof n[k]==="function"}return r};c.support.submitBubbles=a("submit");c.support.changeBubbles=a("change");a=b=d=e=j=null}})();c.props={"for":"htmlFor","class":"className",readonly:"readOnly",maxlength:"maxLength",cellspacing:"cellSpacing",rowspan:"rowSpan",colspan:"colSpan",tabindex:"tabIndex",usemap:"useMap",frameborder:"frameBorder"};var G="jQuery"+J(),Ya=0,za={};c.extend({cache:{},expando:G,noData:{embed:true,object:true,
applet:true},data:function(a,b,d){if(!(a.nodeName&&c.noData[a.nodeName.toLowerCase()])){a=a==A?za:a;var f=a[G],e=c.cache;if(!f&&typeof b==="string"&&d===w)return null;f||(f=++Ya);if(typeof b==="object"){a[G]=f;e[f]=c.extend(true,{},b)}else if(!e[f]){a[G]=f;e[f]={}}a=e[f];if(d!==w)a[b]=d;return typeof b==="string"?a[b]:a}},removeData:function(a,b){if(!(a.nodeName&&c.noData[a.nodeName.toLowerCase()])){a=a==A?za:a;var d=a[G],f=c.cache,e=f[d];if(b){if(e){delete e[b];c.isEmptyObject(e)&&c.removeData(a)}}else{if(c.support.deleteExpando)delete a[c.expando];
else a.removeAttribute&&a.removeAttribute(c.expando);delete f[d]}}}});c.fn.extend({data:function(a,b){if(typeof a==="undefined"&&this.length)return c.data(this[0]);else if(typeof a==="object")return this.each(function(){c.data(this,a)});var d=a.split(".");d[1]=d[1]?"."+d[1]:"";if(b===w){var f=this.triggerHandler("getData"+d[1]+"!",[d[0]]);if(f===w&&this.length)f=c.data(this[0],a);return f===w&&d[1]?this.data(d[0]):f}else return this.trigger("setData"+d[1]+"!",[d[0],b]).each(function(){c.data(this,
a,b)})},removeData:function(a){return this.each(function(){c.removeData(this,a)})}});c.extend({queue:function(a,b,d){if(a){b=(b||"fx")+"queue";var f=c.data(a,b);if(!d)return f||[];if(!f||c.isArray(d))f=c.data(a,b,c.makeArray(d));else f.push(d);return f}},dequeue:function(a,b){b=b||"fx";var d=c.queue(a,b),f=d.shift();if(f==="inprogress")f=d.shift();if(f){b==="fx"&&d.unshift("inprogress");f.call(a,function(){c.dequeue(a,b)})}}});c.fn.extend({queue:function(a,b){if(typeof a!=="string"){b=a;a="fx"}if(b===
w)return c.queue(this[0],a);return this.each(function(){var d=c.queue(this,a,b);a==="fx"&&d[0]!=="inprogress"&&c.dequeue(this,a)})},dequeue:function(a){return this.each(function(){c.dequeue(this,a)})},delay:function(a,b){a=c.fx?c.fx.speeds[a]||a:a;b=b||"fx";return this.queue(b,function(){var d=this;setTimeout(function(){c.dequeue(d,b)},a)})},clearQueue:function(a){return this.queue(a||"fx",[])}});var Aa=/[\n\t]/g,ca=/\s+/,Za=/\r/g,$a=/href|src|style/,ab=/(button|input)/i,bb=/(button|input|object|select|textarea)/i,
cb=/^(a|area)$/i,Ba=/radio|checkbox/;c.fn.extend({attr:function(a,b){return X(this,a,b,true,c.attr)},removeAttr:function(a){return this.each(function(){c.attr(this,a,"");this.nodeType===1&&this.removeAttribute(a)})},addClass:function(a){if(c.isFunction(a))return this.each(function(n){var r=c(this);r.addClass(a.call(this,n,r.attr("class")))});if(a&&typeof a==="string")for(var b=(a||"").split(ca),d=0,f=this.length;d<f;d++){var e=this[d];if(e.nodeType===1)if(e.className){for(var j=" "+e.className+" ",
i=e.className,o=0,k=b.length;o<k;o++)if(j.indexOf(" "+b[o]+" ")<0)i+=" "+b[o];e.className=c.trim(i)}else e.className=a}return this},removeClass:function(a){if(c.isFunction(a))return this.each(function(k){var n=c(this);n.removeClass(a.call(this,k,n.attr("class")))});if(a&&typeof a==="string"||a===w)for(var b=(a||"").split(ca),d=0,f=this.length;d<f;d++){var e=this[d];if(e.nodeType===1&&e.className)if(a){for(var j=(" "+e.className+" ").replace(Aa," "),i=0,o=b.length;i<o;i++)j=j.replace(" "+b[i]+" ",
" ");e.className=c.trim(j)}else e.className=""}return this},toggleClass:function(a,b){var d=typeof a,f=typeof b==="boolean";if(c.isFunction(a))return this.each(function(e){var j=c(this);j.toggleClass(a.call(this,e,j.attr("class"),b),b)});return this.each(function(){if(d==="string")for(var e,j=0,i=c(this),o=b,k=a.split(ca);e=k[j++];){o=f?o:!i.hasClass(e);i[o?"addClass":"removeClass"](e)}else if(d==="undefined"||d==="boolean"){this.className&&c.data(this,"__className__",this.className);this.className=
this.className||a===false?"":c.data(this,"__className__")||""}})},hasClass:function(a){a=" "+a+" ";for(var b=0,d=this.length;b<d;b++)if((" "+this[b].className+" ").replace(Aa," ").indexOf(a)>-1)return true;return false},val:function(a){if(a===w){var b=this[0];if(b){if(c.nodeName(b,"option"))return(b.attributes.value||{}).specified?b.value:b.text;if(c.nodeName(b,"select")){var d=b.selectedIndex,f=[],e=b.options;b=b.type==="select-one";if(d<0)return null;var j=b?d:0;for(d=b?d+1:e.length;j<d;j++){var i=
e[j];if(i.selected){a=c(i).val();if(b)return a;f.push(a)}}return f}if(Ba.test(b.type)&&!c.support.checkOn)return b.getAttribute("value")===null?"on":b.value;return(b.value||"").replace(Za,"")}return w}var o=c.isFunction(a);return this.each(function(k){var n=c(this),r=a;if(this.nodeType===1){if(o)r=a.call(this,k,n.val());if(typeof r==="number")r+="";if(c.isArray(r)&&Ba.test(this.type))this.checked=c.inArray(n.val(),r)>=0;else if(c.nodeName(this,"select")){var u=c.makeArray(r);c("option",this).each(function(){this.selected=
c.inArray(c(this).val(),u)>=0});if(!u.length)this.selectedIndex=-1}else this.value=r}})}});c.extend({attrFn:{val:true,css:true,html:true,text:true,data:true,width:true,height:true,offset:true},attr:function(a,b,d,f){if(!a||a.nodeType===3||a.nodeType===8)return w;if(f&&b in c.attrFn)return c(a)[b](d);f=a.nodeType!==1||!c.isXMLDoc(a);var e=d!==w;b=f&&c.props[b]||b;if(a.nodeType===1){var j=$a.test(b);if(b in a&&f&&!j){if(e){b==="type"&&ab.test(a.nodeName)&&a.parentNode&&c.error("type property can't be changed");
a[b]=d}if(c.nodeName(a,"form")&&a.getAttributeNode(b))return a.getAttributeNode(b).nodeValue;if(b==="tabIndex")return(b=a.getAttributeNode("tabIndex"))&&b.specified?b.value:bb.test(a.nodeName)||cb.test(a.nodeName)&&a.href?0:w;return a[b]}if(!c.support.style&&f&&b==="style"){if(e)a.style.cssText=""+d;return a.style.cssText}e&&a.setAttribute(b,""+d);a=!c.support.hrefNormalized&&f&&j?a.getAttribute(b,2):a.getAttribute(b);return a===null?w:a}return c.style(a,b,d)}});var O=/\.(.*)$/,db=function(a){return a.replace(/[^\w\s\.\|`]/g,
function(b){return"\\"+b})};c.event={add:function(a,b,d,f){if(!(a.nodeType===3||a.nodeType===8)){if(a.setInterval&&a!==A&&!a.frameElement)a=A;var e,j;if(d.handler){e=d;d=e.handler}if(!d.guid)d.guid=c.guid++;if(j=c.data(a)){var i=j.events=j.events||{},o=j.handle;if(!o)j.handle=o=function(){return typeof c!=="undefined"&&!c.event.triggered?c.event.handle.apply(o.elem,arguments):w};o.elem=a;b=b.split(" ");for(var k,n=0,r;k=b[n++];){j=e?c.extend({},e):{handler:d,data:f};if(k.indexOf(".")>-1){r=k.split(".");
k=r.shift();j.namespace=r.slice(0).sort().join(".")}else{r=[];j.namespace=""}j.type=k;j.guid=d.guid;var u=i[k],z=c.event.special[k]||{};if(!u){u=i[k]=[];if(!z.setup||z.setup.call(a,f,r,o)===false)if(a.addEventListener)a.addEventListener(k,o,false);else a.attachEvent&&a.attachEvent("on"+k,o)}if(z.add){z.add.call(a,j);if(!j.handler.guid)j.handler.guid=d.guid}u.push(j);c.event.global[k]=true}a=null}}},global:{},remove:function(a,b,d,f){if(!(a.nodeType===3||a.nodeType===8)){var e,j=0,i,o,k,n,r,u,z=c.data(a),
C=z&&z.events;if(z&&C){if(b&&b.type){d=b.handler;b=b.type}if(!b||typeof b==="string"&&b.charAt(0)==="."){b=b||"";for(e in C)c.event.remove(a,e+b)}else{for(b=b.split(" ");e=b[j++];){n=e;i=e.indexOf(".")<0;o=[];if(!i){o=e.split(".");e=o.shift();k=new RegExp("(^|\\.)"+c.map(o.slice(0).sort(),db).join("\\.(?:.*\\.)?")+"(\\.|$)")}if(r=C[e])if(d){n=c.event.special[e]||{};for(B=f||0;B<r.length;B++){u=r[B];if(d.guid===u.guid){if(i||k.test(u.namespace)){f==null&&r.splice(B--,1);n.remove&&n.remove.call(a,u)}if(f!=
null)break}}if(r.length===0||f!=null&&r.length===1){if(!n.teardown||n.teardown.call(a,o)===false)Ca(a,e,z.handle);delete C[e]}}else for(var B=0;B<r.length;B++){u=r[B];if(i||k.test(u.namespace)){c.event.remove(a,n,u.handler,B);r.splice(B--,1)}}}if(c.isEmptyObject(C)){if(b=z.handle)b.elem=null;delete z.events;delete z.handle;c.isEmptyObject(z)&&c.removeData(a)}}}}},trigger:function(a,b,d,f){var e=a.type||a;if(!f){a=typeof a==="object"?a[G]?a:c.extend(c.Event(e),a):c.Event(e);if(e.indexOf("!")>=0){a.type=
e=e.slice(0,-1);a.exclusive=true}if(!d){a.stopPropagation();c.event.global[e]&&c.each(c.cache,function(){this.events&&this.events[e]&&c.event.trigger(a,b,this.handle.elem)})}if(!d||d.nodeType===3||d.nodeType===8)return w;a.result=w;a.target=d;b=c.makeArray(b);b.unshift(a)}a.currentTarget=d;(f=c.data(d,"handle"))&&f.apply(d,b);f=d.parentNode||d.ownerDocument;try{if(!(d&&d.nodeName&&c.noData[d.nodeName.toLowerCase()]))if(d["on"+e]&&d["on"+e].apply(d,b)===false)a.result=false}catch(j){}if(!a.isPropagationStopped()&&
f)c.event.trigger(a,b,f,true);else if(!a.isDefaultPrevented()){f=a.target;var i,o=c.nodeName(f,"a")&&e==="click",k=c.event.special[e]||{};if((!k._default||k._default.call(d,a)===false)&&!o&&!(f&&f.nodeName&&c.noData[f.nodeName.toLowerCase()])){try{if(f[e]){if(i=f["on"+e])f["on"+e]=null;c.event.triggered=true;f[e]()}}catch(n){}if(i)f["on"+e]=i;c.event.triggered=false}}},handle:function(a){var b,d,f,e;a=arguments[0]=c.event.fix(a||A.event);a.currentTarget=this;b=a.type.indexOf(".")<0&&!a.exclusive;
if(!b){d=a.type.split(".");a.type=d.shift();f=new RegExp("(^|\\.)"+d.slice(0).sort().join("\\.(?:.*\\.)?")+"(\\.|$)")}e=c.data(this,"events");d=e[a.type];if(e&&d){d=d.slice(0);e=0;for(var j=d.length;e<j;e++){var i=d[e];if(b||f.test(i.namespace)){a.handler=i.handler;a.data=i.data;a.handleObj=i;i=i.handler.apply(this,arguments);if(i!==w){a.result=i;if(i===false){a.preventDefault();a.stopPropagation()}}if(a.isImmediatePropagationStopped())break}}}return a.result},props:"altKey attrChange attrName bubbles button cancelable charCode clientX clientY ctrlKey currentTarget data detail eventPhase fromElement handler keyCode layerX layerY metaKey newValue offsetX offsetY originalTarget pageX pageY prevValue relatedNode relatedTarget screenX screenY shiftKey srcElement target toElement view wheelDelta which".split(" "),
fix:function(a){if(a[G])return a;var b=a;a=c.Event(b);for(var d=this.props.length,f;d;){f=this.props[--d];a[f]=b[f]}if(!a.target)a.target=a.srcElement||s;if(a.target.nodeType===3)a.target=a.target.parentNode;if(!a.relatedTarget&&a.fromElement)a.relatedTarget=a.fromElement===a.target?a.toElement:a.fromElement;if(a.pageX==null&&a.clientX!=null){b=s.documentElement;d=s.body;a.pageX=a.clientX+(b&&b.scrollLeft||d&&d.scrollLeft||0)-(b&&b.clientLeft||d&&d.clientLeft||0);a.pageY=a.clientY+(b&&b.scrollTop||
d&&d.scrollTop||0)-(b&&b.clientTop||d&&d.clientTop||0)}if(!a.which&&(a.charCode||a.charCode===0?a.charCode:a.keyCode))a.which=a.charCode||a.keyCode;if(!a.metaKey&&a.ctrlKey)a.metaKey=a.ctrlKey;if(!a.which&&a.button!==w)a.which=a.button&1?1:a.button&2?3:a.button&4?2:0;return a},guid:1E8,proxy:c.proxy,special:{ready:{setup:c.bindReady,teardown:c.noop},live:{add:function(a){c.event.add(this,a.origType,c.extend({},a,{handler:oa}))},remove:function(a){var b=true,d=a.origType.replace(O,"");c.each(c.data(this,
"events").live||[],function(){if(d===this.origType.replace(O,""))return b=false});b&&c.event.remove(this,a.origType,oa)}},beforeunload:{setup:function(a,b,d){if(this.setInterval)this.onbeforeunload=d;return false},teardown:function(a,b){if(this.onbeforeunload===b)this.onbeforeunload=null}}}};var Ca=s.removeEventListener?function(a,b,d){a.removeEventListener(b,d,false)}:function(a,b,d){a.detachEvent("on"+b,d)};c.Event=function(a){if(!this.preventDefault)return new c.Event(a);if(a&&a.type){this.originalEvent=
a;this.type=a.type}else this.type=a;this.timeStamp=J();this[G]=true};c.Event.prototype={preventDefault:function(){this.isDefaultPrevented=Z;var a=this.originalEvent;if(a){a.preventDefault&&a.preventDefault();a.returnValue=false}},stopPropagation:function(){this.isPropagationStopped=Z;var a=this.originalEvent;if(a){a.stopPropagation&&a.stopPropagation();a.cancelBubble=true}},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=Z;this.stopPropagation()},isDefaultPrevented:Y,isPropagationStopped:Y,
isImmediatePropagationStopped:Y};var Da=function(a){var b=a.relatedTarget;try{for(;b&&b!==this;)b=b.parentNode;if(b!==this){a.type=a.data;c.event.handle.apply(this,arguments)}}catch(d){}},Ea=function(a){a.type=a.data;c.event.handle.apply(this,arguments)};c.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(a,b){c.event.special[a]={setup:function(d){c.event.add(this,b,d&&d.selector?Ea:Da,a)},teardown:function(d){c.event.remove(this,b,d&&d.selector?Ea:Da)}}});if(!c.support.submitBubbles)c.event.special.submit=
{setup:function(){if(this.nodeName.toLowerCase()!=="form"){c.event.add(this,"click.specialSubmit",function(a){var b=a.target,d=b.type;if((d==="submit"||d==="image")&&c(b).closest("form").length)return na("submit",this,arguments)});c.event.add(this,"keypress.specialSubmit",function(a){var b=a.target,d=b.type;if((d==="text"||d==="password")&&c(b).closest("form").length&&a.keyCode===13)return na("submit",this,arguments)})}else return false},teardown:function(){c.event.remove(this,".specialSubmit")}};
if(!c.support.changeBubbles){var da=/textarea|input|select/i,ea,Fa=function(a){var b=a.type,d=a.value;if(b==="radio"||b==="checkbox")d=a.checked;else if(b==="select-multiple")d=a.selectedIndex>-1?c.map(a.options,function(f){return f.selected}).join("-"):"";else if(a.nodeName.toLowerCase()==="select")d=a.selectedIndex;return d},fa=function(a,b){var d=a.target,f,e;if(!(!da.test(d.nodeName)||d.readOnly)){f=c.data(d,"_change_data");e=Fa(d);if(a.type!=="focusout"||d.type!=="radio")c.data(d,"_change_data",
e);if(!(f===w||e===f))if(f!=null||e){a.type="change";return c.event.trigger(a,b,d)}}};c.event.special.change={filters:{focusout:fa,click:function(a){var b=a.target,d=b.type;if(d==="radio"||d==="checkbox"||b.nodeName.toLowerCase()==="select")return fa.call(this,a)},keydown:function(a){var b=a.target,d=b.type;if(a.keyCode===13&&b.nodeName.toLowerCase()!=="textarea"||a.keyCode===32&&(d==="checkbox"||d==="radio")||d==="select-multiple")return fa.call(this,a)},beforeactivate:function(a){a=a.target;c.data(a,
"_change_data",Fa(a))}},setup:function(){if(this.type==="file")return false;for(var a in ea)c.event.add(this,a+".specialChange",ea[a]);return da.test(this.nodeName)},teardown:function(){c.event.remove(this,".specialChange");return da.test(this.nodeName)}};ea=c.event.special.change.filters}s.addEventListener&&c.each({focus:"focusin",blur:"focusout"},function(a,b){function d(f){f=c.event.fix(f);f.type=b;return c.event.handle.call(this,f)}c.event.special[b]={setup:function(){this.addEventListener(a,
d,true)},teardown:function(){this.removeEventListener(a,d,true)}}});c.each(["bind","one"],function(a,b){c.fn[b]=function(d,f,e){if(typeof d==="object"){for(var j in d)this[b](j,f,d[j],e);return this}if(c.isFunction(f)){e=f;f=w}var i=b==="one"?c.proxy(e,function(k){c(this).unbind(k,i);return e.apply(this,arguments)}):e;if(d==="unload"&&b!=="one")this.one(d,f,e);else{j=0;for(var o=this.length;j<o;j++)c.event.add(this[j],d,i,f)}return this}});c.fn.extend({unbind:function(a,b){if(typeof a==="object"&&
!a.preventDefault)for(var d in a)this.unbind(d,a[d]);else{d=0;for(var f=this.length;d<f;d++)c.event.remove(this[d],a,b)}return this},delegate:function(a,b,d,f){return this.live(b,d,f,a)},undelegate:function(a,b,d){return arguments.length===0?this.unbind("live"):this.die(b,null,d,a)},trigger:function(a,b){return this.each(function(){c.event.trigger(a,b,this)})},triggerHandler:function(a,b){if(this[0]){a=c.Event(a);a.preventDefault();a.stopPropagation();c.event.trigger(a,b,this[0]);return a.result}},
toggle:function(a){for(var b=arguments,d=1;d<b.length;)c.proxy(a,b[d++]);return this.click(c.proxy(a,function(f){var e=(c.data(this,"lastToggle"+a.guid)||0)%d;c.data(this,"lastToggle"+a.guid,e+1);f.preventDefault();return b[e].apply(this,arguments)||false}))},hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}});var Ga={focus:"focusin",blur:"focusout",mouseenter:"mouseover",mouseleave:"mouseout"};c.each(["live","die"],function(a,b){c.fn[b]=function(d,f,e,j){var i,o=0,k,n,r=j||this.selector,
u=j?this:c(this.context);if(c.isFunction(f)){e=f;f=w}for(d=(d||"").split(" ");(i=d[o++])!=null;){j=O.exec(i);k="";if(j){k=j[0];i=i.replace(O,"")}if(i==="hover")d.push("mouseenter"+k,"mouseleave"+k);else{n=i;if(i==="focus"||i==="blur"){d.push(Ga[i]+k);i+=k}else i=(Ga[i]||i)+k;b==="live"?u.each(function(){c.event.add(this,pa(i,r),{data:f,selector:r,handler:e,origType:i,origHandler:e,preType:n})}):u.unbind(pa(i,r),e)}}return this}});c.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error".split(" "),
function(a,b){c.fn[b]=function(d){return d?this.bind(b,d):this.trigger(b)};if(c.attrFn)c.attrFn[b]=true});A.attachEvent&&!A.addEventListener&&A.attachEvent("onunload",function(){for(var a in c.cache)if(c.cache[a].handle)try{c.event.remove(c.cache[a].handle.elem)}catch(b){}});(function(){function a(g){for(var h="",l,m=0;g[m];m++){l=g[m];if(l.nodeType===3||l.nodeType===4)h+=l.nodeValue;else if(l.nodeType!==8)h+=a(l.childNodes)}return h}function b(g,h,l,m,q,p){q=0;for(var v=m.length;q<v;q++){var t=m[q];
if(t){t=t[g];for(var y=false;t;){if(t.sizcache===l){y=m[t.sizset];break}if(t.nodeType===1&&!p){t.sizcache=l;t.sizset=q}if(t.nodeName.toLowerCase()===h){y=t;break}t=t[g]}m[q]=y}}}function d(g,h,l,m,q,p){q=0;for(var v=m.length;q<v;q++){var t=m[q];if(t){t=t[g];for(var y=false;t;){if(t.sizcache===l){y=m[t.sizset];break}if(t.nodeType===1){if(!p){t.sizcache=l;t.sizset=q}if(typeof h!=="string"){if(t===h){y=true;break}}else if(k.filter(h,[t]).length>0){y=t;break}}t=t[g]}m[q]=y}}}var f=/((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|['"][^'"]*['"]|[^[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
e=0,j=Object.prototype.toString,i=false,o=true;[0,0].sort(function(){o=false;return 0});var k=function(g,h,l,m){l=l||[];var q=h=h||s;if(h.nodeType!==1&&h.nodeType!==9)return[];if(!g||typeof g!=="string")return l;for(var p=[],v,t,y,S,H=true,M=x(h),I=g;(f.exec(""),v=f.exec(I))!==null;){I=v[3];p.push(v[1]);if(v[2]){S=v[3];break}}if(p.length>1&&r.exec(g))if(p.length===2&&n.relative[p[0]])t=ga(p[0]+p[1],h);else for(t=n.relative[p[0]]?[h]:k(p.shift(),h);p.length;){g=p.shift();if(n.relative[g])g+=p.shift();
t=ga(g,t)}else{if(!m&&p.length>1&&h.nodeType===9&&!M&&n.match.ID.test(p[0])&&!n.match.ID.test(p[p.length-1])){v=k.find(p.shift(),h,M);h=v.expr?k.filter(v.expr,v.set)[0]:v.set[0]}if(h){v=m?{expr:p.pop(),set:z(m)}:k.find(p.pop(),p.length===1&&(p[0]==="~"||p[0]==="+")&&h.parentNode?h.parentNode:h,M);t=v.expr?k.filter(v.expr,v.set):v.set;if(p.length>0)y=z(t);else H=false;for(;p.length;){var D=p.pop();v=D;if(n.relative[D])v=p.pop();else D="";if(v==null)v=h;n.relative[D](y,v,M)}}else y=[]}y||(y=t);y||k.error(D||
g);if(j.call(y)==="[object Array]")if(H)if(h&&h.nodeType===1)for(g=0;y[g]!=null;g++){if(y[g]&&(y[g]===true||y[g].nodeType===1&&E(h,y[g])))l.push(t[g])}else for(g=0;y[g]!=null;g++)y[g]&&y[g].nodeType===1&&l.push(t[g]);else l.push.apply(l,y);else z(y,l);if(S){k(S,q,l,m);k.uniqueSort(l)}return l};k.uniqueSort=function(g){if(B){i=o;g.sort(B);if(i)for(var h=1;h<g.length;h++)g[h]===g[h-1]&&g.splice(h--,1)}return g};k.matches=function(g,h){return k(g,null,null,h)};k.find=function(g,h,l){var m,q;if(!g)return[];
for(var p=0,v=n.order.length;p<v;p++){var t=n.order[p];if(q=n.leftMatch[t].exec(g)){var y=q[1];q.splice(1,1);if(y.substr(y.length-1)!=="\\"){q[1]=(q[1]||"").replace(/\\/g,"");m=n.find[t](q,h,l);if(m!=null){g=g.replace(n.match[t],"");break}}}}m||(m=h.getElementsByTagName("*"));return{set:m,expr:g}};k.filter=function(g,h,l,m){for(var q=g,p=[],v=h,t,y,S=h&&h[0]&&x(h[0]);g&&h.length;){for(var H in n.filter)if((t=n.leftMatch[H].exec(g))!=null&&t[2]){var M=n.filter[H],I,D;D=t[1];y=false;t.splice(1,1);if(D.substr(D.length-
1)!=="\\"){if(v===p)p=[];if(n.preFilter[H])if(t=n.preFilter[H](t,v,l,p,m,S)){if(t===true)continue}else y=I=true;if(t)for(var U=0;(D=v[U])!=null;U++)if(D){I=M(D,t,U,v);var Ha=m^!!I;if(l&&I!=null)if(Ha)y=true;else v[U]=false;else if(Ha){p.push(D);y=true}}if(I!==w){l||(v=p);g=g.replace(n.match[H],"");if(!y)return[];break}}}if(g===q)if(y==null)k.error(g);else break;q=g}return v};k.error=function(g){throw"Syntax error, unrecognized expression: "+g;};var n=k.selectors={order:["ID","NAME","TAG"],match:{ID:/#((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
CLASS:/\.((?:[\w\u00c0-\uFFFF-]|\\.)+)/,NAME:/\[name=['"]*((?:[\w\u00c0-\uFFFF-]|\\.)+)['"]*\]/,ATTR:/\[\s*((?:[\w\u00c0-\uFFFF-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\s*\]/,TAG:/^((?:[\w\u00c0-\uFFFF\*-]|\\.)+)/,CHILD:/:(only|nth|last|first)-child(?:\((even|odd|[\dn+-]*)\))?/,POS:/:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^-]|$)/,PSEUDO:/:((?:[\w\u00c0-\uFFFF-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/},leftMatch:{},attrMap:{"class":"className","for":"htmlFor"},attrHandle:{href:function(g){return g.getAttribute("href")}},
relative:{"+":function(g,h){var l=typeof h==="string",m=l&&!/\W/.test(h);l=l&&!m;if(m)h=h.toLowerCase();m=0;for(var q=g.length,p;m<q;m++)if(p=g[m]){for(;(p=p.previousSibling)&&p.nodeType!==1;);g[m]=l||p&&p.nodeName.toLowerCase()===h?p||false:p===h}l&&k.filter(h,g,true)},">":function(g,h){var l=typeof h==="string";if(l&&!/\W/.test(h)){h=h.toLowerCase();for(var m=0,q=g.length;m<q;m++){var p=g[m];if(p){l=p.parentNode;g[m]=l.nodeName.toLowerCase()===h?l:false}}}else{m=0;for(q=g.length;m<q;m++)if(p=g[m])g[m]=
l?p.parentNode:p.parentNode===h;l&&k.filter(h,g,true)}},"":function(g,h,l){var m=e++,q=d;if(typeof h==="string"&&!/\W/.test(h)){var p=h=h.toLowerCase();q=b}q("parentNode",h,m,g,p,l)},"~":function(g,h,l){var m=e++,q=d;if(typeof h==="string"&&!/\W/.test(h)){var p=h=h.toLowerCase();q=b}q("previousSibling",h,m,g,p,l)}},find:{ID:function(g,h,l){if(typeof h.getElementById!=="undefined"&&!l)return(g=h.getElementById(g[1]))?[g]:[]},NAME:function(g,h){if(typeof h.getElementsByName!=="undefined"){var l=[];
h=h.getElementsByName(g[1]);for(var m=0,q=h.length;m<q;m++)h[m].getAttribute("name")===g[1]&&l.push(h[m]);return l.length===0?null:l}},TAG:function(g,h){return h.getElementsByTagName(g[1])}},preFilter:{CLASS:function(g,h,l,m,q,p){g=" "+g[1].replace(/\\/g,"")+" ";if(p)return g;p=0;for(var v;(v=h[p])!=null;p++)if(v)if(q^(v.className&&(" "+v.className+" ").replace(/[\t\n]/g," ").indexOf(g)>=0))l||m.push(v);else if(l)h[p]=false;return false},ID:function(g){return g[1].replace(/\\/g,"")},TAG:function(g){return g[1].toLowerCase()},
CHILD:function(g){if(g[1]==="nth"){var h=/(-?)(\d*)n((?:\+|-)?\d*)/.exec(g[2]==="even"&&"2n"||g[2]==="odd"&&"2n+1"||!/\D/.test(g[2])&&"0n+"+g[2]||g[2]);g[2]=h[1]+(h[2]||1)-0;g[3]=h[3]-0}g[0]=e++;return g},ATTR:function(g,h,l,m,q,p){h=g[1].replace(/\\/g,"");if(!p&&n.attrMap[h])g[1]=n.attrMap[h];if(g[2]==="~=")g[4]=" "+g[4]+" ";return g},PSEUDO:function(g,h,l,m,q){if(g[1]==="not")if((f.exec(g[3])||"").length>1||/^\w/.test(g[3]))g[3]=k(g[3],null,null,h);else{g=k.filter(g[3],h,l,true^q);l||m.push.apply(m,
g);return false}else if(n.match.POS.test(g[0])||n.match.CHILD.test(g[0]))return true;return g},POS:function(g){g.unshift(true);return g}},filters:{enabled:function(g){return g.disabled===false&&g.type!=="hidden"},disabled:function(g){return g.disabled===true},checked:function(g){return g.checked===true},selected:function(g){return g.selected===true},parent:function(g){return!!g.firstChild},empty:function(g){return!g.firstChild},has:function(g,h,l){return!!k(l[3],g).length},header:function(g){return/h\d/i.test(g.nodeName)},
text:function(g){return"text"===g.type},radio:function(g){return"radio"===g.type},checkbox:function(g){return"checkbox"===g.type},file:function(g){return"file"===g.type},password:function(g){return"password"===g.type},submit:function(g){return"submit"===g.type},image:function(g){return"image"===g.type},reset:function(g){return"reset"===g.type},button:function(g){return"button"===g.type||g.nodeName.toLowerCase()==="button"},input:function(g){return/input|select|textarea|button/i.test(g.nodeName)}},
setFilters:{first:function(g,h){return h===0},last:function(g,h,l,m){return h===m.length-1},even:function(g,h){return h%2===0},odd:function(g,h){return h%2===1},lt:function(g,h,l){return h<l[3]-0},gt:function(g,h,l){return h>l[3]-0},nth:function(g,h,l){return l[3]-0===h},eq:function(g,h,l){return l[3]-0===h}},filter:{PSEUDO:function(g,h,l,m){var q=h[1],p=n.filters[q];if(p)return p(g,l,h,m);else if(q==="contains")return(g.textContent||g.innerText||a([g])||"").indexOf(h[3])>=0;else if(q==="not"){h=
h[3];l=0;for(m=h.length;l<m;l++)if(h[l]===g)return false;return true}else k.error("Syntax error, unrecognized expression: "+q)},CHILD:function(g,h){var l=h[1],m=g;switch(l){case "only":case "first":for(;m=m.previousSibling;)if(m.nodeType===1)return false;if(l==="first")return true;m=g;case "last":for(;m=m.nextSibling;)if(m.nodeType===1)return false;return true;case "nth":l=h[2];var q=h[3];if(l===1&&q===0)return true;h=h[0];var p=g.parentNode;if(p&&(p.sizcache!==h||!g.nodeIndex)){var v=0;for(m=p.firstChild;m;m=
m.nextSibling)if(m.nodeType===1)m.nodeIndex=++v;p.sizcache=h}g=g.nodeIndex-q;return l===0?g===0:g%l===0&&g/l>=0}},ID:function(g,h){return g.nodeType===1&&g.getAttribute("id")===h},TAG:function(g,h){return h==="*"&&g.nodeType===1||g.nodeName.toLowerCase()===h},CLASS:function(g,h){return(" "+(g.className||g.getAttribute("class"))+" ").indexOf(h)>-1},ATTR:function(g,h){var l=h[1];g=n.attrHandle[l]?n.attrHandle[l](g):g[l]!=null?g[l]:g.getAttribute(l);l=g+"";var m=h[2];h=h[4];return g==null?m==="!=":m===
"="?l===h:m==="*="?l.indexOf(h)>=0:m==="~="?(" "+l+" ").indexOf(h)>=0:!h?l&&g!==false:m==="!="?l!==h:m==="^="?l.indexOf(h)===0:m==="$="?l.substr(l.length-h.length)===h:m==="|="?l===h||l.substr(0,h.length+1)===h+"-":false},POS:function(g,h,l,m){var q=n.setFilters[h[2]];if(q)return q(g,l,h,m)}}},r=n.match.POS;for(var u in n.match){n.match[u]=new RegExp(n.match[u].source+/(?![^\[]*\])(?![^\(]*\))/.source);n.leftMatch[u]=new RegExp(/(^(?:.|\r|\n)*?)/.source+n.match[u].source.replace(/\\(\d+)/g,function(g,
h){return"\\"+(h-0+1)}))}var z=function(g,h){g=Array.prototype.slice.call(g,0);if(h){h.push.apply(h,g);return h}return g};try{Array.prototype.slice.call(s.documentElement.childNodes,0)}catch(C){z=function(g,h){h=h||[];if(j.call(g)==="[object Array]")Array.prototype.push.apply(h,g);else if(typeof g.length==="number")for(var l=0,m=g.length;l<m;l++)h.push(g[l]);else for(l=0;g[l];l++)h.push(g[l]);return h}}var B;if(s.documentElement.compareDocumentPosition)B=function(g,h){if(!g.compareDocumentPosition||
!h.compareDocumentPosition){if(g==h)i=true;return g.compareDocumentPosition?-1:1}g=g.compareDocumentPosition(h)&4?-1:g===h?0:1;if(g===0)i=true;return g};else if("sourceIndex"in s.documentElement)B=function(g,h){if(!g.sourceIndex||!h.sourceIndex){if(g==h)i=true;return g.sourceIndex?-1:1}g=g.sourceIndex-h.sourceIndex;if(g===0)i=true;return g};else if(s.createRange)B=function(g,h){if(!g.ownerDocument||!h.ownerDocument){if(g==h)i=true;return g.ownerDocument?-1:1}var l=g.ownerDocument.createRange(),m=
h.ownerDocument.createRange();l.setStart(g,0);l.setEnd(g,0);m.setStart(h,0);m.setEnd(h,0);g=l.compareBoundaryPoints(Range.START_TO_END,m);if(g===0)i=true;return g};(function(){var g=s.createElement("div"),h="script"+(new Date).getTime();g.innerHTML="<a name='"+h+"'/>";var l=s.documentElement;l.insertBefore(g,l.firstChild);if(s.getElementById(h)){n.find.ID=function(m,q,p){if(typeof q.getElementById!=="undefined"&&!p)return(q=q.getElementById(m[1]))?q.id===m[1]||typeof q.getAttributeNode!=="undefined"&&
q.getAttributeNode("id").nodeValue===m[1]?[q]:w:[]};n.filter.ID=function(m,q){var p=typeof m.getAttributeNode!=="undefined"&&m.getAttributeNode("id");return m.nodeType===1&&p&&p.nodeValue===q}}l.removeChild(g);l=g=null})();(function(){var g=s.createElement("div");g.appendChild(s.createComment(""));if(g.getElementsByTagName("*").length>0)n.find.TAG=function(h,l){l=l.getElementsByTagName(h[1]);if(h[1]==="*"){h=[];for(var m=0;l[m];m++)l[m].nodeType===1&&h.push(l[m]);l=h}return l};g.innerHTML="<a href='#'></a>";
if(g.firstChild&&typeof g.firstChild.getAttribute!=="undefined"&&g.firstChild.getAttribute("href")!=="#")n.attrHandle.href=function(h){return h.getAttribute("href",2)};g=null})();s.querySelectorAll&&function(){var g=k,h=s.createElement("div");h.innerHTML="<p class='TEST'></p>";if(!(h.querySelectorAll&&h.querySelectorAll(".TEST").length===0)){k=function(m,q,p,v){q=q||s;if(!v&&q.nodeType===9&&!x(q))try{return z(q.querySelectorAll(m),p)}catch(t){}return g(m,q,p,v)};for(var l in g)k[l]=g[l];h=null}}();
(function(){var g=s.createElement("div");g.innerHTML="<div class='test e'></div><div class='test'></div>";if(!(!g.getElementsByClassName||g.getElementsByClassName("e").length===0)){g.lastChild.className="e";if(g.getElementsByClassName("e").length!==1){n.order.splice(1,0,"CLASS");n.find.CLASS=function(h,l,m){if(typeof l.getElementsByClassName!=="undefined"&&!m)return l.getElementsByClassName(h[1])};g=null}}})();var E=s.compareDocumentPosition?function(g,h){return!!(g.compareDocumentPosition(h)&16)}:
function(g,h){return g!==h&&(g.contains?g.contains(h):true)},x=function(g){return(g=(g?g.ownerDocument||g:0).documentElement)?g.nodeName!=="HTML":false},ga=function(g,h){var l=[],m="",q;for(h=h.nodeType?[h]:h;q=n.match.PSEUDO.exec(g);){m+=q[0];g=g.replace(n.match.PSEUDO,"")}g=n.relative[g]?g+"*":g;q=0;for(var p=h.length;q<p;q++)k(g,h[q],l);return k.filter(m,l)};c.find=k;c.expr=k.selectors;c.expr[":"]=c.expr.filters;c.unique=k.uniqueSort;c.text=a;c.isXMLDoc=x;c.contains=E})();var eb=/Until$/,fb=/^(?:parents|prevUntil|prevAll)/,
gb=/,/;R=Array.prototype.slice;var Ia=function(a,b,d){if(c.isFunction(b))return c.grep(a,function(e,j){return!!b.call(e,j,e)===d});else if(b.nodeType)return c.grep(a,function(e){return e===b===d});else if(typeof b==="string"){var f=c.grep(a,function(e){return e.nodeType===1});if(Ua.test(b))return c.filter(b,f,!d);else b=c.filter(b,f)}return c.grep(a,function(e){return c.inArray(e,b)>=0===d})};c.fn.extend({find:function(a){for(var b=this.pushStack("","find",a),d=0,f=0,e=this.length;f<e;f++){d=b.length;
c.find(a,this[f],b);if(f>0)for(var j=d;j<b.length;j++)for(var i=0;i<d;i++)if(b[i]===b[j]){b.splice(j--,1);break}}return b},has:function(a){var b=c(a);return this.filter(function(){for(var d=0,f=b.length;d<f;d++)if(c.contains(this,b[d]))return true})},not:function(a){return this.pushStack(Ia(this,a,false),"not",a)},filter:function(a){return this.pushStack(Ia(this,a,true),"filter",a)},is:function(a){return!!a&&c.filter(a,this).length>0},closest:function(a,b){if(c.isArray(a)){var d=[],f=this[0],e,j=
{},i;if(f&&a.length){e=0;for(var o=a.length;e<o;e++){i=a[e];j[i]||(j[i]=c.expr.match.POS.test(i)?c(i,b||this.context):i)}for(;f&&f.ownerDocument&&f!==b;){for(i in j){e=j[i];if(e.jquery?e.index(f)>-1:c(f).is(e)){d.push({selector:i,elem:f});delete j[i]}}f=f.parentNode}}return d}var k=c.expr.match.POS.test(a)?c(a,b||this.context):null;return this.map(function(n,r){for(;r&&r.ownerDocument&&r!==b;){if(k?k.index(r)>-1:c(r).is(a))return r;r=r.parentNode}return null})},index:function(a){if(!a||typeof a===
"string")return c.inArray(this[0],a?c(a):this.parent().children());return c.inArray(a.jquery?a[0]:a,this)},add:function(a,b){a=typeof a==="string"?c(a,b||this.context):c.makeArray(a);b=c.merge(this.get(),a);return this.pushStack(qa(a[0])||qa(b[0])?b:c.unique(b))},andSelf:function(){return this.add(this.prevObject)}});c.each({parent:function(a){return(a=a.parentNode)&&a.nodeType!==11?a:null},parents:function(a){return c.dir(a,"parentNode")},parentsUntil:function(a,b,d){return c.dir(a,"parentNode",
d)},next:function(a){return c.nth(a,2,"nextSibling")},prev:function(a){return c.nth(a,2,"previousSibling")},nextAll:function(a){return c.dir(a,"nextSibling")},prevAll:function(a){return c.dir(a,"previousSibling")},nextUntil:function(a,b,d){return c.dir(a,"nextSibling",d)},prevUntil:function(a,b,d){return c.dir(a,"previousSibling",d)},siblings:function(a){return c.sibling(a.parentNode.firstChild,a)},children:function(a){return c.sibling(a.firstChild)},contents:function(a){return c.nodeName(a,"iframe")?
a.contentDocument||a.contentWindow.document:c.makeArray(a.childNodes)}},function(a,b){c.fn[a]=function(d,f){var e=c.map(this,b,d);eb.test(a)||(f=d);if(f&&typeof f==="string")e=c.filter(f,e);e=this.length>1?c.unique(e):e;if((this.length>1||gb.test(f))&&fb.test(a))e=e.reverse();return this.pushStack(e,a,R.call(arguments).join(","))}});c.extend({filter:function(a,b,d){if(d)a=":not("+a+")";return c.find.matches(a,b)},dir:function(a,b,d){var f=[];for(a=a[b];a&&a.nodeType!==9&&(d===w||a.nodeType!==1||!c(a).is(d));){a.nodeType===
1&&f.push(a);a=a[b]}return f},nth:function(a,b,d){b=b||1;for(var f=0;a;a=a[d])if(a.nodeType===1&&++f===b)break;return a},sibling:function(a,b){for(var d=[];a;a=a.nextSibling)a.nodeType===1&&a!==b&&d.push(a);return d}});var Ja=/ jQuery\d+="(?:\d+|null)"/g,V=/^\s+/,Ka=/(<([\w:]+)[^>]*?)\/>/g,hb=/^(?:area|br|col|embed|hr|img|input|link|meta|param)$/i,La=/<([\w:]+)/,ib=/<tbody/i,jb=/<|&#?\w+;/,ta=/<script|<object|<embed|<option|<style/i,ua=/checked\s*(?:[^=]|=\s*.checked.)/i,Ma=function(a,b,d){return hb.test(d)?
a:b+"></"+d+">"},F={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],area:[1,"<map>","</map>"],_default:[0,"",""]};F.optgroup=F.option;F.tbody=F.tfoot=F.colgroup=F.caption=F.thead;F.th=F.td;if(!c.support.htmlSerialize)F._default=[1,"div<div>","</div>"];c.fn.extend({text:function(a){if(c.isFunction(a))return this.each(function(b){var d=
c(this);d.text(a.call(this,b,d.text()))});if(typeof a!=="object"&&a!==w)return this.empty().append((this[0]&&this[0].ownerDocument||s).createTextNode(a));return c.text(this)},wrapAll:function(a){if(c.isFunction(a))return this.each(function(d){c(this).wrapAll(a.call(this,d))});if(this[0]){var b=c(a,this[0].ownerDocument).eq(0).clone(true);this[0].parentNode&&b.insertBefore(this[0]);b.map(function(){for(var d=this;d.firstChild&&d.firstChild.nodeType===1;)d=d.firstChild;return d}).append(this)}return this},
wrapInner:function(a){if(c.isFunction(a))return this.each(function(b){c(this).wrapInner(a.call(this,b))});return this.each(function(){var b=c(this),d=b.contents();d.length?d.wrapAll(a):b.append(a)})},wrap:function(a){return this.each(function(){c(this).wrapAll(a)})},unwrap:function(){return this.parent().each(function(){c.nodeName(this,"body")||c(this).replaceWith(this.childNodes)}).end()},append:function(){return this.domManip(arguments,true,function(a){this.nodeType===1&&this.appendChild(a)})},
prepend:function(){return this.domManip(arguments,true,function(a){this.nodeType===1&&this.insertBefore(a,this.firstChild)})},before:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,false,function(b){this.parentNode.insertBefore(b,this)});else if(arguments.length){var a=c(arguments[0]);a.push.apply(a,this.toArray());return this.pushStack(a,"before",arguments)}},after:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,false,function(b){this.parentNode.insertBefore(b,
this.nextSibling)});else if(arguments.length){var a=this.pushStack(this,"after",arguments);a.push.apply(a,c(arguments[0]).toArray());return a}},remove:function(a,b){for(var d=0,f;(f=this[d])!=null;d++)if(!a||c.filter(a,[f]).length){if(!b&&f.nodeType===1){c.cleanData(f.getElementsByTagName("*"));c.cleanData([f])}f.parentNode&&f.parentNode.removeChild(f)}return this},empty:function(){for(var a=0,b;(b=this[a])!=null;a++)for(b.nodeType===1&&c.cleanData(b.getElementsByTagName("*"));b.firstChild;)b.removeChild(b.firstChild);
return this},clone:function(a){var b=this.map(function(){if(!c.support.noCloneEvent&&!c.isXMLDoc(this)){var d=this.outerHTML,f=this.ownerDocument;if(!d){d=f.createElement("div");d.appendChild(this.cloneNode(true));d=d.innerHTML}return c.clean([d.replace(Ja,"").replace(/=([^="'>\s]+\/)>/g,'="$1">').replace(V,"")],f)[0]}else return this.cloneNode(true)});if(a===true){ra(this,b);ra(this.find("*"),b.find("*"))}return b},html:function(a){if(a===w)return this[0]&&this[0].nodeType===1?this[0].innerHTML.replace(Ja,
""):null;else if(typeof a==="string"&&!ta.test(a)&&(c.support.leadingWhitespace||!V.test(a))&&!F[(La.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(Ka,Ma);try{for(var b=0,d=this.length;b<d;b++)if(this[b].nodeType===1){c.cleanData(this[b].getElementsByTagName("*"));this[b].innerHTML=a}}catch(f){this.empty().append(a)}}else c.isFunction(a)?this.each(function(e){var j=c(this),i=j.html();j.empty().append(function(){return a.call(this,e,i)})}):this.empty().append(a);return this},replaceWith:function(a){if(this[0]&&
this[0].parentNode){if(c.isFunction(a))return this.each(function(b){var d=c(this),f=d.html();d.replaceWith(a.call(this,b,f))});if(typeof a!=="string")a=c(a).detach();return this.each(function(){var b=this.nextSibling,d=this.parentNode;c(this).remove();b?c(b).before(a):c(d).append(a)})}else return this.pushStack(c(c.isFunction(a)?a():a),"replaceWith",a)},detach:function(a){return this.remove(a,true)},domManip:function(a,b,d){function f(u){return c.nodeName(u,"table")?u.getElementsByTagName("tbody")[0]||
u.appendChild(u.ownerDocument.createElement("tbody")):u}var e,j,i=a[0],o=[],k;if(!c.support.checkClone&&arguments.length===3&&typeof i==="string"&&ua.test(i))return this.each(function(){c(this).domManip(a,b,d,true)});if(c.isFunction(i))return this.each(function(u){var z=c(this);a[0]=i.call(this,u,b?z.html():w);z.domManip(a,b,d)});if(this[0]){e=i&&i.parentNode;e=c.support.parentNode&&e&&e.nodeType===11&&e.childNodes.length===this.length?{fragment:e}:sa(a,this,o);k=e.fragment;if(j=k.childNodes.length===
1?(k=k.firstChild):k.firstChild){b=b&&c.nodeName(j,"tr");for(var n=0,r=this.length;n<r;n++)d.call(b?f(this[n],j):this[n],n>0||e.cacheable||this.length>1?k.cloneNode(true):k)}o.length&&c.each(o,Qa)}return this}});c.fragments={};c.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){c.fn[a]=function(d){var f=[];d=c(d);var e=this.length===1&&this[0].parentNode;if(e&&e.nodeType===11&&e.childNodes.length===1&&d.length===1){d[b](this[0]);
return this}else{e=0;for(var j=d.length;e<j;e++){var i=(e>0?this.clone(true):this).get();c.fn[b].apply(c(d[e]),i);f=f.concat(i)}return this.pushStack(f,a,d.selector)}}});c.extend({clean:function(a,b,d,f){b=b||s;if(typeof b.createElement==="undefined")b=b.ownerDocument||b[0]&&b[0].ownerDocument||s;for(var e=[],j=0,i;(i=a[j])!=null;j++){if(typeof i==="number")i+="";if(i){if(typeof i==="string"&&!jb.test(i))i=b.createTextNode(i);else if(typeof i==="string"){i=i.replace(Ka,Ma);var o=(La.exec(i)||["",
""])[1].toLowerCase(),k=F[o]||F._default,n=k[0],r=b.createElement("div");for(r.innerHTML=k[1]+i+k[2];n--;)r=r.lastChild;if(!c.support.tbody){n=ib.test(i);o=o==="table"&&!n?r.firstChild&&r.firstChild.childNodes:k[1]==="<table>"&&!n?r.childNodes:[];for(k=o.length-1;k>=0;--k)c.nodeName(o[k],"tbody")&&!o[k].childNodes.length&&o[k].parentNode.removeChild(o[k])}!c.support.leadingWhitespace&&V.test(i)&&r.insertBefore(b.createTextNode(V.exec(i)[0]),r.firstChild);i=r.childNodes}if(i.nodeType)e.push(i);else e=
c.merge(e,i)}}if(d)for(j=0;e[j];j++)if(f&&c.nodeName(e[j],"script")&&(!e[j].type||e[j].type.toLowerCase()==="text/javascript"))f.push(e[j].parentNode?e[j].parentNode.removeChild(e[j]):e[j]);else{e[j].nodeType===1&&e.splice.apply(e,[j+1,0].concat(c.makeArray(e[j].getElementsByTagName("script"))));d.appendChild(e[j])}return e},cleanData:function(a){for(var b,d,f=c.cache,e=c.event.special,j=c.support.deleteExpando,i=0,o;(o=a[i])!=null;i++)if(d=o[c.expando]){b=f[d];if(b.events)for(var k in b.events)e[k]?
c.event.remove(o,k):Ca(o,k,b.handle);if(j)delete o[c.expando];else o.removeAttribute&&o.removeAttribute(c.expando);delete f[d]}}});var kb=/z-?index|font-?weight|opacity|zoom|line-?height/i,Na=/alpha\([^)]*\)/,Oa=/opacity=([^)]*)/,ha=/float/i,ia=/-([a-z])/ig,lb=/([A-Z])/g,mb=/^-?\d+(?:px)?$/i,nb=/^-?\d/,ob={position:"absolute",visibility:"hidden",display:"block"},pb=["Left","Right"],qb=["Top","Bottom"],rb=s.defaultView&&s.defaultView.getComputedStyle,Pa=c.support.cssFloat?"cssFloat":"styleFloat",ja=
function(a,b){return b.toUpperCase()};c.fn.css=function(a,b){return X(this,a,b,true,function(d,f,e){if(e===w)return c.curCSS(d,f);if(typeof e==="number"&&!kb.test(f))e+="px";c.style(d,f,e)})};c.extend({style:function(a,b,d){if(!a||a.nodeType===3||a.nodeType===8)return w;if((b==="width"||b==="height")&&parseFloat(d)<0)d=w;var f=a.style||a,e=d!==w;if(!c.support.opacity&&b==="opacity"){if(e){f.zoom=1;b=parseInt(d,10)+""==="NaN"?"":"alpha(opacity="+d*100+")";a=f.filter||c.curCSS(a,"filter")||"";f.filter=
Na.test(a)?a.replace(Na,b):b}return f.filter&&f.filter.indexOf("opacity=")>=0?parseFloat(Oa.exec(f.filter)[1])/100+"":""}if(ha.test(b))b=Pa;b=b.replace(ia,ja);if(e)f[b]=d;return f[b]},css:function(a,b,d,f){if(b==="width"||b==="height"){var e,j=b==="width"?pb:qb;function i(){e=b==="width"?a.offsetWidth:a.offsetHeight;f!=="border"&&c.each(j,function(){f||(e-=parseFloat(c.curCSS(a,"padding"+this,true))||0);if(f==="margin")e+=parseFloat(c.curCSS(a,"margin"+this,true))||0;else e-=parseFloat(c.curCSS(a,
"border"+this+"Width",true))||0})}a.offsetWidth!==0?i():c.swap(a,ob,i);return Math.max(0,Math.round(e))}return c.curCSS(a,b,d)},curCSS:function(a,b,d){var f,e=a.style;if(!c.support.opacity&&b==="opacity"&&a.currentStyle){f=Oa.test(a.currentStyle.filter||"")?parseFloat(RegExp.$1)/100+"":"";return f===""?"1":f}if(ha.test(b))b=Pa;if(!d&&e&&e[b])f=e[b];else if(rb){if(ha.test(b))b="float";b=b.replace(lb,"-$1").toLowerCase();e=a.ownerDocument.defaultView;if(!e)return null;if(a=e.getComputedStyle(a,null))f=
a.getPropertyValue(b);if(b==="opacity"&&f==="")f="1"}else if(a.currentStyle){d=b.replace(ia,ja);f=a.currentStyle[b]||a.currentStyle[d];if(!mb.test(f)&&nb.test(f)){b=e.left;var j=a.runtimeStyle.left;a.runtimeStyle.left=a.currentStyle.left;e.left=d==="fontSize"?"1em":f||0;f=e.pixelLeft+"px";e.left=b;a.runtimeStyle.left=j}}return f},swap:function(a,b,d){var f={};for(var e in b){f[e]=a.style[e];a.style[e]=b[e]}d.call(a);for(e in b)a.style[e]=f[e]}});if(c.expr&&c.expr.filters){c.expr.filters.hidden=function(a){var b=
a.offsetWidth,d=a.offsetHeight,f=a.nodeName.toLowerCase()==="tr";return b===0&&d===0&&!f?true:b>0&&d>0&&!f?false:c.curCSS(a,"display")==="none"};c.expr.filters.visible=function(a){return!c.expr.filters.hidden(a)}}var sb=J(),tb=/<script(.|\s)*?\/script>/gi,ub=/select|textarea/i,vb=/color|date|datetime|email|hidden|month|number|password|range|search|tel|text|time|url|week/i,N=/=\?(&|$)/,ka=/\?/,wb=/(\?|&)_=.*?(&|$)/,xb=/^(\w+:)?\/\/([^\/?#]+)/,yb=/%20/g,zb=c.fn.load;c.fn.extend({load:function(a,b,d){if(typeof a!==
"string")return zb.call(this,a);else if(!this.length)return this;var f=a.indexOf(" ");if(f>=0){var e=a.slice(f,a.length);a=a.slice(0,f)}f="GET";if(b)if(c.isFunction(b)){d=b;b=null}else if(typeof b==="object"){b=c.param(b,c.ajaxSettings.traditional);f="POST"}var j=this;c.ajax({url:a,type:f,dataType:"html",data:b,complete:function(i,o){if(o==="success"||o==="notmodified")j.html(e?c("<div />").append(i.responseText.replace(tb,"")).find(e):i.responseText);d&&j.each(d,[i.responseText,o,i])}});return this},
serialize:function(){return c.param(this.serializeArray())},serializeArray:function(){return this.map(function(){return this.elements?c.makeArray(this.elements):this}).filter(function(){return this.name&&!this.disabled&&(this.checked||ub.test(this.nodeName)||vb.test(this.type))}).map(function(a,b){a=c(this).val();return a==null?null:c.isArray(a)?c.map(a,function(d){return{name:b.name,value:d}}):{name:b.name,value:a}}).get()}});c.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),
function(a,b){c.fn[b]=function(d){return this.bind(b,d)}});c.extend({get:function(a,b,d,f){if(c.isFunction(b)){f=f||d;d=b;b=null}return c.ajax({type:"GET",url:a,data:b,success:d,dataType:f})},getScript:function(a,b){return c.get(a,null,b,"script")},getJSON:function(a,b,d){return c.get(a,b,d,"json")},post:function(a,b,d,f){if(c.isFunction(b)){f=f||d;d=b;b={}}return c.ajax({type:"POST",url:a,data:b,success:d,dataType:f})},ajaxSetup:function(a){c.extend(c.ajaxSettings,a)},ajaxSettings:{url:location.href,
global:true,type:"GET",contentType:"application/x-www-form-urlencoded",processData:true,async:true,xhr:A.XMLHttpRequest&&(A.location.protocol!=="file:"||!A.ActiveXObject)?function(){return new A.XMLHttpRequest}:function(){try{return new A.ActiveXObject("Microsoft.XMLHTTP")}catch(a){}},accepts:{xml:"application/xml, text/xml",html:"text/html",script:"text/javascript, application/javascript",json:"application/json, text/javascript",text:"text/plain",_default:"*/*"}},lastModified:{},etag:{},ajax:function(a){function b(){e.success&&
e.success.call(k,o,i,x);e.global&&f("ajaxSuccess",[x,e])}function d(){e.complete&&e.complete.call(k,x,i);e.global&&f("ajaxComplete",[x,e]);e.global&&!--c.active&&c.event.trigger("ajaxStop")}function f(q,p){(e.context?c(e.context):c.event).trigger(q,p)}var e=c.extend(true,{},c.ajaxSettings,a),j,i,o,k=a&&a.context||e,n=e.type.toUpperCase();if(e.data&&e.processData&&typeof e.data!=="string")e.data=c.param(e.data,e.traditional);if(e.dataType==="jsonp"){if(n==="GET")N.test(e.url)||(e.url+=(ka.test(e.url)?
"&":"?")+(e.jsonp||"callback")+"=?");else if(!e.data||!N.test(e.data))e.data=(e.data?e.data+"&":"")+(e.jsonp||"callback")+"=?";e.dataType="json"}if(e.dataType==="json"&&(e.data&&N.test(e.data)||N.test(e.url))){j=e.jsonpCallback||"jsonp"+sb++;if(e.data)e.data=(e.data+"").replace(N,"="+j+"$1");e.url=e.url.replace(N,"="+j+"$1");e.dataType="script";A[j]=A[j]||function(q){o=q;b();d();A[j]=w;try{delete A[j]}catch(p){}z&&z.removeChild(C)}}if(e.dataType==="script"&&e.cache===null)e.cache=false;if(e.cache===
false&&n==="GET"){var r=J(),u=e.url.replace(wb,"$1_="+r+"$2");e.url=u+(u===e.url?(ka.test(e.url)?"&":"?")+"_="+r:"")}if(e.data&&n==="GET")e.url+=(ka.test(e.url)?"&":"?")+e.data;e.global&&!c.active++&&c.event.trigger("ajaxStart");r=(r=xb.exec(e.url))&&(r[1]&&r[1]!==location.protocol||r[2]!==location.host);if(e.dataType==="script"&&n==="GET"&&r){var z=s.getElementsByTagName("head")[0]||s.documentElement,C=s.createElement("script");C.src=e.url;if(e.scriptCharset)C.charset=e.scriptCharset;if(!j){var B=
false;C.onload=C.onreadystatechange=function(){if(!B&&(!this.readyState||this.readyState==="loaded"||this.readyState==="complete")){B=true;b();d();C.onload=C.onreadystatechange=null;z&&C.parentNode&&z.removeChild(C)}}}z.insertBefore(C,z.firstChild);return w}var E=false,x=e.xhr();if(x){e.username?x.open(n,e.url,e.async,e.username,e.password):x.open(n,e.url,e.async);try{if(e.data||a&&a.contentType)x.setRequestHeader("Content-Type",e.contentType);if(e.ifModified){c.lastModified[e.url]&&x.setRequestHeader("If-Modified-Since",
c.lastModified[e.url]);c.etag[e.url]&&x.setRequestHeader("If-None-Match",c.etag[e.url])}r||x.setRequestHeader("X-Requested-With","XMLHttpRequest");x.setRequestHeader("Accept",e.dataType&&e.accepts[e.dataType]?e.accepts[e.dataType]+", */*":e.accepts._default)}catch(ga){}if(e.beforeSend&&e.beforeSend.call(k,x,e)===false){e.global&&!--c.active&&c.event.trigger("ajaxStop");x.abort();return false}e.global&&f("ajaxSend",[x,e]);var g=x.onreadystatechange=function(q){if(!x||x.readyState===0||q==="abort"){E||
d();E=true;if(x)x.onreadystatechange=c.noop}else if(!E&&x&&(x.readyState===4||q==="timeout")){E=true;x.onreadystatechange=c.noop;i=q==="timeout"?"timeout":!c.httpSuccess(x)?"error":e.ifModified&&c.httpNotModified(x,e.url)?"notmodified":"success";var p;if(i==="success")try{o=c.httpData(x,e.dataType,e)}catch(v){i="parsererror";p=v}if(i==="success"||i==="notmodified")j||b();else c.handleError(e,x,i,p);d();q==="timeout"&&x.abort();if(e.async)x=null}};try{var h=x.abort;x.abort=function(){x&&h.call(x);
g("abort")}}catch(l){}e.async&&e.timeout>0&&setTimeout(function(){x&&!E&&g("timeout")},e.timeout);try{x.send(n==="POST"||n==="PUT"||n==="DELETE"?e.data:null)}catch(m){c.handleError(e,x,null,m);d()}e.async||g();return x}},handleError:function(a,b,d,f){if(a.error)a.error.call(a.context||a,b,d,f);if(a.global)(a.context?c(a.context):c.event).trigger("ajaxError",[b,a,f])},active:0,httpSuccess:function(a){try{return!a.status&&location.protocol==="file:"||a.status>=200&&a.status<300||a.status===304||a.status===
1223||a.status===0}catch(b){}return false},httpNotModified:function(a,b){var d=a.getResponseHeader("Last-Modified"),f=a.getResponseHeader("Etag");if(d)c.lastModified[b]=d;if(f)c.etag[b]=f;return a.status===304||a.status===0},httpData:function(a,b,d){var f=a.getResponseHeader("content-type")||"",e=b==="xml"||!b&&f.indexOf("xml")>=0;a=e?a.responseXML:a.responseText;e&&a.documentElement.nodeName==="parsererror"&&c.error("parsererror");if(d&&d.dataFilter)a=d.dataFilter(a,b);if(typeof a==="string")if(b===
"json"||!b&&f.indexOf("json")>=0)a=c.parseJSON(a);else if(b==="script"||!b&&f.indexOf("javascript")>=0)c.globalEval(a);return a},param:function(a,b){function d(i,o){if(c.isArray(o))c.each(o,function(k,n){b||/\[\]$/.test(i)?f(i,n):d(i+"["+(typeof n==="object"||c.isArray(n)?k:"")+"]",n)});else!b&&o!=null&&typeof o==="object"?c.each(o,function(k,n){d(i+"["+k+"]",n)}):f(i,o)}function f(i,o){o=c.isFunction(o)?o():o;e[e.length]=encodeURIComponent(i)+"="+encodeURIComponent(o)}var e=[];if(b===w)b=c.ajaxSettings.traditional;
if(c.isArray(a)||a.jquery)c.each(a,function(){f(this.name,this.value)});else for(var j in a)d(j,a[j]);return e.join("&").replace(yb,"+")}});var la={},Ab=/toggle|show|hide/,Bb=/^([+-]=)?([\d+-.]+)(.*)$/,W,va=[["height","marginTop","marginBottom","paddingTop","paddingBottom"],["width","marginLeft","marginRight","paddingLeft","paddingRight"],["opacity"]];c.fn.extend({show:function(a,b){if(a||a===0)return this.animate(K("show",3),a,b);else{a=0;for(b=this.length;a<b;a++){var d=c.data(this[a],"olddisplay");
this[a].style.display=d||"";if(c.css(this[a],"display")==="none"){d=this[a].nodeName;var f;if(la[d])f=la[d];else{var e=c("<"+d+" />").appendTo("body");f=e.css("display");if(f==="none")f="block";e.remove();la[d]=f}c.data(this[a],"olddisplay",f)}}a=0;for(b=this.length;a<b;a++)this[a].style.display=c.data(this[a],"olddisplay")||"";return this}},hide:function(a,b){if(a||a===0)return this.animate(K("hide",3),a,b);else{a=0;for(b=this.length;a<b;a++){var d=c.data(this[a],"olddisplay");!d&&d!=="none"&&c.data(this[a],
"olddisplay",c.css(this[a],"display"))}a=0;for(b=this.length;a<b;a++)this[a].style.display="none";return this}},_toggle:c.fn.toggle,toggle:function(a,b){var d=typeof a==="boolean";if(c.isFunction(a)&&c.isFunction(b))this._toggle.apply(this,arguments);else a==null||d?this.each(function(){var f=d?a:c(this).is(":hidden");c(this)[f?"show":"hide"]()}):this.animate(K("toggle",3),a,b);return this},fadeTo:function(a,b,d){return this.filter(":hidden").css("opacity",0).show().end().animate({opacity:b},a,d)},
animate:function(a,b,d,f){var e=c.speed(b,d,f);if(c.isEmptyObject(a))return this.each(e.complete);return this[e.queue===false?"each":"queue"](function(){var j=c.extend({},e),i,o=this.nodeType===1&&c(this).is(":hidden"),k=this;for(i in a){var n=i.replace(ia,ja);if(i!==n){a[n]=a[i];delete a[i];i=n}if(a[i]==="hide"&&o||a[i]==="show"&&!o)return j.complete.call(this);if((i==="height"||i==="width")&&this.style){j.display=c.css(this,"display");j.overflow=this.style.overflow}if(c.isArray(a[i])){(j.specialEasing=
j.specialEasing||{})[i]=a[i][1];a[i]=a[i][0]}}if(j.overflow!=null)this.style.overflow="hidden";j.curAnim=c.extend({},a);c.each(a,function(r,u){var z=new c.fx(k,j,r);if(Ab.test(u))z[u==="toggle"?o?"show":"hide":u](a);else{var C=Bb.exec(u),B=z.cur(true)||0;if(C){u=parseFloat(C[2]);var E=C[3]||"px";if(E!=="px"){k.style[r]=(u||1)+E;B=(u||1)/z.cur(true)*B;k.style[r]=B+E}if(C[1])u=(C[1]==="-="?-1:1)*u+B;z.custom(B,u,E)}else z.custom(B,u,"")}});return true})},stop:function(a,b){var d=c.timers;a&&this.queue([]);
this.each(function(){for(var f=d.length-1;f>=0;f--)if(d[f].elem===this){b&&d[f](true);d.splice(f,1)}});b||this.dequeue();return this}});c.each({slideDown:K("show",1),slideUp:K("hide",1),slideToggle:K("toggle",1),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"}},function(a,b){c.fn[a]=function(d,f){return this.animate(b,d,f)}});c.extend({speed:function(a,b,d){var f=a&&typeof a==="object"?a:{complete:d||!d&&b||c.isFunction(a)&&a,duration:a,easing:d&&b||b&&!c.isFunction(b)&&b};f.duration=c.fx.off?0:typeof f.duration===
"number"?f.duration:c.fx.speeds[f.duration]||c.fx.speeds._default;f.old=f.complete;f.complete=function(){f.queue!==false&&c(this).dequeue();c.isFunction(f.old)&&f.old.call(this)};return f},easing:{linear:function(a,b,d,f){return d+f*a},swing:function(a,b,d,f){return(-Math.cos(a*Math.PI)/2+0.5)*f+d}},timers:[],fx:function(a,b,d){this.options=b;this.elem=a;this.prop=d;if(!b.orig)b.orig={}}});c.fx.prototype={update:function(){this.options.step&&this.options.step.call(this.elem,this.now,this);(c.fx.step[this.prop]||
c.fx.step._default)(this);if((this.prop==="height"||this.prop==="width")&&this.elem.style)this.elem.style.display="block"},cur:function(a){if(this.elem[this.prop]!=null&&(!this.elem.style||this.elem.style[this.prop]==null))return this.elem[this.prop];return(a=parseFloat(c.css(this.elem,this.prop,a)))&&a>-10000?a:parseFloat(c.curCSS(this.elem,this.prop))||0},custom:function(a,b,d){function f(j){return e.step(j)}this.startTime=J();this.start=a;this.end=b;this.unit=d||this.unit||"px";this.now=this.start;
this.pos=this.state=0;var e=this;f.elem=this.elem;if(f()&&c.timers.push(f)&&!W)W=setInterval(c.fx.tick,13)},show:function(){this.options.orig[this.prop]=c.style(this.elem,this.prop);this.options.show=true;this.custom(this.prop==="width"||this.prop==="height"?1:0,this.cur());c(this.elem).show()},hide:function(){this.options.orig[this.prop]=c.style(this.elem,this.prop);this.options.hide=true;this.custom(this.cur(),0)},step:function(a){var b=J(),d=true;if(a||b>=this.options.duration+this.startTime){this.now=
this.end;this.pos=this.state=1;this.update();this.options.curAnim[this.prop]=true;for(var f in this.options.curAnim)if(this.options.curAnim[f]!==true)d=false;if(d){if(this.options.display!=null){this.elem.style.overflow=this.options.overflow;a=c.data(this.elem,"olddisplay");this.elem.style.display=a?a:this.options.display;if(c.css(this.elem,"display")==="none")this.elem.style.display="block"}this.options.hide&&c(this.elem).hide();if(this.options.hide||this.options.show)for(var e in this.options.curAnim)c.style(this.elem,
e,this.options.orig[e]);this.options.complete.call(this.elem)}return false}else{e=b-this.startTime;this.state=e/this.options.duration;a=this.options.easing||(c.easing.swing?"swing":"linear");this.pos=c.easing[this.options.specialEasing&&this.options.specialEasing[this.prop]||a](this.state,e,0,1,this.options.duration);this.now=this.start+(this.end-this.start)*this.pos;this.update()}return true}};c.extend(c.fx,{tick:function(){for(var a=c.timers,b=0;b<a.length;b++)a[b]()||a.splice(b--,1);a.length||
c.fx.stop()},stop:function(){clearInterval(W);W=null},speeds:{slow:600,fast:200,_default:400},step:{opacity:function(a){c.style(a.elem,"opacity",a.now)},_default:function(a){if(a.elem.style&&a.elem.style[a.prop]!=null)a.elem.style[a.prop]=(a.prop==="width"||a.prop==="height"?Math.max(0,a.now):a.now)+a.unit;else a.elem[a.prop]=a.now}}});if(c.expr&&c.expr.filters)c.expr.filters.animated=function(a){return c.grep(c.timers,function(b){return a===b.elem}).length};c.fn.offset="getBoundingClientRect"in s.documentElement?
function(a){var b=this[0];if(a)return this.each(function(e){c.offset.setOffset(this,a,e)});if(!b||!b.ownerDocument)return null;if(b===b.ownerDocument.body)return c.offset.bodyOffset(b);var d=b.getBoundingClientRect(),f=b.ownerDocument;b=f.body;f=f.documentElement;return{top:d.top+(self.pageYOffset||c.support.boxModel&&f.scrollTop||b.scrollTop)-(f.clientTop||b.clientTop||0),left:d.left+(self.pageXOffset||c.support.boxModel&&f.scrollLeft||b.scrollLeft)-(f.clientLeft||b.clientLeft||0)}}:function(a){var b=
this[0];if(a)return this.each(function(r){c.offset.setOffset(this,a,r)});if(!b||!b.ownerDocument)return null;if(b===b.ownerDocument.body)return c.offset.bodyOffset(b);c.offset.initialize();var d=b.offsetParent,f=b,e=b.ownerDocument,j,i=e.documentElement,o=e.body;f=(e=e.defaultView)?e.getComputedStyle(b,null):b.currentStyle;for(var k=b.offsetTop,n=b.offsetLeft;(b=b.parentNode)&&b!==o&&b!==i;){if(c.offset.supportsFixedPosition&&f.position==="fixed")break;j=e?e.getComputedStyle(b,null):b.currentStyle;
k-=b.scrollTop;n-=b.scrollLeft;if(b===d){k+=b.offsetTop;n+=b.offsetLeft;if(c.offset.doesNotAddBorder&&!(c.offset.doesAddBorderForTableAndCells&&/^t(able|d|h)$/i.test(b.nodeName))){k+=parseFloat(j.borderTopWidth)||0;n+=parseFloat(j.borderLeftWidth)||0}f=d;d=b.offsetParent}if(c.offset.subtractsBorderForOverflowNotVisible&&j.overflow!=="visible"){k+=parseFloat(j.borderTopWidth)||0;n+=parseFloat(j.borderLeftWidth)||0}f=j}if(f.position==="relative"||f.position==="static"){k+=o.offsetTop;n+=o.offsetLeft}if(c.offset.supportsFixedPosition&&
f.position==="fixed"){k+=Math.max(i.scrollTop,o.scrollTop);n+=Math.max(i.scrollLeft,o.scrollLeft)}return{top:k,left:n}};c.offset={initialize:function(){var a=s.body,b=s.createElement("div"),d,f,e,j=parseFloat(c.curCSS(a,"marginTop",true))||0;c.extend(b.style,{position:"absolute",top:0,left:0,margin:0,border:0,width:"1px",height:"1px",visibility:"hidden"});b.innerHTML="<div style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;'><div></div></div><table style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;' cellpadding='0' cellspacing='0'><tr><td></td></tr></table>";
a.insertBefore(b,a.firstChild);d=b.firstChild;f=d.firstChild;e=d.nextSibling.firstChild.firstChild;this.doesNotAddBorder=f.offsetTop!==5;this.doesAddBorderForTableAndCells=e.offsetTop===5;f.style.position="fixed";f.style.top="20px";this.supportsFixedPosition=f.offsetTop===20||f.offsetTop===15;f.style.position=f.style.top="";d.style.overflow="hidden";d.style.position="relative";this.subtractsBorderForOverflowNotVisible=f.offsetTop===-5;this.doesNotIncludeMarginInBodyOffset=a.offsetTop!==j;a.removeChild(b);
c.offset.initialize=c.noop},bodyOffset:function(a){var b=a.offsetTop,d=a.offsetLeft;c.offset.initialize();if(c.offset.doesNotIncludeMarginInBodyOffset){b+=parseFloat(c.curCSS(a,"marginTop",true))||0;d+=parseFloat(c.curCSS(a,"marginLeft",true))||0}return{top:b,left:d}},setOffset:function(a,b,d){if(/static/.test(c.curCSS(a,"position")))a.style.position="relative";var f=c(a),e=f.offset(),j=parseInt(c.curCSS(a,"top",true),10)||0,i=parseInt(c.curCSS(a,"left",true),10)||0;if(c.isFunction(b))b=b.call(a,
d,e);d={top:b.top-e.top+j,left:b.left-e.left+i};"using"in b?b.using.call(a,d):f.css(d)}};c.fn.extend({position:function(){if(!this[0])return null;var a=this[0],b=this.offsetParent(),d=this.offset(),f=/^body|html$/i.test(b[0].nodeName)?{top:0,left:0}:b.offset();d.top-=parseFloat(c.curCSS(a,"marginTop",true))||0;d.left-=parseFloat(c.curCSS(a,"marginLeft",true))||0;f.top+=parseFloat(c.curCSS(b[0],"borderTopWidth",true))||0;f.left+=parseFloat(c.curCSS(b[0],"borderLeftWidth",true))||0;return{top:d.top-
f.top,left:d.left-f.left}},offsetParent:function(){return this.map(function(){for(var a=this.offsetParent||s.body;a&&!/^body|html$/i.test(a.nodeName)&&c.css(a,"position")==="static";)a=a.offsetParent;return a})}});c.each(["Left","Top"],function(a,b){var d="scroll"+b;c.fn[d]=function(f){var e=this[0],j;if(!e)return null;if(f!==w)return this.each(function(){if(j=wa(this))j.scrollTo(!a?f:c(j).scrollLeft(),a?f:c(j).scrollTop());else this[d]=f});else return(j=wa(e))?"pageXOffset"in j?j[a?"pageYOffset":
"pageXOffset"]:c.support.boxModel&&j.document.documentElement[d]||j.document.body[d]:e[d]}});c.each(["Height","Width"],function(a,b){var d=b.toLowerCase();c.fn["inner"+b]=function(){return this[0]?c.css(this[0],d,false,"padding"):null};c.fn["outer"+b]=function(f){return this[0]?c.css(this[0],d,false,f?"margin":"border"):null};c.fn[d]=function(f){var e=this[0];if(!e)return f==null?null:this;if(c.isFunction(f))return this.each(function(j){var i=c(this);i[d](f.call(this,j,i[d]()))});return"scrollTo"in
e&&e.document?e.document.compatMode==="CSS1Compat"&&e.document.documentElement["client"+b]||e.document.body["client"+b]:e.nodeType===9?Math.max(e.documentElement["client"+b],e.body["scroll"+b],e.documentElement["scroll"+b],e.body["offset"+b],e.documentElement["offset"+b]):f===w?c.css(e,d):this.css(d,typeof f==="string"?f:f+"px")}});A.jQuery=A.$=c})(window);
/**
*  Ajax Autocomplete for jQuery, version 1.1.2
*  (c) 2010 Tomas Kirda
*
*  Ajax Autocomplete for jQuery is freely distributable under the terms of an MIT-style license.
*  For details, see the web site: http://www.devbridge.com/projects/autocomplete/jquery/
*
*  Last Review: 03/18/2010
*/

/*jslint onevar: true, evil: true, nomen: true, eqeqeq: true, bitwise: true, regexp: true, newcap: true, immed: true */
/*global window: true, document: true, clearInterval: true, setInterval: true, jQuery: true */

(function($) {

  var reEscape = new RegExp('(\\' + ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'].join('|\\') + ')', 'g');

  function fnFormatResult(value, data, currentValue) {
    var pattern = '(' + currentValue.replace(reEscape, '\\$1') + ')';
    return value.replace(new RegExp(pattern, 'gi'), '<strong>$1<\/strong>');
  }

  function Autocomplete(el, options) {
    this.el = $(el);
    this.el.attr('autocomplete', 'off');
    this.suggestions = [];
    this.data = [];
    this.badQueries = [];
    this.selectedIndex = -1;
    this.currentValue = this.el.val();
    this.intervalId = 0;
    this.cachedResponse = [];
    this.onChangeInterval = null;
    this.ignoreValueChange = false;
    this.serviceUrl = options.serviceUrl;
    this.geocoder = options.geocoder; /* by bbbike */
    this.isLocal = false;
    this.options = {
      autoSubmit: false,
      minChars: 1,
      maxHeight: 300,
      deferRequestBy: 0,
      width: 0,
      highlight: true,
      params: {},
      fnFormatResult: fnFormatResult,
      delimiter: null,
      zIndex: 9999
    };
    this.initialize();
    this.setOptions(options);
  }
  
  $.fn.autocomplete = function(options) {
    return new Autocomplete(this.get(0), options);
  };


  Autocomplete.prototype = {

    killerFn: null,

    initialize: function() {

      var me, uid, autocompleteElId;
      me = this;
      uid = Math.floor(Math.random()*0x100000).toString(16);
      autocompleteElId = 'Autocomplete_' + uid;

      this.killerFn = function(e) {
        if ($(e.target).parents('.autocomplete').size() === 0) {
          me.killSuggestions();
          me.disableKillerFn();
        }
      };

      if (!this.options.width) { this.options.width = this.el.width(); }
      this.mainContainerId = 'AutocompleteContainter_' + uid;

      $('<div id="' + this.mainContainerId + '" style="position:absolute;z-index:9999;"><div class="autocomplete-w1"><div class="autocomplete" id="' + autocompleteElId + '" style="display:none; width:300px;"></div></div></div>').appendTo('body');

      this.container = $('#' + autocompleteElId);
      this.fixPosition();
      if (window.opera) {
        this.el.keypress(function(e) { me.onKeyPress(e); });
      } else {
        this.el.keydown(function(e) { me.onKeyPress(e); });
      }
      this.el.keyup(function(e) { me.onKeyUp(e); });
      this.el.blur(function() { me.enableKillerFn(); });
      this.el.focus(function() { me.fixPosition(); });
    },
    
    setOptions: function(options){
      var o = this.options;
      $.extend(o, options);
      if(o.lookup){
        this.isLocal = true;
        if($.isArray(o.lookup)){ o.lookup = { suggestions:o.lookup, data:[] }; }
      }
      $('#'+this.mainContainerId).css({ zIndex:o.zIndex });
      this.container.css({ maxHeight: o.maxHeight + 'px', width:o.width });
    },
    
    clearCache: function(){
      this.cachedResponse = [];
      this.badQueries = [];
    },
    
    disable: function(){
      this.disabled = true;
    },
    
    enable: function(){
      this.disabled = false;
    },

    fixPosition: function() {
      var offset = this.el.offset();
      $('#' + this.mainContainerId).css({ top: (offset.top + this.el.innerHeight()) + 'px', left: offset.left + 'px' });
    },

    enableKillerFn: function() {
      var me = this;
      $(document).bind('click', me.killerFn);
    },

    disableKillerFn: function() {
      var me = this;
      $(document).unbind('click', me.killerFn);
    },

    killSuggestions: function() {
      var me = this;
      this.stopKillSuggestions();
      this.intervalId = window.setInterval(function() { me.hide(); me.stopKillSuggestions(); }, 300);
    },

    stopKillSuggestions: function() {
      window.clearInterval(this.intervalId);
    },

    onKeyPress: function(e) {
      if (this.disabled || !this.enabled) { return; }
      // return will exit the function
      // and event will not be prevented
      switch (e.keyCode) {
        case 27: //KEY_ESC:
          this.el.val(this.currentValue);
          this.hide();
          break;
        case 9: //KEY_TAB:
        case 13: //KEY_RETURN:
          if (this.selectedIndex === -1 || e.keyCode === 9) {
            this.hide();
            return;
          }
          this.select(this.selectedIndex);
          break;
        case 38: //KEY_UP:
          this.moveUp();
          break;
        case 40: //KEY_DOWN:
          this.moveDown();
          break;
        default:
          return;
      }
      e.stopImmediatePropagation();
      e.preventDefault();
    },

    onKeyUp: function(e) {
      if(this.disabled){ return; }
      switch (e.keyCode) {
        case 38: //KEY_UP:
        case 40: //KEY_DOWN:
          return;
      }
      clearInterval(this.onChangeInterval);
      if (this.currentValue !== this.el.val()) {
        if (this.options.deferRequestBy > 0) {
          // Defer lookup in case when value changes very quickly:
          var me = this;
          this.onChangeInterval = setInterval(function() { me.onValueChange(); }, this.options.deferRequestBy);
        } else {
          this.onValueChange();
        }
      }
    },

    onValueChange: function() {
      clearInterval(this.onChangeInterval);
      this.currentValue = this.el.val();
      var q = this.getQuery(this.currentValue);
      this.selectedIndex = -1;
      if (this.ignoreValueChange) {
        this.ignoreValueChange = false;
        return;
      }
      if (q === '' || q.length < this.options.minChars) {
        this.hide();
      } else {
        this.getSuggestions(q);
      }
    },

    getQuery: function(val) {
      var d, arr;
      d = this.options.delimiter;
      if (!d) { return $.trim(val); }
      arr = val.split(d);
      return $.trim(arr[arr.length - 1]);
    },

    getSuggestionsLocal: function(q) {
      var ret, arr, len, val, i;
      arr = this.options.lookup;
      len = arr.suggestions.length;
      ret = { suggestions:[], data:[] };
      q = q.toLowerCase();
      for(i=0; i< len; i++){
        val = arr.suggestions[i];
        if(val.toLowerCase().indexOf(q) === 0){
          ret.suggestions.push(val);
          ret.data.push(arr.data[i]);
        }
      }
      return ret;
    },
    
    getSuggestions: function(q) {
      var cr, me;
      cr = this.isLocal ? this.getSuggestionsLocal(q) : this.cachedResponse[q];
      if (cr && $.isArray(cr.suggestions)) {
        this.suggestions = cr.suggestions;
        this.data = cr.data;
        this.suggest();
      } else if (!this.isBadQuery(q)) {
        me = this;
        me.options.params.query = q;
        $.get(this.serviceUrl, me.options.params, function(txt) { me.processResponse(txt); }, 'text');
      }
    },

    isBadQuery: function(q) {
      var i = this.badQueries.length;
      while (i--) {
        if (q.indexOf(this.badQueries[i]) === 0) { return true; }
      }
      return false;
    },

    hide: function() {
      this.enabled = false;
      this.selectedIndex = -1;
      this.container.hide();
    },

    suggest: function() {
      if (this.suggestions.length === 0) {
        this.hide();
        return;
      }

      var me, len, div, f, v, i, s, mOver, mClick;
      me = this;
      len = this.suggestions.length;
      f = this.options.fnFormatResult;
      v = this.getQuery(this.currentValue);
      mOver = function(xi) { return function() { me.activate(xi); }; };
      mClick = function(xi) { return function() { me.select(xi); }; };
      this.container.hide().empty();
      for (i = 0; i < len; i++) {
        s = this.suggestions[i];
        div = $((me.selectedIndex === i ? '<div class="selected"' : '<div') + ' title="' + s + '">' + f(s, this.data[i], v) + '</div>');
        div.mouseover(mOver(i));
        div.click(mClick(i));
        this.container.append(div);
      }
      this.enabled = true;
      this.container.show();
    },

    processResponse: function(text, second_try) {
      var response;
      try {
        response = eval('(' + text + ')');
      } catch (err) { return; }
      if (!$.isArray(response.data)) { 
	response.data = []; 
      }

      // by BBBike.org 
      // if geocoder is enabled, try google geolocation service next
      if (response.suggestions.length === 0 && this.geocoder && !second_try) {
	var me = this;
	return this.geocoder( response.query, function (geocoder_text) { me.processResponse( geocoder_text, true) } );
      }

      if(!this.options.noCache){
        this.cachedResponse[response.query] = response;
        if (response.suggestions.length === 0) { this.badQueries.push(response.query); }
      }
      if (response.query === this.getQuery(this.currentValue)) {
        this.suggestions = response.suggestions;
        this.data = response.data;
        this.suggest(); 
      }
    },

    activate: function(index) {
      var divs, activeItem;
      divs = this.container.children();
      // Clear previous selection:
      if (this.selectedIndex !== -1 && divs.length > this.selectedIndex) {
        $(divs.get(this.selectedIndex)).removeClass();
      }
      this.selectedIndex = index;
      if (this.selectedIndex !== -1 && divs.length > this.selectedIndex) {
        activeItem = divs.get(this.selectedIndex);
        $(activeItem).addClass('selected');
      }
      return activeItem;
    },

    deactivate: function(div, index) {
      div.className = '';
      if (this.selectedIndex === index) { this.selectedIndex = -1; }
    },

    select: function(i) {
      var selectedValue, f;
      selectedValue = this.suggestions[i];
      if (selectedValue) {
        this.el.val(selectedValue);
        if (this.options.autoSubmit) {
          f = this.el.parents('form');
          if (f.length > 0) { f.get(0).submit(); }
        }
        this.ignoreValueChange = true;
        this.hide();
        this.onSelect(i);
      }
    },

    moveUp: function() {
      if (this.selectedIndex === -1) { return; }
      if (this.selectedIndex === 0) {
        this.container.children().get(0).className = '';
        this.selectedIndex = -1;
        this.el.val(this.currentValue);
        return;
      }
      this.adjustScroll(this.selectedIndex - 1);
    },

    moveDown: function() {
      if (this.selectedIndex === (this.suggestions.length - 1)) { return; }
      this.adjustScroll(this.selectedIndex + 1);
    },

    adjustScroll: function(i) {
      var activeItem, offsetTop, upperBound, lowerBound;
      activeItem = this.activate(i);
      offsetTop = activeItem.offsetTop;
      upperBound = this.container.scrollTop();
      lowerBound = upperBound + this.options.maxHeight - 25;
      if (offsetTop < upperBound) {
        this.container.scrollTop(offsetTop);
      } else if (offsetTop > lowerBound) {
        this.container.scrollTop(offsetTop - this.options.maxHeight + 25);
      }
      this.el.val(this.getValue(this.suggestions[i]));
    },

    onSelect: function(i) {
      var me, onSelect, s, d;
      me = this;
      onSelect = me.options.onSelect;
      s = me.suggestions[i];
      d = me.data[i];
      me.el.val(me.getValue(s));
      if ($.isFunction(onSelect)) { onSelect(s, d); }
    },
    
    getValue: function(value){
        var del, currVal, arr, me;
        me = this;
        del = me.options.delimiter;
        if (!del) { return value; }
        currVal = me.currentValue;
        arr = currVal.split(del);
        if (arr.length === 1) { return value; }
        return currVal.substr(0, currVal.length - arr[arr.length - 1].length) + value;
    }

  };

}(jQuery));
