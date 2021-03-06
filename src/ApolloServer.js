import {
  ApolloServerBase,
} from 'apollo-server-core';

import {
  graphqlLambda,
} from './lambdaApollo';

import {
  renderPlaygroundPage,
} from '@apollographql/graphql-playground-html';

export class ApolloServer extends ApolloServerBase {
  // If you feel tempted to add an option to this constructor. Please consider
  // another place, since the documentation becomes much more complicated when
  // the constructor is not longer shared between all integration
  constructor(options) {
    if (process.env.ENGINE_API_KEY || options.engine) {
      options.engine = {
        sendReportsImmediately: true,
        ...(typeof options.engine !== 'boolean' ? options.engine : {}),
      };
    }
    super(options);
  }

  // This translates the arguments from the middleware into graphQL options It
  // provides typings for the integration specific behavior, ideally this would
  // be propagated with a generic to the super class
  // https://github.com/apollographql/apollo-server/blob/master/packages/apollo-server-core/src/graphqlOptions.ts
  createGraphQLServerOptions(graphQLServerOptions) {
    return super.graphQLServerOptions(graphQLServerOptions);
  }

  // options used to be for CORS, etc.
  createHandler(options = {}) {
    // We will kick off the `willStart` event once for the server, and then
    // await it before processing any requests by incorporating its `await` into
    // the GraphQLServerOptions function which is called before each request.
    const promiseWillStart = this.willStart();

    return (req, ...ctx) => {
      if (this.playgroundOptions && req.httpMethod === 'GET') {
        if (req.accept.includes('text/html')) {
          const path = req.path || '/';

          const playgroundRenderPageOptions = {
            endpoint: path,
            ...this.playgroundOptions,
          };

          return {
            body: renderPlaygroundPage(playgroundRenderPageOptions),
            statusCode: 200,
            headers: { 'Content-Type': 'text/html', },
          };
        }
      }
      return graphqlLambda(async () => {
        // In a world where this `createHandler` was async, we might avoid this
        // but since we don't want to introduce a breaking change to this API
        // (by switching it to `async`), we'll leverage the
        // `GraphQLServerOptions`, which are dynamically built on each request,
        // to `await` the `promiseWillStart` which we kicked off at the top of
        // this method to ensure that it runs to completion (which is part of
        // its contract) prior to processing the request.
        await promiseWillStart;
        // GraphQLServerOptions becomes context (parent, context, args, info)
        return this.createGraphQLServerOptions({
          req,
          ctx,
        });
        // so passing context here is optional
      })(req, ctx);
    };
  }

}
