# VAULTS API DOCUMENTATION

## GET /v2/vaults

> Retrieves a filtered list of vaults with their basic information including address, network, associated asset details, and transactional support status.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "General",
      "description": "Core informational endpoints providing essential reference data such as networks, assets, and vaults listings for orientation and exploration."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/vaults": {
      "get": {
        "tags": ["General"],
        "description": "Retrieves a filtered list of vaults with their basic information including address, network, associated asset details, and transactional support status.",
        "parameters": [
          {
            "schema": { "type": "integer", "minimum": 0, "default": 0 },
            "in": "query",
            "name": "page",
            "required": false,
            "description": "Page number (starting from 0)"
          },
          {
            "schema": {
              "type": "integer",
              "exclusiveMinimum": true,
              "minimum": 0,
              "maximum": 5000,
              "default": 50
            },
            "in": "query",
            "name": "perPage",
            "required": false,
            "description": "Number of items per page"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "query",
            "name": "network",
            "required": false,
            "description": "Include only vaults with provided network(name or CAIP)"
          },
          {
            "schema": { "type": "string", "minLength": 1 },
            "in": "query",
            "name": "assetSymbol",
            "required": false,
            "description": "Include only vaults with an asset of provided symbol(ticker)"
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "onlyTransactional",
            "required": false,
            "description": "Include only vaults that are supported in the transactional interface."
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "onlyAppFeatured",
            "required": false,
            "description": "Include only vaults that are featured in app.vaults.fyi"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "itemsOnPage": {
                      "type": "integer",
                      "description": "Number of items on the current page"
                    },
                    "nextPage": { "type": "integer", "description": "Next page number" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "pattern": "^0x[a-fA-F0-9]{40}$",
                            "description": "Address of the vault"
                          },
                          "network": {
                            "type": "object",
                            "properties": {
                              "name": {
                                "type": "string",
                                "enum": [
                                  "mainnet",
                                  "optimism",
                                  "arbitrum",
                                  "polygon",
                                  "gnosis",
                                  "base",
                                  "unichain",
                                  "swellchain",
                                  "celo",
                                  "worldchain",
                                  "berachain",
                                  "ink",
                                  "bsc",
                                  "hyperliquid",
                                  "plasma"
                                ],
                                "description": "Name of the network"
                              },
                              "chainId": {
                                "type": "integer",
                                "description": "Chain ID of the network"
                              },
                              "networkCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+$",
                                "description": "CAIP-2 of the network"
                              }
                            },
                            "required": ["name", "chainId", "networkCaip"],
                            "additionalProperties": false,
                            "description": "Network details of the vault"
                          },
                          "asset": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the asset"
                              },
                              "assetCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the asset"
                              },
                              "name": { "type": "string", "description": "Name of the asset" },
                              "symbol": { "type": "string", "description": "Symbol of the asset" },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the asset"
                              },
                              "assetLogo": {
                                "type": "string",
                                "format": "uri",
                                "description": "URL of the asset logo"
                              },
                              "assetPriceInUsd": {
                                "type": "string",
                                "description": "Price of the asset in USD"
                              },
                              "assetGroup": {
                                "type": "string",
                                "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                              }
                            },
                            "required": [
                              "address",
                              "assetCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "assetGroup"
                            ],
                            "additionalProperties": false,
                            "description": "Asset details of the vault"
                          },
                          "isTransactional": {
                            "type": "boolean",
                            "description": "Indicates if the vault supports transactional endpoints"
                          },
                          "isAppFeatured": {
                            "type": "boolean",
                            "description": "Indicates if the vault is featured in app.vaults.fyi"
                          }
                        },
                        "required": [
                          "address",
                          "network",
                          "asset",
                          "isTransactional",
                          "isAppFeatured"
                        ],
                        "additionalProperties": false,
                        "description": "Array of items on the current page"
                      }
                    }
                  },
                  "required": ["itemsOnPage", "data"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/assets

> Retrieves a filtered list of supported assets with their metadata including address, symbol, name, decimals, and network information.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "General",
      "description": "Core informational endpoints providing essential reference data such as networks, assets, and vaults listings for orientation and exploration."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/assets": {
      "get": {
        "tags": ["General"],
        "description": "Retrieves a filtered list of supported assets with their metadata including address, symbol, name, decimals, and network information.",
        "parameters": [
          {
            "schema": { "type": "integer", "minimum": 0, "default": 0 },
            "in": "query",
            "name": "page",
            "required": false,
            "description": "Page number (starting from 0)"
          },
          {
            "schema": {
              "type": "integer",
              "exclusiveMinimum": true,
              "minimum": 0,
              "maximum": 5000,
              "default": 50
            },
            "in": "query",
            "name": "perPage",
            "required": false,
            "description": "Number of items per page"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "query",
            "name": "network",
            "required": false,
            "description": "Include only vaults with provided network(name or CAIP)"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "itemsOnPage": {
                      "type": "integer",
                      "description": "Number of items on the current page"
                    },
                    "nextPage": { "type": "integer", "description": "Next page number" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "pattern": "^0x[a-fA-F0-9]{40}$",
                            "description": "Address of the asset"
                          },
                          "assetCaip": {
                            "type": "string",
                            "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                            "description": "CAIP-2 of the asset"
                          },
                          "name": { "type": "string", "description": "Name of the asset" },
                          "symbol": { "type": "string", "description": "Symbol of the asset" },
                          "decimals": {
                            "type": "integer",
                            "description": "Number of decimals of the asset"
                          },
                          "assetLogo": {
                            "type": "string",
                            "format": "uri",
                            "description": "URL of the asset logo"
                          },
                          "assetPriceInUsd": {
                            "type": "string",
                            "description": "Price of the asset in USD"
                          },
                          "assetGroup": {
                            "type": "string",
                            "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                          },
                          "network": {
                            "type": "object",
                            "properties": {
                              "name": {
                                "type": "string",
                                "enum": [
                                  "mainnet",
                                  "optimism",
                                  "arbitrum",
                                  "polygon",
                                  "gnosis",
                                  "base",
                                  "unichain",
                                  "swellchain",
                                  "celo",
                                  "worldchain",
                                  "berachain",
                                  "ink",
                                  "bsc",
                                  "hyperliquid",
                                  "plasma"
                                ],
                                "description": "Name of the network"
                              },
                              "chainId": {
                                "type": "integer",
                                "description": "Chain ID of the network"
                              },
                              "networkCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+$",
                                "description": "CAIP-2 of the network"
                              }
                            },
                            "required": ["name", "chainId", "networkCaip"],
                            "additionalProperties": false,
                            "description": "Network details of the asset"
                          }
                        },
                        "required": [
                          "address",
                          "assetCaip",
                          "name",
                          "symbol",
                          "decimals",
                          "assetGroup",
                          "network"
                        ],
                        "additionalProperties": false,
                        "description": "Array of items on the current page"
                      }
                    }
                  },
                  "required": ["itemsOnPage", "data"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/tags

> Retrieves a complete list of available vault categorization tags that can be used for filtering and organizing vault data

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "General",
      "description": "Core informational endpoints providing essential reference data such as networks, assets, and vaults listings for orientation and exploration."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/tags": {
      "get": {
        "tags": ["General"],
        "description": "Retrieves a complete list of available vault categorization tags that can be used for filtering and organizing vault data",
        "responses": {
          "200": {
            "description": "Tags of the vault",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "type": "string", "minLength": 1 },
                  "description": "Tags of the vault"
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/networks

> Retrieves a complete list of supported blockchain networks with their identifiers including network name, chain ID, and CAIP format identifier.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "General",
      "description": "Core informational endpoints providing essential reference data such as networks, assets, and vaults listings for orientation and exploration."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/networks": {
      "get": {
        "tags": ["General"],
        "description": "Retrieves a complete list of supported blockchain networks with their identifiers including network name, chain ID, and CAIP format identifier.",
        "responses": {
          "200": {
            "description": "List of supported networks",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "type": "string",
                        "enum": [
                          "mainnet",
                          "optimism",
                          "arbitrum",
                          "polygon",
                          "gnosis",
                          "base",
                          "unichain",
                          "swellchain",
                          "celo",
                          "worldchain",
                          "berachain",
                          "ink",
                          "bsc",
                          "hyperliquid",
                          "plasma"
                        ],
                        "description": "Name of the network"
                      },
                      "chainId": { "type": "integer", "description": "Chain ID of the network" },
                      "networkCaip": {
                        "type": "string",
                        "pattern": "^eip155:\\d+$",
                        "description": "CAIP-2 of the network"
                      }
                    },
                    "required": ["name", "chainId", "networkCaip"],
                    "additionalProperties": false
                  },
                  "description": "List of supported networks"
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

# Detailed Vaults

## GET /v2/detailed-vaults/{network}/{vaultAddress}

> Retrieves a detailed performance metrics of single vault including APY, TVL, rewards, risk scores, and protocol information based on specified filters.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Detailed Vaults",
      "description": "Comprehensive vault data endpoints delivering in-depth analytics including APY metrics, TVL statistics, rewards breakdowns, and risk scores."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/detailed-vaults/{network}/{vaultAddress}": {
      "get": {
        "tags": ["Detailed Vaults"],
        "description": "Retrieves a detailed performance metrics of single vault including APY, TVL, rewards, risk scores, and protocol information based on specified filters.",
        "parameters": [
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Include only vaults with provided network(name or CAIP)"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Address of the vault for which the data will be returned"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "address": {
                      "type": "string",
                      "pattern": "^0x[a-fA-F0-9]{40}$",
                      "description": "Address of the vault"
                    },
                    "network": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "type": "string",
                          "enum": [
                            "mainnet",
                            "optimism",
                            "arbitrum",
                            "polygon",
                            "gnosis",
                            "base",
                            "unichain",
                            "swellchain",
                            "celo",
                            "worldchain",
                            "berachain",
                            "ink",
                            "bsc",
                            "hyperliquid",
                            "plasma"
                          ],
                          "description": "Name of the network"
                        },
                        "chainId": { "type": "integer", "description": "Chain ID of the network" },
                        "networkCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+$",
                          "description": "CAIP-2 of the network"
                        }
                      },
                      "required": ["name", "chainId", "networkCaip"],
                      "additionalProperties": false,
                      "description": "Network details of the vault"
                    },
                    "asset": {
                      "type": "object",
                      "properties": {
                        "address": {
                          "type": "string",
                          "pattern": "^0x[a-fA-F0-9]{40}$",
                          "description": "Address of the asset"
                        },
                        "assetCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                          "description": "CAIP-2 of the asset"
                        },
                        "name": { "type": "string", "description": "Name of the asset" },
                        "symbol": { "type": "string", "description": "Symbol of the asset" },
                        "decimals": {
                          "type": "integer",
                          "description": "Number of decimals of the asset"
                        },
                        "assetLogo": {
                          "type": "string",
                          "format": "uri",
                          "description": "URL of the asset logo"
                        },
                        "assetPriceInUsd": {
                          "type": "string",
                          "description": "Price of the asset in USD"
                        },
                        "assetGroup": {
                          "type": "string",
                          "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                        }
                      },
                      "required": [
                        "address",
                        "assetCaip",
                        "name",
                        "symbol",
                        "decimals",
                        "assetGroup"
                      ],
                      "additionalProperties": false,
                      "description": "Asset details of the vault"
                    },
                    "isTransactional": {
                      "type": "boolean",
                      "description": "Indicates if the vault supports transactional endpoints"
                    },
                    "isAppFeatured": {
                      "type": "boolean",
                      "description": "Indicates if the vault is featured in app.vaults.fyi"
                    },
                    "name": { "type": "string", "description": "Name of the vault" },
                    "protocol": {
                      "type": "object",
                      "properties": {
                        "name": { "type": "string", "description": "Name of the protocol" },
                        "product": { "type": "string", "description": "Product of the protocol" },
                        "version": { "type": "string", "description": "Version of the protocol" },
                        "protocolUrl": { "type": "string", "description": "URL of the protocol" },
                        "description": {
                          "type": "string",
                          "description": "Description of the protocol"
                        },
                        "protocolLogo": {
                          "type": "string",
                          "description": "URL of the protocol logo"
                        }
                      },
                      "required": ["name"],
                      "additionalProperties": false,
                      "description": "Protocol details of the vault"
                    },
                    "lendUrl": { "type": "string", "description": "URL to lend the asset" },
                    "description": { "type": "string", "description": "Description of the vault" },
                    "protocolVaultUrl": {
                      "type": "string",
                      "description": "URL to the protocol vault"
                    },
                    "tags": {
                      "type": "array",
                      "items": { "type": "string", "minLength": 1 },
                      "description": "Tags of the vault"
                    },
                    "holdersData": {
                      "type": "object",
                      "properties": {
                        "totalCount": {
                          "type": "number",
                          "description": "Number of holders of the vault"
                        },
                        "totalBalance": {
                          "type": "string",
                          "description": "Total balance of the vault holders"
                        },
                        "topHolders": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the holder"
                              },
                              "lpTokenBalance": {
                                "type": "string",
                                "description": "Balance of the LP token of the holder"
                              }
                            },
                            "required": ["address", "lpTokenBalance"],
                            "additionalProperties": false
                          },
                          "description": "Top holders of the vault"
                        }
                      },
                      "additionalProperties": false
                    },
                    "apy": {
                      "type": "object",
                      "properties": {
                        "1day": {
                          "type": "object",
                          "properties": {
                            "base": { "type": "number", "description": "Base APY" },
                            "reward": { "type": "number", "description": "Reward APY" },
                            "total": { "type": "number", "description": "Total APY" }
                          },
                          "required": ["base", "reward", "total"],
                          "additionalProperties": false,
                          "description": "1day APY details"
                        },
                        "7day": {
                          "type": "object",
                          "properties": {
                            "base": { "type": "number", "description": "Base APY" },
                            "reward": { "type": "number", "description": "Reward APY" },
                            "total": { "type": "number", "description": "Total APY" }
                          },
                          "required": ["base", "reward", "total"],
                          "additionalProperties": false,
                          "description": "7day APY details"
                        },
                        "30day": {
                          "type": "object",
                          "properties": {
                            "base": { "type": "number", "description": "Base APY" },
                            "reward": { "type": "number", "description": "Reward APY" },
                            "total": { "type": "number", "description": "Total APY" }
                          },
                          "required": ["base", "reward", "total"],
                          "additionalProperties": false,
                          "description": "30day APY details"
                        }
                      },
                      "required": ["1day", "7day", "30day"],
                      "additionalProperties": false,
                      "description": "APY details of the vault"
                    },
                    "tvl": {
                      "type": "object",
                      "properties": {
                        "usd": { "type": "string", "description": "TVL in USD" },
                        "native": { "type": "string", "description": "Native TVL" }
                      },
                      "required": ["usd", "native"],
                      "additionalProperties": false,
                      "description": "TVL details of the vault"
                    },
                    "rewards": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "asset": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the asset"
                              },
                              "assetCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the asset"
                              },
                              "name": { "type": "string", "description": "Name of the asset" },
                              "symbol": { "type": "string", "description": "Symbol of the asset" },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the asset"
                              },
                              "assetLogo": {
                                "type": "string",
                                "format": "uri",
                                "description": "URL of the asset logo"
                              },
                              "assetPriceInUsd": {
                                "type": "string",
                                "description": "Price of the asset in USD"
                              },
                              "assetGroup": {
                                "type": "string",
                                "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                              }
                            },
                            "required": [
                              "address",
                              "assetCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "assetGroup"
                            ],
                            "additionalProperties": false,
                            "description": "Asset details of the reward"
                          },
                          "apy": {
                            "type": "object",
                            "properties": {
                              "1day": {
                                "type": "number",
                                "description": "1day APY of the reward asset"
                              },
                              "7day": {
                                "type": "number",
                                "description": "7day APY of the reward asset"
                              },
                              "30day": {
                                "type": "number",
                                "description": "30day APY of the reward asset"
                              }
                            },
                            "required": ["1day", "7day", "30day"],
                            "additionalProperties": false
                          }
                        },
                        "required": ["asset", "apy"],
                        "additionalProperties": false
                      },
                      "description": "List of rewards for the vault"
                    },
                    "score": {
                      "type": "object",
                      "properties": {
                        "vaultScore": { "type": "number", "description": "Score of the vault" },
                        "vaultTvlScore": {
                          "type": "number",
                          "description": "TVL score of the vault"
                        },
                        "protocolTvlScore": {
                          "type": "number",
                          "description": "TVL score of the protocol"
                        },
                        "holderScore": {
                          "type": "number",
                          "description": "Holder score of the vault"
                        },
                        "networkScore": {
                          "type": "number",
                          "description": "Network score of the vault"
                        },
                        "assetScore": {
                          "type": "number",
                          "description": "Asset score of the vault"
                        }
                      },
                      "required": [
                        "vaultScore",
                        "vaultTvlScore",
                        "protocolTvlScore",
                        "holderScore",
                        "networkScore",
                        "assetScore"
                      ],
                      "additionalProperties": false,
                      "description": "Score details of the vault"
                    },
                    "additionalIncentives": {
                      "type": "string",
                      "description": "Additional incentives of the vault"
                    },
                    "lpToken": {
                      "type": "object",
                      "properties": {
                        "address": {
                          "type": "string",
                          "pattern": "^0x[a-fA-F0-9]{40}$",
                          "description": "Address of the LP token"
                        },
                        "tokenCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                          "description": "CAIP-2 of the LP token"
                        },
                        "name": { "type": "string", "description": "Name of the LP token" },
                        "symbol": { "type": "string", "description": "Symbol of the LP token" },
                        "decimals": {
                          "type": "integer",
                          "description": "Number of decimals of the LP token"
                        }
                      },
                      "required": ["address", "tokenCaip", "name", "symbol", "decimals"],
                      "additionalProperties": false,
                      "description": "LP token details of the vault"
                    },
                    "childrenVaults": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "description": "Address of the child vault"
                          },
                          "asset": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the asset"
                              },
                              "assetCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the asset"
                              },
                              "name": { "type": "string", "description": "Name of the asset" },
                              "symbol": { "type": "string", "description": "Symbol of the asset" },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the asset"
                              },
                              "assetLogo": {
                                "type": "string",
                                "format": "uri",
                                "description": "URL of the asset logo"
                              },
                              "assetPriceInUsd": {
                                "type": "string",
                                "description": "Price of the asset in USD"
                              },
                              "assetGroup": {
                                "type": "string",
                                "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                              }
                            },
                            "required": [
                              "address",
                              "assetCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "assetGroup"
                            ],
                            "additionalProperties": false,
                            "description": "Asset details of the child vault"
                          },
                          "lpToken": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the LP token"
                              },
                              "tokenCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the LP token"
                              },
                              "name": { "type": "string", "description": "Name of the LP token" },
                              "symbol": {
                                "type": "string",
                                "description": "Symbol of the LP token"
                              },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the LP token"
                              }
                            },
                            "required": ["address", "tokenCaip", "name", "symbol", "decimals"],
                            "additionalProperties": false,
                            "description": "LP token details of the child vault"
                          },
                          "additionalAssets": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "address": {
                                  "type": "string",
                                  "pattern": "^0x[a-fA-F0-9]{40}$",
                                  "description": "Address of the asset"
                                },
                                "assetCaip": {
                                  "type": "string",
                                  "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                  "description": "CAIP-2 of the asset"
                                },
                                "name": { "type": "string", "description": "Name of the asset" },
                                "symbol": {
                                  "type": "string",
                                  "description": "Symbol of the asset"
                                },
                                "decimals": {
                                  "type": "integer",
                                  "description": "Number of decimals of the asset"
                                },
                                "assetLogo": {
                                  "type": "string",
                                  "format": "uri",
                                  "description": "URL of the asset logo"
                                },
                                "assetPriceInUsd": {
                                  "type": "string",
                                  "description": "Price of the asset in USD"
                                },
                                "assetGroup": {
                                  "type": "string",
                                  "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                }
                              },
                              "required": [
                                "address",
                                "assetCaip",
                                "name",
                                "symbol",
                                "decimals",
                                "assetGroup"
                              ],
                              "additionalProperties": false
                            },
                            "description": "Additional assets of the child vault"
                          }
                        },
                        "required": ["address", "asset"],
                        "additionalProperties": false
                      },
                      "description": "List of child vaults"
                    },
                    "additionalAssets": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "pattern": "^0x[a-fA-F0-9]{40}$",
                            "description": "Address of the asset"
                          },
                          "assetCaip": {
                            "type": "string",
                            "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                            "description": "CAIP-2 of the asset"
                          },
                          "name": { "type": "string", "description": "Name of the asset" },
                          "symbol": { "type": "string", "description": "Symbol of the asset" },
                          "decimals": {
                            "type": "integer",
                            "description": "Number of decimals of the asset"
                          },
                          "assetLogo": {
                            "type": "string",
                            "format": "uri",
                            "description": "URL of the asset logo"
                          },
                          "assetPriceInUsd": {
                            "type": "string",
                            "description": "Price of the asset in USD"
                          },
                          "assetGroup": {
                            "type": "string",
                            "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                          }
                        },
                        "required": [
                          "address",
                          "assetCaip",
                          "name",
                          "symbol",
                          "decimals",
                          "assetGroup"
                        ],
                        "additionalProperties": false
                      },
                      "description": "Additional assets of the vault"
                    },
                    "transactionalProperties": {
                      "type": "object",
                      "properties": {
                        "depositStepsType": {
                          "type": "string",
                          "enum": ["instant", "complex"],
                          "description": "Type of transaction steps, either \"instant\" or \"complex\""
                        },
                        "redeemStepsType": {
                          "type": "string",
                          "enum": ["instant", "complex"],
                          "description": "Type of transaction steps, either \"instant\" or \"complex\""
                        },
                        "rewardsSupported": {
                          "type": "boolean",
                          "description": "Indicates if the vault supports rewards transaction flows"
                        }
                      },
                      "required": ["depositStepsType", "redeemStepsType", "rewardsSupported"],
                      "additionalProperties": false,
                      "description": "Transactional properties of the vault"
                    }
                  },
                  "required": [
                    "address",
                    "network",
                    "asset",
                    "isTransactional",
                    "isAppFeatured",
                    "name",
                    "protocol",
                    "tags",
                    "holdersData",
                    "apy",
                    "tvl",
                    "rewards"
                  ],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/detailed-vaults

> Retrieves a comprehensive list of vaults with detailed performance metrics including APY, TVL, rewards, risk scores, and protocol information based on specified filters.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Detailed Vaults",
      "description": "Comprehensive vault data endpoints delivering in-depth analytics including APY metrics, TVL statistics, rewards breakdowns, and risk scores."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/detailed-vaults": {
      "get": {
        "tags": ["Detailed Vaults"],
        "description": "Retrieves a comprehensive list of vaults with detailed performance metrics including APY, TVL, rewards, risk scores, and protocol information based on specified filters.",
        "parameters": [
          {
            "schema": { "type": "integer", "minimum": 0, "default": 0 },
            "in": "query",
            "name": "page",
            "required": false,
            "description": "Page number (starting from 0)"
          },
          {
            "schema": {
              "type": "integer",
              "exclusiveMinimum": true,
              "minimum": 0,
              "maximum": 5000,
              "default": 50
            },
            "in": "query",
            "name": "perPage",
            "required": false,
            "description": "Number of items per page"
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "allowedAssets",
            "required": false,
            "description": "Assets to be included by symbol(ticker)."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "disallowedAssets",
            "required": false,
            "description": "Assets to be excluded by symbol(ticker). The parameter is ignored if \"allowedAssets\" is specified."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "allowedProtocols",
            "required": false,
            "description": "Protocols to be included by name."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "disallowedProtocols",
            "required": false,
            "description": "Protocols to be excluded by name. The parameter is ignored if \"allowedProtocols\" is specified."
          },
          {
            "schema": { "type": "integer", "default": 100000 },
            "in": "query",
            "name": "minTvl",
            "required": false,
            "description": "Minimum TVL in USD of the vaults to be included"
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "onlyTransactional",
            "required": false,
            "description": "Include only vaults that are supported in the transactional interface."
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "onlyAppFeatured",
            "required": false,
            "description": "Include only vaults that are featured in app.vaults.fyi"
          },
          {
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "mainnet",
                  "optimism",
                  "arbitrum",
                  "polygon",
                  "gnosis",
                  "base",
                  "unichain",
                  "swellchain",
                  "celo",
                  "worldchain",
                  "berachain",
                  "ink",
                  "bsc",
                  "hyperliquid",
                  "plasma",
                  "eip155:1",
                  "eip155:10",
                  "eip155:42161",
                  "eip155:137",
                  "eip155:100",
                  "eip155:8453",
                  "eip155:130",
                  "eip155:1923",
                  "eip155:42220",
                  "eip155:480",
                  "eip155:80094",
                  "eip155:57073",
                  "eip155:56",
                  "eip155:999",
                  "eip155:9745"
                ],
                "description": "Include only vaults with provided network(name or CAIP)"
              },
              "default": ["base", "mainnet", "arbitrum", "optimism"]
            },
            "in": "query",
            "name": "allowedNetworks",
            "required": false,
            "description": "Networks to be included (name or CAIP)."
          },
          {
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "mainnet",
                  "optimism",
                  "arbitrum",
                  "polygon",
                  "gnosis",
                  "base",
                  "unichain",
                  "swellchain",
                  "celo",
                  "worldchain",
                  "berachain",
                  "ink",
                  "bsc",
                  "hyperliquid",
                  "plasma",
                  "eip155:1",
                  "eip155:10",
                  "eip155:42161",
                  "eip155:137",
                  "eip155:100",
                  "eip155:8453",
                  "eip155:130",
                  "eip155:1923",
                  "eip155:42220",
                  "eip155:480",
                  "eip155:80094",
                  "eip155:57073",
                  "eip155:56",
                  "eip155:999",
                  "eip155:9745"
                ],
                "description": "Include only vaults with provided network(name or CAIP)"
              }
            },
            "in": "query",
            "name": "disallowedNetworks",
            "required": false,
            "description": "Networks to be excluded (name or CAIP). The parameter is ignored if \"allowedNetworks\" is specified."
          },
          {
            "schema": { "type": "integer" },
            "in": "query",
            "name": "maxTvl",
            "required": false,
            "description": "Maximum TVL in USD of the vaults to be included"
          },
          {
            "schema": { "type": "number" },
            "in": "query",
            "name": "maxApy",
            "required": false,
            "description": "Maximum APY (in decimal) of the vaults to be included"
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "tags",
            "required": false,
            "description": "Tags to be included."
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "itemsOnPage": {
                      "type": "integer",
                      "description": "Number of items on the current page"
                    },
                    "nextPage": { "type": "integer", "description": "Next page number" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "pattern": "^0x[a-fA-F0-9]{40}$",
                            "description": "Address of the vault"
                          },
                          "network": {
                            "type": "object",
                            "properties": {
                              "name": {
                                "type": "string",
                                "enum": [
                                  "mainnet",
                                  "optimism",
                                  "arbitrum",
                                  "polygon",
                                  "gnosis",
                                  "base",
                                  "unichain",
                                  "swellchain",
                                  "celo",
                                  "worldchain",
                                  "berachain",
                                  "ink",
                                  "bsc",
                                  "hyperliquid",
                                  "plasma"
                                ],
                                "description": "Name of the network"
                              },
                              "chainId": {
                                "type": "integer",
                                "description": "Chain ID of the network"
                              },
                              "networkCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+$",
                                "description": "CAIP-2 of the network"
                              }
                            },
                            "required": ["name", "chainId", "networkCaip"],
                            "additionalProperties": false,
                            "description": "Network details of the vault"
                          },
                          "asset": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the asset"
                              },
                              "assetCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the asset"
                              },
                              "name": { "type": "string", "description": "Name of the asset" },
                              "symbol": { "type": "string", "description": "Symbol of the asset" },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the asset"
                              },
                              "assetLogo": {
                                "type": "string",
                                "format": "uri",
                                "description": "URL of the asset logo"
                              },
                              "assetPriceInUsd": {
                                "type": "string",
                                "description": "Price of the asset in USD"
                              },
                              "assetGroup": {
                                "type": "string",
                                "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                              }
                            },
                            "required": [
                              "address",
                              "assetCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "assetGroup"
                            ],
                            "additionalProperties": false,
                            "description": "Asset details of the vault"
                          },
                          "isTransactional": {
                            "type": "boolean",
                            "description": "Indicates if the vault supports transactional endpoints"
                          },
                          "isAppFeatured": {
                            "type": "boolean",
                            "description": "Indicates if the vault is featured in app.vaults.fyi"
                          },
                          "name": { "type": "string", "description": "Name of the vault" },
                          "protocol": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the protocol" },
                              "product": {
                                "type": "string",
                                "description": "Product of the protocol"
                              },
                              "version": {
                                "type": "string",
                                "description": "Version of the protocol"
                              },
                              "protocolUrl": {
                                "type": "string",
                                "description": "URL of the protocol"
                              },
                              "description": {
                                "type": "string",
                                "description": "Description of the protocol"
                              },
                              "protocolLogo": {
                                "type": "string",
                                "description": "URL of the protocol logo"
                              }
                            },
                            "required": ["name"],
                            "additionalProperties": false,
                            "description": "Protocol details of the vault"
                          },
                          "lendUrl": { "type": "string", "description": "URL to lend the asset" },
                          "description": {
                            "type": "string",
                            "description": "Description of the vault"
                          },
                          "protocolVaultUrl": {
                            "type": "string",
                            "description": "URL to the protocol vault"
                          },
                          "tags": {
                            "type": "array",
                            "items": { "type": "string", "minLength": 1 },
                            "description": "Tags of the vault"
                          },
                          "holdersData": {
                            "type": "object",
                            "properties": {
                              "totalCount": {
                                "type": "number",
                                "description": "Number of holders of the vault"
                              },
                              "totalBalance": {
                                "type": "string",
                                "description": "Total balance of the vault holders"
                              },
                              "topHolders": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "address": {
                                      "type": "string",
                                      "pattern": "^0x[a-fA-F0-9]{40}$",
                                      "description": "Address of the holder"
                                    },
                                    "lpTokenBalance": {
                                      "type": "string",
                                      "description": "Balance of the LP token of the holder"
                                    }
                                  },
                                  "required": ["address", "lpTokenBalance"],
                                  "additionalProperties": false
                                },
                                "description": "Top holders of the vault"
                              }
                            },
                            "additionalProperties": false
                          },
                          "apy": {
                            "type": "object",
                            "properties": {
                              "1day": {
                                "type": "object",
                                "properties": {
                                  "base": { "type": "number", "description": "Base APY" },
                                  "reward": { "type": "number", "description": "Reward APY" },
                                  "total": { "type": "number", "description": "Total APY" }
                                },
                                "required": ["base", "reward", "total"],
                                "additionalProperties": false,
                                "description": "1day APY details"
                              },
                              "7day": {
                                "type": "object",
                                "properties": {
                                  "base": { "type": "number", "description": "Base APY" },
                                  "reward": { "type": "number", "description": "Reward APY" },
                                  "total": { "type": "number", "description": "Total APY" }
                                },
                                "required": ["base", "reward", "total"],
                                "additionalProperties": false,
                                "description": "7day APY details"
                              },
                              "30day": {
                                "type": "object",
                                "properties": {
                                  "base": { "type": "number", "description": "Base APY" },
                                  "reward": { "type": "number", "description": "Reward APY" },
                                  "total": { "type": "number", "description": "Total APY" }
                                },
                                "required": ["base", "reward", "total"],
                                "additionalProperties": false,
                                "description": "30day APY details"
                              }
                            },
                            "required": ["1day", "7day", "30day"],
                            "additionalProperties": false,
                            "description": "APY details of the vault"
                          },
                          "tvl": {
                            "type": "object",
                            "properties": {
                              "usd": { "type": "string", "description": "TVL in USD" },
                              "native": { "type": "string", "description": "Native TVL" }
                            },
                            "required": ["usd", "native"],
                            "additionalProperties": false,
                            "description": "TVL details of the vault"
                          },
                          "rewards": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "asset": {
                                  "type": "object",
                                  "properties": {
                                    "address": {
                                      "type": "string",
                                      "pattern": "^0x[a-fA-F0-9]{40}$",
                                      "description": "Address of the asset"
                                    },
                                    "assetCaip": {
                                      "type": "string",
                                      "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                      "description": "CAIP-2 of the asset"
                                    },
                                    "name": {
                                      "type": "string",
                                      "description": "Name of the asset"
                                    },
                                    "symbol": {
                                      "type": "string",
                                      "description": "Symbol of the asset"
                                    },
                                    "decimals": {
                                      "type": "integer",
                                      "description": "Number of decimals of the asset"
                                    },
                                    "assetLogo": {
                                      "type": "string",
                                      "format": "uri",
                                      "description": "URL of the asset logo"
                                    },
                                    "assetPriceInUsd": {
                                      "type": "string",
                                      "description": "Price of the asset in USD"
                                    },
                                    "assetGroup": {
                                      "type": "string",
                                      "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                    }
                                  },
                                  "required": [
                                    "address",
                                    "assetCaip",
                                    "name",
                                    "symbol",
                                    "decimals",
                                    "assetGroup"
                                  ],
                                  "additionalProperties": false,
                                  "description": "Asset details of the reward"
                                },
                                "apy": {
                                  "type": "object",
                                  "properties": {
                                    "1day": {
                                      "type": "number",
                                      "description": "1day APY of the reward asset"
                                    },
                                    "7day": {
                                      "type": "number",
                                      "description": "7day APY of the reward asset"
                                    },
                                    "30day": {
                                      "type": "number",
                                      "description": "30day APY of the reward asset"
                                    }
                                  },
                                  "required": ["1day", "7day", "30day"],
                                  "additionalProperties": false
                                }
                              },
                              "required": ["asset", "apy"],
                              "additionalProperties": false
                            },
                            "description": "List of rewards for the vault"
                          },
                          "score": {
                            "type": "object",
                            "properties": {
                              "vaultScore": {
                                "type": "number",
                                "description": "Score of the vault"
                              },
                              "vaultTvlScore": {
                                "type": "number",
                                "description": "TVL score of the vault"
                              },
                              "protocolTvlScore": {
                                "type": "number",
                                "description": "TVL score of the protocol"
                              },
                              "holderScore": {
                                "type": "number",
                                "description": "Holder score of the vault"
                              },
                              "networkScore": {
                                "type": "number",
                                "description": "Network score of the vault"
                              },
                              "assetScore": {
                                "type": "number",
                                "description": "Asset score of the vault"
                              }
                            },
                            "required": [
                              "vaultScore",
                              "vaultTvlScore",
                              "protocolTvlScore",
                              "holderScore",
                              "networkScore",
                              "assetScore"
                            ],
                            "additionalProperties": false,
                            "description": "Score details of the vault"
                          },
                          "additionalIncentives": {
                            "type": "string",
                            "description": "Additional incentives of the vault"
                          },
                          "lpToken": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the LP token"
                              },
                              "tokenCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the LP token"
                              },
                              "name": { "type": "string", "description": "Name of the LP token" },
                              "symbol": {
                                "type": "string",
                                "description": "Symbol of the LP token"
                              },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the LP token"
                              }
                            },
                            "required": ["address", "tokenCaip", "name", "symbol", "decimals"],
                            "additionalProperties": false,
                            "description": "LP token details of the vault"
                          },
                          "childrenVaults": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "address": {
                                  "type": "string",
                                  "description": "Address of the child vault"
                                },
                                "asset": {
                                  "type": "object",
                                  "properties": {
                                    "address": {
                                      "type": "string",
                                      "pattern": "^0x[a-fA-F0-9]{40}$",
                                      "description": "Address of the asset"
                                    },
                                    "assetCaip": {
                                      "type": "string",
                                      "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                      "description": "CAIP-2 of the asset"
                                    },
                                    "name": {
                                      "type": "string",
                                      "description": "Name of the asset"
                                    },
                                    "symbol": {
                                      "type": "string",
                                      "description": "Symbol of the asset"
                                    },
                                    "decimals": {
                                      "type": "integer",
                                      "description": "Number of decimals of the asset"
                                    },
                                    "assetLogo": {
                                      "type": "string",
                                      "format": "uri",
                                      "description": "URL of the asset logo"
                                    },
                                    "assetPriceInUsd": {
                                      "type": "string",
                                      "description": "Price of the asset in USD"
                                    },
                                    "assetGroup": {
                                      "type": "string",
                                      "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                    }
                                  },
                                  "required": [
                                    "address",
                                    "assetCaip",
                                    "name",
                                    "symbol",
                                    "decimals",
                                    "assetGroup"
                                  ],
                                  "additionalProperties": false,
                                  "description": "Asset details of the child vault"
                                },
                                "lpToken": {
                                  "type": "object",
                                  "properties": {
                                    "address": {
                                      "type": "string",
                                      "pattern": "^0x[a-fA-F0-9]{40}$",
                                      "description": "Address of the LP token"
                                    },
                                    "tokenCaip": {
                                      "type": "string",
                                      "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                      "description": "CAIP-2 of the LP token"
                                    },
                                    "name": {
                                      "type": "string",
                                      "description": "Name of the LP token"
                                    },
                                    "symbol": {
                                      "type": "string",
                                      "description": "Symbol of the LP token"
                                    },
                                    "decimals": {
                                      "type": "integer",
                                      "description": "Number of decimals of the LP token"
                                    }
                                  },
                                  "required": [
                                    "address",
                                    "tokenCaip",
                                    "name",
                                    "symbol",
                                    "decimals"
                                  ],
                                  "additionalProperties": false,
                                  "description": "LP token details of the child vault"
                                },
                                "additionalAssets": {
                                  "type": "array",
                                  "items": {
                                    "type": "object",
                                    "properties": {
                                      "address": {
                                        "type": "string",
                                        "pattern": "^0x[a-fA-F0-9]{40}$",
                                        "description": "Address of the asset"
                                      },
                                      "assetCaip": {
                                        "type": "string",
                                        "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                        "description": "CAIP-2 of the asset"
                                      },
                                      "name": {
                                        "type": "string",
                                        "description": "Name of the asset"
                                      },
                                      "symbol": {
                                        "type": "string",
                                        "description": "Symbol of the asset"
                                      },
                                      "decimals": {
                                        "type": "integer",
                                        "description": "Number of decimals of the asset"
                                      },
                                      "assetLogo": {
                                        "type": "string",
                                        "format": "uri",
                                        "description": "URL of the asset logo"
                                      },
                                      "assetPriceInUsd": {
                                        "type": "string",
                                        "description": "Price of the asset in USD"
                                      },
                                      "assetGroup": {
                                        "type": "string",
                                        "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                      }
                                    },
                                    "required": [
                                      "address",
                                      "assetCaip",
                                      "name",
                                      "symbol",
                                      "decimals",
                                      "assetGroup"
                                    ],
                                    "additionalProperties": false
                                  },
                                  "description": "Additional assets of the child vault"
                                }
                              },
                              "required": ["address", "asset"],
                              "additionalProperties": false
                            },
                            "description": "List of child vaults"
                          },
                          "additionalAssets": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "address": {
                                  "type": "string",
                                  "pattern": "^0x[a-fA-F0-9]{40}$",
                                  "description": "Address of the asset"
                                },
                                "assetCaip": {
                                  "type": "string",
                                  "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                  "description": "CAIP-2 of the asset"
                                },
                                "name": { "type": "string", "description": "Name of the asset" },
                                "symbol": {
                                  "type": "string",
                                  "description": "Symbol of the asset"
                                },
                                "decimals": {
                                  "type": "integer",
                                  "description": "Number of decimals of the asset"
                                },
                                "assetLogo": {
                                  "type": "string",
                                  "format": "uri",
                                  "description": "URL of the asset logo"
                                },
                                "assetPriceInUsd": {
                                  "type": "string",
                                  "description": "Price of the asset in USD"
                                },
                                "assetGroup": {
                                  "type": "string",
                                  "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                }
                              },
                              "required": [
                                "address",
                                "assetCaip",
                                "name",
                                "symbol",
                                "decimals",
                                "assetGroup"
                              ],
                              "additionalProperties": false
                            },
                            "description": "Additional assets of the vault"
                          },
                          "transactionalProperties": {
                            "type": "object",
                            "properties": {
                              "depositStepsType": {
                                "type": "string",
                                "enum": ["instant", "complex"],
                                "description": "Type of transaction steps, either \"instant\" or \"complex\""
                              },
                              "redeemStepsType": {
                                "type": "string",
                                "enum": ["instant", "complex"],
                                "description": "Type of transaction steps, either \"instant\" or \"complex\""
                              },
                              "rewardsSupported": {
                                "type": "boolean",
                                "description": "Indicates if the vault supports rewards transaction flows"
                              }
                            },
                            "required": ["depositStepsType", "redeemStepsType", "rewardsSupported"],
                            "additionalProperties": false,
                            "description": "Transactional properties of the vault"
                          }
                        },
                        "required": [
                          "address",
                          "network",
                          "asset",
                          "isTransactional",
                          "isAppFeatured",
                          "name",
                          "protocol",
                          "tags",
                          "holdersData",
                          "apy",
                          "tvl",
                          "rewards"
                        ],
                        "additionalProperties": false,
                        "description": "Array of items on the current page"
                      }
                    },
                    "errors": {
                      "type": "object",
                      "properties": {
                        "unsupportedNetworks": { "type": "array", "items": { "type": "string" } },
                        "unsupportedAssets": { "type": "array", "items": { "type": "string" } },
                        "unsupportedProtocols": { "type": "array", "items": { "type": "string" } }
                      },
                      "required": [
                        "unsupportedNetworks",
                        "unsupportedAssets",
                        "unsupportedProtocols"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "required": ["itemsOnPage", "data", "errors"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/detailed-vaults/{network}/{vaultAddress}/apy

> Retrieves vault APY breakdown.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Detailed Vaults",
      "description": "Comprehensive vault data endpoints delivering in-depth analytics including APY metrics, TVL statistics, rewards breakdowns, and risk scores."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/detailed-vaults/{network}/{vaultAddress}/apy": {
      "get": {
        "tags": ["Detailed Vaults"],
        "description": "Retrieves vault APY breakdown.",
        "parameters": [
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Include only vaults with provided network(name or CAIP)"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Address of the vault for which the data will be returned"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "1day": {
                      "type": "object",
                      "properties": {
                        "base": { "type": "number", "description": "Base APY" },
                        "reward": { "type": "number", "description": "Reward APY" },
                        "total": { "type": "number", "description": "Total APY" }
                      },
                      "required": ["base", "reward", "total"],
                      "additionalProperties": false,
                      "description": "1day APY details"
                    },
                    "7day": {
                      "type": "object",
                      "properties": {
                        "base": { "type": "number", "description": "Base APY" },
                        "reward": { "type": "number", "description": "Reward APY" },
                        "total": { "type": "number", "description": "Total APY" }
                      },
                      "required": ["base", "reward", "total"],
                      "additionalProperties": false,
                      "description": "7day APY details"
                    },
                    "30day": {
                      "type": "object",
                      "properties": {
                        "base": { "type": "number", "description": "Base APY" },
                        "reward": { "type": "number", "description": "Reward APY" },
                        "total": { "type": "number", "description": "Total APY" }
                      },
                      "required": ["base", "reward", "total"],
                      "additionalProperties": false,
                      "description": "30day APY details"
                    }
                  },
                  "required": ["1day", "7day", "30day"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/detailed-vaults/{network}/{vaultAddress}/tvl

> Retrieves vault Tvl breakdown.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Detailed Vaults",
      "description": "Comprehensive vault data endpoints delivering in-depth analytics including APY metrics, TVL statistics, rewards breakdowns, and risk scores."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/detailed-vaults/{network}/{vaultAddress}/tvl": {
      "get": {
        "tags": ["Detailed Vaults"],
        "description": "Retrieves vault Tvl breakdown.",
        "parameters": [
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Include only vaults with provided network(name or CAIP)"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Address of the vault for which the data will be returned"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "usd": { "type": "string", "description": "TVL in USD" },
                    "native": { "type": "string", "description": "Native TVL" }
                  },
                  "required": ["usd", "native"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

# Historical

## GET /v2/historical/{network}/{vaultAddress}

> Retrieves historical APY and TVL for a specific vault, based on the provided query parameters.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Historical (PRO)",
      "description": "Premium endpoints returning time-series historical data for vault metrics, enabling trend analysis and performance tracking over customizable periods."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/historical/{network}/{vaultAddress}": {
      "get": {
        "tags": ["Historical (PRO)"],
        "description": "Retrieves historical APY and TVL for a specific vault, based on the provided query parameters.",
        "parameters": [
          {
            "schema": { "type": "integer", "minimum": 0, "default": 0 },
            "in": "query",
            "name": "page",
            "required": false,
            "description": "Page number (starting from 0)"
          },
          {
            "schema": {
              "type": "integer",
              "exclusiveMinimum": true,
              "minimum": 0,
              "maximum": 20000,
              "default": 50
            },
            "in": "query",
            "name": "perPage",
            "required": false,
            "description": "Number of items per page"
          },
          {
            "schema": { "type": "string", "enum": ["1day", "7day", "30day"], "default": "7day" },
            "in": "query",
            "name": "apyInterval",
            "required": false,
            "description": "Interval for APY data. Possible values: 1day, 7day, 30day"
          },
          {
            "schema": { "type": "string", "enum": ["1hour", "1day", "1week"], "default": "1hour" },
            "in": "query",
            "name": "granularity",
            "required": false,
            "description": "Granularity for historical data (even intervals starting from epoch 0). Possible values: 1hour, 1day, 1week"
          },
          {
            "schema": { "type": "integer", "default": 0 },
            "in": "query",
            "name": "fromTimestamp",
            "required": false,
            "description": "Timestamp for the start of the time period for which data will be fetched"
          },
          {
            "schema": { "type": "integer" },
            "in": "query",
            "name": "toTimestamp",
            "required": false,
            "description": "Timestamp for the end of the time period for which data will be fetched"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Include only vaults with provided network(name or CAIP)"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Address of the vault for which the data will be returned"
          }
        ],
        "responses": {
          "200": {
            "description": "Historical TVL and APY data for a vault, paginated by timestamp",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "itemsOnPage": {
                      "type": "integer",
                      "description": "Number of items on the current page"
                    },
                    "nextPage": { "type": "integer", "description": "Next page number" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "timestamp": {
                            "type": "integer",
                            "description": "Timestamp of the data point"
                          },
                          "blockNumber": {
                            "type": "string",
                            "description": "Block number of the data point"
                          },
                          "apy": {
                            "type": "object",
                            "properties": {
                              "base": { "type": "number", "description": "Base APY" },
                              "reward": { "type": "number", "description": "Reward APY" },
                              "total": { "type": "number", "description": "Total APY" }
                            },
                            "required": ["base", "reward", "total"],
                            "additionalProperties": false,
                            "description": "APY breakdown"
                          },
                          "tvl": {
                            "type": "object",
                            "properties": {
                              "usd": { "type": "string", "description": "TVL in USD" },
                              "native": { "type": "string", "description": "Native TVL" }
                            },
                            "required": ["usd", "native"],
                            "additionalProperties": false,
                            "description": "TVL breakdown"
                          },
                          "sharePrice": { "type": "number", "description": "Share price of vault" }
                        },
                        "required": ["timestamp", "blockNumber", "apy", "tvl", "sharePrice"],
                        "additionalProperties": false,
                        "description": "Array of items on the current page"
                      }
                    }
                  },
                  "required": ["itemsOnPage", "data"],
                  "additionalProperties": false,
                  "description": "Historical TVL and APY data for a vault, paginated by timestamp"
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/historical/{network}/{vaultAddress}/apy

> Retrieves time-series historical APY data for a specific vault, including base yield and rewards components over a customizable time range

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Historical (PRO)",
      "description": "Premium endpoints returning time-series historical data for vault metrics, enabling trend analysis and performance tracking over customizable periods."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/historical/{network}/{vaultAddress}/apy": {
      "get": {
        "tags": ["Historical (PRO)"],
        "description": "Retrieves time-series historical APY data for a specific vault, including base yield and rewards components over a customizable time range",
        "parameters": [
          {
            "schema": { "type": "integer", "minimum": 0, "default": 0 },
            "in": "query",
            "name": "page",
            "required": false,
            "description": "Page number (starting from 0)"
          },
          {
            "schema": {
              "type": "integer",
              "exclusiveMinimum": true,
              "minimum": 0,
              "maximum": 20000,
              "default": 50
            },
            "in": "query",
            "name": "perPage",
            "required": false,
            "description": "Number of items per page"
          },
          {
            "schema": { "type": "string", "enum": ["1day", "7day", "30day"], "default": "7day" },
            "in": "query",
            "name": "apyInterval",
            "required": false,
            "description": "Interval for APY data. Possible values: 1day, 7day, 30day"
          },
          {
            "schema": { "type": "string", "enum": ["1hour", "1day", "1week"], "default": "1hour" },
            "in": "query",
            "name": "granularity",
            "required": false,
            "description": "Granularity for historical data (even intervals starting from epoch 0). Possible values: 1hour, 1day, 1week"
          },
          {
            "schema": { "type": "integer", "default": 0 },
            "in": "query",
            "name": "fromTimestamp",
            "required": false,
            "description": "Timestamp for the start of the time period for which data will be fetched"
          },
          {
            "schema": { "type": "integer" },
            "in": "query",
            "name": "toTimestamp",
            "required": false,
            "description": "Timestamp for the end of the time period for which data will be fetched"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Include only vaults with provided network(name or CAIP)"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Address of the vault for which the data will be returned"
          }
        ],
        "responses": {
          "200": {
            "description": "Historical APY data for a vault, paginated by timestamp",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "itemsOnPage": {
                      "type": "integer",
                      "description": "Number of items on the current page"
                    },
                    "nextPage": { "type": "integer", "description": "Next page number" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "timestamp": {
                            "type": "integer",
                            "description": "Timestamp of the data point"
                          },
                          "blockNumber": {
                            "type": "string",
                            "description": "Block number of the data point"
                          },
                          "apy": {
                            "type": "object",
                            "properties": {
                              "base": { "type": "number", "description": "Base APY" },
                              "reward": { "type": "number", "description": "Reward APY" },
                              "total": { "type": "number", "description": "Total APY" }
                            },
                            "required": ["base", "reward", "total"],
                            "additionalProperties": false,
                            "description": "APY breakdown"
                          }
                        },
                        "required": ["timestamp", "blockNumber", "apy"],
                        "additionalProperties": false,
                        "description": "Array of items on the current page"
                      }
                    }
                  },
                  "required": ["itemsOnPage", "data"],
                  "additionalProperties": false,
                  "description": "Historical APY data for a vault, paginated by timestamp"
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/historical/{network}/{vaultAddress}/tvl

> Retrieves time-series historical TVL data for a specific vault, including base yield and rewards components over a customizable time range

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Historical (PRO)",
      "description": "Premium endpoints returning time-series historical data for vault metrics, enabling trend analysis and performance tracking over customizable periods."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/historical/{network}/{vaultAddress}/tvl": {
      "get": {
        "tags": ["Historical (PRO)"],
        "description": "Retrieves time-series historical TVL data for a specific vault, including base yield and rewards components over a customizable time range",
        "parameters": [
          {
            "schema": { "type": "integer", "minimum": 0, "default": 0 },
            "in": "query",
            "name": "page",
            "required": false,
            "description": "Page number (starting from 0)"
          },
          {
            "schema": {
              "type": "integer",
              "exclusiveMinimum": true,
              "minimum": 0,
              "maximum": 20000,
              "default": 50
            },
            "in": "query",
            "name": "perPage",
            "required": false,
            "description": "Number of items per page"
          },
          {
            "schema": { "type": "string", "enum": ["1day", "7day", "30day"], "default": "7day" },
            "in": "query",
            "name": "apyInterval",
            "required": false,
            "description": "Interval for APY data. Possible values: 1day, 7day, 30day"
          },
          {
            "schema": { "type": "string", "enum": ["1hour", "1day", "1week"], "default": "1hour" },
            "in": "query",
            "name": "granularity",
            "required": false,
            "description": "Granularity for historical data (even intervals starting from epoch 0). Possible values: 1hour, 1day, 1week"
          },
          {
            "schema": { "type": "integer", "default": 0 },
            "in": "query",
            "name": "fromTimestamp",
            "required": false,
            "description": "Timestamp for the start of the time period for which data will be fetched"
          },
          {
            "schema": { "type": "integer" },
            "in": "query",
            "name": "toTimestamp",
            "required": false,
            "description": "Timestamp for the end of the time period for which data will be fetched"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Include only vaults with provided network(name or CAIP)"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Address of the vault for which the data will be returned"
          }
        ],
        "responses": {
          "200": {
            "description": "Historical TVL data for a vault, paginated by timestamp",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "itemsOnPage": {
                      "type": "integer",
                      "description": "Number of items on the current page"
                    },
                    "nextPage": { "type": "integer", "description": "Next page number" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "timestamp": {
                            "type": "integer",
                            "description": "Timestamp of the data point"
                          },
                          "blockNumber": {
                            "type": "string",
                            "description": "Block number of the data point"
                          },
                          "tvl": {
                            "type": "object",
                            "properties": {
                              "usd": { "type": "string", "description": "TVL in USD" },
                              "native": { "type": "string", "description": "Native TVL" }
                            },
                            "required": ["usd", "native"],
                            "additionalProperties": false,
                            "description": "TVL breakdown"
                          }
                        },
                        "required": ["timestamp", "blockNumber", "tvl"],
                        "additionalProperties": false,
                        "description": "Array of items on the current page"
                      }
                    }
                  },
                  "required": ["itemsOnPage", "data"],
                  "additionalProperties": false,
                  "description": "Historical TVL data for a vault, paginated by timestamp"
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/historical/{network}/{vaultAddress}/sharePrice

> Retrieves time-series historical TVL data for a specific vault, including base yield and rewards components over a customizable time range

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Historical (PRO)",
      "description": "Premium endpoints returning time-series historical data for vault metrics, enabling trend analysis and performance tracking over customizable periods."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/historical/{network}/{vaultAddress}/sharePrice": {
      "get": {
        "tags": ["Historical (PRO)"],
        "description": "Retrieves time-series historical TVL data for a specific vault, including base yield and rewards components over a customizable time range",
        "parameters": [
          {
            "schema": { "type": "integer", "minimum": 0, "default": 0 },
            "in": "query",
            "name": "page",
            "required": false,
            "description": "Page number (starting from 0)"
          },
          {
            "schema": {
              "type": "integer",
              "exclusiveMinimum": true,
              "minimum": 0,
              "maximum": 20000,
              "default": 50
            },
            "in": "query",
            "name": "perPage",
            "required": false,
            "description": "Number of items per page"
          },
          {
            "schema": { "type": "string", "enum": ["1day", "7day", "30day"], "default": "7day" },
            "in": "query",
            "name": "apyInterval",
            "required": false,
            "description": "Interval for APY data. Possible values: 1day, 7day, 30day"
          },
          {
            "schema": { "type": "string", "enum": ["1hour", "1day", "1week"], "default": "1hour" },
            "in": "query",
            "name": "granularity",
            "required": false,
            "description": "Granularity for historical data (even intervals starting from epoch 0). Possible values: 1hour, 1day, 1week"
          },
          {
            "schema": { "type": "integer", "default": 0 },
            "in": "query",
            "name": "fromTimestamp",
            "required": false,
            "description": "Timestamp for the start of the time period for which data will be fetched"
          },
          {
            "schema": { "type": "integer" },
            "in": "query",
            "name": "toTimestamp",
            "required": false,
            "description": "Timestamp for the end of the time period for which data will be fetched"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Include only vaults with provided network(name or CAIP)"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Address of the vault for which the data will be returned"
          }
        ],
        "responses": {
          "200": {
            "description": "Historical SharePrice data for a vault, paginated by timestamp",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "itemsOnPage": {
                      "type": "integer",
                      "description": "Number of items on the current page"
                    },
                    "nextPage": { "type": "integer", "description": "Next page number" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "timestamp": {
                            "type": "integer",
                            "description": "Timestamp of the data point"
                          },
                          "blockNumber": {
                            "type": "string",
                            "description": "Block number of the data point"
                          },
                          "sharePrice": { "type": "number", "description": "Share price of vault" }
                        },
                        "required": ["timestamp", "blockNumber", "sharePrice"],
                        "additionalProperties": false,
                        "description": "Array of items on the current page"
                      }
                    }
                  },
                  "required": ["itemsOnPage", "data"],
                  "additionalProperties": false,
                  "description": "Historical SharePrice data for a vault, paginated by timestamp"
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

# Benchmarks

Benchmarks give users a simple, consistent way to compare yield performance across networks.&#x20;

For each network, we publish a USD and ETH benchmark based on the top 5 vaults by TVL (minimum $1M) at each timestamp that match relevant token sets:

- USD-benchmark token set: USDC, USDT, DAI, USDS, USDe
- ETH-benchmark token set: ETH, WETH

The benchmark APY is a TVL-weighted average, calculated daily and stored with 1/7/30-day performance history. Benchmarks are not retroactively revised when new vaults are added.

---

## GET /v2/benchmarks/{network}

> Retrieves benchmark APY data for the specified network and benchmark code.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Benchmarks (PRO)",
      "description": "Vaults.fyi curated benchmark endpoints providing aggregated yield performance data for USD and ETH denominated assets across selected networks."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/benchmarks/{network}": {
      "get": {
        "tags": ["Benchmarks (PRO)"],
        "description": "Retrieves benchmark APY data for the specified network and benchmark code.",
        "parameters": [
          {
            "schema": { "type": "string", "enum": ["usd", "eth"] },
            "in": "query",
            "name": "code",
            "required": true,
            "description": "Benchmark code identifier. Available codes: usd, eth"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Network name or CAIP-2 identifier"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "apy": {
                      "type": "object",
                      "properties": {
                        "1day": {
                          "type": "object",
                          "properties": {
                            "base": { "type": "number", "description": "Base APY" },
                            "reward": { "type": "number", "description": "Reward APY" },
                            "total": { "type": "number", "description": "Total APY" }
                          },
                          "required": ["base", "reward", "total"],
                          "additionalProperties": false,
                          "description": "1day APY details"
                        },
                        "7day": {
                          "type": "object",
                          "properties": {
                            "base": { "type": "number", "description": "Base APY" },
                            "reward": { "type": "number", "description": "Reward APY" },
                            "total": { "type": "number", "description": "Total APY" }
                          },
                          "required": ["base", "reward", "total"],
                          "additionalProperties": false,
                          "description": "7day APY details"
                        },
                        "30day": {
                          "type": "object",
                          "properties": {
                            "base": { "type": "number", "description": "Base APY" },
                            "reward": { "type": "number", "description": "Reward APY" },
                            "total": { "type": "number", "description": "Total APY" }
                          },
                          "required": ["base", "reward", "total"],
                          "additionalProperties": false,
                          "description": "30day APY details"
                        }
                      },
                      "required": ["1day", "7day", "30day"],
                      "additionalProperties": false,
                      "nullable": true,
                      "description": "APY interval breakdown for the benchmark"
                    },
                    "timestamp": {
                      "type": "integer",
                      "description": "Timestamp of the benchmark data point"
                    }
                  },
                  "required": ["apy", "timestamp"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/historical-benchmarks/{network}

> Retrieves historical benchmark APY data for the specified network and benchmark code with pagination.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Benchmarks (PRO)",
      "description": "Vaults.fyi curated benchmark endpoints providing aggregated yield performance data for USD and ETH denominated assets across selected networks."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/historical-benchmarks/{network}": {
      "get": {
        "tags": ["Benchmarks (PRO)"],
        "description": "Retrieves historical benchmark APY data for the specified network and benchmark code with pagination.",
        "parameters": [
          {
            "schema": { "type": "integer", "minimum": 0, "default": 0 },
            "in": "query",
            "name": "page",
            "required": false,
            "description": "Page number (starting from 0)"
          },
          {
            "schema": {
              "type": "integer",
              "exclusiveMinimum": true,
              "minimum": 0,
              "maximum": 20000,
              "default": 50
            },
            "in": "query",
            "name": "perPage",
            "required": false,
            "description": "Number of items per page"
          },
          {
            "schema": { "type": "string", "enum": ["usd", "eth"] },
            "in": "query",
            "name": "code",
            "required": true,
            "description": "Benchmark code identifier. Available codes: usd, eth"
          },
          {
            "schema": { "type": "integer", "default": 0 },
            "in": "query",
            "name": "fromTimestamp",
            "required": false,
            "description": "Timestamp for the start of the time period for which data will be fetched"
          },
          {
            "schema": { "type": "integer" },
            "in": "query",
            "name": "toTimestamp",
            "required": false,
            "description": "Timestamp for the end of the time period for which data will be fetched"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Network name or CAIP-2 identifier"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "itemsOnPage": {
                      "type": "integer",
                      "description": "Number of items on the current page"
                    },
                    "nextPage": { "type": "integer", "description": "Next page number" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "apy": {
                            "type": "object",
                            "properties": {
                              "1day": {
                                "type": "object",
                                "properties": {
                                  "base": { "type": "number", "description": "Base APY" },
                                  "reward": { "type": "number", "description": "Reward APY" },
                                  "total": { "type": "number", "description": "Total APY" }
                                },
                                "required": ["base", "reward", "total"],
                                "additionalProperties": false,
                                "description": "1day APY details"
                              },
                              "7day": {
                                "type": "object",
                                "properties": {
                                  "base": { "type": "number", "description": "Base APY" },
                                  "reward": { "type": "number", "description": "Reward APY" },
                                  "total": { "type": "number", "description": "Total APY" }
                                },
                                "required": ["base", "reward", "total"],
                                "additionalProperties": false,
                                "description": "7day APY details"
                              },
                              "30day": {
                                "type": "object",
                                "properties": {
                                  "base": { "type": "number", "description": "Base APY" },
                                  "reward": { "type": "number", "description": "Reward APY" },
                                  "total": { "type": "number", "description": "Total APY" }
                                },
                                "required": ["base", "reward", "total"],
                                "additionalProperties": false,
                                "description": "30day APY details"
                              }
                            },
                            "required": ["1day", "7day", "30day"],
                            "additionalProperties": false,
                            "nullable": true,
                            "description": "APY interval breakdown for the benchmark"
                          },
                          "timestamp": {
                            "type": "integer",
                            "description": "Timestamp of the benchmark data point"
                          }
                        },
                        "required": ["apy", "timestamp"],
                        "additionalProperties": false,
                        "description": "Array of items on the current page"
                      }
                    }
                  },
                  "required": ["itemsOnPage", "data"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

# Portfolio

## GET /v2/portfolio/positions/{userAddress}

> Provides all vault positions for the user, with optional filters.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Portfolio (PRO)",
      "description": "Advanced endpoints providing detailed information about user balances, active positions, historical interactions, and tailored investment opportunities."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/portfolio/positions/{userAddress}": {
      "get": {
        "tags": ["Portfolio (PRO)"],
        "description": "Provides all vault positions for the user, with optional filters.",
        "parameters": [
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "allowedAssets",
            "required": false,
            "description": "Assets to be included by symbol(ticker)."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "disallowedAssets",
            "required": false,
            "description": "Assets to be excluded by symbol(ticker). The parameter is ignored if \"allowedAssets\" is specified."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "allowedProtocols",
            "required": false,
            "description": "Protocols to be included by name."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "disallowedProtocols",
            "required": false,
            "description": "Protocols to be excluded by name. The parameter is ignored if \"allowedProtocols\" is specified."
          },
          {
            "schema": { "type": "integer", "default": 100000 },
            "in": "query",
            "name": "minTvl",
            "required": false,
            "description": "Minimum TVL in USD of the vaults to be included"
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "onlyTransactional",
            "required": false,
            "description": "Include only vaults that are supported in the transactional interface."
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "onlyAppFeatured",
            "required": false,
            "description": "Include only vaults that are featured in app.vaults.fyi"
          },
          {
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "mainnet",
                  "optimism",
                  "arbitrum",
                  "polygon",
                  "gnosis",
                  "base",
                  "unichain",
                  "swellchain",
                  "celo",
                  "worldchain",
                  "berachain",
                  "ink",
                  "bsc",
                  "hyperliquid",
                  "plasma",
                  "eip155:1",
                  "eip155:10",
                  "eip155:42161",
                  "eip155:137",
                  "eip155:100",
                  "eip155:8453",
                  "eip155:130",
                  "eip155:1923",
                  "eip155:42220",
                  "eip155:480",
                  "eip155:80094",
                  "eip155:57073",
                  "eip155:56",
                  "eip155:999",
                  "eip155:9745"
                ],
                "description": "Include only vaults with provided network(name or CAIP)"
              },
              "default": ["base", "mainnet", "arbitrum", "optimism"]
            },
            "in": "query",
            "name": "allowedNetworks",
            "required": false,
            "description": "Networks to be included (name or CAIP)."
          },
          {
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "mainnet",
                  "optimism",
                  "arbitrum",
                  "polygon",
                  "gnosis",
                  "base",
                  "unichain",
                  "swellchain",
                  "celo",
                  "worldchain",
                  "berachain",
                  "ink",
                  "bsc",
                  "hyperliquid",
                  "plasma",
                  "eip155:1",
                  "eip155:10",
                  "eip155:42161",
                  "eip155:137",
                  "eip155:100",
                  "eip155:8453",
                  "eip155:130",
                  "eip155:1923",
                  "eip155:42220",
                  "eip155:480",
                  "eip155:80094",
                  "eip155:57073",
                  "eip155:56",
                  "eip155:999",
                  "eip155:9745"
                ],
                "description": "Include only vaults with provided network(name or CAIP)"
              }
            },
            "in": "query",
            "name": "disallowedNetworks",
            "required": false,
            "description": "Networks to be excluded (name or CAIP). The parameter is ignored if \"allowedNetworks\" is specified."
          },
          {
            "schema": { "type": "integer" },
            "in": "query",
            "name": "maxTvl",
            "required": false,
            "description": "Maximum TVL in USD of the vaults to be included"
          },
          {
            "schema": { "type": "number" },
            "in": "query",
            "name": "maxApy",
            "required": false,
            "description": "Maximum APY (in decimal) of the vaults to be included"
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "tags",
            "required": false,
            "description": "Tags to be included."
          },
          {
            "schema": { "type": "string", "enum": ["1day", "7day", "30day"], "default": "7day" },
            "in": "query",
            "name": "apyInterval",
            "required": false,
            "description": "Interval for APY data. Possible values: 1day, 7day, 30day"
          },
          {
            "schema": { "type": "number", "minimum": 0, "default": 1 },
            "in": "query",
            "name": "minUsdAssetValueThreshold",
            "required": false,
            "description": "Minimum USD value of the vault to be included"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address to be used for best vault calculation"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "pattern": "^0x[a-fA-F0-9]{40}$",
                            "description": "Address of the vault"
                          },
                          "network": {
                            "type": "object",
                            "properties": {
                              "name": {
                                "type": "string",
                                "enum": [
                                  "mainnet",
                                  "optimism",
                                  "arbitrum",
                                  "polygon",
                                  "gnosis",
                                  "base",
                                  "unichain",
                                  "swellchain",
                                  "celo",
                                  "worldchain",
                                  "berachain",
                                  "ink",
                                  "bsc",
                                  "hyperliquid",
                                  "plasma"
                                ],
                                "description": "Name of the network"
                              },
                              "chainId": {
                                "type": "integer",
                                "description": "Chain ID of the network"
                              },
                              "networkCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+$",
                                "description": "CAIP-2 of the network"
                              }
                            },
                            "required": ["name", "chainId", "networkCaip"],
                            "additionalProperties": false,
                            "description": "Network details of the vault"
                          },
                          "asset": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the asset"
                              },
                              "assetCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the asset"
                              },
                              "name": { "type": "string", "description": "Name of the asset" },
                              "symbol": { "type": "string", "description": "Symbol of the asset" },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the asset"
                              },
                              "assetLogo": {
                                "type": "string",
                                "format": "uri",
                                "description": "URL of the asset logo"
                              },
                              "assetPriceInUsd": {
                                "type": "string",
                                "description": "Price of the asset in USD"
                              },
                              "assetGroup": {
                                "type": "string",
                                "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                              },
                              "balanceNative": {
                                "type": "string",
                                "description": "Balance of the asset denominated in asset wei"
                              },
                              "balanceUsd": {
                                "type": "string",
                                "description": "Balance of the asset denominated in usd"
                              },
                              "unclaimedNative": {
                                "type": "string",
                                "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                              },
                              "unclaimedUsd": {
                                "type": "string",
                                "description": "Unclaimed balance of the asset in the position denominated in usd"
                              },
                              "positionValueInAsset": {
                                "type": "string",
                                "description": "Position value in asset denominated in asset wei"
                              }
                            },
                            "required": [
                              "address",
                              "assetCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "assetGroup",
                              "balanceNative",
                              "balanceUsd"
                            ],
                            "additionalProperties": false,
                            "description": "Asset details of the vault"
                          },
                          "isTransactional": {
                            "type": "boolean",
                            "description": "Indicates if the vault supports transactional endpoints"
                          },
                          "isAppFeatured": {
                            "type": "boolean",
                            "description": "Indicates if the vault is featured in app.vaults.fyi"
                          },
                          "name": { "type": "string", "description": "Name of the vault" },
                          "protocol": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the protocol" },
                              "product": {
                                "type": "string",
                                "description": "Product of the protocol"
                              },
                              "version": {
                                "type": "string",
                                "description": "Version of the protocol"
                              },
                              "protocolUrl": {
                                "type": "string",
                                "description": "URL of the protocol"
                              },
                              "description": {
                                "type": "string",
                                "description": "Description of the protocol"
                              },
                              "protocolLogo": {
                                "type": "string",
                                "description": "URL of the protocol logo"
                              }
                            },
                            "required": ["name"],
                            "additionalProperties": false,
                            "description": "Protocol details of the vault"
                          },
                          "apy": {
                            "type": "object",
                            "properties": {
                              "base": { "type": "number", "description": "Base APY" },
                              "reward": { "type": "number", "description": "Reward APY" },
                              "total": { "type": "number", "description": "Total APY" }
                            },
                            "required": ["base", "reward", "total"],
                            "additionalProperties": false,
                            "description": "APY details of the vault"
                          },
                          "additionalAssets": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "address": {
                                  "type": "string",
                                  "pattern": "^0x[a-fA-F0-9]{40}$",
                                  "description": "Address of the asset"
                                },
                                "assetCaip": {
                                  "type": "string",
                                  "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                  "description": "CAIP-2 of the asset"
                                },
                                "name": { "type": "string", "description": "Name of the asset" },
                                "symbol": {
                                  "type": "string",
                                  "description": "Symbol of the asset"
                                },
                                "decimals": {
                                  "type": "integer",
                                  "description": "Number of decimals of the asset"
                                },
                                "assetLogo": {
                                  "type": "string",
                                  "format": "uri",
                                  "description": "URL of the asset logo"
                                },
                                "assetPriceInUsd": {
                                  "type": "string",
                                  "description": "Price of the asset in USD"
                                },
                                "assetGroup": {
                                  "type": "string",
                                  "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                },
                                "balanceNative": {
                                  "type": "string",
                                  "description": "Balance of the asset denominated in asset wei"
                                },
                                "balanceUsd": {
                                  "type": "string",
                                  "description": "Balance of the asset denominated in usd"
                                },
                                "unclaimedNative": {
                                  "type": "string",
                                  "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                                },
                                "unclaimedUsd": {
                                  "type": "string",
                                  "description": "Unclaimed balance of the asset in the position denominated in usd"
                                },
                                "positionValueInAsset": {
                                  "type": "string",
                                  "description": "Position value in asset denominated in asset wei"
                                }
                              },
                              "required": [
                                "address",
                                "assetCaip",
                                "name",
                                "symbol",
                                "decimals",
                                "assetGroup",
                                "balanceNative",
                                "balanceUsd"
                              ],
                              "additionalProperties": false
                            },
                            "description": "Additional assets of the vault"
                          },
                          "lpToken": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the LP token"
                              },
                              "tokenCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the LP token"
                              },
                              "name": { "type": "string", "description": "Name of the LP token" },
                              "symbol": {
                                "type": "string",
                                "description": "Symbol of the LP token"
                              },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the LP token"
                              },
                              "balanceNative": {
                                "type": "string",
                                "description": "Balance of the asset denominated in asset wei"
                              },
                              "balanceUsd": {
                                "type": "string",
                                "description": "Balance of the asset denominated in usd"
                              },
                              "unclaimedNative": {
                                "type": "string",
                                "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                              },
                              "unclaimedUsd": {
                                "type": "string",
                                "description": "Unclaimed balance of the asset in the position denominated in usd"
                              },
                              "positionValueInAsset": {
                                "type": "string",
                                "description": "Position value in asset denominated in asset wei"
                              },
                              "assetPriceInUsd": {
                                "type": "string",
                                "description": "Price of the asset in USD"
                              }
                            },
                            "required": [
                              "address",
                              "tokenCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "balanceNative",
                              "balanceUsd"
                            ],
                            "additionalProperties": false,
                            "description": "LP token details of the vault"
                          },
                          "childrenVaults": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "address": {
                                  "type": "string",
                                  "description": "Address of the child vault"
                                },
                                "asset": {
                                  "type": "object",
                                  "properties": {
                                    "address": {
                                      "type": "string",
                                      "pattern": "^0x[a-fA-F0-9]{40}$",
                                      "description": "Address of the asset"
                                    },
                                    "assetCaip": {
                                      "type": "string",
                                      "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                      "description": "CAIP-2 of the asset"
                                    },
                                    "name": {
                                      "type": "string",
                                      "description": "Name of the asset"
                                    },
                                    "symbol": {
                                      "type": "string",
                                      "description": "Symbol of the asset"
                                    },
                                    "decimals": {
                                      "type": "integer",
                                      "description": "Number of decimals of the asset"
                                    },
                                    "assetLogo": {
                                      "type": "string",
                                      "format": "uri",
                                      "description": "URL of the asset logo"
                                    },
                                    "assetPriceInUsd": {
                                      "type": "string",
                                      "description": "Price of the asset in USD"
                                    },
                                    "assetGroup": {
                                      "type": "string",
                                      "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                    },
                                    "balanceNative": {
                                      "type": "string",
                                      "description": "Balance of the asset denominated in asset wei"
                                    },
                                    "balanceUsd": {
                                      "type": "string",
                                      "description": "Balance of the asset denominated in usd"
                                    },
                                    "unclaimedNative": {
                                      "type": "string",
                                      "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                                    },
                                    "unclaimedUsd": {
                                      "type": "string",
                                      "description": "Unclaimed balance of the asset in the position denominated in usd"
                                    },
                                    "positionValueInAsset": {
                                      "type": "string",
                                      "description": "Position value in asset denominated in asset wei"
                                    }
                                  },
                                  "required": [
                                    "address",
                                    "assetCaip",
                                    "name",
                                    "symbol",
                                    "decimals",
                                    "assetGroup",
                                    "balanceNative",
                                    "balanceUsd"
                                  ],
                                  "additionalProperties": false,
                                  "description": "Asset details of the child vault"
                                },
                                "lpToken": {
                                  "type": "object",
                                  "properties": {
                                    "address": {
                                      "type": "string",
                                      "pattern": "^0x[a-fA-F0-9]{40}$",
                                      "description": "Address of the LP token"
                                    },
                                    "tokenCaip": {
                                      "type": "string",
                                      "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                      "description": "CAIP-2 of the LP token"
                                    },
                                    "name": {
                                      "type": "string",
                                      "description": "Name of the LP token"
                                    },
                                    "symbol": {
                                      "type": "string",
                                      "description": "Symbol of the LP token"
                                    },
                                    "decimals": {
                                      "type": "integer",
                                      "description": "Number of decimals of the LP token"
                                    },
                                    "balanceNative": {
                                      "type": "string",
                                      "description": "Balance of the asset denominated in asset wei"
                                    },
                                    "balanceUsd": {
                                      "type": "string",
                                      "description": "Balance of the asset denominated in usd"
                                    },
                                    "unclaimedNative": {
                                      "type": "string",
                                      "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                                    },
                                    "unclaimedUsd": {
                                      "type": "string",
                                      "description": "Unclaimed balance of the asset in the position denominated in usd"
                                    },
                                    "positionValueInAsset": {
                                      "type": "string",
                                      "description": "Position value in asset denominated in asset wei"
                                    },
                                    "assetPriceInUsd": {
                                      "type": "string",
                                      "description": "Price of the asset in USD"
                                    }
                                  },
                                  "required": [
                                    "address",
                                    "tokenCaip",
                                    "name",
                                    "symbol",
                                    "decimals",
                                    "balanceNative",
                                    "balanceUsd"
                                  ],
                                  "additionalProperties": false,
                                  "description": "LP token details of the child vault"
                                },
                                "additionalAssets": {
                                  "type": "array",
                                  "items": {
                                    "type": "object",
                                    "properties": {
                                      "address": {
                                        "type": "string",
                                        "pattern": "^0x[a-fA-F0-9]{40}$",
                                        "description": "Address of the asset"
                                      },
                                      "assetCaip": {
                                        "type": "string",
                                        "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                        "description": "CAIP-2 of the asset"
                                      },
                                      "name": {
                                        "type": "string",
                                        "description": "Name of the asset"
                                      },
                                      "symbol": {
                                        "type": "string",
                                        "description": "Symbol of the asset"
                                      },
                                      "decimals": {
                                        "type": "integer",
                                        "description": "Number of decimals of the asset"
                                      },
                                      "assetLogo": {
                                        "type": "string",
                                        "format": "uri",
                                        "description": "URL of the asset logo"
                                      },
                                      "assetPriceInUsd": {
                                        "type": "string",
                                        "description": "Price of the asset in USD"
                                      },
                                      "assetGroup": {
                                        "type": "string",
                                        "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                      },
                                      "balanceNative": {
                                        "type": "string",
                                        "description": "Balance of the asset denominated in asset wei"
                                      },
                                      "balanceUsd": {
                                        "type": "string",
                                        "description": "Balance of the asset denominated in usd"
                                      },
                                      "unclaimedNative": {
                                        "type": "string",
                                        "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                                      },
                                      "unclaimedUsd": {
                                        "type": "string",
                                        "description": "Unclaimed balance of the asset in the position denominated in usd"
                                      },
                                      "positionValueInAsset": {
                                        "type": "string",
                                        "description": "Position value in asset denominated in asset wei"
                                      }
                                    },
                                    "required": [
                                      "address",
                                      "assetCaip",
                                      "name",
                                      "symbol",
                                      "decimals",
                                      "assetGroup",
                                      "balanceNative",
                                      "balanceUsd"
                                    ],
                                    "additionalProperties": false
                                  },
                                  "description": "Additional assets of the child vault"
                                }
                              },
                              "required": ["address", "asset"],
                              "additionalProperties": false
                            },
                            "description": "List of child vaults"
                          }
                        },
                        "required": [
                          "address",
                          "network",
                          "asset",
                          "isTransactional",
                          "isAppFeatured",
                          "name",
                          "protocol",
                          "apy"
                        ],
                        "additionalProperties": false
                      }
                    },
                    "errors": {
                      "type": "object",
                      "properties": {
                        "unsupportedNetworks": { "type": "array", "items": { "type": "string" } },
                        "unsupportedAssets": { "type": "array", "items": { "type": "string" } },
                        "unsupportedProtocols": { "type": "array", "items": { "type": "string" } }
                      },
                      "required": [
                        "unsupportedNetworks",
                        "unsupportedAssets",
                        "unsupportedProtocols"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "required": ["data", "errors"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/portfolio/positions/{userAddress}/{network}/{vaultAddress}

> Gives a detailed view of one specific vault position on a given network.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Portfolio (PRO)",
      "description": "Advanced endpoints providing detailed information about user balances, active positions, historical interactions, and tailored investment opportunities."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/portfolio/positions/{userAddress}/{network}/{vaultAddress}": {
      "get": {
        "tags": ["Portfolio (PRO)"],
        "description": "Gives a detailed view of one specific vault position on a given network.",
        "parameters": [
          {
            "schema": { "type": "string", "enum": ["1day", "7day", "30day"], "default": "7day" },
            "in": "query",
            "name": "apyInterval",
            "required": false,
            "description": "Interval for APY data. Possible values: 1day, 7day, 30day"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address to be used for best vault calculation"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Include only vaults with provided network(name or CAIP)"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Address of the vault for which the data will be returned"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "address": {
                      "type": "string",
                      "pattern": "^0x[a-fA-F0-9]{40}$",
                      "description": "Address of the vault"
                    },
                    "network": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "type": "string",
                          "enum": [
                            "mainnet",
                            "optimism",
                            "arbitrum",
                            "polygon",
                            "gnosis",
                            "base",
                            "unichain",
                            "swellchain",
                            "celo",
                            "worldchain",
                            "berachain",
                            "ink",
                            "bsc",
                            "hyperliquid",
                            "plasma"
                          ],
                          "description": "Name of the network"
                        },
                        "chainId": { "type": "integer", "description": "Chain ID of the network" },
                        "networkCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+$",
                          "description": "CAIP-2 of the network"
                        }
                      },
                      "required": ["name", "chainId", "networkCaip"],
                      "additionalProperties": false,
                      "description": "Network details of the vault"
                    },
                    "asset": {
                      "type": "object",
                      "properties": {
                        "address": {
                          "type": "string",
                          "pattern": "^0x[a-fA-F0-9]{40}$",
                          "description": "Address of the asset"
                        },
                        "assetCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                          "description": "CAIP-2 of the asset"
                        },
                        "name": { "type": "string", "description": "Name of the asset" },
                        "symbol": { "type": "string", "description": "Symbol of the asset" },
                        "decimals": {
                          "type": "integer",
                          "description": "Number of decimals of the asset"
                        },
                        "assetLogo": {
                          "type": "string",
                          "format": "uri",
                          "description": "URL of the asset logo"
                        },
                        "assetPriceInUsd": {
                          "type": "string",
                          "description": "Price of the asset in USD"
                        },
                        "assetGroup": {
                          "type": "string",
                          "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                        },
                        "balanceNative": {
                          "type": "string",
                          "description": "Balance of the asset denominated in asset wei"
                        },
                        "balanceUsd": {
                          "type": "string",
                          "description": "Balance of the asset denominated in usd"
                        },
                        "unclaimedNative": {
                          "type": "string",
                          "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                        },
                        "unclaimedUsd": {
                          "type": "string",
                          "description": "Unclaimed balance of the asset in the position denominated in usd"
                        },
                        "positionValueInAsset": {
                          "type": "string",
                          "description": "Position value in asset denominated in asset wei"
                        }
                      },
                      "required": [
                        "address",
                        "assetCaip",
                        "name",
                        "symbol",
                        "decimals",
                        "assetGroup",
                        "balanceNative",
                        "balanceUsd"
                      ],
                      "additionalProperties": false,
                      "description": "Asset details of the vault"
                    },
                    "isTransactional": {
                      "type": "boolean",
                      "description": "Indicates if the vault supports transactional endpoints"
                    },
                    "isAppFeatured": {
                      "type": "boolean",
                      "description": "Indicates if the vault is featured in app.vaults.fyi"
                    },
                    "name": { "type": "string", "description": "Name of the vault" },
                    "protocol": {
                      "type": "object",
                      "properties": {
                        "name": { "type": "string", "description": "Name of the protocol" },
                        "product": { "type": "string", "description": "Product of the protocol" },
                        "version": { "type": "string", "description": "Version of the protocol" },
                        "protocolUrl": { "type": "string", "description": "URL of the protocol" },
                        "description": {
                          "type": "string",
                          "description": "Description of the protocol"
                        },
                        "protocolLogo": {
                          "type": "string",
                          "description": "URL of the protocol logo"
                        }
                      },
                      "required": ["name"],
                      "additionalProperties": false,
                      "description": "Protocol details of the vault"
                    },
                    "apy": {
                      "type": "object",
                      "properties": {
                        "base": { "type": "number", "description": "Base APY" },
                        "reward": { "type": "number", "description": "Reward APY" },
                        "total": { "type": "number", "description": "Total APY" }
                      },
                      "required": ["base", "reward", "total"],
                      "additionalProperties": false,
                      "description": "APY details of the vault"
                    },
                    "additionalAssets": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "pattern": "^0x[a-fA-F0-9]{40}$",
                            "description": "Address of the asset"
                          },
                          "assetCaip": {
                            "type": "string",
                            "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                            "description": "CAIP-2 of the asset"
                          },
                          "name": { "type": "string", "description": "Name of the asset" },
                          "symbol": { "type": "string", "description": "Symbol of the asset" },
                          "decimals": {
                            "type": "integer",
                            "description": "Number of decimals of the asset"
                          },
                          "assetLogo": {
                            "type": "string",
                            "format": "uri",
                            "description": "URL of the asset logo"
                          },
                          "assetPriceInUsd": {
                            "type": "string",
                            "description": "Price of the asset in USD"
                          },
                          "assetGroup": {
                            "type": "string",
                            "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                          },
                          "balanceNative": {
                            "type": "string",
                            "description": "Balance of the asset denominated in asset wei"
                          },
                          "balanceUsd": {
                            "type": "string",
                            "description": "Balance of the asset denominated in usd"
                          },
                          "unclaimedNative": {
                            "type": "string",
                            "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                          },
                          "unclaimedUsd": {
                            "type": "string",
                            "description": "Unclaimed balance of the asset in the position denominated in usd"
                          },
                          "positionValueInAsset": {
                            "type": "string",
                            "description": "Position value in asset denominated in asset wei"
                          }
                        },
                        "required": [
                          "address",
                          "assetCaip",
                          "name",
                          "symbol",
                          "decimals",
                          "assetGroup",
                          "balanceNative",
                          "balanceUsd"
                        ],
                        "additionalProperties": false
                      },
                      "description": "Additional assets of the vault"
                    },
                    "lpToken": {
                      "type": "object",
                      "properties": {
                        "address": {
                          "type": "string",
                          "pattern": "^0x[a-fA-F0-9]{40}$",
                          "description": "Address of the LP token"
                        },
                        "tokenCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                          "description": "CAIP-2 of the LP token"
                        },
                        "name": { "type": "string", "description": "Name of the LP token" },
                        "symbol": { "type": "string", "description": "Symbol of the LP token" },
                        "decimals": {
                          "type": "integer",
                          "description": "Number of decimals of the LP token"
                        },
                        "balanceNative": {
                          "type": "string",
                          "description": "Balance of the asset denominated in asset wei"
                        },
                        "balanceUsd": {
                          "type": "string",
                          "description": "Balance of the asset denominated in usd"
                        },
                        "unclaimedNative": {
                          "type": "string",
                          "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                        },
                        "unclaimedUsd": {
                          "type": "string",
                          "description": "Unclaimed balance of the asset in the position denominated in usd"
                        },
                        "positionValueInAsset": {
                          "type": "string",
                          "description": "Position value in asset denominated in asset wei"
                        },
                        "assetPriceInUsd": {
                          "type": "string",
                          "description": "Price of the asset in USD"
                        }
                      },
                      "required": [
                        "address",
                        "tokenCaip",
                        "name",
                        "symbol",
                        "decimals",
                        "balanceNative",
                        "balanceUsd"
                      ],
                      "additionalProperties": false,
                      "description": "LP token details of the vault"
                    },
                    "childrenVaults": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "description": "Address of the child vault"
                          },
                          "asset": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the asset"
                              },
                              "assetCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the asset"
                              },
                              "name": { "type": "string", "description": "Name of the asset" },
                              "symbol": { "type": "string", "description": "Symbol of the asset" },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the asset"
                              },
                              "assetLogo": {
                                "type": "string",
                                "format": "uri",
                                "description": "URL of the asset logo"
                              },
                              "assetPriceInUsd": {
                                "type": "string",
                                "description": "Price of the asset in USD"
                              },
                              "assetGroup": {
                                "type": "string",
                                "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                              },
                              "balanceNative": {
                                "type": "string",
                                "description": "Balance of the asset denominated in asset wei"
                              },
                              "balanceUsd": {
                                "type": "string",
                                "description": "Balance of the asset denominated in usd"
                              },
                              "unclaimedNative": {
                                "type": "string",
                                "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                              },
                              "unclaimedUsd": {
                                "type": "string",
                                "description": "Unclaimed balance of the asset in the position denominated in usd"
                              },
                              "positionValueInAsset": {
                                "type": "string",
                                "description": "Position value in asset denominated in asset wei"
                              }
                            },
                            "required": [
                              "address",
                              "assetCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "assetGroup",
                              "balanceNative",
                              "balanceUsd"
                            ],
                            "additionalProperties": false,
                            "description": "Asset details of the child vault"
                          },
                          "lpToken": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the LP token"
                              },
                              "tokenCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the LP token"
                              },
                              "name": { "type": "string", "description": "Name of the LP token" },
                              "symbol": {
                                "type": "string",
                                "description": "Symbol of the LP token"
                              },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the LP token"
                              },
                              "balanceNative": {
                                "type": "string",
                                "description": "Balance of the asset denominated in asset wei"
                              },
                              "balanceUsd": {
                                "type": "string",
                                "description": "Balance of the asset denominated in usd"
                              },
                              "unclaimedNative": {
                                "type": "string",
                                "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                              },
                              "unclaimedUsd": {
                                "type": "string",
                                "description": "Unclaimed balance of the asset in the position denominated in usd"
                              },
                              "positionValueInAsset": {
                                "type": "string",
                                "description": "Position value in asset denominated in asset wei"
                              },
                              "assetPriceInUsd": {
                                "type": "string",
                                "description": "Price of the asset in USD"
                              }
                            },
                            "required": [
                              "address",
                              "tokenCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "balanceNative",
                              "balanceUsd"
                            ],
                            "additionalProperties": false,
                            "description": "LP token details of the child vault"
                          },
                          "additionalAssets": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "address": {
                                  "type": "string",
                                  "pattern": "^0x[a-fA-F0-9]{40}$",
                                  "description": "Address of the asset"
                                },
                                "assetCaip": {
                                  "type": "string",
                                  "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                  "description": "CAIP-2 of the asset"
                                },
                                "name": { "type": "string", "description": "Name of the asset" },
                                "symbol": {
                                  "type": "string",
                                  "description": "Symbol of the asset"
                                },
                                "decimals": {
                                  "type": "integer",
                                  "description": "Number of decimals of the asset"
                                },
                                "assetLogo": {
                                  "type": "string",
                                  "format": "uri",
                                  "description": "URL of the asset logo"
                                },
                                "assetPriceInUsd": {
                                  "type": "string",
                                  "description": "Price of the asset in USD"
                                },
                                "assetGroup": {
                                  "type": "string",
                                  "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                },
                                "balanceNative": {
                                  "type": "string",
                                  "description": "Balance of the asset denominated in asset wei"
                                },
                                "balanceUsd": {
                                  "type": "string",
                                  "description": "Balance of the asset denominated in usd"
                                },
                                "unclaimedNative": {
                                  "type": "string",
                                  "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                                },
                                "unclaimedUsd": {
                                  "type": "string",
                                  "description": "Unclaimed balance of the asset in the position denominated in usd"
                                },
                                "positionValueInAsset": {
                                  "type": "string",
                                  "description": "Position value in asset denominated in asset wei"
                                }
                              },
                              "required": [
                                "address",
                                "assetCaip",
                                "name",
                                "symbol",
                                "decimals",
                                "assetGroup",
                                "balanceNative",
                                "balanceUsd"
                              ],
                              "additionalProperties": false
                            },
                            "description": "Additional assets of the child vault"
                          }
                        },
                        "required": ["address", "asset"],
                        "additionalProperties": false
                      },
                      "description": "List of child vaults"
                    }
                  },
                  "required": [
                    "address",
                    "network",
                    "asset",
                    "isTransactional",
                    "isAppFeatured",
                    "name",
                    "protocol",
                    "apy"
                  ],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/portfolio/best-deposit-options/{userAddress}

> Analyzes a user's existing wallet balances and recommends optimal vault deposit opportunities based on yield performance, risk parameters, and user-defined criteria.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Portfolio (PRO)",
      "description": "Advanced endpoints providing detailed information about user balances, active positions, historical interactions, and tailored investment opportunities."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/portfolio/best-deposit-options/{userAddress}": {
      "get": {
        "tags": ["Portfolio (PRO)"],
        "description": "Analyzes a user's existing wallet balances and recommends optimal vault deposit opportunities based on yield performance, risk parameters, and user-defined criteria.",
        "parameters": [
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "allowedAssets",
            "required": false,
            "description": "Assets to be included by symbol(ticker)."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "disallowedAssets",
            "required": false,
            "description": "Assets to be excluded by symbol(ticker). The parameter is ignored if \"allowedAssets\" is specified."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "allowedProtocols",
            "required": false,
            "description": "Protocols to be included by name."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "disallowedProtocols",
            "required": false,
            "description": "Protocols to be excluded by name. The parameter is ignored if \"allowedProtocols\" is specified."
          },
          {
            "schema": { "type": "integer", "default": 100000 },
            "in": "query",
            "name": "minTvl",
            "required": false,
            "description": "Minimum TVL in USD of the vaults to be included"
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "onlyTransactional",
            "required": false,
            "description": "Include only vaults that are supported in the transactional interface."
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "onlyAppFeatured",
            "required": false,
            "description": "Include only vaults that are featured in app.vaults.fyi"
          },
          {
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "mainnet",
                  "optimism",
                  "arbitrum",
                  "polygon",
                  "gnosis",
                  "base",
                  "unichain",
                  "swellchain",
                  "celo",
                  "worldchain",
                  "berachain",
                  "ink",
                  "bsc",
                  "hyperliquid",
                  "plasma",
                  "eip155:1",
                  "eip155:10",
                  "eip155:42161",
                  "eip155:137",
                  "eip155:100",
                  "eip155:8453",
                  "eip155:130",
                  "eip155:1923",
                  "eip155:42220",
                  "eip155:480",
                  "eip155:80094",
                  "eip155:57073",
                  "eip155:56",
                  "eip155:999",
                  "eip155:9745"
                ],
                "description": "Include only vaults with provided network(name or CAIP)"
              },
              "default": ["base", "mainnet", "arbitrum", "optimism"]
            },
            "in": "query",
            "name": "allowedNetworks",
            "required": false,
            "description": "Networks to be included (name or CAIP)."
          },
          {
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "mainnet",
                  "optimism",
                  "arbitrum",
                  "polygon",
                  "gnosis",
                  "base",
                  "unichain",
                  "swellchain",
                  "celo",
                  "worldchain",
                  "berachain",
                  "ink",
                  "bsc",
                  "hyperliquid",
                  "plasma",
                  "eip155:1",
                  "eip155:10",
                  "eip155:42161",
                  "eip155:137",
                  "eip155:100",
                  "eip155:8453",
                  "eip155:130",
                  "eip155:1923",
                  "eip155:42220",
                  "eip155:480",
                  "eip155:80094",
                  "eip155:57073",
                  "eip155:56",
                  "eip155:999",
                  "eip155:9745"
                ],
                "description": "Include only vaults with provided network(name or CAIP)"
              }
            },
            "in": "query",
            "name": "disallowedNetworks",
            "required": false,
            "description": "Networks to be excluded (name or CAIP). The parameter is ignored if \"allowedNetworks\" is specified."
          },
          {
            "schema": { "type": "string", "enum": ["1day", "7day", "30day"], "default": "7day" },
            "in": "query",
            "name": "apyInterval",
            "required": false,
            "description": "Interval for APY data. Possible values: 1day, 7day, 30day"
          },
          {
            "schema": { "type": "number", "minimum": 0 },
            "in": "query",
            "name": "minApy",
            "required": false,
            "description": "Minimum APY of the vault to be included"
          },
          {
            "schema": { "type": "number", "minimum": 0, "default": 1 },
            "in": "query",
            "name": "minUsdAssetValueThreshold",
            "required": false,
            "description": "Minimum USD value of the vault to be included"
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "alwaysReturnAssets",
            "required": false,
            "description": "Assets to always be included in the response."
          },
          {
            "schema": { "type": "integer", "exclusiveMinimum": true, "minimum": 0, "default": 3 },
            "in": "query",
            "name": "maxVaultsPerAsset",
            "required": false,
            "description": "Maximum number of vaults to be included per asset."
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address to be used for best vault calculation"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "requestedAddress": {
                      "type": "string",
                      "pattern": "^0x[a-fA-F0-9]{40}$",
                      "description": "Address of the user requesting the data"
                    },
                    "userBalances": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "asset": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the asset"
                              },
                              "assetCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the asset"
                              },
                              "name": { "type": "string", "description": "Name of the asset" },
                              "symbol": { "type": "string", "description": "Symbol of the asset" },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the asset"
                              },
                              "assetLogo": {
                                "type": "string",
                                "format": "uri",
                                "description": "URL of the asset logo"
                              },
                              "assetPriceInUsd": {
                                "type": "string",
                                "description": "Price of the asset in USD"
                              },
                              "assetGroup": {
                                "type": "string",
                                "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                              },
                              "balanceNative": {
                                "type": "string",
                                "description": "Balance of the asset"
                              },
                              "balanceUsd": {
                                "type": "string",
                                "description": "USD value of the asset"
                              }
                            },
                            "required": [
                              "address",
                              "assetCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "assetGroup",
                              "balanceNative",
                              "balanceUsd"
                            ],
                            "additionalProperties": false,
                            "description": "Requested asset details"
                          },
                          "depositOptions": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "name": { "type": "string", "description": "Name of the vault" },
                                "address": {
                                  "type": "string",
                                  "pattern": "^0x[a-fA-F0-9]{40}$",
                                  "description": "Address of the vault"
                                },
                                "network": {
                                  "type": "object",
                                  "properties": {
                                    "name": {
                                      "type": "string",
                                      "enum": [
                                        "mainnet",
                                        "optimism",
                                        "arbitrum",
                                        "polygon",
                                        "gnosis",
                                        "base",
                                        "unichain",
                                        "swellchain",
                                        "celo",
                                        "worldchain",
                                        "berachain",
                                        "ink",
                                        "bsc",
                                        "hyperliquid",
                                        "plasma"
                                      ],
                                      "description": "Name of the network"
                                    },
                                    "chainId": {
                                      "type": "integer",
                                      "description": "Chain ID of the network"
                                    },
                                    "networkCaip": {
                                      "type": "string",
                                      "pattern": "^eip155:\\d+$",
                                      "description": "CAIP-2 of the network"
                                    }
                                  },
                                  "required": ["name", "chainId", "networkCaip"],
                                  "additionalProperties": false,
                                  "description": "Network details of the vault"
                                },
                                "isTransactional": {
                                  "type": "boolean",
                                  "description": "Indicates if the vault supports transactional endpoints"
                                },
                                "isAppFeatured": {
                                  "type": "boolean",
                                  "description": "Indicates if the vault is featured in app.vaults.fyi"
                                },
                                "protocol": {
                                  "type": "object",
                                  "properties": {
                                    "name": {
                                      "type": "string",
                                      "description": "Name of the protocol"
                                    },
                                    "product": {
                                      "type": "string",
                                      "description": "Product of the protocol"
                                    },
                                    "version": {
                                      "type": "string",
                                      "description": "Version of the protocol"
                                    },
                                    "protocolUrl": {
                                      "type": "string",
                                      "description": "URL of the protocol"
                                    },
                                    "description": {
                                      "type": "string",
                                      "description": "Description of the protocol"
                                    },
                                    "protocolLogo": {
                                      "type": "string",
                                      "description": "URL of the protocol logo"
                                    }
                                  },
                                  "required": ["name"],
                                  "additionalProperties": false,
                                  "description": "Protocol details of the vault"
                                },
                                "tvl": {
                                  "type": "object",
                                  "properties": {
                                    "usd": { "type": "string", "description": "TVL in USD" },
                                    "native": { "type": "string", "description": "Native TVL" }
                                  },
                                  "required": ["usd", "native"],
                                  "additionalProperties": false,
                                  "description": "Total Value Locked (TVL) in the vault"
                                },
                                "tags": {
                                  "type": "array",
                                  "items": { "type": "string" },
                                  "description": "Tags associated with the vault"
                                },
                                "apy": {
                                  "type": "object",
                                  "properties": {
                                    "base": { "type": "number", "description": "Base APY" },
                                    "reward": { "type": "number", "description": "Reward APY" },
                                    "total": { "type": "number", "description": "Total APY" }
                                  },
                                  "required": ["base", "reward", "total"],
                                  "additionalProperties": false,
                                  "description": "Annual Percentage Yield (APY) breakdown"
                                },
                                "projectedUsdAnnualEarnings": {
                                  "type": "string",
                                  "description": "Projected annual earnings in USD"
                                },
                                "lendUrl": {
                                  "type": "string",
                                  "description": "URL to lend the asset in the vault"
                                },
                                "protocolVaultUrl": {
                                  "type": "string",
                                  "description": "URL to the vault in the protocol"
                                }
                              },
                              "required": [
                                "name",
                                "address",
                                "network",
                                "isTransactional",
                                "isAppFeatured",
                                "protocol",
                                "tvl",
                                "apy",
                                "projectedUsdAnnualEarnings"
                              ],
                              "additionalProperties": false,
                              "description": "Best vault details for the requested asset"
                            }
                          }
                        },
                        "required": ["depositOptions"],
                        "additionalProperties": false
                      },
                      "description": "Array of user balances with asset and vault details"
                    },
                    "errors": {
                      "type": "object",
                      "properties": {
                        "unsupportedNetworks": { "type": "array", "items": { "type": "string" } },
                        "unsupportedAssets": { "type": "array", "items": { "type": "string" } },
                        "unsupportedProtocols": { "type": "array", "items": { "type": "string" } }
                      },
                      "required": [
                        "unsupportedNetworks",
                        "unsupportedAssets",
                        "unsupportedProtocols"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "required": ["requestedAddress", "userBalances"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/portfolio/best-vault/{userAddress}

> Returns the single best vault opportunity for the user, based on balance and yield analysis.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Portfolio (PRO)",
      "description": "Advanced endpoints providing detailed information about user balances, active positions, historical interactions, and tailored investment opportunities."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/portfolio/best-vault/{userAddress}": {
      "get": {
        "tags": ["Portfolio (PRO)"],
        "description": "Returns the single best vault opportunity for the user, based on balance and yield analysis.",
        "parameters": [
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "allowedAssets",
            "required": false,
            "description": "Assets to be included by symbol(ticker)."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "disallowedAssets",
            "required": false,
            "description": "Assets to be excluded by symbol(ticker). The parameter is ignored if \"allowedAssets\" is specified."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "allowedProtocols",
            "required": false,
            "description": "Protocols to be included by name."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "disallowedProtocols",
            "required": false,
            "description": "Protocols to be excluded by name. The parameter is ignored if \"allowedProtocols\" is specified."
          },
          {
            "schema": { "type": "integer", "default": 100000 },
            "in": "query",
            "name": "minTvl",
            "required": false,
            "description": "Minimum TVL in USD of the vaults to be included"
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "onlyTransactional",
            "required": false,
            "description": "Include only vaults that are supported in the transactional interface."
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "onlyAppFeatured",
            "required": false,
            "description": "Include only vaults that are featured in app.vaults.fyi"
          },
          {
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "mainnet",
                  "optimism",
                  "arbitrum",
                  "polygon",
                  "gnosis",
                  "base",
                  "unichain",
                  "swellchain",
                  "celo",
                  "worldchain",
                  "berachain",
                  "ink",
                  "bsc",
                  "hyperliquid",
                  "plasma",
                  "eip155:1",
                  "eip155:10",
                  "eip155:42161",
                  "eip155:137",
                  "eip155:100",
                  "eip155:8453",
                  "eip155:130",
                  "eip155:1923",
                  "eip155:42220",
                  "eip155:480",
                  "eip155:80094",
                  "eip155:57073",
                  "eip155:56",
                  "eip155:999",
                  "eip155:9745"
                ],
                "description": "Include only vaults with provided network(name or CAIP)"
              },
              "default": ["base", "mainnet", "arbitrum", "optimism"]
            },
            "in": "query",
            "name": "allowedNetworks",
            "required": false,
            "description": "Networks to be included (name or CAIP)."
          },
          {
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "mainnet",
                  "optimism",
                  "arbitrum",
                  "polygon",
                  "gnosis",
                  "base",
                  "unichain",
                  "swellchain",
                  "celo",
                  "worldchain",
                  "berachain",
                  "ink",
                  "bsc",
                  "hyperliquid",
                  "plasma",
                  "eip155:1",
                  "eip155:10",
                  "eip155:42161",
                  "eip155:137",
                  "eip155:100",
                  "eip155:8453",
                  "eip155:130",
                  "eip155:1923",
                  "eip155:42220",
                  "eip155:480",
                  "eip155:80094",
                  "eip155:57073",
                  "eip155:56",
                  "eip155:999",
                  "eip155:9745"
                ],
                "description": "Include only vaults with provided network(name or CAIP)"
              }
            },
            "in": "query",
            "name": "disallowedNetworks",
            "required": false,
            "description": "Networks to be excluded (name or CAIP). The parameter is ignored if \"allowedNetworks\" is specified."
          },
          {
            "schema": { "type": "string", "enum": ["1day", "7day", "30day"], "default": "7day" },
            "in": "query",
            "name": "apyInterval",
            "required": false,
            "description": "Interval for APY data. Possible values: 1day, 7day, 30day"
          },
          {
            "schema": { "type": "number", "minimum": 0 },
            "in": "query",
            "name": "minApy",
            "required": false,
            "description": "Minimum APY of the vault to be included"
          },
          {
            "schema": { "type": "number", "minimum": 0, "default": 1 },
            "in": "query",
            "name": "minUsdAssetValueThreshold",
            "required": false,
            "description": "Minimum USD value of the vault to be included"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address to be used for best vault calculation"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "requestedAddress": {
                      "type": "string",
                      "pattern": "^0x[a-fA-F0-9]{40}$",
                      "description": "Address of the user requesting the data"
                    },
                    "asset": {
                      "type": "object",
                      "properties": {
                        "address": {
                          "type": "string",
                          "pattern": "^0x[a-fA-F0-9]{40}$",
                          "description": "Address of the asset"
                        },
                        "assetCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                          "description": "CAIP-2 of the asset"
                        },
                        "name": { "type": "string", "description": "Name of the asset" },
                        "symbol": { "type": "string", "description": "Symbol of the asset" },
                        "decimals": {
                          "type": "integer",
                          "description": "Number of decimals of the asset"
                        },
                        "assetLogo": {
                          "type": "string",
                          "format": "uri",
                          "description": "URL of the asset logo"
                        },
                        "assetPriceInUsd": {
                          "type": "string",
                          "description": "Price of the asset in USD"
                        },
                        "assetGroup": {
                          "type": "string",
                          "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                        },
                        "balanceNative": {
                          "type": "string",
                          "description": "Balance of the asset"
                        },
                        "balanceUsd": { "type": "string", "description": "USD value of the asset" }
                      },
                      "required": [
                        "address",
                        "assetCaip",
                        "name",
                        "symbol",
                        "decimals",
                        "assetGroup",
                        "balanceNative",
                        "balanceUsd"
                      ],
                      "additionalProperties": false,
                      "description": "Requested asset details"
                    },
                    "vault": {
                      "type": "object",
                      "properties": {
                        "name": { "type": "string", "description": "Name of the vault" },
                        "address": {
                          "type": "string",
                          "pattern": "^0x[a-fA-F0-9]{40}$",
                          "description": "Address of the vault"
                        },
                        "network": {
                          "type": "object",
                          "properties": {
                            "name": {
                              "type": "string",
                              "enum": [
                                "mainnet",
                                "optimism",
                                "arbitrum",
                                "polygon",
                                "gnosis",
                                "base",
                                "unichain",
                                "swellchain",
                                "celo",
                                "worldchain",
                                "berachain",
                                "ink",
                                "bsc",
                                "hyperliquid",
                                "plasma"
                              ],
                              "description": "Name of the network"
                            },
                            "chainId": {
                              "type": "integer",
                              "description": "Chain ID of the network"
                            },
                            "networkCaip": {
                              "type": "string",
                              "pattern": "^eip155:\\d+$",
                              "description": "CAIP-2 of the network"
                            }
                          },
                          "required": ["name", "chainId", "networkCaip"],
                          "additionalProperties": false,
                          "description": "Network details of the vault"
                        },
                        "isTransactional": {
                          "type": "boolean",
                          "description": "Indicates if the vault supports transactional endpoints"
                        },
                        "isAppFeatured": {
                          "type": "boolean",
                          "description": "Indicates if the vault is featured in app.vaults.fyi"
                        },
                        "protocol": {
                          "type": "object",
                          "properties": {
                            "name": { "type": "string", "description": "Name of the protocol" },
                            "product": {
                              "type": "string",
                              "description": "Product of the protocol"
                            },
                            "version": {
                              "type": "string",
                              "description": "Version of the protocol"
                            },
                            "protocolUrl": {
                              "type": "string",
                              "description": "URL of the protocol"
                            },
                            "description": {
                              "type": "string",
                              "description": "Description of the protocol"
                            },
                            "protocolLogo": {
                              "type": "string",
                              "description": "URL of the protocol logo"
                            }
                          },
                          "required": ["name"],
                          "additionalProperties": false,
                          "description": "Protocol details of the vault"
                        },
                        "tvl": {
                          "type": "object",
                          "properties": {
                            "usd": { "type": "string", "description": "TVL in USD" },
                            "native": { "type": "string", "description": "Native TVL" }
                          },
                          "required": ["usd", "native"],
                          "additionalProperties": false,
                          "description": "Total Value Locked (TVL) in the vault"
                        },
                        "tags": {
                          "type": "array",
                          "items": { "type": "string" },
                          "description": "Tags associated with the vault"
                        },
                        "apy": {
                          "type": "object",
                          "properties": {
                            "base": { "type": "number", "description": "Base APY" },
                            "reward": { "type": "number", "description": "Reward APY" },
                            "total": { "type": "number", "description": "Total APY" }
                          },
                          "required": ["base", "reward", "total"],
                          "additionalProperties": false,
                          "description": "Annual Percentage Yield (APY) breakdown"
                        },
                        "projectedUsdAnnualEarnings": {
                          "type": "string",
                          "description": "Projected annual earnings in USD"
                        },
                        "lendUrl": {
                          "type": "string",
                          "description": "URL to lend the asset in the vault"
                        },
                        "protocolVaultUrl": {
                          "type": "string",
                          "description": "URL to the vault in the protocol"
                        }
                      },
                      "required": [
                        "name",
                        "address",
                        "network",
                        "isTransactional",
                        "isAppFeatured",
                        "protocol",
                        "tvl",
                        "apy",
                        "projectedUsdAnnualEarnings"
                      ],
                      "additionalProperties": false,
                      "description": "Best vault details for the requested asset"
                    },
                    "errors": {
                      "type": "object",
                      "properties": {
                        "unsupportedNetworks": { "type": "array", "items": { "type": "string" } },
                        "unsupportedAssets": { "type": "array", "items": { "type": "string" } },
                        "unsupportedProtocols": { "type": "array", "items": { "type": "string" } }
                      },
                      "required": [
                        "unsupportedNetworks",
                        "unsupportedAssets",
                        "unsupportedProtocols"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "required": ["requestedAddress"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/portfolio/idle-assets/{userAddress}

> Get balances of idle assets for a specific user address.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Portfolio (PRO)",
      "description": "Advanced endpoints providing detailed information about user balances, active positions, historical interactions, and tailored investment opportunities."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/portfolio/idle-assets/{userAddress}": {
      "get": {
        "tags": ["Portfolio (PRO)"],
        "description": "Get balances of idle assets for a specific user address.",
        "parameters": [
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "allowedAssets",
            "required": false,
            "description": "Assets to be included by symbol(ticker)."
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "disallowedAssets",
            "required": false,
            "description": "Assets to be excluded by symbol(ticker). The parameter is ignored if \"allowedAssets\" is specified."
          },
          {
            "schema": { "type": "number", "minimum": 0, "default": 0.5 },
            "in": "query",
            "name": "minUsdAssetValueThreshold",
            "required": false,
            "description": "Minimum USD value of the asset to be included"
          },
          {
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "mainnet",
                  "optimism",
                  "arbitrum",
                  "polygon",
                  "gnosis",
                  "base",
                  "unichain",
                  "swellchain",
                  "celo",
                  "worldchain",
                  "berachain",
                  "ink",
                  "bsc",
                  "hyperliquid",
                  "plasma",
                  "eip155:1",
                  "eip155:10",
                  "eip155:42161",
                  "eip155:137",
                  "eip155:100",
                  "eip155:8453",
                  "eip155:130",
                  "eip155:1923",
                  "eip155:42220",
                  "eip155:480",
                  "eip155:80094",
                  "eip155:57073",
                  "eip155:56",
                  "eip155:999",
                  "eip155:9745"
                ],
                "description": "Include only vaults with provided network(name or CAIP)"
              },
              "default": ["base", "mainnet", "arbitrum", "optimism"]
            },
            "in": "query",
            "name": "allowedNetworks",
            "required": false,
            "description": "Networks to be included (name or CAIP)."
          },
          {
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "mainnet",
                  "optimism",
                  "arbitrum",
                  "polygon",
                  "gnosis",
                  "base",
                  "unichain",
                  "swellchain",
                  "celo",
                  "worldchain",
                  "berachain",
                  "ink",
                  "bsc",
                  "hyperliquid",
                  "plasma",
                  "eip155:1",
                  "eip155:10",
                  "eip155:42161",
                  "eip155:137",
                  "eip155:100",
                  "eip155:8453",
                  "eip155:130",
                  "eip155:1923",
                  "eip155:42220",
                  "eip155:480",
                  "eip155:80094",
                  "eip155:57073",
                  "eip155:56",
                  "eip155:999",
                  "eip155:9745"
                ],
                "description": "Include only vaults with provided network(name or CAIP)"
              }
            },
            "in": "query",
            "name": "disallowedNetworks",
            "required": false,
            "description": "Networks to be excluded (name or CAIP). The parameter is ignored if \"allowedNetworks\" is specified."
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address to be used for best vault calculation"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "pattern": "^0x[a-fA-F0-9]{40}$",
                            "description": "Address of the asset"
                          },
                          "assetCaip": {
                            "type": "string",
                            "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                            "description": "CAIP-2 of the asset"
                          },
                          "name": { "type": "string", "description": "Name of the asset" },
                          "symbol": { "type": "string", "description": "Symbol of the asset" },
                          "decimals": {
                            "type": "integer",
                            "description": "Number of decimals of the asset"
                          },
                          "assetLogo": {
                            "type": "string",
                            "format": "uri",
                            "description": "URL of the asset logo"
                          },
                          "assetPriceInUsd": {
                            "type": "string",
                            "description": "Price of the asset in USD"
                          },
                          "assetGroup": {
                            "type": "string",
                            "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                          },
                          "balanceNative": {
                            "type": "string",
                            "description": "Balance of the asset"
                          },
                          "balanceUsd": {
                            "type": "string",
                            "description": "USD value of the asset"
                          },
                          "network": {
                            "type": "object",
                            "properties": {
                              "name": {
                                "type": "string",
                                "enum": [
                                  "mainnet",
                                  "optimism",
                                  "arbitrum",
                                  "polygon",
                                  "gnosis",
                                  "base",
                                  "unichain",
                                  "swellchain",
                                  "celo",
                                  "worldchain",
                                  "berachain",
                                  "ink",
                                  "bsc",
                                  "hyperliquid",
                                  "plasma"
                                ],
                                "description": "Name of the network"
                              },
                              "chainId": {
                                "type": "integer",
                                "description": "Chain ID of the network"
                              },
                              "networkCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+$",
                                "description": "CAIP-2 of the network"
                              }
                            },
                            "required": ["name", "chainId", "networkCaip"],
                            "additionalProperties": false,
                            "description": "Network details of the vault"
                          }
                        },
                        "required": [
                          "address",
                          "assetCaip",
                          "name",
                          "symbol",
                          "decimals",
                          "assetGroup",
                          "balanceNative",
                          "balanceUsd",
                          "network"
                        ],
                        "additionalProperties": false
                      }
                    },
                    "errors": {
                      "type": "object",
                      "properties": {
                        "unsupportedNetworks": { "type": "array", "items": { "type": "string" } },
                        "unsupportedAssets": { "type": "array", "items": { "type": "string" } }
                      },
                      "required": ["unsupportedNetworks", "unsupportedAssets"],
                      "additionalProperties": false
                    }
                  },
                  "required": ["data", "errors"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/portfolio/total-returns/{userAddress}/{network}/{vaultAddress}

> Retrieves the total returns for a user's position in a specific vault, including asset details and native returns amount.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Portfolio (PRO)",
      "description": "Advanced endpoints providing detailed information about user balances, active positions, historical interactions, and tailored investment opportunities."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/portfolio/total-returns/{userAddress}/{network}/{vaultAddress}": {
      "get": {
        "tags": ["Portfolio (PRO)"],
        "description": "Retrieves the total returns for a user's position in a specific vault, including asset details and native returns amount.",
        "parameters": [
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address to get returns for"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Network to get returns for"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Vault address to get returns for"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "address": {
                      "type": "string",
                      "pattern": "^0x[a-fA-F0-9]{40}$",
                      "description": "Address of the asset"
                    },
                    "assetCaip": {
                      "type": "string",
                      "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                      "description": "CAIP-2 of the asset"
                    },
                    "name": { "type": "string", "description": "Name of the asset" },
                    "symbol": { "type": "string", "description": "Symbol of the asset" },
                    "decimals": {
                      "type": "integer",
                      "description": "Number of decimals of the asset"
                    },
                    "assetLogo": {
                      "type": "string",
                      "format": "uri",
                      "description": "URL of the asset logo"
                    },
                    "assetPriceInUsd": {
                      "type": "string",
                      "description": "Price of the asset in USD"
                    },
                    "assetGroup": {
                      "type": "string",
                      "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                    },
                    "returnsNative": {
                      "type": "string",
                      "description": "Total returns in native token amount"
                    }
                  },
                  "required": [
                    "address",
                    "assetCaip",
                    "name",
                    "symbol",
                    "decimals",
                    "assetGroup",
                    "returnsNative"
                  ],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/portfolio/events/{userAddress}/{network}/{vaultAddress}

> Retrieves all transactions (deposits and withdrawals) for a user's position in a specific vault, including transaction details and metadata.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [
    {
      "name": "Portfolio (PRO)",
      "description": "Advanced endpoints providing detailed information about user balances, active positions, historical interactions, and tailored investment opportunities."
    }
  ],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/portfolio/events/{userAddress}/{network}/{vaultAddress}": {
      "get": {
        "tags": ["Portfolio (PRO)"],
        "description": "Retrieves all transactions (deposits and withdrawals) for a user's position in a specific vault, including transaction details and metadata.",
        "parameters": [
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address to get returns for"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Network to get returns for"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Vault address to get returns for"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "asset": {
                      "type": "object",
                      "properties": {
                        "address": {
                          "type": "string",
                          "pattern": "^0x[a-fA-F0-9]{40}$",
                          "description": "Address of the asset"
                        },
                        "assetCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                          "description": "CAIP-2 of the asset"
                        },
                        "name": { "type": "string", "description": "Name of the asset" },
                        "symbol": { "type": "string", "description": "Symbol of the asset" },
                        "decimals": {
                          "type": "integer",
                          "description": "Number of decimals of the asset"
                        },
                        "assetLogo": {
                          "type": "string",
                          "format": "uri",
                          "description": "URL of the asset logo"
                        },
                        "assetPriceInUsd": {
                          "type": "string",
                          "description": "Price of the asset in USD"
                        },
                        "assetGroup": {
                          "type": "string",
                          "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                        }
                      },
                      "required": [
                        "address",
                        "assetCaip",
                        "name",
                        "symbol",
                        "decimals",
                        "assetGroup"
                      ],
                      "additionalProperties": false,
                      "description": "Details of the asset"
                    },
                    "lpToken": {
                      "type": "object",
                      "properties": {
                        "address": {
                          "type": "string",
                          "pattern": "^0x[a-fA-F0-9]{40}$",
                          "description": "Address of the LP token"
                        },
                        "tokenCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                          "description": "CAIP-2 of the LP token"
                        },
                        "name": { "type": "string", "description": "Name of the LP token" },
                        "symbol": { "type": "string", "description": "Symbol of the LP token" },
                        "decimals": {
                          "type": "integer",
                          "description": "Number of decimals of the LP token"
                        }
                      },
                      "required": ["address", "tokenCaip", "name", "symbol", "decimals"],
                      "additionalProperties": false,
                      "description": "Details of the LP token"
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "timestamp": {
                            "type": "integer",
                            "description": "Transaction timestamp"
                          },
                          "blockNumber": {
                            "type": "string",
                            "description": "Block number of the transaction"
                          },
                          "eventType": {
                            "type": "string",
                            "enum": ["deposit", "withdrawal"],
                            "description": "Type of transaction event"
                          },
                          "assetAmountNative": {
                            "type": "string",
                            "description": "Asset amount in native units"
                          },
                          "sharePrice": {
                            "type": "number",
                            "description": "Share price of the LP token"
                          },
                          "lpTokenAmount": { "type": "string", "description": "LP token amount" },
                          "transactionHash": {
                            "type": "string",
                            "description": "Transaction hash"
                          },
                          "logIndex": {
                            "type": "number",
                            "description": "Log index of the transaction"
                          }
                        },
                        "required": [
                          "timestamp",
                          "blockNumber",
                          "eventType",
                          "assetAmountNative",
                          "sharePrice",
                          "lpTokenAmount",
                          "transactionHash",
                          "logIndex"
                        ],
                        "additionalProperties": false
                      },
                      "description": "List of transaction events sorted by timestamp"
                    },
                    "items": {
                      "type": "number",
                      "description": "Total number of transaction events"
                    }
                  },
                  "required": ["asset", "lpToken", "data", "items"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

# Transactions

## GET /v2/transactions/context/{userAddress}/{network}/{vaultAddress}

> Retrieves the complete transactional context for a user's interaction with a specific vault, including available deposit/redeem steps, current balances, and claimable rewards.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/transactions/context/{userAddress}/{network}/{vaultAddress}": {
      "get": {
        "tags": ["Transactions (PRO)"],
        "description": "Retrieves the complete transactional context for a user's interaction with a specific vault, including available deposit/redeem steps, current balances, and claimable rewards.",
        "parameters": [
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Network name or CAIP-2 identifier"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Vault address"
          }
        ],
        "responses": {
          "200": {
            "description": "Transaction context information for a user and vault",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "currentDepositStep": {
                      "type": "string",
                      "enum": [
                        "deposit",
                        "redeem",
                        "request-redeem",
                        "claim-redeem",
                        "claim-rewards",
                        "start-redeem-cooldown"
                      ],
                      "description": "Current deposit step"
                    },
                    "depositSteps": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "actions": { "type": "array", "items": { "type": "string" } },
                          "actionsUrl": { "type": "string" },
                          "name": {
                            "type": "string",
                            "enum": [
                              "deposit",
                              "redeem",
                              "request-redeem",
                              "claim-redeem",
                              "claim-rewards",
                              "start-redeem-cooldown"
                            ]
                          }
                        },
                        "required": ["actions", "actionsUrl", "name"],
                        "additionalProperties": false
                      },
                      "description": "Deposit steps"
                    },
                    "currentRedeemStep": {
                      "type": "string",
                      "enum": [
                        "deposit",
                        "redeem",
                        "request-redeem",
                        "claim-redeem",
                        "claim-rewards",
                        "start-redeem-cooldown"
                      ],
                      "description": "Current redeem step"
                    },
                    "redeemSteps": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "actions": { "type": "array", "items": { "type": "string" } },
                          "actionsUrl": { "type": "string" },
                          "name": {
                            "type": "string",
                            "enum": [
                              "deposit",
                              "redeem",
                              "request-redeem",
                              "claim-redeem",
                              "claim-rewards",
                              "start-redeem-cooldown"
                            ]
                          }
                        },
                        "required": ["actions", "actionsUrl", "name"],
                        "additionalProperties": false
                      },
                      "description": "Redeem steps"
                    },
                    "lpToken": {
                      "type": "object",
                      "properties": {
                        "address": {
                          "type": "string",
                          "pattern": "^0x[a-fA-F0-9]{40}$",
                          "description": "Address of the LP token"
                        },
                        "tokenCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                          "description": "CAIP-2 of the LP token"
                        },
                        "name": { "type": "string", "description": "Name of the LP token" },
                        "symbol": { "type": "string", "description": "Symbol of the LP token" },
                        "decimals": {
                          "type": "integer",
                          "description": "Number of decimals of the LP token"
                        },
                        "balanceNative": {
                          "type": "string",
                          "description": "Balance of the LP token"
                        },
                        "balanceUsd": {
                          "type": "string",
                          "description": "USD value of the LP token"
                        }
                      },
                      "required": [
                        "address",
                        "tokenCaip",
                        "name",
                        "symbol",
                        "decimals",
                        "balanceNative",
                        "balanceUsd"
                      ],
                      "additionalProperties": false,
                      "description": "LP token details"
                    },
                    "asset": {
                      "type": "object",
                      "properties": {
                        "address": {
                          "type": "string",
                          "pattern": "^0x[a-fA-F0-9]{40}$",
                          "description": "Address of the asset"
                        },
                        "assetCaip": {
                          "type": "string",
                          "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                          "description": "CAIP-2 of the asset"
                        },
                        "name": { "type": "string", "description": "Name of the asset" },
                        "symbol": { "type": "string", "description": "Symbol of the asset" },
                        "decimals": {
                          "type": "integer",
                          "description": "Number of decimals of the asset"
                        },
                        "assetLogo": {
                          "type": "string",
                          "format": "uri",
                          "description": "URL of the asset logo"
                        },
                        "assetPriceInUsd": {
                          "type": "string",
                          "description": "Price of the asset in USD"
                        },
                        "assetGroup": {
                          "type": "string",
                          "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                        },
                        "balanceNative": {
                          "type": "string",
                          "description": "Balance of the asset denominated in asset wei"
                        },
                        "balanceUsd": {
                          "type": "string",
                          "description": "Balance of the asset denominated in usd"
                        },
                        "unclaimedNative": {
                          "type": "string",
                          "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                        },
                        "unclaimedUsd": {
                          "type": "string",
                          "description": "Unclaimed balance of the asset in the position denominated in usd"
                        },
                        "positionValueInAsset": {
                          "type": "string",
                          "description": "Position value in asset denominated in asset wei"
                        }
                      },
                      "required": [
                        "address",
                        "assetCaip",
                        "name",
                        "symbol",
                        "decimals",
                        "assetGroup",
                        "balanceNative",
                        "balanceUsd"
                      ],
                      "additionalProperties": false,
                      "description": "Asset details"
                    },
                    "additionalAssets": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "pattern": "^0x[a-fA-F0-9]{40}$",
                            "description": "Address of the asset"
                          },
                          "assetCaip": {
                            "type": "string",
                            "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                            "description": "CAIP-2 of the asset"
                          },
                          "name": { "type": "string", "description": "Name of the asset" },
                          "symbol": { "type": "string", "description": "Symbol of the asset" },
                          "decimals": {
                            "type": "integer",
                            "description": "Number of decimals of the asset"
                          },
                          "assetLogo": {
                            "type": "string",
                            "format": "uri",
                            "description": "URL of the asset logo"
                          },
                          "assetPriceInUsd": {
                            "type": "string",
                            "description": "Price of the asset in USD"
                          },
                          "assetGroup": {
                            "type": "string",
                            "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                          },
                          "balanceNative": {
                            "type": "string",
                            "description": "Balance of the asset denominated in asset wei"
                          },
                          "balanceUsd": {
                            "type": "string",
                            "description": "Balance of the asset denominated in usd"
                          },
                          "unclaimedNative": {
                            "type": "string",
                            "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                          },
                          "unclaimedUsd": {
                            "type": "string",
                            "description": "Unclaimed balance of the asset in the position denominated in usd"
                          },
                          "positionValueInAsset": {
                            "type": "string",
                            "description": "Position value in asset denominated in asset wei"
                          }
                        },
                        "required": [
                          "address",
                          "assetCaip",
                          "name",
                          "symbol",
                          "decimals",
                          "assetGroup",
                          "balanceNative",
                          "balanceUsd"
                        ],
                        "additionalProperties": false
                      },
                      "description": "Additional assets details"
                    },
                    "childrenPositions": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "address": {
                            "type": "string",
                            "description": "Address of the child vault"
                          },
                          "lpToken": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the LP token"
                              },
                              "tokenCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the LP token"
                              },
                              "name": { "type": "string", "description": "Name of the LP token" },
                              "symbol": {
                                "type": "string",
                                "description": "Symbol of the LP token"
                              },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the LP token"
                              },
                              "balanceNative": {
                                "type": "string",
                                "description": "Balance of the LP token"
                              },
                              "balanceUsd": {
                                "type": "string",
                                "description": "USD value of the LP token"
                              }
                            },
                            "required": [
                              "address",
                              "tokenCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "balanceNative",
                              "balanceUsd"
                            ],
                            "additionalProperties": false,
                            "description": "LP token details of the child vault"
                          },
                          "asset": {
                            "type": "object",
                            "properties": {
                              "address": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the asset"
                              },
                              "assetCaip": {
                                "type": "string",
                                "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                "description": "CAIP-2 of the asset"
                              },
                              "name": { "type": "string", "description": "Name of the asset" },
                              "symbol": { "type": "string", "description": "Symbol of the asset" },
                              "decimals": {
                                "type": "integer",
                                "description": "Number of decimals of the asset"
                              },
                              "assetLogo": {
                                "type": "string",
                                "format": "uri",
                                "description": "URL of the asset logo"
                              },
                              "assetPriceInUsd": {
                                "type": "string",
                                "description": "Price of the asset in USD"
                              },
                              "assetGroup": {
                                "type": "string",
                                "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                              },
                              "balanceNative": {
                                "type": "string",
                                "description": "Balance of the asset denominated in asset wei"
                              },
                              "balanceUsd": {
                                "type": "string",
                                "description": "Balance of the asset denominated in usd"
                              },
                              "unclaimedNative": {
                                "type": "string",
                                "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                              },
                              "unclaimedUsd": {
                                "type": "string",
                                "description": "Unclaimed balance of the asset in the position denominated in usd"
                              },
                              "positionValueInAsset": {
                                "type": "string",
                                "description": "Position value in asset denominated in asset wei"
                              }
                            },
                            "required": [
                              "address",
                              "assetCaip",
                              "name",
                              "symbol",
                              "decimals",
                              "assetGroup",
                              "balanceNative",
                              "balanceUsd"
                            ],
                            "additionalProperties": false,
                            "description": "Asset details of the child vault"
                          },
                          "additionalAssets": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "address": {
                                  "type": "string",
                                  "pattern": "^0x[a-fA-F0-9]{40}$",
                                  "description": "Address of the asset"
                                },
                                "assetCaip": {
                                  "type": "string",
                                  "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                  "description": "CAIP-2 of the asset"
                                },
                                "name": { "type": "string", "description": "Name of the asset" },
                                "symbol": {
                                  "type": "string",
                                  "description": "Symbol of the asset"
                                },
                                "decimals": {
                                  "type": "integer",
                                  "description": "Number of decimals of the asset"
                                },
                                "assetLogo": {
                                  "type": "string",
                                  "format": "uri",
                                  "description": "URL of the asset logo"
                                },
                                "assetPriceInUsd": {
                                  "type": "string",
                                  "description": "Price of the asset in USD"
                                },
                                "assetGroup": {
                                  "type": "string",
                                  "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                },
                                "balanceNative": {
                                  "type": "string",
                                  "description": "Balance of the asset denominated in asset wei"
                                },
                                "balanceUsd": {
                                  "type": "string",
                                  "description": "Balance of the asset denominated in usd"
                                },
                                "unclaimedNative": {
                                  "type": "string",
                                  "description": "Unclaimed balance of the asset in the position denominated in asset wei"
                                },
                                "unclaimedUsd": {
                                  "type": "string",
                                  "description": "Unclaimed balance of the asset in the position denominated in usd"
                                },
                                "positionValueInAsset": {
                                  "type": "string",
                                  "description": "Position value in asset denominated in asset wei"
                                }
                              },
                              "required": [
                                "address",
                                "assetCaip",
                                "name",
                                "symbol",
                                "decimals",
                                "assetGroup",
                                "balanceNative",
                                "balanceUsd"
                              ],
                              "additionalProperties": false
                            },
                            "description": "Additional assets details of the child vault"
                          }
                        },
                        "required": ["address", "lpToken", "asset", "additionalAssets"],
                        "additionalProperties": false
                      }
                    },
                    "vaultSpecificData": { "description": "Vault specific data" },
                    "rewards": {
                      "type": "object",
                      "properties": {
                        "claimable": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "amount": {
                                "type": "string",
                                "description": "Amount of the claimable reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "network": {
                                    "type": "string",
                                    "enum": [
                                      "mainnet",
                                      "optimism",
                                      "arbitrum",
                                      "polygon",
                                      "gnosis",
                                      "base",
                                      "unichain",
                                      "swellchain",
                                      "celo",
                                      "worldchain",
                                      "berachain",
                                      "ink",
                                      "bsc",
                                      "hyperliquid",
                                      "plasma"
                                    ],
                                    "description": "Network of the reward"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "network"
                                ],
                                "additionalProperties": false
                              }
                            },
                            "required": ["amount", "asset"],
                            "additionalProperties": false
                          }
                        },
                        "currentStep": {
                          "type": "string",
                          "enum": [
                            "deposit",
                            "redeem",
                            "request-redeem",
                            "claim-redeem",
                            "claim-rewards",
                            "start-redeem-cooldown"
                          ],
                          "description": "Current step for claiming rewards"
                        },
                        "steps": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "actions": { "type": "array", "items": { "type": "string" } },
                              "actionsUrl": { "type": "string" },
                              "name": {
                                "type": "string",
                                "enum": [
                                  "deposit",
                                  "redeem",
                                  "request-redeem",
                                  "claim-redeem",
                                  "claim-rewards",
                                  "start-redeem-cooldown"
                                ]
                              }
                            },
                            "required": ["actions", "actionsUrl", "name"],
                            "additionalProperties": false
                          },
                          "description": "Steps for claiming rewards"
                        }
                      },
                      "required": ["claimable", "currentStep", "steps"],
                      "additionalProperties": false
                    }
                  },
                  "required": [
                    "currentDepositStep",
                    "depositSteps",
                    "currentRedeemStep",
                    "redeemSteps",
                    "lpToken",
                    "asset",
                    "additionalAssets",
                    "childrenPositions"
                  ],
                  "additionalProperties": false,
                  "description": "Transaction context information for a user and vault"
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/transactions/{action}/{userAddress}/{network}/{vaultAddress}

> Retrieves executable transaction payloads for specific actions (deposit, redeem, claim) for a user interacting with a vault, including ready-to-sign transaction data and optional simulation results.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/transactions/{action}/{userAddress}/{network}/{vaultAddress}": {
      "get": {
        "tags": ["Transactions (PRO)"],
        "description": "Retrieves executable transaction payloads for specific actions (deposit, redeem, claim) for a user interacting with a vault, including ready-to-sign transaction data and optional simulation results.",
        "parameters": [
          {
            "schema": { "type": "boolean", "default": "false" },
            "in": "query",
            "name": "simulate",
            "required": false,
            "description": "Simulate the transaction"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "query",
            "name": "assetAddress",
            "required": true,
            "description": "Address of the asset to be used in the transaction"
          },
          {
            "schema": { "type": "string" },
            "in": "query",
            "name": "amount",
            "required": false,
            "description": "Only applicable to deposit, redeem, request-redeem, Amount of the asset to be used in the transaction"
          },
          {
            "schema": { "type": "boolean" },
            "in": "query",
            "name": "all",
            "required": false,
            "description": "Only applicable for redeem action. If true, all assets will be redeemed"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "deposit",
                "redeem",
                "request-redeem",
                "claim-redeem",
                "claim-rewards",
                "start-redeem-cooldown"
              ]
            },
            "in": "path",
            "name": "action",
            "required": true,
            "description": "Action to be performed"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address to get returns for"
          },
          {
            "schema": {
              "type": "string",
              "enum": [
                "mainnet",
                "optimism",
                "arbitrum",
                "polygon",
                "gnosis",
                "base",
                "unichain",
                "swellchain",
                "celo",
                "worldchain",
                "berachain",
                "ink",
                "bsc",
                "hyperliquid",
                "plasma",
                "eip155:1",
                "eip155:10",
                "eip155:42161",
                "eip155:137",
                "eip155:100",
                "eip155:8453",
                "eip155:130",
                "eip155:1923",
                "eip155:42220",
                "eip155:480",
                "eip155:80094",
                "eip155:57073",
                "eip155:56",
                "eip155:999",
                "eip155:9745"
              ]
            },
            "in": "path",
            "name": "network",
            "required": true,
            "description": "Network to get returns for"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "vaultAddress",
            "required": true,
            "description": "Vault address to get returns for"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "currentActionIndex": { "type": "number" },
                    "actions": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "name": { "type": "string", "description": "Name of the action" },
                          "tx": {
                            "type": "object",
                            "properties": {
                              "to": {
                                "type": "string",
                                "pattern": "^0x[a-fA-F0-9]{40}$",
                                "description": "Address of the transaction recipient"
                              },
                              "chainId": {
                                "type": "integer",
                                "exclusiveMinimum": true,
                                "minimum": 0,
                                "description": "Chain ID of the transaction"
                              },
                              "data": {
                                "type": "string",
                                "description": "Data to be sent with the transaction"
                              },
                              "value": {
                                "type": "string",
                                "description": "Value to be sent with the transaction"
                              }
                            },
                            "required": ["to", "chainId"],
                            "additionalProperties": false
                          },
                          "simulation": {
                            "type": "object",
                            "properties": {
                              "url": {
                                "type": "string",
                                "description": "URL to simulated transaction"
                              },
                              "status": {
                                "type": "string",
                                "enum": ["success", "failure", "internal server error"],
                                "description": "Status of the simulation"
                              },
                              "tokensReceived": {
                                "type": "object",
                                "additionalProperties": { "type": "string" },
                                "description": "Tokens received from the transaction"
                              },
                              "tokensSpent": {
                                "type": "object",
                                "additionalProperties": { "type": "string" },
                                "description": "Tokens spent in the transaction"
                              }
                            },
                            "required": ["url", "status"],
                            "additionalProperties": false
                          }
                        },
                        "required": ["name", "tx"],
                        "additionalProperties": false
                      }
                    }
                  },
                  "required": ["currentActionIndex", "actions"],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/transactions/rewards/context/{userAddress}

> Retrieves claimable rewards context for a user across all networks and vaults, including reward details and claim URLs.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/transactions/rewards/context/{userAddress}": {
      "get": {
        "tags": ["Transactions (PRO)"],
        "description": "Retrieves claimable rewards context for a user across all networks and vaults, including reward details and claim URLs.",
        "parameters": [
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address"
          }
        ],
        "responses": {
          "200": {
            "description": "Rewards context information for claiming available rewards",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "claimable": {
                      "type": "object",
                      "required": [
                        "mainnet",
                        "optimism",
                        "arbitrum",
                        "polygon",
                        "gnosis",
                        "base",
                        "unichain",
                        "swellchain",
                        "celo",
                        "worldchain",
                        "berachain",
                        "ink",
                        "bsc",
                        "hyperliquid",
                        "plasma"
                      ],
                      "properties": {
                        "mainnet": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "optimism": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "arbitrum": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "polygon": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "gnosis": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "base": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "unichain": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "swellchain": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "celo": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "worldchain": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "berachain": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "ink": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "bsc": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "hyperliquid": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        },
                        "plasma": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "claimId": {
                                "type": "string",
                                "description": "Unique identifier for the reward"
                              },
                              "asset": {
                                "type": "object",
                                "properties": {
                                  "address": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the asset"
                                  },
                                  "assetCaip": {
                                    "type": "string",
                                    "pattern": "^eip155:\\d+\\/(erc20:0x[0-9a-fA-F]{40}|slip44:\\d+)$",
                                    "description": "CAIP-2 of the asset"
                                  },
                                  "name": { "type": "string", "description": "Name of the asset" },
                                  "symbol": {
                                    "type": "string",
                                    "description": "Symbol of the asset"
                                  },
                                  "decimals": {
                                    "type": "integer",
                                    "description": "Number of decimals of the asset"
                                  },
                                  "assetLogo": {
                                    "type": "string",
                                    "format": "uri",
                                    "description": "URL of the asset logo"
                                  },
                                  "assetPriceInUsd": {
                                    "type": "string",
                                    "description": "Price of the asset in USD"
                                  },
                                  "assetGroup": {
                                    "type": "string",
                                    "description": "Group of the asset, e.g., ETH, USD, EURO, BTC, OTHER"
                                  },
                                  "claimableAmount": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed"
                                  },
                                  "claimableAmountInUsd": {
                                    "type": "string",
                                    "description": "Amount of the asset that can be claimed in USD"
                                  }
                                },
                                "required": [
                                  "address",
                                  "assetCaip",
                                  "name",
                                  "symbol",
                                  "decimals",
                                  "assetGroup",
                                  "claimableAmount"
                                ],
                                "additionalProperties": false,
                                "description": "Reward asset details"
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "protocol": {
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "type": "string",
                                          "description": "Name of the protocol"
                                        },
                                        "product": {
                                          "type": "string",
                                          "description": "Product of the protocol"
                                        },
                                        "version": {
                                          "type": "string",
                                          "description": "Version of the protocol"
                                        },
                                        "protocolUrl": {
                                          "type": "string",
                                          "description": "URL of the protocol"
                                        },
                                        "protocolLogo": {
                                          "type": "string",
                                          "description": "URL of the protocol logo"
                                        },
                                        "description": {
                                          "type": "string",
                                          "description": "Description of the protocol"
                                        }
                                      },
                                      "required": ["name"],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": ["protocol"],
                                  "additionalProperties": false
                                },
                                "description": "Sources of the reward"
                              },
                              "actionUrl": {
                                "type": "string",
                                "description": "URL to claim this specific reward"
                              }
                            },
                            "required": ["claimId", "asset", "sources", "actionUrl"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "additionalProperties": false,
                      "description": "Claimable rewards organized by network"
                    },
                    "actionUrl": { "type": "string", "description": "URL for claiming all rewards" }
                  },
                  "required": ["claimable", "actionUrl"],
                  "additionalProperties": false,
                  "description": "Rewards context information for claiming available rewards"
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## GET /v2/transactions/rewards/claim/{userAddress}

> Generates a claim rewards transaction for a user, returning transaction payloads needed to claim rewards from protocols.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Vaults.fyi API", "version": "2.0.0" },
  "tags": [],
  "servers": [{ "url": "https://api.vaults.fyi", "description": "Vaults.fyi API" }],
  "security": [{ "apiKey": [] }],
  "components": {
    "securitySchemes": { "apiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
  },
  "paths": {
    "/v2/transactions/rewards/claim/{userAddress}": {
      "get": {
        "tags": ["Transactions (PRO)"],
        "description": "Generates a claim rewards transaction for a user, returning transaction payloads needed to claim rewards from protocols.",
        "parameters": [
          {
            "schema": { "type": "boolean", "default": "false" },
            "in": "query",
            "name": "simulate",
            "required": false,
            "description": "Simulate the transaction"
          },
          {
            "schema": { "type": "array", "items": { "type": "string", "minLength": 1 } },
            "in": "query",
            "name": "claimIds",
            "required": true,
            "description": "Array of claim IDs to be claimed"
          },
          {
            "schema": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "in": "path",
            "name": "userAddress",
            "required": true,
            "description": "User address to claim rewards for"
          }
        ],
        "responses": {
          "200": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "mainnet",
                    "optimism",
                    "arbitrum",
                    "polygon",
                    "gnosis",
                    "base",
                    "unichain",
                    "swellchain",
                    "celo",
                    "worldchain",
                    "berachain",
                    "ink",
                    "bsc",
                    "hyperliquid",
                    "plasma"
                  ],
                  "properties": {
                    "mainnet": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "optimism": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "arbitrum": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "polygon": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "gnosis": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "base": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "unichain": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "swellchain": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "celo": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "worldchain": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "berachain": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "ink": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "bsc": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "hyperliquid": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    },
                    "plasma": {
                      "type": "object",
                      "properties": {
                        "currentActionIndex": { "type": "number" },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "name": { "type": "string", "description": "Name of the action" },
                              "tx": {
                                "type": "object",
                                "properties": {
                                  "to": {
                                    "type": "string",
                                    "pattern": "^0x[a-fA-F0-9]{40}$",
                                    "description": "Address of the transaction recipient"
                                  },
                                  "chainId": {
                                    "type": "integer",
                                    "exclusiveMinimum": true,
                                    "minimum": 0,
                                    "description": "Chain ID of the transaction"
                                  },
                                  "data": {
                                    "type": "string",
                                    "description": "Data to be sent with the transaction"
                                  },
                                  "value": {
                                    "type": "string",
                                    "description": "Value to be sent with the transaction"
                                  }
                                },
                                "required": ["to", "chainId"],
                                "additionalProperties": false
                              },
                              "simulation": {
                                "type": "object",
                                "properties": {
                                  "url": {
                                    "type": "string",
                                    "description": "URL to simulated transaction"
                                  },
                                  "status": {
                                    "type": "string",
                                    "enum": ["success", "failure", "internal server error"],
                                    "description": "Status of the simulation"
                                  },
                                  "tokensReceived": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens received from the transaction"
                                  },
                                  "tokensSpent": {
                                    "type": "object",
                                    "additionalProperties": { "type": "string" },
                                    "description": "Tokens spent in the transaction"
                                  }
                                },
                                "required": ["url", "status"],
                                "additionalProperties": false
                              }
                            },
                            "required": ["name", "tx"],
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": ["currentActionIndex", "actions"],
                      "additionalProperties": false
                    }
                  },
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "statusCode": { "type": "number" },
                        "error": { "type": "string", "enum": ["Bad Request"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["statusCode", "error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Unauthorized"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "API key required. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance.",
                            "This endpoint is only available to vaults.fyi PRO subscribers. Please upgrade your API key to access this feature."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Forbidden"] },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided API key has exhausted its available credits. Please contact vaults.fyi support at https://t.me/vaultsfyisupport or email (support@wallfacer.io) for further assistance."
                          ]
                        },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "408": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Internal Server Error"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          },
          "503": {
            "description": "Default Response",
            "content": {
              "application/json": {
                "schema": {
                  "anyOf": [
                    {
                      "type": "object",
                      "properties": {
                        "error": { "type": "string", "enum": ["Service Unavailable"] },
                        "message": { "type": "string" },
                        "errorId": { "type": "string" }
                      },
                      "required": ["error", "message"],
                      "additionalProperties": false
                    },
                    {}
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```
