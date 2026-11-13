export function requireFreeAllowance(subscription, text) {
  if(subscription.tier!=='free') throw new Error('Only a verified free account is enabled in this prototype.');
  if(subscription.can_extend_character_limit!==false) throw new Error('Usage extension is enabled or unknown; speech blocked.');
  const {character_count:used,character_limit:limit}=subscription;
  if(!Number.isFinite(used)||!Number.isFinite(limit)||used<0||limit<used) throw new Error('Free allowance could not be verified.');
  if(typeof text!=='string'||!text.trim()||text.length>700) throw new Error('Prototype narration must contain 1–700 characters.');
  if(limit-used<text.length*2) throw new Error('Insufficient conservative free allowance; no paid fallback.');
}
export function alignmentCues(alignment, expectedText) {
  const c=alignment?.characters,s=alignment?.character_start_times_seconds,e=alignment?.character_end_times_seconds;
  if(!Array.isArray(c)||!c.length||c.length!==s?.length||c.length!==e?.length) throw new Error('Missing measured speech alignment.');
  if(expectedText!==undefined&&c.join('')!==expectedText) throw new Error('Speech alignment does not match approved narration.');
  const cues=[];let text='',start=0,end=0;
  for(let i=0;i<c.length;i++){
    if(typeof c[i]!=='string'||!Number.isFinite(s[i])||!Number.isFinite(e[i])||s[i]<0||e[i]<s[i]||(i&&(s[i]<s[i-1]||s[i]<e[i-1]-0.001))) throw new Error('Invalid speech alignment.');
    if(!text) start=s[i];
    text+=c[i];end=e[i];
    if((text.length>=35&&/\s/.test(c[i]))||i===c.length-1){if(text.trim())cues.push({start,end,text:text.trim()});text='';}
  }
  return cues;
}
