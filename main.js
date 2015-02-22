( function ( $, L ) {
    var map, lastLookup, lastWaitingRequest, lookupTimeout, control, mapping, currentIndex,
        groups = {},
        OSM_LINK_FORMAT = 'https://www.openstreetmap.org/TYPE/ID',
        OVERPASS_API_ENDPOINT = 'https://overpass-api.de/api/interpreter',
        OVERPASS_API_REQUEST = '[out:json];(' +
            'node[amenity=place_of_worship](BOUNDS);' +
            'way[amenity=place_of_worship](BOUNDS););' +
            'out center;>;',
        OVERPASS_BOUNDS_REGEX = /BOUNDS/g,
        DEFAULT_POPUP_CONTENT = '<span class="popup-loading">Loading details...</span>',
        DEFAULT_MARKER_POSITION = [35.1174, -89.9711], // Home sweet home...
        DEFAULT_RADIUS = 20000,
        UNKNOWN_COLOR = 'rgb(189,189,189)',
        COLORS = ['rgb(31,120,180)','rgb(178,223,138)','rgb(51,160,44)','rgb(251,154,153)','rgb(227,26,28)','rgb(253,191,111)',
        'rgb(255,127,0)','rgb(202,178,214)','rgb(106,61,154)','rgb(255,255,153)','rgb(177,89,40)','rgb(141,211,199)','rgb(255,255,179)',
        'rgb(190,186,218)','rgb(251,128,114)','rgb(128,177,211)','rgb(253,180,98)','rgb(179,222,105)','rgb(252,205,229)',
        'rgb(217,217,217)','rgb(188,128,189)','rgb(204,235,197)','rgb(255,237,111)']; // http://colorbrewer2.org/ <3

    // Taken from http://underscorejs.org/docs/underscore.html -- debounce(func, timeout, immediate)
    function debounce(g,e,h){function k(){var b=Date.now()-l;b<e&&0<=b?a=setTimeout(k,e-b):(a=null,h||(f=g.apply(c,d),a||(c=d=null)))}
        var a,d,c,l,f;return function(){c=this;d=arguments;l=Date.now();var b=h&&!a;a||(a=setTimeout(k,e));b&&(f=g.apply(c,d),c=d=null);return f}};

    mapping = { unknown: UNKNOWN_COLOR };
    currentIndex = 0;
    function getColor ( name ) {
        if ( !mapping[name] ) {
            mapping[name] = COLORS[currentIndex];
            currentIndex++;
            if ( currentIndex === COLORS.length ) {
                currentIndex = 0;
            }
        }
        return mapping[name];
    }

    function init () {
        var position, marker, autocomplete, initialHeight, isGrowing,
            $autocomplete = $( '#autocomplete' );

        map = L.map( 'map', {
                worldCopyJump: true,
                photonControl: true,
                photonControlOptions: {
                    placeholder: 'Fly to...',
                    noResultLabel: 'No results found. Try moving the marker to your desired location.',
                    includePosition: false,
                    feedbackEmail: null,
                    onSelected: autocompleteSelected
                }
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

        /*marker.bindPopup( '<buttons class="go-marker-button">Drag to position,<br> then click <u>here</u> to begin</button>', { closeButton: false, closeOnClick: false } );
        marker.openPopup();
        marker.on( 'dragend', function () { 
            marker.openPopup();
        } );*/

        function autocompleteSelected ( feature ) {
            $( '.photon-input' ).blur();
            marker.setLatLng( [feature.geometry.coordinates[1], feature.geometry.coordinates[0] ] );
            go();
        }

        $( '.photon-input' ).focus();

        marker.on( 'click dragend', go );
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

    // https://github.com/kartenkarsten/leaflet-layer-overpass/blob/master/OverPassLayer.js
    // South-West-North-East
    L.LatLngBounds.prototype.toOverpassBBoxString = function (){
      var a = this._southWest,
        b = this._northEast;
      return [ a.lat, a.lng, b.lat, b.lng ].join( ',' );
    }

    lastLookup = 0;
    lastWaitingRequest = null;
    lookupTimeout = null;
    function lookup( latlngOrBounds, def ) {
        var circle, bounds,
            results = {},
            deferred = def || $.Deferred();

        //lolnope
        if ( Date.now() - lastLookup < 2500 ) {
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

        if ( typeof latlngOrBounds.toOverpassBBoxString === 'function' ) {
            if ( latlngOrBounds.getEast() - latlngOrBounds.getWest() > 1 ) {
                latlngOrBounds = latlngOrBounds.getCenter();
            } else {
                bounds = latlngOrBounds;
            }
        }

        if ( !bounds ) {
            circle = L.circle( latlngOrBounds, DEFAULT_RADIUS, {
                opacity: 0
            } ).addTo( map );
            bounds = circle.getBounds();
            map.removeLayer( circle );
        }

        $.get( OVERPASS_API_ENDPOINT, {
            data: OVERPASS_API_REQUEST.replace( OVERPASS_BOUNDS_REGEX, bounds.toOverpassBBoxString() )
        } ).done( function ( data ) {
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

            deferred.resolve(
                Object.keys( results ).map( function ( name ) {
                    return { name: name, places: results[name] };
                } )
            );
        } );

        return deferred;
    }

    function render ( latlng ) {
        lookup( latlng ).done( function ( results ) {
            addMarkers( results );
            addControl();

            $( document.body ).addClass( 'rendered' );

            // Update url to be centered
            map.on( 'move drag', debounce( function () {
                var ll = map.getCenter();
                $( '.photon-input' ).attr( 'placeholder', ll.lat.toFixed( 3 ) + ', ' + ll.lng.toFixed( 3 ) )
                window.location.hash = ll.lat.toFixed( 3 ) + ',' + ll.lng.toFixed( 3 );
            }, 100 ) );

            // Also, now add the listener to dynamically add MORE points later on! Such fun very excite.
            map.on( 'moveend', debounce( function () {
                lookup( map.getBounds() ).done( function ( results ) {
                    addMarkers( results );
                    addControl();
                } );
            }, 50, /* immediate */ true ) );

        } );
    }

    function addMarkers ( results ) {
        results.forEach( function ( r ) {
            var name = r.name,
                places = r.places,
                markers = [],
                color = getColor( r.name );

            places.forEach( function ( place ) {
                var marker;

                if ( !groups[name] || groups[name].places.indexOf( place ) === -1 ) {
                    marker = L.circleMarker( L.latLng( place.lat, place.lng ), { color: color, fill: true, fillColor: color, fillOpacity: 0.8 } );
                    marker.bindPopup( DEFAULT_POPUP_CONTENT );
                    marker.once( 'click', function () {
                        var marker = this;
                        marker.getPopup().setContent( '<div class="name">' + place.name + '</div>' +
                            '<div class="address"><a target="_blank" href="' + OSM_LINK_FORMAT.replace( 'TYPE', place.type ).replace( 'ID', place.id ) + '">OpenStreetMap id #' + place.id + '</a></div>' );
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


    control = null;
    function addControl () {
        var overlays = {};

        function makeHtml( name, g ) {
            return '<span class="group" style="background-color: ' + g.color + '">' + name.charAt( 0 ).toUpperCase() + name.substring( 1 ).replace( '_', ' ' ) + '</span>'
        }

        if ( !control ) {
            $.each( groups, function ( name, g ) {
                overlays[ makeHtml( name, g ) ] = g.group;
            } );

            control = L.control.layers( {}, overlays, {
                collapsed: false
            } ).addTo( map );

            $( '.group' )
                .hover( function () {
                    $( this ).parent().parent().siblings().find( 'input' ).each( function () {
                        var $this = $( this );
                        $this.data( 'old-state', $this.prop( 'checked' ) );
                        $this.prop( 'checked', false );
                    } );
                    control._onInputClick();
                }, function () {
                    $( this ).parent().parent().siblings().find( 'input' ).each( function () {
                        var $this = $( this );
                        $this.prop( 'checked', $this.data( 'old-state' ) );
                    } );
                    control._onInputClick();
                } );
        } else {
            $.each( groups, function ( name, g ) {
                if ( !control._layers[ L.stamp( g.group ) ] ) {
                    control.addOverlay( g.group, makeHtml( name, g ) );
                }
            } );
        }
    }

    function purgeNonVisibleMarkers () {
        var bounds = map.getBounds().pad( 0.5 );

        map.eachLayer( function ( layer ) {
            if ( layer.eachLayer ) {
                layer.eachLayer( function ( marker ) {
                    if ( !bounds.contains( marker.getLatLng() ) ) {
                        layer.removeLayer( marker );
                    }
                } );
            }
        } );
    }
    setInterval( purgeNonVisibleMarkers, 5000 );

    // debugging
    window.map = map;

}( jQuery, L ) );
