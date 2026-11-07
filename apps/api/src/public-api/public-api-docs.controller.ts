import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { PUBLIC_API_PATH } from "./public-api.controller";
import { publicApiOpenApiDocument } from "./openapi";

@Controller({ path: PUBLIC_API_PATH, version: VERSION_NEUTRAL })
export class PublicApiDocsController {
  @Get("openapi.json")
  openapi() {
    return publicApiOpenApiDocument;
  }
}
