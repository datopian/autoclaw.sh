import { describe, expect, it, vi } from "vitest";
import { applySkillPack, getSkillPack, listSkillPacks } from "../../src/services/skill-packs";

describe("skill packs", () => {
  it("lists available packs", () => {
    const packs = listSkillPacks();
    expect(packs.map((pack) => pack.name)).toEqual(["basic", "creator", "ops"]);
  });

  it("applies basic pack when no existing policy rows", async () => {
    const pack = getSkillPack("basic");
    expect(pack).not.toBeNull();

    const repo = {
      listByTenant: vi.fn(async () => []),
      upsert: vi.fn(async () => {})
    };
    const result = await applySkillPack({
      repo: repo as never,
      tenantId: "t_1",
      pack: pack!
    });

    expect(result.applied).toBe(true);
    expect(repo.upsert).toHaveBeenCalled();
  });

  it("does not override existing policy rows unless forced", async () => {
    const pack = getSkillPack("ops");
    expect(pack).not.toBeNull();

    const repo = {
      listByTenant: vi.fn(async () => [
        {
          tenantId: "t_1",
          skillName: "weather",
          allowed: true,
          enabled: true,
          hidden: false,
          createdAt: "x",
          updatedAt: "y"
        }
      ]),
      upsert: vi.fn(async () => {})
    };
    const result = await applySkillPack({
      repo: repo as never,
      tenantId: "t_1",
      pack: pack!
    });

    expect(result.applied).toBe(false);
    expect(repo.upsert).not.toHaveBeenCalled();
  });
});
