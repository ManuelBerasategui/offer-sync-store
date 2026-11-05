import { describe, expect, it } from "vitest";
import { whatsappGroupUrl } from "./store";

describe("whatsappGroupUrl", () => {
  it("acepta invitaciones de chat.whatsapp.com", () => {
    expect(whatsappGroupUrl(" https://chat.whatsapp.com/E5su9ugpSe153nH6fIqihO?s=cl ")).toBe(
      "https://chat.whatsapp.com/E5su9ugpSe153nH6fIqihO?s=cl",
    );
  });

  it("rechaza vacío, http, otros dominios y esquemas peligrosos", () => {
    expect(whatsappGroupUrl("")).toBe("");
    expect(whatsappGroupUrl(undefined)).toBe("");
    expect(whatsappGroupUrl("http://chat.whatsapp.com/E5su9ugpSe153nH6fIqihO")).toBe("");
    expect(whatsappGroupUrl("https://chat.whatsapp.com.evil.com/E5su9ugpSe153")).toBe("");
    expect(whatsappGroupUrl("https://evil.com/?chat.whatsapp.com")).toBe("");
    expect(whatsappGroupUrl("javascript:alert(1)")).toBe("");
    expect(whatsappGroupUrl("https://chat.whatsapp.com/")).toBe("");
    expect(whatsappGroupUrl("https://user:pw@chat.whatsapp.com/E5su9ugpSe153")).toBe("");
  });
});
