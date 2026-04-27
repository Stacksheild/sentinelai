import { describe, it, expect } from "vitest";
import { classifyTask } from "../classifier/task-classifier.js";

describe("classifyTask", () => {
  describe("code-generation", () => {
    it("classifies 'write a function' as code-generation", () => {
      expect(classifyTask("write a function to parse JSON")).toBe("code-generation");
    });
    it("classifies 'implement X' as code-generation", () => {
      expect(classifyTask("implement a binary search algorithm")).toBe("code-generation");
    });
    it("classifies 'create a React component' as code-generation", () => {
      expect(classifyTask("create a React component for the login form")).toBe("code-generation");
    });
  });

  describe("code-review", () => {
    it("classifies 'review this code' as code-review", () => {
      expect(classifyTask("review this code for bugs")).toBe("code-review");
    });
    it("classifies 'audit the diff' as code-review", () => {
      expect(classifyTask("audit the diff in this pull request")).toBe("code-review");
    });
    it("classifies 'find bugs in' as code-review", () => {
      expect(classifyTask("find bugs in the authentication module")).toBe("code-review");
    });
  });

  describe("summarization", () => {
    it("classifies 'summarize this document' as summarization", () => {
      expect(classifyTask("summarize this document")).toBe("summarization");
    });
    it("classifies 'TL;DR' as summarization", () => {
      expect(classifyTask("tldr this article")).toBe("summarization");
    });
  });

  describe("analysis", () => {
    it("classifies 'analyze the performance' as analysis", () => {
      expect(classifyTask("analyze the performance of this query")).toBe("analysis");
    });
    it("classifies 'compare these two approaches' as analysis", () => {
      expect(classifyTask("compare these two approaches")).toBe("analysis");
    });
    it("classifies 'why does this happen' as analysis", () => {
      expect(classifyTask("explain why does this error happen")).toBe("analysis");
    });
  });

  describe("translation", () => {
    it("classifies 'translate to Spanish' as translation", () => {
      expect(classifyTask("translate this text to Spanish")).toBe("translation");
    });
    it("classifies 'convert to French' as translation", () => {
      expect(classifyTask("convert this document to French")).toBe("translation");
    });
  });

  describe("extraction", () => {
    it("classifies 'extract the data fields' as extraction", () => {
      expect(classifyTask("extract the data fields from this JSON")).toBe("extraction");
    });
    it("classifies 'parse names and dates' as extraction", () => {
      expect(classifyTask("parse the names and dates from this document")).toBe("extraction");
    });
  });

  describe("creative", () => {
    it("classifies 'write a blog post' as creative", () => {
      expect(classifyTask("write a blog post about AI safety")).toBe("creative");
    });
    it("classifies 'draft an email' as creative", () => {
      expect(classifyTask("draft an email to the team")).toBe("creative");
    });
    it("classifies 'brainstorm ideas' as creative", () => {
      expect(classifyTask("brainstorm ideas for the new feature")).toBe("creative");
    });
  });

  describe("chat (default)", () => {
    it("classifies 'hello' as chat", () => {
      expect(classifyTask("hello there")).toBe("chat");
    });
    it("classifies unrecognized input as chat", () => {
      expect(classifyTask("xyzzy plugh")).toBe("chat");
    });
  });
});
