/*eslint-disable */

var fs = require('fs');

var version = require('./package.json').version;

var HTML_HEAD = fs.readFileSync('./jsduck-config/head.html').toString();
var CSS = fs.readFileSync('./jsduck-config/style.css').toString();

/* Insure that browserify and babelify generated code does not get counted against our test coverage */
var through = require('through');
function fixBrowserifyForIstanbul(file) {
    var data = '';
    return through(write, end);

    function write (buf) {
        data += buf;
    }
    function end () {
      var lines = data.split(/\n/);


      for (var i = 0; i < lines.length; i++) {
        if (lines[i].match(/\/\*\*/)) {
          break;
        }

        lines[i] = lines[i].replace(/\sfunction/g, "/* istanbul ignore next */ function");
        lines[i] = lines[i].replace(/\(function/g, "/* istanbul ignore next */ (function");
        lines[i] = lines[i].replace(/(\{|\}) if /g, "$1 /* istanbul ignore next */ if ");
        lines[i] = lines[i].replace(/; if /g, "; /* istanbul ignore next */ if ");
        lines[i] = lines[i].replace(/(\{|\}) for /g, "$1 /* istanbul ignore next */ for ");
        lines[i] = lines[i].replace(/; for /g, "; /* istanbul ignore next */ for ");
      }

       this.queue(lines.join('\n'));
       this.queue(null);
    }
}

var browsers = [
  {
    browserName: "internet explorer",
    platform: "WIN8",
    version: "10"
  },
  {
    browserName: "internet explorer",
    platform: "Windows 8.1",
    version: "11"
  },
  /* Saucelabs support lacking for this config
   {
     browserName: 'MicrosoftEdge',
     "platform": "Windows 10",
     version: '20.10240'
  },*/
  {
    browserName: 'firefox',
    version: '32',
    platform: 'OS X 10.9'
  },
   {
    browserName: 'iphone',
    version: '7.1',
    platform: 'OS X 10.9'
  },
  {
    browserName: 'chrome',
    platform: 'Linux',
    deviceName: 'Android Emulator',
    deviceOrientation: 'portrait'
  },
  {
    browserName: 'safari',
    version: '7',
    platform: 'OS X 10.9'

  }
];

module.exports = function (grunt) {

  var credentials;
  try {
    credentials = grunt.file.readJSON('./credentials.json');
  } catch (e) {
    credentials = {saucelabs:{}};
  }

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Build tasks
    babel: {
      options: {
        sourceMap: 'inline',
        presets: ['es2015']
      },
      dist: {
        files: {
          "lib/layer.js": "src/layer.js",
          "lib/root.js": "src/root.js",
          "lib/const.js": "src/const.js",
          "lib/logger.js": "src/logger.js",
          "lib/client-utils.js": "src/client-utils.js",
          "lib/xhr.js": "src/xhr.js",
          "lib/client-authenticator.js": "src/client-authenticator.js",
          "lib/client.js": "src/client.js",
          "lib/mixins/client-identities.js": "src/mixins/client-identities.js",
          "lib/mixins/client-conversations.js": "src/mixins/client-conversations.js",
          "lib/mixins/client-channels.js": "src/mixins/client-channels.js",
          "lib/mixins/client-members.js": "src/mixins/client-members.js",
          "lib/mixins/client-messages.js": "src/mixins/client-messages.js",
          "lib/mixins/client-queries.js": "src/mixins/client-queries.js",
          "lib/models/syncable.js": "src/models/syncable.js",
          "lib/models/container.js": "src/models/container.js",
          "lib/models/conversation.js": "src/models/conversation.js",
          "lib/models/channel.js": "src/models/channel.js",
          "lib/models/message-part.js": "src/models/message-part.js",
          "lib/models/message.js": "src/models/message.js",
          "lib/models/conversation-message.js": "src/models/conversation-message.js",
          "lib/models/channel-message.js": "src/models/channel-message.js",
          "lib/models/announcement.js": "src/models/announcement.js",
          "lib/models/content.js": "src/models/content.js",
          "lib/models/identity.js": "src/models/identity.js",
          "lib/models/membership.js": "src/models/membership.js",
          "lib/queries/query.js": "src/queries/query.js",
          "lib/queries/identities-query.js": "src/queries/identities-query.js",
          "lib/queries/conversations-query.js": "src/queries/conversations-query.js",
          "lib/queries/channels-query.js": "src/queries/channels-query.js",
          "lib/queries/members-query.js": "src/queries/members-query.js",
          "lib/queries/messages-query.js": "src/queries/messages-query.js",
          "lib/queries/announcements-query.js": "src/queries/announcements-query.js",
          "lib/queries/query-builder.js": "src/queries/query-builder.js",
          "lib/sync-manager.js": "src/sync-manager.js",
          "lib/sync-event.js": "src/sync-event.js",
          "lib/db-manager.js": "src/db-manager.js",
          "lib/online-state-manager.js": "src/online-state-manager.js",
          "lib/websockets/socket-manager.js": "src/websockets/socket-manager.js",
          "lib/websockets/request-manager.js": "src/websockets/request-manager.js",
          "lib/websockets/change-manager.js": "src/websockets/change-manager.js",
          "lib/layer-error.js": "src/layer-error.js",
          "lib/layer-event.js": "src/layer-event.js",
          "lib/client-registry.js": "src/client-registry.js",
          "lib/typing-indicators/typing-indicators.js": "src/typing-indicators/typing-indicators.js",
          "lib/typing-indicators/typing-indicator-listener.js": "src/typing-indicators/typing-indicator-listener.js",
          "lib/typing-indicators/typing-listener.js": "src/typing-indicators/typing-listener.js",
          "lib/typing-indicators/typing-publisher.js": "src/typing-indicators/typing-publisher.js",
          "lib/utils/defer.js": "src/utils/defer.js",
          "lib/utils/layer-parser.js": "src/utils/layer-parser.js"
        }
      }
    },
    browserify: {
      options: {
        separator: ';'
      },
      debug: {
        files: {
          'build/client.debug.js': ['index-es6.js']
        },
        options: {
          transform: [['babelify', {
            presets: ['es2015']}]],
          browserifyOptions: {
            standalone: 'layer',
            debug: true
          }
        }
      },
      build: {
        files: {
          'build/client.build.js': ['index-es6.js']
        },
        options: {
          transform: [['babelify', {presets: ['es2015'], sourceMaps: false}]],
          browserifyOptions: {
            standalone: 'layer',
            debug: false
          }
        }
      },
      coverage: {
        files: {
          'coverage/index.js': ['index.js']
        },
        options: {
          transform: [[fixBrowserifyForIstanbul], ["istanbulify"]],
          browserifyOptions: {
            standalone: false,
            debug: false
          }
        }
      }
    },
    remove: {
      build: {
        fileList: ['build/client.build.js']
      },
      lib: {
        dirList: ['lib']
      }
    },
    uglify: {
    		options: {
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
    				'<%= grunt.template.today("yyyy-mm-dd") %> */ ',
        mangle: {
          except: [
            "layer",
            "Client"]
        },
        sourceMap: false,
        screwIE8: true
      },
      build: {
        files: {
          'build/client.min.js': ['build/client.build.js']
        }
      }
    },
    watch: {
      debug: {
        files: ['package.json', 'src/**', "Gruntfile.js", "index.js"],
        tasks: ['debug', 'prepublish']
      }
    },

    // Testing and Coverage tasks
    jasmine: {
      options: {
        helpers: ['test/lib/mock-ajax.js', 'test/specs/responses.js'],
        specs: ['test/specs/unit/*Spec.js', 'test/specs/unit/**/*Spec.js'],
        summary: true
      },
      debug: {
        src: ["build/client.debug.js"]
      },
      coverage: {
        src: ["coverage/index.js"],
        options: {
          summary: false,
          display: "none",
          template: require('grunt-template-jasmine-istanbul'),
          templateOptions: {
            coverage: 'coverage/data/coverage.json',
            ignoreFiles: ["coverage/index.js"],
            report: [{ type: "text", options: { dir: 'coverage/report/text' } },
              { type: "html", options: { dir: 'coverage/report' } }]

          }
        }
      }
    },
    // Adds support for the ignoreFiles parameter, which is needed for removing generated files from the result
    copy: {
      fixIstanbul: {
        src: "grunt-template-jasmine-istanbul_src-main-js-template.js",
        dest: "node_modules/grunt-template-jasmine-istanbul/src/main/js/template.js"
      }
    },

    version: {
      build: {
        files: [
          {
            dest: 'src/client.js',
            src: 'src/client.js'
          }
        ]
      },
      options: {
        version: "<%= pkg.version %>"
      }
    },

    // Documentation
    jsduck: {
      build: {
        src: ["lib/**.js", "lib/models/**.js", "lib/queries/**.js", "lib/typing-indicators/**.js", "lib/websockets/**.js", "lib/mixins/**.js"],
        dest: 'docs',
        options: {
          'builtin-classes': false,
          'warnings': ['-no_doc', '-dup_member', '-link_ambiguous'],
          'external': ['XMLHttpRequest', 'Blob', 'Websocket', 'KeyboardEvent', 'IDBVersionChangeEvent', 'IDBKeyRange', 'IDBDatabase'],
          'title': 'Layer Web SDK - API Documentation',
          'categories': ['jsduck-config/categories.json'],
          'head-html': HTML_HEAD,
          'css': [CSS],
          'footer': 'Layer Web SDK v' + version
        }
      }
    },
    jsduckfixes: {
      build: {
        files: [
          {
            src: ['docs/output/*.js']
          }
        ],
        options: {
        }
      }
    },

    // Saucelabs Tests
    connect: {
			saucelabs: {
        options: {
            port: 9023
        }
      },
      develop: {
        options: {
          port: 8001
        }
      }
    },
    'saucelabs-jasmine': {
      debug: {
        options: {
          username: credentials ? credentials.saucelabs.user : '',
          key: credentials ? credentials.saucelabs.pass : '',
          urls: ['http://127.0.0.1:9023/test/SpecRunner.html'],
          testname: 'Web SDK <%= pkg.version %> Unit Test',
          browsers: browsers
        }
      }
    },
  });

  grunt.registerMultiTask('version', 'Assign Versions', function() {
    var options = this.options();


    function replace(fileGroup, version) {
      fileGroup.src.forEach(function(file, index) {
        var contents = grunt.file.read(file);
        var newContents = contents.replace(/Client\.version = (.*)$/m, "Client.version = '" + options.version + "';");
        if (newContents != contents) grunt.file.write(fileGroup.dest, newContents);
      });
    }

    // Iterate over each file set and fire away on that set
    this.files.forEach(function(fileGroup) {
      replace(fileGroup, options.version);
    });
  });

  grunt.registerMultiTask('jsduckfixes', 'Fixing Docs', function() {
    var options = this.options();

    this.files.forEach(function(fileGroup) {
      fileGroup.src.forEach(function(file, index) {
          var contents = grunt.file.read(file);
          var startIndex = contents.indexOf('{');
          var endIndex = contents.lastIndexOf('}') + 1;
          var parsedContents = JSON.parse(contents.substring(startIndex, endIndex));

          if (parsedContents.members) parsedContents.members.forEach(function(element) {
            element.id = element.id.replace(/:/g, '_');
          });
          parsedContents.html = parsedContents.html.replace(/id='([^']*):([^']*)'/g, "id='" + "$1" + "_" + "$2'");
          parsedContents.html = parsedContents.html.replace(/href='([^']*):([^']*)'/g, "href='" + "$1" + "_" + "$2'");
          contents = contents.substring(0, startIndex) + JSON.stringify(parsedContents) + contents.substring(endIndex);
          grunt.file.write(file, contents);
      });
    });
  });

  // Building
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-remove');
  grunt.registerTask('debug', ['version', 'babel:dist', 'browserify:debug']);
  grunt.registerTask('buildmin', ['version', 'browserify:build',  'uglify', 'remove:build']);
  grunt.registerTask('build', ['debug', 'buildmin']);
  grunt.registerTask('prepublish', ['build']);

  // Documentation
  grunt.loadNpmTasks('grunt-jsduck');
  grunt.registerTask('docs', ['version', 'babel:dist',  'jsduck', 'jsduckfixes']);

  // Testing
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.registerTask('test', ['debug', 'jasmine:debug']);


  // Coverage Tests; warning: First run of grunt coverage will NOT use the copied istanbul fix; only the subsequent runs will.
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.registerTask('coverage', ['copy:fixIstanbul', 'babel:dist', 'browserify:coverage', 'jasmine:coverage']);

  // Saucelabs Tests
  grunt.loadNpmTasks('grunt-saucelabs');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.registerTask('sauce', ['connect:saucelabs', 'saucelabs-jasmine']);
  grunt.registerTask("develop", ["connect:develop", "watch"]);
};
