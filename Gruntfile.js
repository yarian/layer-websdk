/*eslint-disable */

var fs = require('fs');

var version = require('./package.json').version;
var path = require('path');
var babel = require('babel-core');

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
    custom_babel: {
      dist: {

        files: [
          {
            src: ['src/**/*.js']
          }
        ],
        options: {
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

  grunt.registerMultiTask('custom_babel', 'Babelifying all files in src', function() {
    var options = this.options();

    function convert(file, outputPath) {
      try {
        var output = grunt.file.read(file);
        var outputFolder = path.dirname(outputPath);
        if (!grunt.file.exists(outputFolder)) {
          grunt.file.mkdir(outputFolder);
        }
        var babelResult = babel.transform(output, {
          presets: ["babel-preset-es2015"]
        });
        var result = babelResult.code;

        grunt.file.write(outputPath, result);
      grunt.log.writeln("Wrote " + outputPath + "; success: " + grunt.file.exists(outputPath));
      } catch(e) {
        grunt.log.writeln('Failed to process ' + file + '; ', e);
      }
    }

    grunt.file.delete('lib');

    var files = [];
    // Iterate over each file set and generate the build file specified for that set
    this.files.forEach(function(fileGroup) {
      fileGroup.src.forEach(function(file, index) {
        files.push(file);
        convert(file, file.replace(/^src/, 'lib'));
      });
    });
  });

  // Building
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-remove');
  grunt.registerTask('debug', ['version', 'custom_babel:dist', 'browserify:debug']);
  grunt.registerTask('buildmin', ['version', 'browserify:build',  'uglify', 'remove:build']);
  grunt.registerTask('build', ['debug', 'buildmin']);
  grunt.registerTask('prepublish', ['build']);

  // Documentation
  grunt.loadNpmTasks('grunt-jsduck');
  grunt.registerTask('docs', ['version', 'custom_babel:dist',  'jsduck', 'jsduckfixes']);

  // Testing
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.registerTask('test', ['debug', 'jasmine:debug']);


  // Coverage Tests; warning: First run of grunt coverage will NOT use the copied istanbul fix; only the subsequent runs will.
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.registerTask('coverage', ['copy:fixIstanbul', 'custom_babel:dist', 'browserify:coverage', 'jasmine:coverage']);

  // Saucelabs Tests
  grunt.loadNpmTasks('grunt-saucelabs');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.registerTask('sauce', ['connect:saucelabs', 'saucelabs-jasmine']);
  grunt.registerTask("develop", ["connect:develop", "watch"]);
};
