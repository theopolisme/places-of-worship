define( [ 'jquery', './renderer/main', './map', './ui' ], function ( $, renderer, map, ui ) {
    var isEnabled = false;

    function enable () {
        isEnabled = true;

        $( '#geolocate' ).click( function () {
            ui.progress.start();
            map.geolocate( function ( err, latlng ) {
                if ( !err ) {
                    renderer.renderAtLatLng( latlng );
                }
            } );
            return false;
        } );

        map.addHandler( 'locationSelected', function ( feature ) {
            renderer.renderAtLatLng( [ feature.geometry.coordinates[1], feature.geometry.coordinates[0] ] );
        } );
    }

    return {
        enable: enable
    };
} );