define( [ 'jquery', 'nprogress', 'sweet-alert', 'events', './map' ], function ( $, NProgress, sweetAlert, Events, map ) {
    var justSetState = false,
        events = Events();    

    function setupFlyMapOnHashChange () {
        $( window ).on( 'hashchange', function () {
            if ( justSetState ) {
                justSetState = false;
            } else if ( getStateLatLng() ) {
                events.fire( 'shouldRender', getStateLatLng() );
            } else {
                console.log( 'Unrecognized hash...' );
            }
        } );
        $( window ).trigger( 'hashchange' );
    }

    function getStateLatLng () {
        var latlng;

        if ( window.location.hash && window.location.hash.indexOf( '#/vis/' ) === 0 ) {
            latlng = window.location.hash.substring( 6 ).split( ',' );
            if ( latlng.length !== 0 ) {
                return latlng;
            }
        }

        return null;
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
        getStateLatLng: getStateLatLng,
        updateState: function ( latlng ) {
            window.location.hash = '/vis/' + latlng.lat.toFixed( 3 ) + ',' + latlng.lng.toFixed( 3 );
            $( '.photon-input' ).attr( 'placeholder', latlng.lat.toFixed( 3 ) + ', ' + latlng.lng.toFixed( 3 ) );
            justSetState = true;
        }
    }
} );
