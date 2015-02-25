define( [ './core' ], function ( core ) {
    var instance = core.getInstance(),
        changesetId = null,
        changesetIdDate = window.localStorage && window.localStorage['changesetIdDate'] ?
            new Date( JSON.parse( window.localStorage['changesetIdDate'] ) ) : null;

    return {
        invalidateChangeset: function () {
            changesetId = null;
            changesetIdDate = null;
        },
        getChangeset: function ( cb ) {
            if ( changesetId ) {
                cb( changesetId );

            } else if ( changesetIdDate && ( new Date() ) - changesetIdDate < 1000 * 60 * 60 ) { // same id for up to 1hr session
                changesetId = +window.localStorage['changesetId'];
                cb( changesetId );

            } else {
                instance.xhr( {
                    method: 'PUT',
                    path: OSM_API_CHANGESET_ENDPOINT,
                    options: { header: { 'Content-Type': 'text/xml' } },
                    content: '<osm>' +
                             '    <changeset>' +
                             '        <tag k="created_by" v="places-of-worship ' + VERSION + '"/>' +
                             '        <tag k="comment" v="Adding religion information"/>' +
                             '    </changeset>' +
                             '</osm>'
                }, function ( err, resp ) {
                    if ( err ) {
                        console.log( 'Error creating changeset', err );
                        return;
                    }

                    // Save date for up to an hour
                    if ( window.localStorage ) {
                        window.localStorage['changesetId'] = resp;
                        window.localStorage['changesetIdDate'] = JSON.stringify( new Date() );
                    }

                    changesetId = +resp;
                    cb( changesetId );
                } );
            }
        }
    }
} );