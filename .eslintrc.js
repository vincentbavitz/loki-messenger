module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": [
        "plugin:airbnb-base",
        "plugin:prettier",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking"
    ],
    "ignorePatterns": [
        "build/**",
        "components/**",
        "coverage/**",
        "dist/**",
        "mnemonic_languages/**",
        "js/curve/*",
        "js/components.js",
        "js/libtextsecure.js",
        "js/libloki.js",
        "js/util_worker.js",
        "js/libsignal-protocol-worker.js",
        "libtextsecure/components.js",
        "libloki/test/test.js",
        "libtextsecure/test/test.js",
        "test/test.js",
        "js/Mp3LameEncoder.min.js",
        "js/WebAudioRecorderMp3.js",
        "js/libphonenumber-util.js",
        "js/libsignal-protocol-worker.js",
        "libtextsecure/libsignal-protocol.js",
        "libtextsecure/test/blanket_mocha.js",
        "test/blanket_mocha.js",
        "ts/**/*.js",
        "libloki/test/components.js",
        "libloki/modules/mnemonic.js"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "@typescript-eslint/tslint"
    ],
    "rules": {
        "comma-dangle": [
            "error",
            {
                "objects": "always-multiline",
                "arrays": "always-multiline",
                "functions": "never"
            }
        ],
        "curly": "error",
        "brace-style": [
            "error",
            "1tbs"
        ],
        "mocha/no-exclusive-tests": [
            "error"
        ],
        "more/no-then": [
            "error"
        ],
        "no-use-before-define": [
            "off",
            {
                "functions": true,
                "classes": true,
                "variables": true
            }
        ],
        "no-underscore-dangle": "error",
        "no-console": [
            "error",
            {
                "allow": [
                    "dirxml",
                    "warn",
                    "dir",
                    "timeLog",
                    "assert",
                    "clear",
                    "count",
                    "countReset",
                    "group",
                    "groupCollapsed",
                    "groupEnd",
                    "table",
                    "Console",
                    "markTimeline",
                    "profile",
                    "profileEnd",
                    "timeline",
                    "timelineEnd",
                    "timeStamp",
                    "context"
                ]
            }
        ],
        "operator-linebreak": [
            "error"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single",
            {
                "avoidEscape": true,
                "allowTemplateLiterals": true
            }
        ],
        "arrow-parens": [
            "error",
            "as-needed"
        ],
        "function-paren-newline": [
            "off",
            "multiline"
        ],
        "max-len": "off",
        "lines-around-comment": [
            0
        ],
        "no-confusing-arrow": [
            0,
            {
                "allowParens": true
            }
        ],
        "no-mixed-operators": [
            0,
            {
                "groups": [
                    [
                        "+",
                        "-",
                        "*",
                        "/",
                        "%",
                        "**"
                    ],
                    [
                        "&",
                        "|",
                        "^",
                        "~",
                        "<<",
                        ">>",
                        ">>>"
                    ],
                    [
                        "==",
                        "!=",
                        "===",
                        "!==",
                        ">",
                        ">=",
                        "<",
                        "<="
                    ],
                    [
                        "&&",
                        "||"
                    ],
                    [
                        "in",
                        "instanceof"
                    ]
                ],
                "allowSamePrecedence": false
            }
        ],
        "no-tabs": [
            0
        ],
        "no-unexpected-multiline": [
            0
        ],
        "array-bracket-newline": [
            "off",
            "consistent"
        ],
        "array-bracket-spacing": [
            "off",
            "never"
        ],
        "array-element-newline": [
            "off",
            {
                "multiline": true,
                "minItems": 3
            }
        ],
        "arrow-spacing": [
            "off",
            {
                "before": true,
                "after": true
            }
        ],
        "block-spacing": [
            "off",
            "always"
        ],
        "comma-spacing": [
            "off",
            {
                "before": false,
                "after": true
            }
        ],
        "comma-style": [
            "off",
            "last"
        ],
        "computed-property-spacing": [
            "off",
            "never"
        ],
        "dot-location": [
            "off",
            "property"
        ],
        "eol-last": "error",
        "func-call-spacing": [
            "off",
            "never"
        ],
        "generator-star": [
            "off"
        ],
        "generator-star-spacing": [
            "off",
            {
                "before": false,
                "after": true
            }
        ],
        "implicit-arrow-linebreak": [
            "off"
        ],
        "indent": [
            "off",
            2,
            {
                "SwitchCase": 1,
                "VariableDeclarator": 1,
                "outerIIFEBody": 1,
                "FunctionDeclaration": {
                    "parameters": 1,
                    "body": 1
                },
                "FunctionExpression": {
                    "parameters": 1,
                    "body": 1
                },
                "CallExpression": {
                    "arguments": 1
                },
                "ArrayExpression": 1,
                "ObjectExpression": 1,
                "ImportDeclaration": 1,
                "flatTernaryExpressions": false,
                "ignoredNodes": [
                    "JSXElement",
                    "JSXElement *"
                ],
                "ignoreComments": false
            }
        ],
        "indent-legacy": [
            "off"
        ],
        "jsx-quotes": [
            "off",
            "prefer-double"
        ],
        "key-spacing": [
            "off",
            {
                "beforeColon": false,
                "afterColon": true
            }
        ],
        "keyword-spacing": [
            "off",
            {
                "before": true,
                "after": true,
                "overrides": {
                    "return": {
                        "after": true
                    },
                    "throw": {
                        "after": true
                    },
                    "case": {
                        "after": true
                    }
                }
            }
        ],
        "multiline-ternary": [
            "off",
            "never"
        ],
        "newline-per-chained-call": "off",
        "new-parens": "error",
        "no-arrow-condition": [
            "off"
        ],
        "no-comma-dangle": [
            "off"
        ],
        "no-extra-parens": [
            "off",
            "all",
            {
                "conditionalAssign": true,
                "nestedBinaryExpressions": false,
                "returnAssign": false,
                "ignoreJSX": "all",
                "enforceForArrowConditionals": false
            }
        ],
        "no-extra-semi": "error",
        "no-floating-decimal": [
            "off"
        ],
        "no-mixed-spaces-and-tabs": [
            "off"
        ],
        "no-multi-spaces": [
            "off",
            {
                "ignoreEOLComments": false
            }
        ],
        "no-multiple-empty-lines": [
            "error",
            {
                "max": 2
            }
        ],
        "no-reserved-keys": [
            "off"
        ],
        "no-space-before-semi": [
            "off"
        ],
        "no-spaced-func": [
            "off"
        ],
        "no-trailing-spaces": "error",
        "no-whitespace-before-property": [
            "off"
        ],
        "no-wrap-func": [
            "off"
        ],
        "nonblock-statement-body-position": [
            "off"
        ],
        "object-curly-newline": [
            "off",
            {
                "ObjectExpression": {
                    "minProperties": 4,
                    "multiline": true,
                    "consistent": true
                },
                "ObjectPattern": {
                    "minProperties": 4,
                    "multiline": true,
                    "consistent": true
                }
            }
        ],
        "object-curly-spacing": [
            "off",
            "always"
        ],
        "object-property-newline": [
            "off",
            {
                "allowMultiplePropertiesPerLine": true,
                "allowAllPropertiesOnSameLine": false
            }
        ],
        "one-var-declaration-per-line": [
            "off",
            "always"
        ],
        "padded-blocks": [
            "off",
            {
                "blocks": "never",
                "classes": "never",
                "switches": "never"
            }
        ],
        "quote-props": [
            "error",
            "as-needed"
        ],
        "rest-spread-spacing": [
            "off",
            "never"
        ],
        "semi": [
            "off",
            "always"
        ],
        "semi-spacing": [
            "off",
            {
                "before": false,
                "after": true
            }
        ],
        "semi-style": [
            "off",
            "last"
        ],
        "space-after-function-name": [
            "off"
        ],
        "space-after-keywords": [
            "off"
        ],
        "space-before-blocks": [
            "off"
        ],
        "space-before-function-paren": "off",
        "space-before-function-parentheses": [
            "off"
        ],
        "space-before-keywords": [
            "off"
        ],
        "space-in-brackets": [
            "off"
        ],
        "space-in-parens": [
            "error",
            "never"
        ],
        "space-infix-ops": [
            "off"
        ],
        "space-return-throw-case": [
            "off"
        ],
        "space-unary-ops": [
            "off",
            {
                "words": true,
                "nonwords": false,
                "overrides": {}
            }
        ],
        "space-unary-word-ops": [
            "off"
        ],
        "switch-colon-spacing": [
            "off",
            {
                "after": true,
                "before": false
            }
        ],
        "template-curly-spacing": [
            "off"
        ],
        "template-tag-spacing": [
            "off",
            "never"
        ],
        "unicode-bom": [
            "off",
            "never"
        ],
        "wrap-iife": [
            "off",
            "outside",
            {
                "functionPrototypeMethods": false
            }
        ],
        "wrap-regex": [
            "off"
        ],
        "yield-star-spacing": [
            "off",
            "after"
        ],
        "strict": [
            "error"
        ],
        "import/no-unresolved": [
            "error",
            {
                "commonjs": true,
                "caseSensitive": true
            }
        ],
        "import/named": [
            "off"
        ],
        "import/default": [
            "off"
        ],
        "import/namespace": [
            "off"
        ],
        "import/export": [
            "error"
        ],
        "import/no-named-as-default": [
            "error"
        ],
        "import/no-named-as-default-member": [
            "error"
        ],
        "import/no-deprecated": "off",
        "import/no-extraneous-dependencies": "error",
        "import/no-mutable-exports": [
            "error"
        ],
        "import/no-commonjs": [
            "off"
        ],
        "import/no-amd": [
            "error"
        ],
        "import/no-nodejs-modules": [
            "off"
        ],
        "import/first": [
            "error",
            "absolute-first"
        ],
        "import/imports-first": [
            "off"
        ],
        "import/no-duplicates": [
            "error"
        ],
        "import/no-namespace": [
            "off"
        ],
        "import/extensions": [
            "error",
            "always",
            {
                "js": "never",
                "jsx": "never"
            }
        ],
        "import/order": "error",
        "import/newline-after-import": [
            "error"
        ],
        "import/prefer-default-export": [
            "error"
        ],
        "import/no-restricted-paths": [
            "off"
        ],
        "import/max-dependencies": [
            "off",
            {
                "max": 10
            }
        ],
        "import/no-absolute-path": [
            "error"
        ],
        "import/no-dynamic-require": [
            "error"
        ],
        "import/no-internal-modules": "error",
        "import/unambiguous": [
            "off"
        ],
        "import/no-webpack-loader-syntax": [
            "error"
        ],
        "import/no-unassigned-import": "error",
        "import/no-named-default": [
            "error"
        ],
        "import/no-anonymous-default-export": [
            "off",
            {
                "allowArray": false,
                "allowArrowFunction": false,
                "allowAnonymousClass": false,
                "allowAnonymousFunction": false,
                "allowLiteral": false,
                "allowObject": false
            }
        ],
        "arrow-body-style": [
            "error",
            "as-needed",
            {
                "requireReturnForObjectLiteral": false
            }
        ],
        "constructor-super": "error",
        "no-class-assign": [
            "error"
        ],
        "no-const-assign": [
            "error"
        ],
        "no-dupe-class-members": [
            "error"
        ],
        "no-duplicate-imports": "error",
        "no-new-symbol": [
            "error"
        ],
        "no-restricted-imports": "off",
        "no-this-before-super": [
            "error"
        ],
        "no-useless-computed-key": [
            "error"
        ],
        "no-useless-constructor": [
            "error"
        ],
        "no-useless-rename": [
            "error",
            {
                "ignoreDestructuring": false,
                "ignoreImport": false,
                "ignoreExport": false
            }
        ],
        "no-var": [
            "error"
        ],
        "object-shorthand": "off",
        "prefer-arrow-callback": [
            "error",
            {
                "allowNamedFunctions": false,
                "allowUnboundThis": true
            }
        ],
        "prefer-const": [
            "error",
            {
                "destructuring": "any",
                "ignoreReadBeforeAssign": true
            }
        ],
        "prefer-destructuring": [
            "error",
            {
                "VariableDeclarator": {
                    "array": false,
                    "object": true
                },
                "AssignmentExpression": {
                    "array": true,
                    "object": true
                }
            },
            {
                "enforceForRenamedProperties": false
            }
        ],
        "prefer-numeric-literals": [
            "error"
        ],
        "prefer-reflect": [
            "off"
        ],
        "prefer-rest-params": [
            "error"
        ],
        "prefer-spread": [
            "error"
        ],
        "prefer-template": "error",
        "require-yield": [
            "error"
        ],
        "sort-imports": [
            "off",
            {
                "ignoreCase": false,
                "ignoreMemberSort": false,
                "memberSyntaxSortOrder": [
                    "none",
                    "all",
                    "multiple",
                    "single"
                ]
            }
        ],
        "symbol-description": [
            "error"
        ],
        "init-declarations": [
            "off"
        ],
        "no-catch-shadow": [
            "off"
        ],
        "no-delete-var": [
            "error"
        ],
        "no-label-var": [
            "error"
        ],
        "no-restricted-globals": [
            "error",
            "isFinite",
            "isNaN",
            "addEventListener",
            "blur",
            "close",
            "closed",
            "confirm",
            "defaultStatus",
            "event",
            "external",
            "defaultstatus",
            "find",
            "focus",
            "frameElement",
            "frames",
            "history",
            "innerHeight",
            "innerWidth",
            "length",
            "location",
            "locationbar",
            "menubar",
            "moveBy",
            "moveTo",
            "name",
            "onblur",
            "onerror",
            "onfocus",
            "onload",
            "onresize",
            "onunload",
            "open",
            "opener",
            "opera",
            "outerHeight",
            "outerWidth",
            "pageXOffset",
            "pageYOffset",
            "parent",
            "print",
            "removeEventListener",
            "resizeBy",
            "resizeTo",
            "screen",
            "screenLeft",
            "screenTop",
            "screenX",
            "screenY",
            "scroll",
            "scrollbars",
            "scrollBy",
            "scrollTo",
            "scrollX",
            "scrollY",
            "self",
            "status",
            "statusbar",
            "stop",
            "toolbar",
            "top"
        ],
        "no-shadow": [
            "error",
            {
                "hoist": "all"
            }
        ],
        "no-shadow-restricted-names": [
            "error"
        ],
        "no-undef": [
            "error"
        ],
        "no-undef-init": "error",
        "no-undefined": [
            "off"
        ],
        "no-unused-vars": [
            "error",
            {
                "vars": "all",
                "args": "after-used",
                "ignoreRestSiblings": true
            }
        ],
        "camelcase": "error",
        "capitalized-comments": [
            "off",
            "never",
            {
                "line": {
                    "ignorePattern": ".*",
                    "ignoreInlineComments": true,
                    "ignoreConsecutiveComments": true
                },
                "block": {
                    "ignorePattern": ".*",
                    "ignoreInlineComments": true,
                    "ignoreConsecutiveComments": true
                }
            }
        ],
        "consistent-this": [
            "off"
        ],
        "func-name-matching": [
            "off",
            "always",
            {
                "includeCommonJSModuleExports": false
            }
        ],
        "func-names": [
            "warn"
        ],
        "func-style": [
            "off",
            "expression"
        ],
        "id-blacklist": "error",
        "id-length": [
            "off"
        ],
        "id-match": "error",
        "line-comment-position": [
            "off",
            {
                "position": "above",
                "ignorePattern": "",
                "applyDefaultPatterns": true
            }
        ],
        "lines-between-class-members": [
            "off",
            "always",
            {
                "exceptAfterSingleLine": false
            }
        ],
        "lines-around-directive": [
            "error",
            {
                "before": "always",
                "after": "always"
            }
        ],
        "max-depth": [
            "off",
            4
        ],
        "max-lines": "error",
        "max-nested-callbacks": [
            "off"
        ],
        "max-params": [
            "off",
            3
        ],
        "max-statements": [
            "off",
            10
        ],
        "max-statements-per-line": [
            "off",
            {
                "max": 1
            }
        ],
        "multiline-comment-style": [
            "off",
            "starred-block"
        ],
        "new-cap": [
            "error",
            {
                "newIsCap": true,
                "newIsCapExceptions": [],
                "capIsNew": false,
                "capIsNewExceptions": [
                    "Immutable.Map",
                    "Immutable.Set",
                    "Immutable.List"
                ],
                "properties": true
            }
        ],
        "newline-after-var": [
            "off"
        ],
        "newline-before-return": [
            "off"
        ],
        "no-array-constructor": [
            "error"
        ],
        "no-bitwise": "error",
        "no-continue": [
            "error"
        ],
        "no-inline-comments": [
            "off"
        ],
        "no-lonely-if": [
            "error"
        ],
        "no-multi-assign": [
            "error"
        ],
        "no-negated-condition": [
            "off"
        ],
        "no-nested-ternary": [
            "error"
        ],
        "no-new-object": [
            "error"
        ],
        "no-plusplus": [
            "error"
        ],
        "no-restricted-syntax": [
            "error",
            "ForInStatement"
        ],
        "no-ternary": [
            "off"
        ],
        "no-unneeded-ternary": [
            "error",
            {
                "defaultAssignment": false
            }
        ],
        "one-var": [
            "error",
            "never"
        ],
        "operator-assignment": [
            "error",
            "always"
        ],
        "padding-line-between-statements": [
            "error",
            {
                "blankLine": "always",
                "prev": "*",
                "next": "return"
            }
        ],
        "require-jsdoc": [
            "off"
        ],
        "sort-keys": [
            "off",
            "asc",
            {
                "caseSensitive": false,
                "natural": true
            }
        ],
        "sort-vars": [
            "off"
        ],
        "spaced-comment": [
            "error",
            "never"
        ],
        "callback-return": [
            "off"
        ],
        "global-require": [
            "error"
        ],
        "handle-callback-err": [
            "off"
        ],
        "no-buffer-constructor": [
            "error"
        ],
        "no-mixed-requires": [
            "off",
            false
        ],
        "no-new-require": [
            "error"
        ],
        "no-path-concat": [
            "error"
        ],
        "no-process-env": [
            "off"
        ],
        "no-process-exit": [
            "off"
        ],
        "no-restricted-modules": [
            "off"
        ],
        "no-sync": [
            "off"
        ],
        "for-direction": [
            "error"
        ],
        "getter-return": [
            "error",
            {
                "allowImplicit": true
            }
        ],
        "no-await-in-loop": [
            "error"
        ],
        "no-compare-neg-zero": [
            "error"
        ],
        "no-cond-assign": "error",
        "no-constant-condition": "error",
        "no-control-regex": "error",
        "no-debugger": "error",
        "no-dupe-args": [
            "error"
        ],
        "no-dupe-keys": [
            "error"
        ],
        "no-duplicate-case": "error",
        "no-empty": "error",
        "no-empty-character-class": [
            "error"
        ],
        "no-ex-assign": [
            "error"
        ],
        "no-extra-boolean-cast": [
            "error"
        ],
        "no-func-assign": [
            "error"
        ],
        "no-inner-declarations": [
            "error"
        ],
        "no-invalid-regexp": "error",
        "no-irregular-whitespace": "error",
        "no-obj-calls": [
            "error"
        ],
        "no-prototype-builtins": [
            "error"
        ],
        "no-regex-spaces": "error",
        "no-sparse-arrays": "error",
        "no-template-curly-in-string": "error",
        "no-unreachable": [
            "error"
        ],
        "no-unsafe-finally": "error",
        "no-unsafe-negation": [
            "error"
        ],
        "no-negated-in-lhs": [
            "off"
        ],
        "use-isnan": "error",
        "valid-jsdoc": [
            "off"
        ],
        "valid-typeof": "off",
        "accessor-pairs": [
            "off"
        ],
        "array-callback-return": [
            "error"
        ],
        "block-scoped-var": [
            "error"
        ],
        "complexity": "error",
        "class-methods-use-this": [
            "error",
            {
                "exceptMethods": []
            }
        ],
        "consistent-return": [
            "error"
        ],
        "default-case": "error",
        "dot-notation": "error",
        "eqeqeq": [
            "error",
            "smart"
        ],
        "guard-for-in": "error",
        "no-alert": [
            "warn"
        ],
        "no-caller": "error",
        "no-case-declarations": [
            "error"
        ],
        "no-div-regex": [
            "off"
        ],
        "no-else-return": [
            "error",
            {
                "allowElseIf": true
            }
        ],
        "no-empty-function": [
            "error",
            {
                "allow": [
                    "arrowFunctions",
                    "functions",
                    "methods"
                ]
            }
        ],
        "no-empty-pattern": [
            "error"
        ],
        "no-eq-null": [
            "off"
        ],
        "no-eval": "error",
        "no-extend-native": [
            "error"
        ],
        "no-extra-bind": [
            "error"
        ],
        "no-extra-label": [
            "error"
        ],
        "no-fallthrough": "off",
        "no-global-assign": [
            "error",
            {
                "exceptions": []
            }
        ],
        "no-native-reassign": [
            "off"
        ],
        "no-implicit-coercion": [
            "off",
            {
                "boolean": false,
                "number": true,
                "string": true,
                "allow": []
            }
        ],
        "no-implicit-globals": [
            "off"
        ],
        "no-implied-eval": [
            "error"
        ],
        "no-invalid-this": "error",
        "no-iterator": [
            "error"
        ],
        "no-labels": [
            "error",
            {
                "allowLoop": false,
                "allowSwitch": false
            }
        ],
        "no-lone-blocks": [
            "error"
        ],
        "no-loop-func": [
            "error"
        ],
        "no-magic-numbers": "off",
        "no-multi-str": "off",
        "no-new": [
            "error"
        ],
        "no-new-func": [
            "error"
        ],
        "no-new-wrappers": "error",
        "no-octal": "error",
        "no-octal-escape": "error",
        "no-param-reassign": [
            "error",
            {
                "props": true,
                "ignorePropertyModificationsFor": [
                    "acc",
                    "e",
                    "ctx",
                    "req",
                    "request",
                    "res",
                    "response",
                    "$scope"
                ]
            }
        ],
        "no-proto": [
            "error"
        ],
        "no-redeclare": "error",
        "no-restricted-properties": [
            "error",
            {
                "object": "arguments",
                "property": "callee",
                "message": "arguments.callee is deprecated"
            },
            {
                "object": "global",
                "property": "isFinite",
                "message": "Please use Number.isFinite instead"
            },
            {
                "object": "self",
                "property": "isFinite",
                "message": "Please use Number.isFinite instead"
            },
            {
                "object": "window",
                "property": "isFinite",
                "message": "Please use Number.isFinite instead"
            },
            {
                "object": "global",
                "property": "isNaN",
                "message": "Please use Number.isNaN instead"
            },
            {
                "object": "self",
                "property": "isNaN",
                "message": "Please use Number.isNaN instead"
            },
            {
                "object": "window",
                "property": "isNaN",
                "message": "Please use Number.isNaN instead"
            },
            {
                "property": "__defineGetter__",
                "message": "Please use Object.defineProperty instead."
            },
            {
                "property": "__defineSetter__",
                "message": "Please use Object.defineProperty instead."
            },
            {
                "object": "Math",
                "property": "pow",
                "message": "Use the exponentiation operator (**) instead."
            }
        ],
        "no-return-assign": [
            "error",
            "always"
        ],
        "no-return-await": "error",
        "no-script-url": [
            "error"
        ],
        "no-self-assign": [
            "error"
        ],
        "no-self-compare": [
            "error"
        ],
        "no-sequences": "error",
        "no-throw-literal": "error",
        "no-unmodified-loop-condition": [
            "off"
        ],
        "no-unused-expressions": "error",
        "no-unused-labels": "error",
        "no-useless-call": [
            "off"
        ],
        "no-useless-concat": [
            "error"
        ],
        "no-useless-escape": [
            "error"
        ],
        "no-useless-return": [
            "error"
        ],
        "no-void": "error",
        "no-warning-comments": [
            "off",
            {
                "terms": [
                    "todo",
                    "fixme",
                    "xxx"
                ],
                "location": "start"
            }
        ],
        "no-with": [
            "error"
        ],
        "prefer-promise-reject-errors": [
            "error",
            {
                "allowEmptyReject": true
            }
        ],
        "radix": "error",
        "require-await": [
            "off"
        ],
        "vars-on-top": [
            "error"
        ],
        "yoda": "error",
        "@typescript-eslint/array-type": "error",
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/explicit-member-accessibility": [
            "error",
            {
                "accessibility": "explicit"
            }
        ],
        "@typescript-eslint/indent": [
            "off",
            2
        ],
        "@typescript-eslint/member-delimiter-style": [
            "error",
            {
                "multiline": {
                    "delimiter": "semi",
                    "requireLast": true
                },
                "singleline": {
                    "delimiter": "semi",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/member-ordering": "error",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-extraneous-class": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/no-param-reassign": "error",
        "@typescript-eslint/no-parameter-properties": "error",
        "@typescript-eslint/no-require-imports": "error",
        "@typescript-eslint/no-unnecessary-qualifier": "error",
        "@typescript-eslint/no-unnecessary-type-arguments": "error",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/prefer-for-of": "error",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/prefer-namespace-keyword": "off",
        "@typescript-eslint/prefer-readonly": "error",
        "@typescript-eslint/promise-function-async": "error",
        "@typescript-eslint/quotes": [
            "error",
            "single",
            {
                "avoidEscape": true
            }
        ],
        "@typescript-eslint/restrict-plus-operands": "error",
        "@typescript-eslint/semi": [
            "error",
            "always"
        ],
        "@typescript-eslint/strict-boolean-expressions": "off",
        "@typescript-eslint/type-annotation-spacing": "off",
        "@typescript-eslint/unified-signatures": "error",
        "import/no-default-export": "error",
        "jsdoc/no-types": "error",
        "max-classes-per-file": [
            "error",
            3
        ],
        "no-null/no-null": "off",
        "prefer-arrow/prefer-arrow-functions": "off",
        "prefer-object-spread": "error",
        "unicorn/filename-case": "error",
        "@typescript-eslint/tslint/config": [
            "error",
            {
                "rules": {
                    "chai-prefer-contains-to-index-of": true,
                    "chai-vague-errors": true,
                    "encoding": true,
                    "function-name": [
                        true,
                        {
                            "function-regex": "^_?[a-z][\\w\\d]+$"
                        }
                    ],
                    "informative-docs": true,
                    "insecure-random": true,
                    "jquery-deferred-must-complete": true,
                    "jsdoc-format": true,
                    "jsx-alignment": true,
                    "jsx-boolean-value": true,
                    "jsx-curly-spacing": [
                        true,
                        "never"
                    ],
                    "jsx-equals-spacing": [
                        true,
                        "never"
                    ],
                    "jsx-key": true,
                    "jsx-no-bind": true,
                    "jsx-no-string-ref": true,
                    "jsx-self-close": true,
                    "jsx-wrap-multiline": true,
                    "match-default-export-name": true,
                    "max-func-body-length": [
                        true,
                        150
                    ],
                    "mocha-avoid-only": true,
                    "mocha-unneeded-done": true,
                    "no-backbone-get-set-outside-model": true,
                    "no-cookies": true,
                    "no-delete-expression": true,
                    "no-disable-auto-sanitization": true,
                    "no-document-domain": true,
                    "no-document-write": true,
                    "no-dynamic-delete": true,
                    "no-exec-script": true,
                    "no-function-constructor-with-string-args": true,
                    "no-function-expression": true,
                    "no-http-string": [
                        true,
                        "http://www.example.com/?.*",
                        "http://localhost:?.*"
                    ],
                    "no-inner-html": true,
                    "no-jquery-raw-elements": true,
                    "no-reference-import": true,
                    "no-string-based-set-immediate": true,
                    "no-string-based-set-interval": true,
                    "no-string-based-set-timeout": true,
                    "no-typeof-undefined": true,
                    "no-unnecessary-bind": true,
                    "no-unnecessary-callback-wrapper": true,
                    "no-unnecessary-field-initialization": true,
                    "no-unnecessary-local-variable": true,
                    "no-unnecessary-override": true,
                    "no-unsupported-browser-code": true,
                    "no-useless-files": true,
                    "no-with-statement": true,
                    "non-literal-fs-path": true,
                    "non-literal-require": true,
                    "number-literal-format": true,
                    "one-line": [
                        true,
                        "check-open-brace",
                        "check-catch",
                        "check-else",
                        "check-whitespace"
                    ],
                    "prefer-while": true,
                    "promise-must-complete": true,
                    "react-a11y-anchors": true,
                    "react-a11y-aria-unsupported-elements": true,
                    "react-a11y-event-has-role": true,
                    "react-a11y-image-button-has-alt": true,
                    "react-a11y-img-has-alt": true,
                    "react-a11y-input-elements": true,
                    "react-a11y-lang": true,
                    "react-a11y-meta": true,
                    "react-a11y-no-onchange": true,
                    "react-a11y-props": true,
                    "react-a11y-proptypes": true,
                    "react-a11y-required": true,
                    "react-a11y-role": true,
                    "react-a11y-role-has-required-aria-props": true,
                    "react-a11y-role-supports-aria-props": true,
                    "react-a11y-tabindex-no-positive": true,
                    "react-a11y-titles": true,
                    "react-anchor-blank-noopener": true,
                    "react-iframe-missing-sandbox": true,
                    "react-no-dangerous-html": [
                        true,
                        {
                            "file": "ts/components/session/SessionHTMLRenderer.tsx",
                            "method": "<unknown>",
                            "comment": "Usage has been approved by Maxim on 13 Dec 2019"
                        }
                    ],
                    "react-unused-props-and-state": true,
                    "switch-final-break": true,
                    "underscore-consistent-invocation": true,
                    "use-named-parameter": true,
                    "use-simple-attributes": true,
                    "whitespace": [
                        true,
                        "check-branch",
                        "check-decl",
                        "check-operator",
                        "check-separator",
                        "check-type"
                    ]
                }
            }
        ]
    },
    "settings": {
        "import/core-modules": [
            "electron"
        ],
        "import/resolver": {
            "node": {
                "extensions": [
                    ".js",
                    ".json"
                ]
            }
        },
        "import/extensions": [
            ".js",
            ".jsx"
        ],
        "import/ignore": [
            "node_modules",
            "\\.(coffee|scss|css|less|hbs|svg|json)$"
        ]
    }
};
