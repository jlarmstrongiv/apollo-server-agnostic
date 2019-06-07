"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.graphqlLambda = graphqlLambda;

var _apolloServerCore = require("apollo-server-core");

var _apolloServerEnv = require("apollo-server-env");

function graphqlLambda(options) {
  if (!options) {
    throw new Error('Apollo Server requires options.');
  }

  if (arguments.length > 1) {
    throw new Error(`Apollo Server expects exactly one argument, got ${arguments.length}`);
  } // returns a promise, runHttpQuery is async
  // ctx is optional


  const graphqlHandler = async (queryInfo = {}, ctx) => {
    if (!queryInfo.query) {
      return {
        body: 'Query missing.',
        statusCode: 500,
        headers: new _apolloServerEnv.Headers()
      };
    }

    try {
      // Try resolving query
      const {
        graphqlResponse,
        responseInit // first args array seems to be optional

      } = await (0, _apolloServerCore.runHttpQuery)([queryInfo, ctx], {
        method: queryInfo.httpMethod,
        options: options,
        query: queryInfo.query,
        request: {
          url: queryInfo.path,
          method: queryInfo.httpMethod,
          headers: new _apolloServerEnv.Headers()
        }
      });
      return {
        body: graphqlResponse,
        statusCode: 200,
        headers: responseInit.headers
      };
    } catch (error) {
      // resolving query failed
      if ('HttpQueryError' !== error.name) {
        return {
          body: error.name,
          statusCode: 500,
          headers: new _apolloServerEnv.Headers()
        };
      }

      return {
        body: error.message,
        statusCode: error.statusCode,
        headers: error.headers
      };
    }
  };

  return graphqlHandler;
}