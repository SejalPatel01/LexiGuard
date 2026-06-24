import { safeJsonParse } from '../lib/safe-json';

console.log("Starting Safe JSON Parsing tests...");

// Test Case 1: Standard JSON
const standardJson = `{"name": "Alice", "age": 30}`;
const res1 = safeJsonParse(standardJson, { name: "", age: 0 });
if (res1.name !== "Alice" || res1.age !== 30) {
  console.error("Test Case 1 Failed:", res1);
  process.exit(1);
}
console.log("Test Case 1 Passed (Standard JSON)");

// Test Case 2: Markdown Code Fences
const fencedJson = `
\`\`\`json
{
  "name": "Bob",
  "age": 25
}
\`\`\`
`;
const res2 = safeJsonParse(fencedJson, { name: "", age: 0 });
if (res2.name !== "Bob" || res2.age !== 25) {
  console.error("Test Case 2 Failed:", res2);
  process.exit(1);
}
console.log("Test Case 2 Passed (Markdown Code Fences)");

// Test Case 3: Trailing Commas
const trailingCommaJson = `{
  "name": "Charlie",
  "items": [1, 2, 3,],
}`;
const res3 = safeJsonParse(trailingCommaJson, { name: "", items: [] as number[] });
if (res3.name !== "Charlie" || res3.items.length !== 3) {
  console.error("Test Case 3 Failed:", res3);
  process.exit(1);
}
console.log("Test Case 3 Passed (Trailing Commas)");

// Test Case 4: Unescaped Newlines in String Value
const newlineJson = `{
  "name": "David",
  "notes": "Line 1
Line 2
Line 3"
}`;
const res4 = safeJsonParse(newlineJson, { name: "", notes: "" });
if (res4.name !== "David" || !res4.notes.includes("Line 2")) {
  console.error("Test Case 4 Failed:", res4);
  process.exit(1);
}
console.log("Test Case 4 Passed (Unescaped Newlines)");

// Test Case 5: Text around JSON Block
const textAroundJson = `Here is the requested output:
{
  "name": "Eve",
  "age": 22
}
Hope this helps!`;
const res5 = safeJsonParse(textAroundJson, { name: "", age: 0 });
if (res5.name !== "Eve" || res5.age !== 22) {
  console.error("Test Case 5 Failed:", res5);
  process.exit(1);
}
console.log("Test Case 5 Passed (Text Around JSON)");

// Test Case 6: Malformed/Corrupted fallback
const malformedJson = `{"name": "Frank", "age": `;
const defaultVal = { name: "Default", age: 99 };
const res6 = safeJsonParse(malformedJson, defaultVal);
if (res6.name !== "Default" || res6.age !== 99) {
  console.error("Test Case 6 Failed:", res6);
  process.exit(1);
}
console.log("Test Case 6 Passed (Malformed Fallback)");

console.log("All Safe JSON tests passed successfully!");
process.exit(0);
