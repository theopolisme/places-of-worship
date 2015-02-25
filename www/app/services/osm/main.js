define( [ '../../ui', './actions' ], function ( ui, actions ) {
    var isInitialized = false;

    function init () {
        isInitialized = true;
        ui.addOsmLogoutClickHandler( function () {
            actions.logout();
        } );

        if ( actions.isAuthenticated() ) {
            ui.showOsmLoggedIn();
        }
    }

    return {
        init: function () {
            if ( !isInitialized ) {
                init();
            }
        }
    };
} );
