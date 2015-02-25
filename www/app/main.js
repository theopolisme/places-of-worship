define( [  './map', './interactions', './ui', './services/osm/main', './renderer/main' ], function ( map, interactions, ui, osm, renderer ) {
    map.init();
    interactions.enable();
    renderer.init();
    osm.init();
    ui.setupFlyMapOnHashChange();
} );
