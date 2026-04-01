import { describe, expect, it } from "vitest";
import { renderTenantSkillMarkdown } from "../../src/services/runtime-custom-skills";

describe("runtime custom skills", () => {
  it("renders tenant skill markdown with frontmatter", () => {
    const rendered = renderTenantSkillMarkdown({
      name: "Finance Assistant",
      kind: "instruction",
      content: "Always show monthly totals first."
    });

    expect(rendered).toContain("name: Finance Assistant");
    expect(rendered).toContain("description: Tenant custom skill (instruction)");
    expect(rendered).toContain("# Finance Assistant");
    expect(rendered).toContain("Always show monthly totals first.");
  });
});
