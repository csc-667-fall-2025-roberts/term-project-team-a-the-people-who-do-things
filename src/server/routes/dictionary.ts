import express, { Request, Response } from "express";
import {
	isValidWord,
	validateWords,
	getWordInfo,
	getDictionaryStats,
	validateWordDetailed,
} from "../services/dictionary.js";

const router = express.Router();

/**
 * POST /api/dictionary/validate
 * Validate a single word
 * Body: { word: string }
 */
router.post("/validate", (req: Request, res: Response) => {
	const { word } = req.body;

	if (!word) {
		return res.status(400).json({
			error: "Word is required",
		});
	}

	const result = validateWordDetailed(word);
	return res.json(result);
});

/**
 * POST /api/dictionary/validate-multiple
 * Validate multiple words
 * Body: { words: string[] }
 */
router.post("/validate-multiple", (req: Request, res: Response) => {
	const { words } = req.body;

	if (!Array.isArray(words)) {
		return res.status(400).json({
			error: "Words must be an array",
		});
	}

	const result = validateWords(words);
	return res.json(result);
});

/**
 * GET /api/dictionary/word/:word
 * Get information about a specific word
 */
router.get("/word/:word", (req: Request, res: Response) => {
	const { word } = req.params;

	if (!word) {
		return res.status(400).json({
			error: "Word is required",
		});
	}

	const info = getWordInfo(word);
	return res.json(info);
});


/**
 * GET /api/dictionary/stats
 * Get dictionary statistics
 */
router.get("/stats", (_req: Request, res: Response) => {
	const stats = getDictionaryStats();
	return res.json(stats);
});

/**
 * POST /api/dictionary/quick-check
 * Quick validation for a single word (simpler response)
 * Body: { word: string }
 */
router.post("/quick-check", (req: Request, res: Response) => {
	const { word } = req.body;

	if (!word) {
		return res.status(400).json({
			error: "Word is required",
		});
	}

	const valid = isValidWord(word);
	return res.json({
		word: word.toUpperCase(),
		valid,
	});
});

export default router;
