define( [ 'leaflet', 'jquery', './core', '../util' ], function ( L, $, core, util ) {
    var lMap = core.getMap(),
        control = null;

    function update ( groups ) {
        var overlays = {};

        function makeHtml( name, g ) {
            return '<span class="group" data-name="' + name + '" style="background-color: ' + g.color + '">' + util.prettifyReligionName( name ) + '</span>'
        }

        if ( !control ) {
            $.each( groups, function ( name, g ) {
                overlays[ makeHtml( name, g ) ] = g.group;
            } );

            control = L.control.layers( {}, overlays, {
                collapsed: false
            } ).addTo( lMap );
        } else {
            $.each( groups, function ( name, g ) {
                if ( !control._layers[ L.stamp( g.group ) ] ) {
                    control.addOverlay( g.group, makeHtml( name, g ) );
                }
            } );
        }
    }

    return {
        update: update,
        getControl: function () { return control; }
    };
} );
