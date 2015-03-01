requirejs.config( {
    baseUrl: 'lib',
    paths: {
        app: '../app'
    },
    shim: {
        leaflet: {
            exports: 'L'
        },
        'leaflet.photon': {
            deps: [ 'leaflet' ]
        }
    }
} );

requirejs( [ 'app/main' ] );
