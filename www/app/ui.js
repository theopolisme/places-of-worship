define( [ 'jquery', 'nprogress', 'sweet-alert', 'events', './map' ], function ( $, NProgress, sweetAlert, Events, map ) {
    var justSetState = false,
        events = Events();    

    function setupFlyMapOnHashChange () {
        $( window ).on( 'hashchange', function () {
            var hashState;

            if ( justSetState ) {
                justSetState = false;
                return;
            }

            hashState = getHashState();
            if ( hashState.latlng ) {
                events.fire( 'shouldRender', hashState.latlng, hashState.zoom );
            }
        } );
        $( window ).trigger( 'hashchange' );
    }

    function getHashState () {
        var hashItems, latlng, zoom;

        if ( window.location.hash && window.location.hash.indexOf( '#/vis/' ) === 0 ) {
            hashItems = window.location.hash.split( '/' );
            latlng = hashItems[2].split( ',' );
            zoom = +hashItems[3];
            return {
                latlng: latlng,
                zoom: zoom
            };
        }

        return {
            latlng: null,
            zoom: null
        };
    }

    function updateState ( latlng, zoom ) {
        window.location.hash = '/vis/' + latlng.lat.toFixed( 3 ) + ',' + latlng.lng.toFixed( 3 ) + '/' + zoom;
        $( '.photon-input' ).attr( 'placeholder', latlng.lat.toFixed( 3 ) + ', ' + latlng.lng.toFixed( 3 ) );
        justSetState = true;
    }

    function showOsmLoggedIn () {
        $( '.osm-login-detail' ).show();
        $( '#osmLogout' ).click( function () {
            events.fire( 'osmLogoutClick' );
            $( '.osm-login-detail' ).hide();
            return false;
        } );
    }

    function onFirstRenderStart () {
        $( document.body ).addClass( 'rendering' );
        $( '#intro' )
            .css( {
                bottom: '-' + ( $( '#intro' ).height() + 20 ),
                opacity: 0
            } );
    }

    function onFirstRenderEnd () {
        $( document.body ).removeClass( 'rendering' );
        $( document.body ).addClass( 'rendered' );
    }

    return {
        progress: NProgress,
        alert: sweetAlert,
        showOsmLoggedIn: showOsmLoggedIn,
        addOsmLogoutClickHandler: function ( cb ) {
            events.on( 'osmLogoutClick', cb );
        },
        addRenderHandler: function ( cb ) {
            events.on( 'shouldRender', cb );
        },
        firstRenderStart: onFirstRenderStart,
        firstRenderEnd: onFirstRenderEnd,
        setBodyClass: function ( className, toggle ) {
            $( document.body ).toggleClass( className, typeof toggle === 'undefined' ? true : toggle );
        },
        setupFlyMapOnHashChange: setupFlyMapOnHashChange,
        updateState: updateState
    }
} );
