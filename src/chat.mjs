/** Parse only text. Authentication, event deduplication and role claims belong to intake. */
export function parseRezzCommand(message, { maxCodePoints = 500 } = {}) {
  if (!Number.isInteger(maxCodePoints) || maxCodePoints < 1 || maxCodePoints > 2000) throw new TypeError('maxCodePoints must be an integer from 1 to 2000.');
  if (typeof message !== 'string') throw new TypeError('Chat message must be text.');
  const text = message.trim();
  if (!/^!rezz(?:\s|$)/i.test(text)) return { disposition: 'ignored' };
  let prompt = text.slice(5).trim();
  if (prompt.startsWith('"') !== prompt.endsWith('"') || prompt === '"') return { disposition: 'rejected', reason: 'unmatched_quotes', message: 'Close the outer double quotes around your prompt.' };
  if (prompt.startsWith('"')) prompt = prompt.slice(1, -1).trim();
  if (!prompt) return { disposition: 'rejected', reason: 'empty_prompt', message: 'Add a visual prompt after !rezz.' };
  // Count Unicode code points, not UTF-16 units (an emoji may occupy two units).
  let length = 0;
  for (const _ of prompt) if (++length > maxCodePoints) return { disposition: 'rejected', reason: 'prompt_too_long', message: `Keep the prompt within ${maxCodePoints} Unicode code points.` };
  return { disposition: 'accepted', prompt };
}
