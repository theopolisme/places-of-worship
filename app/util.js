define( [ 'jquery' ], function ( $ ) {
    var COLORS = ['rgb(31,120,180)','rgb(178,223,138)',/*'rgb(51,160,44)', too dark*/'rgb(251,154,153)','rgb(227,26,28)','rgb(253,191,111)',
            'rgb(255,127,0)','rgb(202,178,214)','rgb(106,61,154)','rgb(255,255,153)','rgb(177,89,40)','rgb(141,211,199)','rgb(255,255,179)',
            'rgb(190,186,218)','rgb(251,128,114)','rgb(128,177,211)','rgb(253,180,98)','rgb(179,222,105)','rgb(252,205,229)',
            'rgb(217,217,217)','rgb(188,128,189)','rgb(204,235,197)','rgb(255,237,111)'], // http://colorbrewer2.org/ <3
        RELIGIONS = {buddhist: "Buddhist",christian: "Christian",hindu: "Hindu",jain: "Jain",jewish: "Jewish",multifaith: "Multifaith",
            muslim: "Muslim",shinto: "Shinto",sikh: "Sikh",spiritualist: "Spiritualist",taoist: "Taoist",unitarian_universalist: "Unitarian universalist",
            voodoo: "Voodoo"}, // http://taginfo.openstreetmap.org/api/4/key/values?key=religion&filter=all&lang=en&sortname=count&sortorder=desc
        UNKNOWN_COLOR = 'rgb(189,189,189)',

        mapping = { unknown: UNKNOWN_COLOR };
        mappingIndex = 0;

    function getColor ( name ) {
        if ( !mapping[name] ) {
            mapping[name] = COLORS[mappingIndex];
            mappingIndex++;
            if ( mappingIndex === COLORS.length ) {
                mappingIndex = 0;
            }
        }
        return mapping[name];
    }

    return {
        getColor: getColor,
        // debounce(func, timeout, immediate)
        debounce: function (g,e,h){function k(){var b=Date.now()-l;b<e&&0<=b?a=setTimeout(k,e-b):(a=null,h||(f=g.apply(c,d),a||(c=d=null)))}
            var a,d,c,l,f;return function(){c=this;d=arguments;l=Date.now();var b=h&&!a;a||(a=setTimeout(k,e));b&&(f=g.apply(c,d),c=d=null);return f}
        },
        prettifyReligionName: function ( name ) {
        return name.charAt( 0 ).toUpperCase() + name.substring( 1 ).replace( '_', ' ' );
        },
        serializeXml: function ( xmlElement ) {
            return ( new XMLSerializer() ).serializeToString( xmlElement );
        },
        generateReligionSelect: function ( id ) {
            var $select = $( '<select>', { id: id } )
                .append( '<option value="" disabled selected>Select a religion</option>' );

            $.each( RELIGIONS, function ( value, name ) {
                $( '<option>', { value: value } ).text( name ).appendTo( $select );
            } );

            return $select.prop( 'outerHTML' );
        }
    };
} );