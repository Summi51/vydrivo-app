export function requireFreeAllowance(subscription, text) {
  if(subscription.tier!=='free') throw new Error('Only a verified free account is enabled in this prototype.');
  if(subscription.can_extend_character_limit!==false) throw new Error('Usage extension is enabled or unknown; speech blocked.');
  const {character_count:used,character_limit:limit}=subscription;
  if(!Number.isFinite(used)||!Number.isFinite(limit)||used<0||limit<used) throw new Error('Free allowance could not be verified.');
  if(typeof text!=='string'||!text.trim()||text.length>700) throw new Error('Prototype narration must contain 1–700 characters.');
  if(limit-used<text.length*2) throw new Error('Insufficient conservative free allowance; no paid fallback.');
}
export function alignmentCues(alignment) {
  const characters = alignment?.characters;
  const starts = alignment?.character_start_times_seconds;
  const ends = alignment?.character_end_times_seconds;
  if (!Array.isArray(characters) || !characters.length || characters.length !== starts?.length || characters.length !== ends?.length) {
    throw new Error('Missing measured speech alignment.');
  }
  return [{ start: starts[0], end: ends[ends.length - 1], text: characters.join('') }];
}
