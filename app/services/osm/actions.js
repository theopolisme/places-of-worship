define( [ './core', './changeset', '../../ui' ], function ( core, changeset, ui ) {
    var OSM_LINK_FORMAT = 'https://www.openstreetmap.org/TYPE/ID',
        OSM_API_CHANGESET_ENDPOINT = '/api/0.6/changeset/create',
        OSM_API_PLACE_ENDPOINT = '/api/0.6/TYPE/ID';

    function addReligionToPlace ( place, religion ) {
        var path = OSM_API_PLACE_ENDPOINT
            .replace( 'TYPE', place.type )
            .replace( 'ID', place.id );

        changeset.getChangeset( function ( religionChangesetId ) {
            core.getInstance().xhr( {
                method: 'GET',
                path: path
            }, function ( err, raw ) {
                var $doc, $node;

                if ( err ) {
                    console.log( 'Error getting entry', err );
                    return;
                }

                $doc = $( $.parseXML( serializeXml( raw ) ) );
                $node = $doc.find( 'node' );

                if ( $node.find( 'tag[k="religion"]' ).length ) {
                    console.log( 'Error: Dying early, a religion is already specified for given entry', $doc );
                    return;
                }

                $node.removeAttr( 'timestamp' );
                $node.removeAttr( 'user' );
                $node.removeAttr( 'uid' );

                $node.attr( 'changeset', religionChangesetId );
                $node.append( '<tag k="religion" v="' + religion + '"/>' );

                core.getInstance().xhr( {
                    method: 'PUT',
                    path: path,
                    options: { header: { 'Content-Type': 'text/xml' } },
                    content: serializeXml( $doc.get( 0 ) )
                }, function ( err, resp ) {
                    if ( err ) {
                        console.log( 'Error posting updated entry', err );
                        // If the changeset we have has become invalidated, delete the cached one
                        // and create a brand new changeset instead.
                        if ( err.status === 409 ) {
                            console.log( 'Changeset dead, creating new one & retrying' );
                            changeset.invalidateChangeset();
                            addReligionToPlace( place, religion );
                        }
                        return;
                    }

                    console.log( 'updated successfully!', resp );
                } ); 
            } );
        } );
    }

    return {
        authenticate: function ( cb ) {
            core.getInstance().authenticate( function () {
                ui.showOsmLoggedIn();
                cb.apply( null, arguments );
            } );
        },
        isAuthenticated: core.getInstance().authenticated,
        addReligionToPlace: addReligionToPlace,
        makeLinkToPlace: function ( place ) {
            return OSM_LINK_FORMAT
                .replace( 'TYPE', place.type )
                .replace( 'ID', place.id );
        }
    }
} );