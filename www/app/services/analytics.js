define( [ /* google-analytics */ ], function () {
    var handlers;

    if ( !IS_PRODUCTION ) {
        ga = function () {
            console.log.apply( console, arguments );
        }
    }

    handlers = {
        locationSelected: function ( name ) {
            ga( 'send', 'event', {
                eventCategory: 'Interactions',
                eventAction: 'Location selected',
                eventLabel: name
            } );
        }
    };

    return {
        send: function ( type, data ) {
            if ( handlers[type] ) {
                handlers[type]( data );
            }
        }
    };
} );
