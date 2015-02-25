define( [ 'osmauth' ], function ( osmAuth ) {
    var instance = osmAuth({
        oauth_consumer_key: 'odmQFDLgsfm7UB3GlCIpGV6Q8eX6ZlSqNlxrTT6M',
        oauth_secret: 'NLHjFqxVtYfNWqA1Ayilsf47Et9uqppFPvDJtCzu',
        url: 'https://www.openstreetmap.org',
        landing: IS_PRODUCTION ? 'land.html' : 'lib/osmauth.land.html'
    } );

    return {
        getInstance: function () { return instance; }
    };
} );