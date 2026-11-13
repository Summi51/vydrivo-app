import test from 'node:test';
import assert from 'node:assert/strict';
import {requireFreeAllowance,alignmentCues} from './voice-policy.mjs';
const free={tier:'free',character_count:0,character_limit:1000,can_extend_character_limit:false};
test('speech refuses paid, unknown, extended or depleted allowance',()=>{for(const patch of [{tier:'starter'},{can_extend_character_limit:true},{can_extend_character_limit:undefined},{character_limit:1},{character_count:null}])assert.throws(()=>requireFreeAllowance({...free,...patch},'Hello'));requireFreeAllowance(free,'Hello');});
test('speech alignment uses measured timestamps and rejects malformed timing',()=>{const x={characters:['H','i'],character_start_times_seconds:[.2,.3],character_end_times_seconds:[.3,.5]};assert.deepEqual(alignmentCues(x),[{start:.2,end:.5,text:'Hi'}]);assert.throws(()=>alignmentCues({...x,character_end_times_seconds:[]}));assert.throws(()=>alignmentCues({...x,character_start_times_seconds:[.3,.2]}));});
