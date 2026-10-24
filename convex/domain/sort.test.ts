import { describe, expect, it } from "vitest";
import { compareValues, sortRows } from "./sort";

describe("compareValues", () => {
  it("orders text the French way, ignoring accents and case", () => {
    const words = ["Épinards", "abricot", "Échalote", "ail"];
    expect([...words].sort(compareValues)).toEqual(["abricot", "ail", "Échalote", "Épinards"]);
  });

  it("orders numbers inside text numerically", () => {
    expect(compareValues("Rayon 10", "Rayon 9")).toBeGreaterThan(0);
  });
});

describe("sortRows", () => {
  const rows = [
    { name: "Riz", price: 2.5 },
    { name: "Ail", price: undefined },
    { name: "Bœuf", price: 25 },
    { name: "Sel", price: null },
    { name: "Pâtes", price: 2.5 },
  ];

  it("sorts ascending and descending", () => {
    expect(sortRows(rows, (r) => r.name, "asc").map((r) => r.name)).toEqual(["Ail", "Bœuf", "Pâtes", "Riz", "Sel"]);
    expect(sortRows(rows, (r) => r.name, "desc").map((r) => r.name)).toEqual(["Sel", "Riz", "Pâtes", "Bœuf", "Ail"]);
  });

  it("keeps empty cells last in both directions and ties in their order", () => {
    expect(sortRows(rows, (r) => r.price, "asc").map((r) => r.name)).toEqual(["Riz", "Pâtes", "Bœuf", "Ail", "Sel"]);
    expect(sortRows(rows, (r) => r.price, "desc").map((r) => r.name)).toEqual(["Bœuf", "Riz", "Pâtes", "Ail", "Sel"]);
  });

  it("does not modify the given array", () => {
    const copy = [...rows];
    sortRows(rows, (r) => r.name, "desc");
    expect(rows).toEqual(copy);
  });
});
