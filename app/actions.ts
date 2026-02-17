"use server";

import fs from "fs";
import path from "path";

export interface ReleaseNote {
  title: string;
  type: string;
  date: string;
  content: string;
  extra?: {
    icon: string;
    text: string;
  };
}

export async function getReleaseNotes(): Promise<ReleaseNote[]> {
  try {
    const filePath = path.join(process.cwd(), "release.md");
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const sections = fileContent.split("---").map((s) => s.trim()).filter(Boolean);

    const notes: ReleaseNote[] = sections.map((section) => {
      const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
      
      // Parse Header: ### Type | Title
      const headerLine = lines.find((l) => l.startsWith("###"));
      let type = "Umum";
      let title = "Update";
      
      if (headerLine) {
        const headerContent = headerLine.replace("###", "").trim();
        const parts = headerContent.split("|");
        if (parts.length > 1) {
          type = parts[0].trim();
          title = parts[1].trim();
        } else {
          title = headerContent;
        }
      }

      // Parse Date: *Date*
      const dateLine = lines.find((l) => l.startsWith("*") && l.endsWith("*"));
      const date = dateLine ? dateLine.replace(/\*/g, "").trim() : "";

      // Parse Extra: > Icon | Text
      const extraLine = lines.find((l) => l.startsWith(">"));
      let extra = undefined;
      if (extraLine) {
        const extraContent = extraLine.replace(">", "").trim();
        const parts = extraContent.split("|");
        if (parts.length > 1) {
          extra = {
            icon: parts[0].trim(),
            text: parts[1].trim(),
          };
        }
      }

      // Parse Content: Everything else
      const content = lines
        .filter((l) => !l.startsWith("###") && !l.startsWith("*") && !l.startsWith(">"))
        .join(" ");

      return {
        type,
        title,
        date,
        content,
        extra,
      };
    });

    return notes;
  } catch (error) {
    console.error("Error reading release notes:", error);
    return [];
  }
}
