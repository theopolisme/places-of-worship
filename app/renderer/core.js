define( [ '../map', '../services/overpass' ], function ( map, overpass, ui ) {
    var lMap = map.getMap();

    return {
        getMap: function () { return lMap; },
        lookup: function ( latlngOrBounds, cb ) {
            overpass.lookup( latlngOrBounds ).done( function ( results ) {
                cb( results );
            } );
        } 
    };
} );
