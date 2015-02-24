( function ( $, L, NProgress ) {
    var map, lastLookup, lastWaitingRequest, lookupTimeout, control, states, mapping, mappingIndex,
        changesetId, changesetIdDate,
        oldUnknownsNowUpdated = [],
        religionSelectIndex = 0,
        groups = {},
        authenticatedOsm = osmAuth({
            oauth_consumer_key: 'odmQFDLgsfm7UB3GlCIpGV6Q8eX6ZlSqNlxrTT6M',
            oauth_secret: 'NLHjFqxVtYfNWqA1Ayilsf47Et9uqppFPvDJtCzu',
            url: 'http://www.openstreetmap.org',
            landing: 'ext/osmauth.land.html'
        } ),

        // CONSTANTS
        OSM_LINK_FORMAT = 'https://www.openstreetmap.org/TYPE/ID',
        OSM_API_CHANGESET_ENDPOINT = '/api/0.6/changeset/create',
        OSM_API_PLACE_ENDPOINT = '/api/0.6/TYPE/ID',
        OVERPASS_API_ENDPOINT = 'https://overpass-api.de/api/interpreter',
        OVERPASS_API_REQUEST = '[out:json];(' +
            'node[amenity=place_of_worship](BOUNDS);' +
            'way[amenity=place_of_worship](BOUNDS););' +
            'out center;>;',
        OVERPASS_BOUNDS_REGEX = /BOUNDS/g,
        DEFAULT_POPUP_CONTENT = '<span class="popup-loading">Loading details...</span>',
        DEFAULT_MARKER_POSITION = [35.1174, -89.9711], // Home sweet home...
        DEFAULT_RADIUS = 20000,
        DEFAULT_PURGE_RADIUS = 100000,
        UNKNOWN_COLOR = 'rgb(189,189,189)',
        COLORS = ['rgb(31,120,180)','rgb(178,223,138)',/*'rgb(51,160,44)', too dark*/'rgb(251,154,153)','rgb(227,26,28)','rgb(253,191,111)',
            'rgb(255,127,0)','rgb(202,178,214)','rgb(106,61,154)','rgb(255,255,153)','rgb(177,89,40)','rgb(141,211,199)','rgb(255,255,179)',
            'rgb(190,186,218)','rgb(251,128,114)','rgb(128,177,211)','rgb(253,180,98)','rgb(179,222,105)','rgb(252,205,229)',
            'rgb(217,217,217)','rgb(188,128,189)','rgb(204,235,197)','rgb(255,237,111)'], // http://colorbrewer2.org/ <3
        RELIGIONS = {buddhist: "Buddhist",christian: "Christian",hindu: "Hindu",jain: "Jain",jewish: "Jewish",multifaith: "Multifaith",
            muslim: "Muslim",shinto: "Shinto",sikh: "Sikh",spiritualist: "Spiritualist",taoist: "Taoist",unitarian_universalist: "Unitarian universalist",
            voodoo: "Voodoo"}; // http://taginfo.openstreetmap.org/api/4/key/values?key=religion&filter=all&lang=en&sortname=count&sortorder=desc

    // Taken from http://underscorejs.org/docs/underscore.html -- debounce(func, timeout, immediate)
    function debounce(g,e,h){function k(){var b=Date.now()-l;b<e&&0<=b?a=setTimeout(k,e-b):(a=null,h||(f=g.apply(c,d),a||(c=d=null)))}
        var a,d,c,l,f;return function(){c=this;d=arguments;l=Date.now();var b=h&&!a;a||(a=setTimeout(k,e));b&&(f=g.apply(c,d),c=d=null);return f}
    }

    function prettifyReligionName( name ) {
        return name.charAt( 0 ).toUpperCase() + name.substring( 1 ).replace( '_', ' ' );
    }

    function serializeXml ( xmlElement ) {
        return ( new XMLSerializer() ).serializeToString( xmlElement );
    }


    function showAndSetupOsmLoginDetail () {
        $( '.osm-login-detail' ).show();
        $( '#osmLogout' ).click( function () {
            authenticatedOsm.logout();
            $( '.osm-login-detail' ).hide();
            return false;
        } );
    }

    changesetId = null;
    changesetIdDate = window.localStorage && window.localStorage['changesetIdDate'] ? new Date( JSON.parse( window.localStorage['changesetIdDate'] ) ) : null;
    function osmApiAddReligionToPlace( place, religion ) {
        var path = OSM_API_PLACE_ENDPOINT.replace( 'TYPE', place.type ).replace( 'ID', place.id );

        console.log( 'Adding religion to place!', place, religion );

        if ( !changesetId ) {
            if ( changesetIdDate && ( new Date() ) - changesetIdDate < 1000 * 60 * 60 ) { // same id for up to 1hr session
                changesetId = +window.localStorage['changesetId'];
                addReligion( changesetId );
                return;
            }

            authenticatedOsm.xhr( {
                method: 'PUT',
                path: OSM_API_CHANGESET_ENDPOINT,
                options: { header: { 'Content-Type': 'text/xml' } },
                content: '<osm>' +
                         '    <changeset>' +
                         '        <tag k="created_by" v="places-of-worship ' + VERSION + '"/>' +
                         '        <tag k="comment" v="Adding religion information"/>' +
                         '    </changeset>' +
                         '</osm>'
            }, function ( err, resp ) {
                if ( err ) {
                    console.log( 'Error creating changeset', err );
                    return;
                }

                // Save date for up to an hour
                if ( window.localStorage ) {
                    window.localStorage['changesetId'] = resp;
                    window.localStorage['changesetIdDate'] = JSON.stringify( new Date() );
                }

                changesetId = +resp;
                addReligion( changesetId );
            } );
        } else {
            addReligion( changesetId );
        }

        function addReligion ( religionChangesetId ) {
            authenticatedOsm.xhr( {
                method: 'GET',
                path: path
            }, function ( err, raw ) {
                var $doc, $node;

                if ( err ) {
                    console.log( 'Error getting entry', err );
                    return;
                }

                $doc = $( $.parseXML( serializeXml( raw ) ) );
                $node = $doc.find( 'node' );

                if ( $node.find( 'tag[k="religion"]' ).length ) {
                    console.log( 'Error: Dying early, a religion is already specified for given entry', $doc );
                    return;
                }

                $node.attr( 'changeset', religionChangesetId );

                // No thanks :P
                $node.removeAttr( 'timestamp' );
                $node.removeAttr( 'user' );
                $node.removeAttr( 'uid' );

                $node.append( '<tag k="religion" v="' + religion + '"/>' );

                authenticatedOsm.xhr( {
                    method: 'PUT',
                    path: path,
                    options: { header: { 'Content-Type': 'text/xml' } },
                    content: serializeXml( $doc.get( 0 ) )
                }, function ( err, resp ) {
                    if ( err ) {
                        console.log( 'Error posting updated entry', err );

                        // If the changeset we have has become invalidated, delete the cached one
                        // and create a brand new changeset instead.
                        if ( err.status === 409 ) {
                            console.log( 'Changeset dead, creating new one & retrying' );
                            changesetId = null;
                            changesetIdDate = null;
                            osmApiAddReligionToPlace( place, religion )
                        }

                        return;
                    }

                    console.log( 'updated successfully!', resp );
                } ); 
            } );
        }
    }

    function generateReligionSelect( id ) {
        var $select = $( '<select>', { id: id } )
            .append( '<option value="" disabled selected>Select a religion</option>' );

        $.each( RELIGIONS, function ( value, name ) {
            $( '<option>', { value: value } ).text( name ).appendTo( $select );
        } );

        return $select.prop( 'outerHTML' );
    }

    mapping = { unknown: UNKNOWN_COLOR };
    mappingIndex = 0;
    function getColor ( name ) {
        if ( !mapping[name] ) {
            mapping[name] = COLORS[mappingIndex];
            mappingIndex++;
            if ( mappingIndex === COLORS.length ) {
                mappingIndex = 0;
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

        function updatePosition () {
            var ll = marker.getLatLng();
            $( '.photon-input' ).attr( 'placeholder', ll.lat.toFixed( 3 ) + ', ' + ll.lng.toFixed( 3 ) )
            window.location.hash = ll.lat.toFixed( 3 ) + ',' + ll.lng.toFixed( 3 );
        }
        marker.on( 'move', updatePosition );

        function autocompleteSelected ( feature ) {
            $( '.photon-input' ).blur();
            marker.setLatLng( [feature.geometry.coordinates[1], feature.geometry.coordinates[0] ] );
            go();
        }

        $( '.photon-input' ).focus();

        $( '.photon-input' ).on( 'keyup blur change', function () {
            $( this ).toggleClass( 'has-content', !!$( this ).val().length );
        } );

        if ( authenticatedOsm.authenticated() ) {
            showAndSetupOsmLoginDetail();
        }

        marker.on( 'click', go );
        marker.once( 'drag', function () { 
            $( '#go' ).css( 'font-weight', 'bold' );
            $( '.photon-input' ).blur();
        } );

        $( '#go' ).click( go );

        function go () {
            var latlng = marker.getLatLng();

            $( document.body ).addClass( 'map-active' );
            render( latlng );

            $( '#intro' )
                .css( {
                    bottom: '-' + ( $( '#intro' ).height() + 20 ),
                    opacity: 0
                } );

            map.flyTo( latlng, 12 );

            setTimeout( function () {
                map.removeLayer( marker );
            }, 1000 );
        }
    }
    init();


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

        NProgress.start();

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

        function error ( data ) {
            sweetAlert( {
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
            data: OVERPASS_API_REQUEST.replace( OVERPASS_BOUNDS_REGEX, bounds.toOverpassBBoxString() )
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

            NProgress.done();
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
    function addMarkers ( results, isUpdatingUnknown ) {
        results.forEach( function ( r ) {
            var name = r.name,
                isUnknown = r.name === 'unknown',
                places = r.places,
                markers = [],
                newPlaces = [],
                color = getColor( r.name );

            places.forEach( function ( place ) {
                var marker, selectorId, latLngString;

                latLngString = place.lat + '' + place.lng;
                if ( isUpdatingUnknown || !groups[name] || ( groups[name].places.indexOf( latLngString ) === -1 && oldUnknownsNowUpdated.indexOf( latLngString ) === -1 ) ) {
                    marker = L.circleMarker( L.latLng( place.lat, place.lng ), { color: color, fill: true, fillColor: color, fillOpacity: 0.8 } );
                    marker.bindPopup( DEFAULT_POPUP_CONTENT );
                    marker.once( 'click', function () {
                        var marker = this,
                            content = '<div class="name">' + place.name + '</div>' +
                            '<div><div>' + prettifyReligionName( r.name ) + '</div><div><a target="_blank" href="' + OSM_LINK_FORMAT.replace( 'TYPE', place.type ).replace( 'ID', place.id ) + '">View/edit on OpenStreetMap</a></div></div>';

                        if ( isUnknown ) {
                            selectorId = 'religionSelect' + religionSelectIndex++;
                            content += '<div class="no-data">' +
                                'We don\'t have data about what religion is associated with this place of worship. Do you know?' +
                                '<div class="options">' +
                                    generateReligionSelect( selectorId ) +
                                    '<button id="submit' + selectorId + '">Submit</button>' +
                                '</div>'
                            '</div>';
                        }

                        marker.getPopup().setContent( content );

                        if ( isUnknown ) {
                            function popupOpen () {
                                $( '#submit' + selectorId ).click( function () {
                                    var val = $( '#' + selectorId ).val();

                                    if ( !val ) {
                                        return;
                                    }

                                    if ( authenticatedOsm.authenticated() ) {
                                        osmApiAddReligionToPlace( place, val );
                                        updateMap();
                                    } else {
                                        sweetAlert( {
                                            title: 'First things first',
                                            html: true,
                                            text: '<div class="osm-detail"><p>Religion information is stored in OpenStreetMap. ' +
                                            'After clicking the button below, you\'ll be brought to a screen where you can login (or create an account) ' +
                                            'and authorize Places of Worship to make edits on your behalf.</p>' +
                                            '<p>Only changes that you explicitly initiate&mdash;updates to the religion of a particular ' +
                                            'location&mdash;will be made, and you can revoke access at any time.</p>' +
                                            '<p>By updating the data on OpenStreetMap, you\'ll be contributing not only to the visualization, ' +
                                            'but also to the countless other services and tools powered by OpenStreetMap.</p>',
                                            showCancelButton: true,
                                            type: 'info',
                                            confirmButtonText: 'Show authorization screen',
                                            cancelButtonText: 'Never mind'
                                        }, function ( okay ) {
                                            if ( okay ) {
                                                authenticatedOsm.authenticate( function () {
                                                    showAndSetupOsmLoginDetail();
                                                    osmApiAddReligionToPlace( place, val );
                                                    updateMap();
                                                } );
                                            }
                                        } );
                                    }

                                    function updateMap () {
                                        marker.closePopup();
                                        groups[name].group.removeLayer( marker );
                                        groups[name].places.splice( groups[name].places.indexOf( latLngString ), 1 );
                                        oldUnknownsNowUpdated.push( latLngString );
                                        addMarkers( [ {
                                            name: val,
                                            places: [ place ]
                                        } ], /* isUpdatingUnknown */ true );
                                        addControl();
                                    }

                                } );
                            }
                            popupOpen();
                            marker.on( 'popupopen', popupOpen );
                        }
                    } );

                    newPlaces.push( latLngString );
                    markers.push( marker );
                }
            } );

            if ( groups[name] ) {
                markers.forEach( function ( m ) {
                    groups[name].group.addLayer( m );
                } );
                groups[name].places = groups[name].places.concat( newPlaces );
            } else {
                groups[name] = { color: color, places: newPlaces, group: L.featureGroup( markers ).addTo( map ) }; 
            }
        } );

        console.log( '----\nmarkers added' );
        $.each( groups, function ( k, v ) {
            console.log(k + ': ' + ( v.group._layers ? Object.keys( v.group._layers ).length : 0));
        } );
    }


    control = null;
    states = {};
    function addControl () {
        var overlays = {};

        function makeHtml( name, g ) {
            return '<span class="group" data-name="' + name + '" style="background-color: ' + g.color + '">' + prettifyReligionName( name ) + '</span>'
        }

        if ( !control ) {
            $.each( groups, function ( name, g ) {
                overlays[ makeHtml( name, g ) ] = g.group;
            } );

            control = L.control.layers( {}, overlays, {
                collapsed: false
            } ).addTo( map );

            $( '.leaflet-control-layers-overlays' )
                .tooltipster( {
                    content: 'Click to change visibility until clicked again. Double-click to hide all other religions (double-click again to show all religions).',
                    position: 'left',
                    maxWidth: 300
                } );
        } else {
            $.each( groups, function ( name, g ) {
                if ( !control._layers[ L.stamp( g.group ) ] ) {
                    control.addOverlay( g.group, makeHtml( name, g ) );
                    $( '.leaflet-control-layers-overlays' )
                        .tooltipster( 'reposition' );
                }
            } );
        }

        $.each( groups, function ( name, g ) {
            if ( !states[name] ) {
                states[name] = {
                    groupSelector: '.leaflet-control-layers-overlays .group[data-name="' + name + '"]',
                    inputSelector: '.leaflet-control-layers-overlays .input[data-name="' + name + '"]',
                    isHidden: false,
                    isHovered: false,
                    isInDoubleClickSoloMode: false
                }
            }
        } );

        $( '.leaflet-control-layers-overlays .group' )
            .not( '.dblclick-enabled' )
            .addClass( 'dblclick-enabled' )
            .dblclick( function () {
                var name = $( this ).data( 'name' ),
                    isInDoubleClickSoloMode = !states[name].isInDoubleClickSoloMode;

                // End all previous double-click-solos
                $.each( states, function ( _, data ) { data.isInDoubleClickSoloMode = false; } );
                states[name].isInDoubleClickSoloMode = isInDoubleClickSoloMode;

                $.each( states, function ( name, data ) {
                    if ( !data.isInDoubleClickSoloMode && isInDoubleClickSoloMode ) {
                        data.isHidden = true;
                        $( data.groupSelector )
                            .removeClass( 'temp-disabled' )
                            .parent().parent().children( 'input' ).prop( 'checked', false );
                    } else {
                        data.isHidden = false;
                        $( data.groupSelector ).parent().parent().children( 'input' ).prop( 'checked', true );
                    }
                } );

                setTimeout( function () { control._onInputClick() }, 0 );
            } );

        $( '.leaflet-control-layers-overlays input' )
            .not( '.input' )
            .addClass( 'input' )
            .each( function () {
                var name = $( this ).parent().find( '.group' ).data( 'name' );
                $( this )
                    .prop( 'checked', !states[name].isHidden )
                    .data( 'name', name );
            } );

        setTimeout( function () { control._onInputClick() }, 0 );

        $( '.leaflet-control-layers-overlays' ).on( 'mouseleave', function ( e ) {
            $.each( states, function ( name, data ) {
                states[name].isHovered = false;
                $( data.groupSelector )
                    .removeClass( 'temp-disabled' )
                    .parent().parent().children( 'input' ).prop( 'checked', !data.isHidden );
            } );
            setTimeout( function () { control._onInputClick() }, 0 );
        } )

        $( '.leaflet-control-layers-overlays' ).on( 'mouseover', function ( e ) {
            $.each( states, function ( name, data ) {
                if ( $( e.target ).is( data.groupSelector ) ) {
                    states[name].isHovered = true;
                    if ( !states[name].isHidden ) {
                        $( data.groupSelector )
                            .removeClass( 'temp-disabled' )
                            .parent().parent().children( 'input' ).prop( 'checked', true );
                    }
                } else {
                    states[name].isHovered = false;
                    $( data.groupSelector )
                        .toggleClass( 'temp-disabled', !states[name].isHidden )
                        .parent().parent().children( 'input' ).prop( 'checked', false );
                }
            } );
            setTimeout( function () { control._onInputClick() }, 0 );
        } );

        $( '.leaflet-control-layers-overlays input' )
            .click( function () {
                states[ $( this ).data( 'name' ) ].isHidden = !$( this ).prop( 'checked' );
            } );
    }

    function purge() {
        var circle = L.circle( map.getCenter(), DEFAULT_PURGE_RADIUS, {
                    opacity: 0
                } ).addTo( map ),
            bounds = circle.getBounds().extend( map.getBounds() );

        map.removeLayer( circle );

        $.each( groups, function ( _, g ) {
            var layer = g.group;

            // Remove markers that are far out of the viewport
            layer.eachLayer( function ( marker ) {
                var latlng = marker.getLatLng();
                if ( !bounds.contains( latlng ) ) {
                    layer.removeLayer( marker );
                    g.places.splice( g.places.indexOf( latlng.lat + '' + latlng.lng ), 1 );
                }
            } );

            // Remove controls for layers that no longer have any markers
            if ( layer._layers && Object.keys( layer._layers ).length === 0 ) {
                map.removeLayer( layer );
                control.removeLayer( layer );
                addControl(); // Force update
            }

        } );
    }
    setInterval( purge, 5000 );

}( jQuery, L, NProgress ) );
