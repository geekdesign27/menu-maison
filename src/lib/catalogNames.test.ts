import { describe, expect, it } from "vitest";
import { buildProducts, filterProducts } from "../../convex/domain/products";
import { frenchName, localize, namesToSave, searchText } from "./catalogNames";

const items = [
  { _id: "a", name: "Oignon", nameDe: "Zwiebel" },
  { _id: "b", name: "Topinambour" },
];

describe("catalogue names", () => {
  it("shows the German name to a German profile, keeps the French one for editors", () => {
    const de = localize(items, "de");
    expect(de.map((i) => i.name)).toEqual(["Zwiebel", "Topinambour"]);
    expect(de.map(frenchName)).toEqual(["Oignon", "Topinambour"]);
    expect(localize(items, "fr").map((i) => i.name)).toEqual(["Oignon", "Topinambour"]);
    expect(localize(items, "fr")).not.toBe(items);
  });

  it("finds a product by either name", () => {
    const [zwiebel] = localize(items, "de");
    expect(searchText(zwiebel)).toContain("Oignon");
    expect(searchText(items[0])).toContain("Zwiebel");
    const rows = buildProducts(localize(items, "de"), [], [], "de");
    expect(filterProducts(rows, { search: "oign" }).map((r) => r.name)).toEqual(["Zwiebel"]);
    expect(filterProducts(rows, { search: "zwie" }).map((r) => r.name)).toEqual(["Zwiebel"]);
  });

  it("gives a product named only in German that name in French too", () => {
    expect(namesToSave("", " Zwiebel ")).toEqual({ name: "Zwiebel", nameDe: "Zwiebel" });
    expect(namesToSave("Oignon", "")).toEqual({ name: "Oignon", nameDe: "" });
  });
});
