
import { generateEmbedding } from "./services/embeddingService.js";

const text = "React memoization improves rendering performance";

const embedding = await generateEmbedding(text);

console.log("Text:", text);
console.log("Dimensions:", embedding.length);
console.log("First 5 values:", embedding.slice(0, 5));
