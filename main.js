( function ( $, L, google ) {
    var map, service, lastLookup, lastWaitingRequest, lookupTimeout,
        groups = {},
        DEFAULT_POPUP_CONTENT = '<span class="popup-loading">Loading details...</span>',
        DEFAULT_MARKER_POSITION = [35.1174, -89.9711], // Home sweet home...
        DEFAULT_RADIUS = 30000,
        TYPES = {
            church: 'Churches',
            synagogue: 'Synagogues',
            mosque: 'Mosques',
            hindu_temple: 'Hindu temples'
        }
        COLORS = {
            church: '#7fc97f',
            synagogue: '#beaed4',
            mosque: '#fdc086',
            hindu_temple: '#ffff99'
        };

    // Taken from http://underscorejs.org/docs/underscore.html -- debounce(func, timeout, immediate)
    function debounce(g,e,h){function k(){var b=Date.now()-l;b<e&&0<=b?a=setTimeout(k,e-b):(a=null,h||(f=g.apply(c,d),a||(c=d=null)))}
        var a,d,c,l,f;return function(){c=this;d=arguments;l=Date.now();var b=h&&!a;a||(a=setTimeout(k,e));b&&(f=g.apply(c,d),c=d=null);return f}};

    function init () {
        var position, marker, autocomplete, initialHeight, isGrowing,
            $autocomplete = $( '#autocomplete' );

        map = L.map( 'map', {
                worldCopyJump: true
            } ).setView( [0, 0], 2 );

        L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 16,
            minZoom: 2
        } ).addTo( map );

        if ( window.location.hash ) {
            position = window.location.hash.substring( 1 ).split( ',' );
        } else {
            position = DEFAULT_MARKER_POSITION;
        }

        marker = L.marker( position, {
            draggable: true,
        } ).addTo( map );

        function updateMarkerData () {
            var ll = marker.getLatLng();
            window.location.hash = ll.lat.toFixed( 3 ) + ',' + ll.lng.toFixed( 3 );
            $( '#currentPosition' ).text( ll.lat.toFixed( 3 ) + ', ' + ll.lng.toFixed( 3 ) );
        }
        marker.on( 'move', updateMarkerData );
        marker.on( 'drag', function () {
            var ll = marker.getLatLng(),
                placeholder = ll.lat.toFixed( 3 ) + ', ' + ll.lng.toFixed( 3 );
            $autocomplete.val( '' );
            $autocomplete.attr( 'placeholder', placeholder );
            updateMarkerData();
        } );
        updateMarkerData();

        autocomplete = new google.maps.places.Autocomplete( document.getElementById( 'autocomplete' ), {
            types: [ '(regions)' ]
        } );

        google.maps.event.addListener( autocomplete, 'place_changed', function () {
            var location = autocomplete.getPlace().geometry.location,
                latlng = [ location.lat(), location.lng() ];
            marker.setLatLng( latlng );
            $autocomplete.parent().stop().animate( { height: initialHeight } );
            go();
        } );

        initialHeight = $autocomplete.parent().height() + 'px';
        isGrowing = false;
        $autocomplete.keyup( function () {
            var len = $autocomplete.val().length;
            if ( len && !isGrowing ) {
                isGrowing = true;
                $autocomplete.parent().stop().animate( { height: '225px' } );
            } else if ( len === 0 ) {
                isGrowing = false;
                $autocomplete.parent().stop().animate( { height: initialHeight } );
            }
        } );

        $autocomplete.focus();

        $( '#go' ).click( go );

        function go () {
            var latlng = marker.getLatLng();

            render( latlng );

            $( '#intro' )
                .css( {
                    bottom: '-' + ( $( '#intro' ).height() + 20 ),
                    opacity: 0
                } );

            map.flyTo( latlng, 11 );

            setTimeout( function () {
                map.removeLayer( marker );
            }, 1000 );
        }
    }
    init();

    service = new google.maps.places.PlacesService( document.getElementById( 'attributions' ) );

    function getDetails( placeId ) {
        var deferred = $.Deferred();
        service.getDetails( { placeId: placeId }, function ( data ) { deferred.resolve( data ); } );
        return deferred;
    }

    lastLookup = 0;
    lastWaitingRequest = null;
    lookupTimeout = null;
    function lookup( latlng, def ) {
        var results = {},
            deferred = def || $.Deferred();

        //lolnope
        if ( Date.now() - lastLookup < 2500 ) {
            lastWaitingRequest = [ latlng, deferred ];
            if ( !lookupTimeout ) {
                lookupTimeout = setTimeout( function () {
                    lookup.apply( null, lastWaitingRequest );
                }, Date.now() - lastLookup );
            }
            return deferred;
        }

        lastLookup = Date.now();
        lookupTimeout = null;

        deferreds = Object.keys( TYPES ).map( function ( type ) {
                var typeDeferred = $.Deferred();

                service.radarSearch( {
                    location: { lat: latlng.lat, lng: latlng.lng },
                    radius: DEFAULT_RADIUS,
                    types: [ type ]
                }, function ( data, status ) {
                    if ( status !== google.maps.places.PlacesServiceStatus.OK ) {
                        console.log( 'Error: ' + status );
                        data = [];
                    }
                    results[type] = data.map( function ( r ) {
                        return { lat: r.geometry.location.lat(), lng: r.geometry.location.lng(), id: r.place_id };
                    } );

                    typeDeferred.resolve();
                } );

                return typeDeferred;
            } )


        $.when.apply( $, deferreds ).done( function () {
            var finalResults = [];

            // Return to original, sorted order
            Object.keys( TYPES ).forEach( function ( type ) {
                finalResults.push( { name: type, places: results[type] } );
            } );

            deferred.resolve( finalResults );
        } );

        return deferred;
    }

    function render ( latlng ) {
        lookup( latlng ).done( function ( results ) {
            addMarkers( results );
            addControl();

            // Make the map fade into a more cinematic mode once the flyTo() op is completed.
            // Unfortunately, a current bug in Leaflet fires a TON of zoomend/moveend events during
            // the move... hence, this debounced workaround. https://github.com/Leaflet/Leaflet/issues/3134
            map.once( 'zoomend', debounce( function () {
                $( document.body ).addClass( 'rendered' );

                // Update url to be centered
                map.on( 'move drag', debounce( function () {
                    var ll = map.getCenter();
                    window.location.hash = ll.lat.toFixed( 3 ) + ',' + ll.lng.toFixed( 3 );
                }, 100 ) );

                // Also, now add the listener to dynamically add MORE points later on! Such fun very excite.
                map.on( 'moveend', debounce( function () {
                    lookup( map.getCenter() ).done( function ( results ) {
                        addMarkers( results );
                    } );
                }, 50, /* immediate */ true ) );
            }, 100 ) );

        } );
    }

    function addMarkers ( results ) {
        results.forEach( function ( r ) {
            var name = r.name,
                places = r.places,
                markers = [],
                color = COLORS[name];

            places.forEach( function ( place ) {
                var marker;

                if ( !groups[name] || groups[name].places.indexOf( place ) === -1 ) {
                    marker = L.circleMarker( L.latLng( place.lat, place.lng ), { color: color, fill: true, fillColor: color, fillOpacity: 0.8 } );
                    marker.bindPopup( DEFAULT_POPUP_CONTENT );
                    marker.once( 'click', function () {
                        var marker = this;
                        getDetails( place.id ).done( function ( data ) {
                            marker.getPopup().setContent( '<div class="name">' + data.name + '</div>' +
                                '<div class="address">' + data.adr_address + '</div>' );
                        } );
                    } );
                    markers.push( marker );
                }
            } );

            if ( groups[name] ) {
                markers.forEach( function ( m ) {
                    groups[name].group.addLayer( m );
                } );
            } else {
                groups[name] = { color: color, places: places, group: L.featureGroup( markers ).addTo( map ) }; 
            }
        } );
    }


    function addControl () {
        var overlays = {};

        $.each( groups, function ( name, g ) {
            overlays['<span class="group" style="background-color: ' + g.color + '">' + TYPES[name] + '</span>'] = g.group;
        } );

        L.control.layers( {}, overlays, {
            collapsed: false
        } ).addTo( map );
    }

}( jQuery, L, google ) );
