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
        },
        'jquery.tooltipster': {
            deps: [ 'jquery' ]
        }
    }
} );

requirejs( [ 'app/main' ] );
