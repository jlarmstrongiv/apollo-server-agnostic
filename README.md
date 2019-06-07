# apollo-server-agnostic

> Like `apollo-server-lambda@2.6.2`, but without all the features.

Without all the vendor lock-ins, this Apollo Server implementation can run with any Node.js framework.

Strictly Apollo Server features, such as Apollo Federation and playground options, are available.

Server options, such as CORS and Headers, are left for you to implement with your chosen framework.

## Getting Started

### Installation

Install with [NPM](https://www.npmjs.com/package/apollo-server-agnostic):
```Shell
npm install apollo-server-agnostic graphql
```
Install with Yarn:
```Shell
yarn add apollo-server-agnostic graphql
```

### Setup and Usage

```js
const {
  ApolloServer,
  gql
} = require('apollo-server-agnostic');

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Query {
    hello: String
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: () => 'Hello world!',
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const graphqlHandler = server.createHandler();
```

The function `graphqlHandler` accepts a response object.  In order for this module to remain framework agnostic, you must format the request yourself.  It is recommended to encapsulate the object re-mapping code inside a function.

The `graphqlHandler` function accepts a request parameter defined as:

```tsx
// request
type req {
  httpMethod: String, // POST or GET
  accept: String, // 'application/json' or 'text/html'
  path: String, // /graphql
  query: Query, // standardized Query object from request.body or request.queryParams
}
```

All other parameters passed to the `graphqlHandler` function will be merged as an array `...ctx` and will be passed with the request object as the [context](https://www.apollographql.com/docs/graphql-tools/resolvers/#resolver-function-signature) for your resolver functions.

Calling `graphqlHandler(format(req))` returns a Promise with:

```tsx
type res {
  body: String // response body, already JSON.stringify()
  headers: Object // response headers
  statusCode: Number // response status code
}
```

### Express

<details><summary>Code Samples</summary>
<p>

Create a function to format the Express `req` request object.

```js
// format.js
module.exports.formatExpress = (req) => {
  const httpMethod = req.method;
  const accept = req.headers['Accept'] || req.headers['accept'];
  const path = req.path;
  const query = Object.entries(req.body).length ? req.body : req.query;
  return {
    httpMethod,
    accept,
    path,
    query,
  };
};
```

Put everything together

```js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { formatExpress, } = require('./format');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create graphqlHandler here

app.get('/graphql', async (req, res) => {
  const response = await graphqlHandler(formatExpress(req));

  res.status(response.statusCode)
    .set(response.headers)
    .send(response.body);
});

app.post('/graphql', async (req, res) => {
  const response = await graphqlHandler(formatExpress(req));

  res.status(response.statusCode) // use statusCode
    .set(response.headers) // merge headers
    .send(response.body); // send body string
});

const listener = app.listen({ port: 3001, }, () => {
  console.log(`🚀 Server ready at http://localhost:${listener.address().port}${server.graphqlPath}`);
});

```
</p>
</details>

### Claudia API Builder

<details><summary>Code Samples</summary>
<p>

Create a function to format the Claudia `request` object.

```js
// format.js
module.exports.formatClaudia = (req) => {
  const httpMethod = req.context.method;
  const accept = req.headers['Accept'] || req.headers['accept'];
  const path = req.proxyRequest.requestContext.path;
  const query = Object.entries(req.body).length ? req.body : req.queryString;
  return {
    httpMethod,
    accept,
    path,
    query,
  };
};
```

Put everything together

```js
const ApiBuilder = require('claudia-api-builder');
const { formatClaudia, } = require('./format');

const api = new ApiBuilder();

api.corsMaxAge(60); // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age

// Create graphqlHandler here

api.get('/graphql', async request => {
  request.lambdaContext.callbackWaitsForEmptyEventLoop = false;

  const response = await graphqlHandler(formatClaudia(request));

  const body = response.headers['Content-Type'] === 'text/html' ?
    response.body :
    JSON.parse(response.body);

  // You must parse the body so ApiResponse does not JSON.stringify() twice
  return new api.ApiResponse(body, response.headers, response.statusCode);
});

api.post('/graphql', async request => {
  request.lambdaContext.callbackWaitsForEmptyEventLoop = false;

  const response = await graphqlHandler(formatClaudia(request));

  // You must parse the body so ApiResponse does not JSON.stringify() twice
  return new api.ApiResponse(JSON.parse(response.body), response.headers, response.statusCode);
});

module.exports = api;
```

</p>
</details>

### Notes

More documentation of ApolloServer can be found in their [docs](https://www.apollographql.com/docs/apollo-server/), especially the `apollo-server-lambda` [docs](https://www.apollographql.com/docs/apollo-server/deployment/lambda/).

#### Disabling the GUI

Disabling the GUI requires ApolloServer settings:

```js
const server = new ApolloServer({
  introspection: false,
  playground: false,
});
```

See this Apollo Server [issue](https://github.com/apollographql/apollo-server/issues/1472).

### License

MIT
