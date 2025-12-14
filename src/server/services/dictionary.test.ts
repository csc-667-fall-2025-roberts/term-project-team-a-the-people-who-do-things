import {
	getDictionaryStats,
	getWordInfo,
	isValidWord,
	validateWordDetailed,
	validateWords,
} from "./dictionary.js";

describe("Dictionary Service", () => {
	describe("isValidWord", () => {
		it("should validate common words", () => {
			expect(isValidWord("HELLO")).toBe(true);
			expect(isValidWord("WORLD")).toBe(true);
			expect(isValidWord("SCRABBLE")).toBe(true);
		});

		it("should reject invalid words", () => {
			expect(isValidWord("XYZABC")).toBe(false);
			expect(isValidWord("QQQQQQ")).toBe(false);
		});

		it("should be case insensitive", () => {
			expect(isValidWord("hello")).toBe(true);
			expect(isValidWord("HeLLo")).toBe(true);
			expect(isValidWord("HELLO")).toBe(true);
		});

		it("should handle empty strings", () => {
			expect(isValidWord("")).toBe(false);
			expect(isValidWord("   ")).toBe(false);
		});

		it("should handle null/undefined", () => {
			expect(isValidWord(null as any)).toBe(false);
			expect(isValidWord(undefined as any)).toBe(false);
		});

		it("should validate short words", () => {
			expect(isValidWord("I")).toBe(true);
			expect(isValidWord("A")).toBe(true);
		});
	});

	describe("validateWords", () => {
		it("should validate multiple words", () => {
			const result = validateWords(["CAT", "DOG", "BIRD"]);
			expect(result.valid).toBe(true);
			expect(result.invalidWords).toHaveLength(0);
			expect(result.validWords).toContain("CAT");
		});

		it("should identify invalid words", () => {
			const result = validateWords(["CAT", "XYZABC", "DOG"]);
			expect(result.valid).toBe(false);
			expect(result.invalidWords).toContain("XYZABC");
			expect(result.validWords).toContain("CAT");
			expect(result.validWords).toContain("DOG");
		});

		it("should handle empty array", () => {
			const result = validateWords([]);
			expect(result.valid).toBe(true);
			expect(result.invalidWords).toHaveLength(0);
		});
	});

	describe("getWordInfo", () => {
		it("should return word information", () => {
			const info = getWordInfo("HELLO");
			expect(info.exists).toBe(true);
			expect(info.length).toBe(5);
			expect(info.normalized).toBe("HELLO");
		});

		it("should normalize case", () => {
			const info = getWordInfo("hello");
			expect(info.normalized).toBe("HELLO");
		});

		it("should handle non-existent words", () => {
			const info = getWordInfo("XYZABC");
			expect(info.exists).toBe(false);
			expect(info.length).toBe(6);
		});
	});

	describe("getDictionaryStats", () => {
		it("should return valid statistics", () => {
			const stats = getDictionaryStats();
			expect(stats.totalWords).toBeGreaterThan(0);
			expect(typeof stats.wordsByLength).toBe("object");
		});

		it("should have consistent word counts", () => {
			const stats = getDictionaryStats();
			const totalByLength = Object.values(stats.wordsByLength).reduce(
				(sum, count) => sum + count,
				0
			);
			expect(totalByLength).toBe(stats.totalWords);
		});
	});

	describe("validateWordDetailed", () => {
		it("should provide detailed validation for valid words", () => {
			const result = validateWordDetailed("HELLO");
			expect(result.valid).toBe(true);
			expect(result.normalized).toBe("HELLO");
			expect(result.length).toBe(5);
			expect(result.error).toBeUndefined();
		});

		it("should provide error for invalid words", () => {
			const result = validateWordDetailed("XYZABC");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Word not found in dictionary");
		});

		it("should reject empty strings", () => {
			const result = validateWordDetailed("");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Word cannot be empty");
		});

		it("should reject non-letter characters", () => {
			const result = validateWordDetailed("CAT123");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Word must contain only letters");
		});

		it("should reject null input", () => {
			const result = validateWordDetailed(null as any);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Word must be a non-empty string");
		});
	});
});
