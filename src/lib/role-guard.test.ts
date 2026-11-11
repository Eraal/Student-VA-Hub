import { describe, it, expect } from "vitest";
import { evaluateRoleAccess, getDefaultRolePath } from "./role-guard";
import { Role } from "@prisma/client";

describe("evaluateRoleAccess", () => {
  it("denies unauthenticated requests", () => {
    const resNull = evaluateRoleAccess(null, Role.STUDENT);
    expect(resNull.allowed).toBe(false);
    expect(resNull.reason).toBe("UNAUTHENTICATED");

    const resUndefined = evaluateRoleAccess(undefined, Role.CLIENT);
    expect(resUndefined.allowed).toBe(false);
    expect(resUndefined.reason).toBe("UNAUTHENTICATED");
  });

  it("denies access if role does not match expected role", () => {
    const studentAccessingClient = evaluateRoleAccess(Role.STUDENT, Role.CLIENT);
    expect(studentAccessingClient.allowed).toBe(false);
    expect(studentAccessingClient.reason).toBe("FORBIDDEN");

    const clientAccessingStudent = evaluateRoleAccess(Role.CLIENT, Role.STUDENT);
    expect(clientAccessingStudent.allowed).toBe(false);
    expect(clientAccessingStudent.reason).toBe("FORBIDDEN");
  });

  it("allows access when role matches expected role", () => {
    const studentRes = evaluateRoleAccess(Role.STUDENT, Role.STUDENT);
    expect(studentRes.allowed).toBe(true);
    expect(studentRes.reason).toBeUndefined();

    const clientRes = evaluateRoleAccess(Role.CLIENT, Role.CLIENT);
    expect(clientRes.allowed).toBe(true);
    expect(clientRes.reason).toBeUndefined();
  });
});

describe("getDefaultRolePath", () => {
  it("returns /student for STUDENT role", () => {
    expect(getDefaultRolePath(Role.STUDENT)).toBe("/student");
  });

  it("returns /client for CLIENT role", () => {
    expect(getDefaultRolePath(Role.CLIENT)).toBe("/client");
  });

  it("returns /login for null or undefined", () => {
    expect(getDefaultRolePath(null)).toBe("/login");
    expect(getDefaultRolePath(undefined)).toBe("/login");
  });
});

