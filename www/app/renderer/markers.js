define( [ 'leaflet', './core', './control', '../ui', '../util', '../services/osm/actions' ], function ( L, core, control, ui, util, osmActions ) {
    var DEFAULT_POPUP_CONTENT = '<span class="popup-loading">Loading details...</span>',
        OSM_LINK_FORMAT = 'https://www.openstreetmap.org/TYPE/ID',

        lMap = core.getMap(),

        religionSelectIndex = 0,
        oldUnknownsNowUpdated = [],
        groups = {};

    function update ( results, isUpdatingUnknown ) {
        results.forEach( function ( r ) {
            var name = r.name,
                isUnknown = r.name === 'unknown',
                places = r.places,
                markers = [],
                newPlaces = [],
                color = util.getColor( r.name );

            places.forEach( function ( place ) {
                var marker, selectorId, latLngString;

                latLngString = place.lat + '' + place.lng;
                if ( isUpdatingUnknown || !groups[name] || ( groups[name].places.indexOf( latLngString ) === -1 && oldUnknownsNowUpdated.indexOf( latLngString ) === -1 ) ) {
                    marker = L.circleMarker( L.latLng( place.lat, place.lng ), { color: color, fill: true, fillColor: color, fillOpacity: 0.8 } );
                    marker.bindPopup( DEFAULT_POPUP_CONTENT );
                    marker.once( 'click', function () {
                        var marker = this,
                            content = '<div class="name">' + place.name + '</div>' +
                            '<div><div>' + util.prettifyReligionName( r.name ) + '</div><div><a target="_blank" href="' + OSM_LINK_FORMAT.replace( 'TYPE', place.type ).replace( 'ID', place.id ) + '">View/edit on OpenStreetMap</a></div></div>';

                        if ( isUnknown ) {
                            selectorId = 'religionSelect' + religionSelectIndex++;
                            content += '<div class="no-data">' +
                                'We don\'t have data about what religion is associated with this place of worship. Do you know?' +
                                '<div class="options">' +
                                    util.generateReligionSelect( selectorId ) +
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

                                    if ( osmActions.isAuthenticated() ) {
                                        osmActions.addReligionToPlace( place, val );
                                        updateMap();
                                    } else {
                                        ui.alert( {
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
                                                osmActions.authenticate( function () {
                                                    osmActions.addReligionToPlace( place, val );
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
                                        update( [ {
                                            name: val,
                                            places: [ place ]
                                        } ], /* isUpdatingUnknown */ true );
                                        control.update( groups );
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
                groups[name] = { color: color, places: newPlaces, group: L.featureGroup( markers ).addTo( lMap ) }; 
            }
        } );
    }

    return {
        getGroups: function () { return groups; },
        update: update
    }
} );
