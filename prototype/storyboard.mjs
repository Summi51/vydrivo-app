import {createHash} from 'node:crypto';
const string = {type:'string'};
const REFERENCE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const storyboardSchema = {
  type:'object', additionalProperties:false, required:['schemaVersion','title','scenes'],
  properties:{schemaVersion:{type:'integer',enum:[1]}, title:string, scenes:{type:'array',minItems:1,maxItems:24,items:{
    type:'object',additionalProperties:false,required:['id','title','narration','visualKind','visualPrompt','estimatedSeconds'],
    properties:{id:string,title:string,narration:string,visualKind:{type:'string',enum:['ai-generated-footage','motion-graphics']},visualPrompt:string,estimatedSeconds:{type:'number',minimum:2,maximum:30}}
  }}}
};
function exactKeys(value, keys) {
  if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(k=>!keys.includes(k)) || keys.some(k=>!(k in value))) throw new Error('Unexpected or missing storyboard fields.');
}
function sceneKeys(value) {
  const required = ['id','title','narration','visualKind','visualPrompt','estimatedSeconds'];
  const allowed = [...required, 'referenceAssetId'];
  if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(k=>!allowed.includes(k)) || required.some(k=>!(k in value))) throw new Error('Unexpected or missing storyboard fields.');
}
function plain(value,max) {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f<>]/.test(value)) throw new Error('Storyboard fields must be bounded plain text.');
}
export function validateStoryboard(board) {
  exactKeys(board,['schemaVersion','title','scenes']);
  if(board.schemaVersion!==1) throw new Error('Unsupported storyboard version.');
  plain(board.title,120);
  if(!Array.isArray(board.scenes)||board.scenes.length<1||board.scenes.length>24) throw new Error('Expected 1–24 scenes.');
  const ids=new Set(); let total=0,footage=0;
  for(const s of board.scenes){
    sceneKeys(s);
    if(typeof s.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,47}$/.test(s.id)||ids.has(s.id)) throw new Error('Scene IDs must be unique safe identifiers.');
    ids.add(s.id);plain(s.title,120);plain(s.narration,700);plain(s.visualPrompt,2000);
    if(s.referenceAssetId!==undefined&&s.referenceAssetId!==null&&(typeof s.referenceAssetId!=='string'||!REFERENCE_ID.test(s.referenceAssetId))) throw new Error('Scene reference must be a saved media asset ID.');
    if(!['ai-generated-footage','motion-graphics'].includes(s.visualKind)) throw new Error('Unsupported visual kind.');
    if(!Number.isFinite(s.estimatedSeconds)||s.estimatedSeconds<2||s.estimatedSeconds>30) throw new Error('Invalid scene duration.');
    total+=s.estimatedSeconds;if(s.visualKind==='ai-generated-footage')footage+=s.estimatedSeconds;
  }
  if(total<60||total>90) throw new Error('Storyboard must target 60–90 seconds.');
  if(footage<total/2) throw new Error('Generated footage must cover at least half the planned timeline; graphics are supplementary.');
  return board;
}
// Fixed key order makes review hashes independent of JSON formatting/key order.
export function storyboardReferenceIds(board){validateStoryboard(board);return [...new Set(board.scenes.map(s=>s.referenceAssetId).filter(Boolean))];}
export function storyboardHash(board){validateStoryboard(board);return createHash('sha256').update(JSON.stringify({schemaVersion:board.schemaVersion,title:board.title,scenes:board.scenes.map(s=>{const scene={id:s.id,title:s.title,narration:s.narration,visualKind:s.visualKind,visualPrompt:s.visualPrompt,estimatedSeconds:s.estimatedSeconds};if(s.referenceAssetId)scene.referenceAssetId=s.referenceAssetId;return scene;})})).digest('hex');}
export function requireReview(board,approval){if(approval?.approved!==true||approval.storyboardHash!==storyboardHash(board))throw new Error('Review approval is missing or stale. Review this exact storyboard before generation.');}
