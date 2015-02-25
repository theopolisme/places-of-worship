module.exports = function ( grunt ) {
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
    grunt.loadNpmTasks( 'grunt-targethtml' );
    grunt.loadNpmTasks( 'grunt-htmlclean' );
    grunt.loadNpmTasks('grunt-gh-pages');

    grunt.initConfig( {
        requirejs: {
            build: {
                options: {
                    mainConfigFile: 'www/app.js',
                    baseUrl: 'www/lib',
                    include: [ 'almond', 'app' ],
                    out: 'build/app.min.js'
                }
            }
        },
        targethtml: {
            build: {
                files: {
                    'build/index.html': [ 'www/index.html' ]
                }
            }
        },
        cssmin: {
            build: {
                files: {
                    'build/app.min.css': [ 'www/**/*.css' ]
                }
            }
        },
        htmlclean: {
            build: {
                files: {
                    'build/index.html': [ 'build/index.html' ],
                    'build/land.html': [ 'www/lib/osmauth.land.html' ] 
                }
            }
        },
        'gh-pages': {
            deploy: {
                options: {
                  base: 'build',
                  message: 'Sync'
                },
                src: ['**']
            }
        }
    } );

    grunt.registerTask( 'build', [
        'requirejs:build', 'targethtml:build', 'cssmin:build', 'htmlclean:build'
    ] );

    grunt.registerTask( 'deploy', [
        'build', 'gh-pages:deploy'
    ] );
};
