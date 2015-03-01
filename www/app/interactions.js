define( [ 'jquery', './renderer/main', './map', './ui', './services/analytics' ], function ( $, renderer, map, ui, analytics ) {
    var isEnabled = false;

    function enable () {
        isEnabled = true;

        $( '#geolocate' ).click( function () {
            ui.progress.start();
            map.geolocate( function ( err, latlng ) {
                if ( !err ) {
                    analytics.send( 'geolocateSelected', latlng.toString() );
                    renderer.renderAtLatLng( latlng );
                }
            } );
            return false;
        } );

        map.addHandler( 'locationSelected', function ( feature ) {
            analytics.send( 'locationSelected', feature.properties.name );
            renderer.renderAtLatLng( [ feature.geometry.coordinates[1], feature.geometry.coordinates[0] ] );
        } );

        map.getMap().on( 'dblclick', function ( e ) {
            analytics.send( 'latLngSelected', e.latlng.toString() );
            renderer.renderAtLatLng( e.latlng );
        } );
    }

    return {
        enable: enable
    };
} );