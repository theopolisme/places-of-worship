define( [ 'leaflet', 'leaflet.photon', 'events' ], function ( L, _, Events ) {
    var map, photonControl,
        events = Events();

    function init () {
        map = L.map( 'map', {
            worldCopyJump: true,
        } ).setView( [0, 0], 2 );

        // We use double-click to fly to points instead
        map.doubleClickZoom.disable();

        photonControl = new L.Control.Photon( {
            url: 'https://photon.komoot.de/api/?',
            placeholder: 'Fly to...',
            noResultLabel: 'No results found.',
            includePosition: false,
            feedbackEmail: null,
            onSelected: function ( location ) {
                events.fire( 'locationSelected', location );
            }
        } )
            .on( 'ajax:send', events.fire.bind( events, 'autocompleteLookupStart' ) )
            .on( 'ajax:return', events.fire.bind( events, 'autocompleteLookupEnd' ) )
            .addTo( map );

        L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 16,
            minZoom: 2
        } ).addTo( map );
    }
    init();

    return {
        init: function () { return true; },
        getMap: function () { return map; },
        addHandler: function ( name, cb ) {
            events.on( name, cb );
        },
        getBoundsOfCircleFromLatLng: function ( latlng, radius ) {
            circle = L.circle( latlng, radius, {
                opacity: 0
            } ).addTo( map );
            bounds = circle.getBounds();
            map.removeLayer( circle );
            return bounds;
        },
        geolocate: function ( cb ) {
            map.locate();
            map.once( 'locationfound', function ( e ) {
                map.off( 'locationfound locationerror' );
                cb( false, e.latlng );
            } );
            map.once( 'locationerror', function ( e ) {
                map.off( 'locationfound locationerror' );
                cb( true, e );
            } );
        }
    };
} );