import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  formatMonthYear,
  formatRange,
  renderResumeHtml,
  splitBullets,
  type ResumeProfile,
  type ResumeTheme,
} from "@/lib/pdf/resume-html";

const theme: ResumeTheme = {
  name: "Modern",
  headFont: "Inter",
  bodyFont: "Inter",
  accent: "#0f766e",
  layout: "SINGLE",
  align: "LEFT",
  headingStyle: "PLAIN",
  density: "REGULAR",
  headerStyle: "INLINE",
  sidebarStyle: "PLAIN",
  dateStyle: "INLINE",
  photoShape: "ROUNDED",
  photoPosition: "HEADER_START",
};

const profile: ResumeProfile = {
  fields: {
    name: "Aman Vicky",
    email: "aman@example.com",
    phone: "+91 90000 00000",
    location: "Bengaluru",
    headline: "Backend engineer",
    summary: "Builds payment systems.",
  },
  skills: [
    { name: "TypeScript" },
    { name: "PostgreSQL" },
    { name: "Figma", group: "Design" },
  ],
  experiences: [
    {
      role: "Backend Engineer",
      company: "Acme",
      location: "Remote",
      startYear: 2022,
      startMonth: 3,
      current: true,
      bullets: "- Built the payments pipeline.\n- Cut latency by 40%.",
    },
  ],
  projects: [{ name: "Leyp", link: "github.com/amanvicky/leyp", bullets: "A job search tool." }],
  educations: [{ degree: "B.Tech CSE", school: "IIT Delhi", startYear: 2018, endYear: 2022 }],
  languages: [{ name: "English", level: "NATIVE" }],
  publications: [{ citation: "A paper on queues" }],
};

describe("resume html", () => {
  it("formats single dates and ranges", () => {
    expect(formatMonthYear(2021, 5)).toBe("May 2021");
    expect(formatMonthYear(2021)).toBe("2021");
    expect(formatMonthYear(null, 5)).toBe("");
    expect(formatMonthYear(2021, 13)).toBe("2021");
    expect(formatRange({ year: 2020 }, { year: 2022 })).toBe("2020 – 2022");
    expect(formatRange({ year: 2022, month: 3 }, { year: null }, true)).toBe("Mar 2022 – Present");
    expect(formatRange({}, {})).toBe("");
  });

  it("escapes every html metacharacter", () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });

  it("splits a bullet blob and drops markers and blanks", () => {
    expect(splitBullets("- one\n• two\n\n  three  \n* four")).toEqual(["one", "two", "three", "four"]);
    expect(splitBullets("")).toEqual([]);
    expect(splitBullets(undefined)).toEqual([]);
  });

  it("renders the profile into a complete document", () => {
    const html = renderResumeHtml(profile, theme);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<title>Aman Vicky</title>");
    expect(html).toContain("Backend Engineer");
    expect(html).toContain("Acme");
    expect(html).toContain("Mar 2022 – Present");
    expect(html).toContain("Built the payments pipeline.");
    expect(html).toContain("IIT Delhi");
    expect(html).toContain("English (NATIVE)");
    expect(html).toContain("A paper on queues");
    expect(html).toContain("#0f766e");
    expect(html).toContain('"Inter"');
  });

  it("groups skills by their group name", () => {
    const html = renderResumeHtml(profile, theme);
    expect(html).toContain("TypeScript, PostgreSQL");
    expect(html).toContain("<strong>Design:</strong> Figma");
  });

  it("omits sections that have no data instead of printing empty headings", () => {
    const html = renderResumeHtml(
      { fields: { name: "Solo" }, skills: [], experiences: [], projects: [], educations: [], languages: [] },
      theme,
    );
    expect(html).not.toContain("<h2>Experience</h2>");
    expect(html).not.toContain("<h2>Education</h2>");
    expect(html).not.toContain("<h2>Skills</h2>");
    expect(html).not.toContain("<h2>Languages</h2>");
    expect(html).toContain("Solo");
  });

  it("never emits unescaped user text", () => {
    const hostile = renderResumeHtml(
      {
        ...profile,
        fields: { name: '<img src=x onerror="alert(1)">', summary: "</p><script>bad()</script>" },
      },
      theme,
    );
    expect(hostile).not.toContain("<script>bad()");
    expect(hostile).not.toContain("<img src=x");
    expect(hostile).toContain("&lt;img src=x");
  });

  it("switches layout and header style with the theme", () => {
    const sidebar = renderResumeHtml(profile, { ...theme, layout: "SIDEBAR_LEFT", headerStyle: "CENTRED" });
    expect(sidebar).toContain("layout-sidebar");
    expect(sidebar).toContain("grid-template-columns");
    expect(sidebar).toContain('class="header centred"');

    const single = renderResumeHtml(profile, { ...theme, layout: "SINGLE", headerStyle: "PLAIN" });
    expect(single).toContain("layout-single");
    expect(single).not.toContain("grid-template-columns");
  });

  it("applies each date style", () => {
    expect(renderResumeHtml(profile, { ...theme, dateStyle: "RIGHT" })).toContain('class="dates"');
    expect(renderResumeHtml(profile, { ...theme, dateStyle: "UNDER" })).toContain("dates under");
    expect(renderResumeHtml(profile, { ...theme, dateStyle: "INLINE" })).toContain("dates inline");
  });

  it("renders a photo only when one is supplied", () => {
    expect(renderResumeHtml(profile, theme)).not.toContain('class="photo"');
    expect(renderResumeHtml({ ...profile, photoDataUrl: "data:image/png;base64,AAA" }, theme)).toContain(
      'class="photo"',
    );
  });
});
