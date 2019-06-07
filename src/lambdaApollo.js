import {
  runHttpQuery,
} from 'apollo-server-core';
import {
  Headers,
} from 'apollo-server-env';

export function graphqlLambda(options) {
  if (!options) {
    throw new Error('Apollo Server requires options.');
  }

  if (arguments.length > 1) {
    throw new Error(
      `Apollo Server expects exactly one argument, got ${arguments.length}`,
    );
  }

  // returns a promise, runHttpQuery is async
  // ctx is optional
  const graphqlHandler = async (req = {}, ctx) => {
    if (!req.query) {
      return {
        body: 'Query missing.',
        statusCode: 500,
        headers: new Headers(),
      };
    }

    try {
      // Try resolving query
      const {
        graphqlResponse,
        responseInit,
        // first args array seems to be optional
      } = await runHttpQuery([req, ctx,], {
        method: req.httpMethod,
        options: options,
        query: req.query,
        request: {
          url: req.path,
          method: req.httpMethod,
          headers: new Headers(),
        },
      });
      return {
        body: graphqlResponse,
        statusCode: 200,
        headers: responseInit.headers,
      };

    } catch (error) {
      // resolving query failed
      if ('HttpQueryError' !== error.name) {
        return {
          body: error.name,
          statusCode: 500,
          headers: new Headers(),
        };
      }
      return {
        body: error.message,
        statusCode: error.statusCode,
        headers: error.headers,
      };
    }

  };

  return graphqlHandler;
}
