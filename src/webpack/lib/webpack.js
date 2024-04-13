/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

'use strict'

const util = require('util')
const webpackOptionsSchemaCheck = require('../schemas/WebpackOptions.check.js')
const webpackOptionsSchema = require('../schemas/WebpackOptions.json')
const Compiler = require('./Compiler')
const MultiCompiler = require('./MultiCompiler')
const WebpackOptionsApply = require('./WebpackOptionsApply')
const { applyWebpackOptionsDefaults, applyWebpackOptionsBaseDefaults } = require('./config/defaults')
const { getNormalizedWebpackOptions } = require('./config/normalization')
const NodeEnvironmentPlugin = require('./node/NodeEnvironmentPlugin')
const memoize = require('./util/memoize')

/** @typedef {import("../declarations/WebpackOptions").WebpackOptions} WebpackOptions */
/** @typedef {import("./Compiler").WatchOptions} WatchOptions */
/** @typedef {import("./MultiCompiler").MultiCompilerOptions} MultiCompilerOptions */
/** @typedef {import("./MultiStats")} MultiStats */
/** @typedef {import("./Stats")} Stats */

const getValidateSchema = memoize(() => require('./validateSchema'))

/**
 * @template T
 * @callback Callback
 * @param {Error=} err
 * @param {T=} stats
 * @returns {void}
 */

/**
 * @param {ReadonlyArray<WebpackOptions>} childOptions options array
 * @param {MultiCompilerOptions} options options
 * @returns {MultiCompiler} a multi-compiler
 */
const createMultiCompiler = (childOptions, options) => {
    const compilers = childOptions.map(options => createCompiler(options))
    const compiler = new MultiCompiler(compilers, options)
    for (const childCompiler of compilers) {
        if (childCompiler.options.dependencies) {
            compiler.setDependencies(childCompiler, childCompiler.options.dependencies)
        }
    }
    return compiler
}

/**
 * @param {WebpackOptions} rawOptions options object
 * @returns {Compiler} a compiler
 */
const createCompiler = rawOptions => {
    const options = getNormalizedWebpackOptions(rawOptions)

    // 初始化options中的context，默认为命令行执行路径
    applyWebpackOptionsBaseDefaults(options)

    const compiler = new Compiler(options.context, options)

    new NodeEnvironmentPlugin({
        infrastructureLogging: options.infrastructureLogging
    }).apply(compiler)

    // 注册自定义插件
    if (Array.isArray(options.plugins)) {
        for (const plugin of options.plugins) {
            // 如果是一个函数，this指向compiler
            if (typeof plugin === 'function') {
                plugin.call(compiler, compiler)
            } else {
                // 如果是一个对象，this指向插件本身
                plugin.apply(compiler)
            }
        }
    }
    // 初始化配置
    applyWebpackOptionsDefaults(options)

    // 根据options注册插件
    // 很重要：在entryOption钩子上会处理每个入口并为每个入口在compiler上挂载make钩子，钩子回调将调用compilation的addEntry方法
    new WebpackOptionsApply().process(options, compiler)

    // 初始化
    compiler.hooks.initialize.call()

    return compiler
}

/**
 * @callback WebpackFunctionSingle
 * @param {WebpackOptions} options options object
 * @param {Callback<Stats>=} callback callback
 * @returns {Compiler} the compiler object
 */

/**
 * @callback WebpackFunctionMulti
 * @param {ReadonlyArray<WebpackOptions> & MultiCompilerOptions} options options objects
 * @param {Callback<MultiStats>=} callback callback
 * @returns {MultiCompiler} the multi compiler object
 */

const asArray = options => (Array.isArray(options) ? Array.from(options) : [options])

const webpack = (options, callback) => {
    const create = () => {
        if (!asArray(options).every(webpackOptionsSchemaCheck)) {
            getValidateSchema()(webpackOptionsSchema, options)
            util.deprecate(
                () => {},
                'webpack bug: Pre-compiled schema reports error while real schema is happy. This has performance drawbacks.',
                'DEP_WEBPACK_PRE_COMPILED_SCHEMA_INVALID'
            )()
        }
        let compiler
        let watch = false
        let watchOptions
        if (Array.isArray(options)) {
            /** @type {MultiCompiler} */
            compiler = createMultiCompiler(options, /** @type {MultiCompilerOptions} */ (options))
            watch = options.some(options => options.watch)
            watchOptions = options.map(options => options.watchOptions || {})
        } else {
            const webpackOptions = options

            compiler = createCompiler(webpackOptions)
            watch = webpackOptions.watch
            watchOptions = webpackOptions.watchOptions || {}
        }
        return { compiler, watch, watchOptions }
    }

    if (callback) {
        try {
            // 创建compiler
            const { compiler, watch, watchOptions } = create()
            if (watch) {
                compiler.watch(watchOptions, callback)
            } else {
                // 执行run
                compiler.run((err, stats) => {
                    compiler.close(err2 => {
                        callback(err || err2, stats)
                    })
                })
            }
            return compiler
        } catch (err) {
            process.nextTick(() => callback(err))
            return null
        }
    } else {
        const { compiler, watch } = create()
        if (watch) {
            util.deprecate(
                () => {},
                "A 'callback' argument needs to be provided to the 'webpack(options, callback)' function when the 'watch' option is set. There is no way to handle the 'watch' option without a callback.",
                'DEP_WEBPACK_WATCH_WITHOUT_CALLBACK'
            )()
        }
        return compiler
    }
}

module.exports = webpack
