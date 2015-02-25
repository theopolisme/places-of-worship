define( [ 'leaflet', 'jquery', 'jquery.tooltipster', './core', '../util' ], function ( L, $, _, core, util ) {
    var lMap = core.getMap(),
        control = null,
        states = {};

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

            $( '.leaflet-control-layers-overlays' )
                .tooltipster( {
                    content: 'Click to change visibility until clicked again. Double-click to hide all other religions (double-click again to show all religions).',
                    position: 'left',
                    maxWidth: 300
                } );
        } else {
            $.each( groups, function ( name, g ) {
                if ( !control._layers[ L.stamp( g.group ) ] ) {
                    control.addOverlay( g.group, makeHtml( name, g ) );
                    $( '.leaflet-control-layers-overlays' )
                        .tooltipster( 'reposition' );
                }
            } );
        }

        $.each( groups, function ( name, g ) {
            if ( !states[name] ) {
                states[name] = {
                    groupSelector: '.leaflet-control-layers-overlays .group[data-name="' + name + '"]',
                    inputSelector: '.leaflet-control-layers-overlays .input[data-name="' + name + '"]',
                    isHidden: false,
                    isHovered: false,
                    isInDoubleClickSoloMode: false
                }
            }
        } );

        $( '.leaflet-control-layers-overlays .group' )
            .not( '.dblclick-enabled' )
            .addClass( 'dblclick-enabled' )
            .dblclick( function () {
                var name = $( this ).data( 'name' ),
                    isInDoubleClickSoloMode = !states[name].isInDoubleClickSoloMode;

                // End all previous double-click-solos
                $.each( states, function ( _, data ) { data.isInDoubleClickSoloMode = false; } );
                states[name].isInDoubleClickSoloMode = isInDoubleClickSoloMode;

                $.each( states, function ( name, data ) {
                    if ( !data.isInDoubleClickSoloMode && isInDoubleClickSoloMode ) {
                        data.isHidden = true;
                        $( data.groupSelector )
                            .removeClass( 'temp-disabled' )
                            .parent().parent().children( 'input' ).prop( 'checked', false );
                    } else {
                        data.isHidden = false;
                        $( data.groupSelector ).parent().parent().children( 'input' ).prop( 'checked', true );
                    }
                } );

                setTimeout( function () { control._onInputClick() }, 0 );
            } );

        $( '.leaflet-control-layers-overlays input' )
            .not( '.input' )
            .addClass( 'input' )
            .each( function () {
                var name = $( this ).parent().find( '.group' ).data( 'name' );
                $( this )
                    .prop( 'checked', !states[name].isHidden )
                    .data( 'name', name );
            } );

        setTimeout( function () { control._onInputClick() }, 0 );

        $( '.leaflet-control-layers-overlays' ).on( 'mouseleave', function ( e ) {
            $.each( states, function ( name, data ) {
                states[name].isHovered = false;
                $( data.groupSelector )
                    .removeClass( 'temp-disabled' )
                    .parent().parent().children( 'input' ).prop( 'checked', !data.isHidden );
            } );
            setTimeout( function () { control._onInputClick() }, 0 );
        } )

        $( '.leaflet-control-layers-overlays' ).on( 'mouseover', function ( e ) {
            $.each( states, function ( name, data ) {
                if ( $( e.target ).is( data.groupSelector ) ) {
                    states[name].isHovered = true;
                    if ( !states[name].isHidden ) {
                        $( data.groupSelector )
                            .removeClass( 'temp-disabled' )
                            .parent().parent().children( 'input' ).prop( 'checked', true );
                    }
                } else {
                    states[name].isHovered = false;
                    $( data.groupSelector )
                        .toggleClass( 'temp-disabled', !states[name].isHidden )
                        .parent().parent().children( 'input' ).prop( 'checked', false );
                }
            } );
            setTimeout( function () { control._onInputClick() }, 0 );
        } );

        $( '.leaflet-control-layers-overlays input' )
            .click( function () {
                states[ $( this ).data( 'name' ) ].isHidden = !$( this ).prop( 'checked' );
            } );
    }

    return {
        update: update,
        getControl: function () { return control; }
    };
} );
