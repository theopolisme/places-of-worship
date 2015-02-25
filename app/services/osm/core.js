define( [ 'osmauth' ], function ( osmAuth ) {
    var instance = osmAuth({
        oauth_consumer_key: 'odmQFDLgsfm7UB3GlCIpGV6Q8eX6ZlSqNlxrTT6M',
        oauth_secret: 'NLHjFqxVtYfNWqA1Ayilsf47Et9uqppFPvDJtCzu',
        url: 'http://www.openstreetmap.org',
        landing: 'lib/osmauth.land.html'
    } );

    return {
        getInstance: function () { return instance; }
    };
} );