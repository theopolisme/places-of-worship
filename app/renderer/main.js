define( [ './core', './markers', './control', './purge', '../ui', '../util' ],
    function ( core, markers, control, purge, ui, util ) {

    var isFirstRender = true,
        lMap = core.getMap();  

    function update ( results ) {
        markers.update( results );
        control.update( markers.getGroups() );
    }

    function addHandlers () {
        lMap.on( 'move drag', util.debounce( function () {
            ui.updateState( lMap.getCenter() );
        }, 100 ) );

        lMap.on( 'moveend', util.debounce( function () {
            core.lookup( lMap.getBounds(), update );
        }, 50, /* immediate */ true ) );
    }

    function renderAtLatLng ( latlng ) {
        lMap.flyTo( latlng, 12 );
        if ( isFirstRender ) {
            addHandlers();
            ui.firstRenderStart();
        }
        core.lookup( latlng, function ( results ) {
            update( results );
            if ( isFirstRender ) {
                ui.firstRenderEnd();
                isFirstRender = false;
            }
        } );
    }

    return {
        renderAtLatLng: renderAtLatLng,
        purge: purge.purge,
        init: function () {
            ui.addRenderHandler( renderAtLatLng );
            purge.startAutoPurge();
        },
        update: update
    }
} );