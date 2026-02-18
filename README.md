This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Set the following environment variables before running:

```bash
# Required for Calculator Basic API (Bearer token auth)
export CALCULATOR_BEARER_TOKEN=your-secret-token
```

## OpenAPI Specifications

This server hosts multiple OpenAPI specifications:

| Spec Name | File | Endpoint | Description |
|-----------|------|----------|-------------|
| OpenAPI 1 | `openapi1.json` | `/api/openapi/openapi1` | User API v1 |
| OpenAPI 2 | `openapi2.json` | `/api/openapi/openapi2` | User API v2 |
| Calculator Basic | `calculator-basic.json` | `/api/openapi/calculator-basic` | Add/Subtract/Update with Bearer auth |
| Calculator OAuth | `calculator-oauth.json` | `/api/openapi/calculator-oauth` | Multiply with OAuth |

### List All Available Specs

```bash
curl http://localhost:3000/api/openapi
```

### Get a Specific Spec

```bash
curl http://localhost:3000/api/openapi/calculator-basic
```

## Calculator APIs

### Calculator Basic (Bearer Token Authentication)

Requires `Authorization: Bearer <token>` header where token matches `CALCULATOR_BEARER_TOKEN` env var.

All endpoints support multiple HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `HEAD`.

**Add two numbers:**

Using POST/PUT/PATCH (with JSON body):
```bash
curl -X POST http://localhost:3000/api/calculator-basic/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"a": 10, "b": 5}'
```

Using GET/DELETE (with query parameters):
```bash
curl -X GET "http://localhost:3000/api/calculator-basic/add?a=10&b=5" \
  -H "Authorization: Bearer your-secret-token"
```

Using HEAD (headers only):
```bash
curl -X HEAD "http://localhost:3000/api/calculator-basic/add?a=10&b=5" \
  -H "Authorization: Bearer your-secret-token" \
  -v
```

Response: `{"result": 15}`

**Subtract two numbers:**

Using POST/PUT/PATCH (with JSON body):
```bash
curl -X POST http://localhost:3000/api/calculator-basic/subtract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"a": 10, "b": 3}'
```

Using GET/DELETE (with query parameters):
```bash
curl -X GET "http://localhost:3000/api/calculator-basic/subtract?a=10&b=3" \
  -H "Authorization: Bearer your-secret-token"
```

Response: `{"result": 7}`

**Update a value with an operation:**

Using POST/PUT/PATCH (with JSON body):
```bash
curl -X PATCH http://localhost:3000/api/calculator-basic/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"value": 10, "operation": "add", "operand": 5}'
```

Using GET/DELETE (with query parameters):
```bash
curl -X GET "http://localhost:3000/api/calculator-basic/update?value=10&operation=add&operand=5" \
  -H "Authorization: Bearer your-secret-token"
```

Response: `{"result": 15, "previousValue": 10, "operation": "add", "operand": 5}`

Supported operations: `add`, `subtract`, `multiply`, `divide`

**Note:** 
- `GET`, `HEAD`, and `DELETE` methods use query parameters
- `POST`, `PUT`, and `PATCH` methods use JSON request body
- All methods require Bearer token authentication

### Calculator OAuth (OAuth 2.0 Authentication)

Requires `Authorization: Bearer <oauth-token>` header with a valid OAuth token (minimum 10 characters for demo).

**Multiply two numbers:**

```bash
curl -X POST http://localhost:3000/api/calculator-oauth/multiply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-oauth-token-here" \
  -d '{"a": 6, "b": 7}'
```

Response: `{"result": 42}`

## Docker Deployment

Build and run with Docker:

```bash
# Build the image
docker build -t mcp-poc-app .

# Run the container
docker run -p 3000:3000 -e CALCULATOR_BEARER_TOKEN=your-secret-token mcp-poc-app
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

<!-- Start Summary [summary] -->
## Summary

Petstore - OpenAPI 3.1: This is a sample Pet Store Server based on the OpenAPI 3.1 specification.

Some useful links:
- [OpenAPI Reference](https://www.speakeasy.com/openapi)
- [The Pet Store repository](https://github.com/swagger-api/swagger-petstore)
- [The source API definition for the Pet Store](https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml)

For more information about the API: [Find out more about Swagger](http://swagger.io)
<!-- End Summary [summary] -->

<!-- Start Table of Contents [toc] -->
## Table of Contents
<!-- $toc-max-depth=2 -->
  * [Getting Started](#getting-started)
  * [Learn More](#learn-more)
  * [Deploy on Vercel](#deploy-on-vercel)
  * [Installation](#installation)

<!-- End Table of Contents [toc] -->

<!-- Start Installation [installation] -->
## Installation

> [!TIP]
> To finish publishing your MCP Server to npm and others you must [run your first generation action](https://www.speakeasy.com/docs/github-setup#step-by-step-guide).
<details>
<summary>MCP Bundle (Desktop Extension)</summary>

Install the MCP server as a Desktop Extension using the pre-built [`mcp-server.mcpb`](./static/mcp-server.mcpb) file:

Simply drag and drop the [`mcp-server.mcpb`](./static/mcp-server.mcpb) file onto Claude Desktop to install the extension.

The MCP bundle package includes the MCP server and all necessary configuration. Once installed, the server will be available without additional setup.

> [!NOTE]
> MCP bundles provide a streamlined way to package and distribute MCP servers. Learn more about [Desktop Extensions](https://www.anthropic.com/engineering/desktop-extensions).

</details>

<details>
<summary>Cursor</summary>

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=Petstore&config=eyJtY3BTZXJ2ZXJzIjp7IlBldHN0b3JlIjp7ImNvbW1hbmQiOiJucHgiLCJhcmdzIjpbInBldHN0b3JlIiwic3RhcnQiLCItLWVudmlyb25tZW50IiwiLi4uIiwiLS1hcGkta2V5IiwiLi4uIl19fX0=)

Or manually:

1. Open Cursor Settings
2. Select Tools and Integrations
3. Select New MCP Server
4. If the configuration file is empty paste the following JSON into the MCP Server Configuration:

```json
{
  "mcpServers": {
    "Petstore": {
      "command": "npx",
      "args": [
        "petstore",
        "start",
        "--environment",
        "...",
        "--api-key",
        "..."
      ]
    }
  }
}
```

</details>

<details>
<summary>Claude Code CLI</summary>

```bash
claude mcp add petstore npx petstore start -- --environment ... --api-key ...
```

</details>
<details>
<summary>Windsurf</summary>

Refer to [Official Windsurf documentation](https://docs.windsurf.com/windsurf/cascade/mcp#adding-a-new-mcp-plugin) for latest information

1. Open Windsurf Settings
2. Select Cascade on left side menu
3. Click on `Manage MCPs`. (To Manage MCPs you should be signed in with a Windsurf Account)
4. Click on `View raw config` to open up the mcp configuration file.
5. If the configuration file is empty paste the full json
```
{
  "mcpServers": {
    "Petstore": {
      "command": "npx",
      "args": [
        "petstore",
        "start",
        "--environment",
        "...",
        "--api-key",
        "..."
      ]
    }
  }
}
```
</details>
<details>
<summary>VS Code</summary>

Refer to [Official VS Code documentation](https://code.visualstudio.com/api/extension-guides/ai/mcp) for latest information

1. Open [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)
1. Search and open `MCP: Open User Configuration`. This should open mcp.json file
2. If the configuration file is empty paste the full json
```
{
  "mcpServers": {
    "Petstore": {
      "command": "npx",
      "args": [
        "petstore",
        "start",
        "--environment",
        "...",
        "--api-key",
        "..."
      ]
    }
  }
}
```

</details>
<details>
<summary>Claude Desktop</summary>
Claude Desktop doesn't yet support SSE/remote MCP servers.

You need to do the following
1. Open claude Desktop
2. Open left hand side pane, then click on your Username
3. Go to `Settings`
4. Go to `Developer` tab (on the left hand side)
5. Click on `Edit Config`
Paste the following config in the configuration

```json
{
  "mcpServers": {
    "Petstore": {
      "command": "npx",
      "args": [
        "petstore",
        "start",
        "--environment",
        "...",
        "--api-key",
        "..."
      ]
    }
  }
}
```

</details>


<details>
<summary> Stdio installation via npm </summary>
To start the MCP server, run:

```bash
npx petstore start --environment ... --api-key ...
```

For a full list of server arguments, run:

```
npx petstore --help
```

</details>
<!-- End Installation [installation] -->

<!-- Placeholder for Future Speakeasy SDK Sections -->
