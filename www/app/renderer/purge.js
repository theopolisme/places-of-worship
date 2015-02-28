define( [ 'leaflet', './core', './markers', './control' ], function ( L, core, markers, control ) {
    var MS_BETWEEN_PURGES = 5000,
        DEFAULT_PURGE_RADIUS = 100000,
        lMap = core.getMap();

    function purge () {
        var groups = markers.getGroups(),
            circle = L.circle( lMap.getCenter(), DEFAULT_PURGE_RADIUS, {
                    opacity: 0
                } ).addTo( lMap ),
            bounds = circle.getBounds().extend( lMap.getBounds() );

        lMap.removeLayer( circle );

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
                lMap.removeLayer( layer );
                control.getControl().removeLayer( layer );
                control.update();
            }

        } );
    }

    return {
        purge: purge,
        startAutoPurge: function () {
            setInterval( purge, MS_BETWEEN_PURGES );
        }
    };
} );
