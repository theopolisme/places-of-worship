define( [ 'jquery', '../ui', '../map' ], function ( $, ui, map ) {
    var OVERPASS_API_ENDPOINT = 'https://overpass-api.de/api/interpreter',
        OVERPASS_API_REQUEST = '[out:json];(' +
            'node[amenity=place_of_worship](BOUNDS);' +
            'way[amenity=place_of_worship](BOUNDS););' +
            'out center;>;',
        OVERPASS_BOUNDS_REGEX = /BOUNDS/g,
        MS_BETWEEN_REQUESTS = 2500,
        LOOKUP_RADIUS = 20000,

        lastLookup = 0,
        lastWaitingRequest = null,
        lookupTimeout = null;

    // https://github.com/kartenkarsten/leaflet-layer-overpass/blob/master/OverPassLayer.js
    function converBoundsToOverpassBBoxString ( bounds ) {
        var a = bounds._southWest,
            b = bounds._northEast;
        return [ a.lat, a.lng, b.lat, b.lng ].join( ',' );
    }

    function lookup ( latlngOrBounds, deferred ) {
        var bounds,
            results = {},
            deferred = deferred || $.Deferred();

        // Don't overload the server -- only make a request ever
        // MS_BETWEEN_REQUESTS milliseconds.
        if ( Date.now() - lastLookup < MS_BETWEEN_REQUESTS ) {
            lastWaitingRequest = [ latlngOrBounds, deferred ];
            if ( !lookupTimeout ) {
                lookupTimeout = setTimeout( function () {
                    lookup.apply( null, lastWaitingRequest );
                }, Date.now() - lastLookup );
            }
            return deferred;
        }

        lastLookup = Date.now();
        lookupTimeout = null;

        ui.progress.start();

        if ( typeof latlngOrBounds.toBBoxString === 'function' ) {
            if ( latlngOrBounds.getEast() - latlngOrBounds.getWest() > 1 ) {
                latlngOrBounds = latlngOrBounds.getCenter();
            } else {
                bounds = latlngOrBounds;
            }
        }

        if ( !bounds ) {
            bounds = map.getBoundsOfCircleFromLatLng( latlngOrBounds, LOOKUP_RADIUS );
        }

        function error ( data ) {
            ui.alert( {
                title: 'Oh no!',
                text: 'Unable to fetch data from the API... it might be overloaded? Try again ' +
                    'in a few minutes, and if problems persist, report it on <a href="https://github.com' +
                    '/theopolisme/places-of-worship">GitHub</a>. <div class="error-details">' + JSON.stringify( data ) +
                    '</div>',
                type: 'error',
                allowOutsideClick: true,
                html: true
            }, function () {
                window.location.reload();
            } );
        }

        $.get( OVERPASS_API_ENDPOINT, {
            data: OVERPASS_API_REQUEST.replace( OVERPASS_BOUNDS_REGEX, converBoundsToOverpassBBoxString( bounds ) )
        } )
        .fail( error )
        .done( function ( data ) {
            if ( data.elements && data.elements.length ) {
                data.elements.forEach( function ( el ) {
                    var lat, lng, religion;

                    if ( el.type === 'way' ) {
                        lat = el.center.lat;
                        lng = el.center.lon;
                    } else {
                        lat = el.lat;
                        lng = el.lon;
                    }

                    //if ( el.tags.denomination && el.tags.denomination.length > 1 ) {
                    //    religion = el.tags.denomination.toLowerCase();
                    if ( el.tags.religion && el.tags.religion.length > 1 ) {
                        religion = el.tags.religion.toLowerCase();
                    } else {
                        religion = 'unknown';
                    }

                    if ( !results[religion] ) {
                        results[religion] = [];
                    }

                    results[religion].push( { lat: lat, lng: lng, id: el.id,
                        name: el.tags.name || 'Unknown name', type: el.type } );
                } );
            }

            ui.progress.done();
            deferred.resolve(
                Object.keys( results ).map( function ( name ) {
                    return { name: name, places: results[name] };
                } ).sort( function ( a, b ) {
                    return b.places.length - a.places.length;
                } )
            );
        } );

        return deferred;
    }

    return {
        lookup: lookup
    };
} );